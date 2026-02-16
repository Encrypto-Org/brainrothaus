import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@/lib/supabase"
import { submitPrintOrder, getVariantId } from "@/lib/printful"

// Force Node.js runtime (avoid Edge runtime networking issues)
export const runtime = "nodejs"

interface ParsedItem {
  slug: string
  size: string
  quantity: number
}

/**
 * Parse the "items" metadata string from checkout.
 * Format: "slug|size|qty,slug|size|qty"
 */
function parseItemsMetadata(itemsStr: string): ParsedItem[] {
  if (!itemsStr) return []
  return itemsStr.split(",").map((entry) => {
    const [slug, size, qty] = entry.split("|")
    return { slug: slug || "", size: size || "large", quantity: parseInt(qty, 10) || 1 }
  })
}

/**
 * Stripe webhook handler for checkout.session.completed events.
 *
 * Flow:
 * 1. Verify webhook signature (Stripe SDK local crypto — works on Vercel)
 * 2. Parse items from metadata (cart format: "slug|size|qty,slug|size|qty")
 * 3. Look up products from Supabase by slug
 * 4. Create order in Supabase brainrothaus_orders table with order_items JSONB
 * 5. Submit print orders to Printful (one per item — each has different art)
 * 6. Increment units_sold on each product
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  // --- Step 1: Verify signature ---
  let event: Stripe.Event
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Webhook] Signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // --- Step 2: Handle checkout.session.completed ---
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata

    if (!metadata) {
      console.error("[Webhook] No metadata in checkout session:", session.id)
      return NextResponse.json({ received: true })
    }

    const customerEmail = session.customer_email
    const amountUsd = session.amount_total ? session.amount_total / 100 : 0

    // Parse items from cart-format metadata
    const parsedItems = parseItemsMetadata(metadata.items || "")

    const shippingAddress = {
      name: metadata.shipping_name || "",
      address1: metadata.shipping_address1 || "",
      address2: metadata.shipping_address2 || "",
      city: metadata.shipping_city || "",
      state: metadata.shipping_state || "",
      zip: metadata.shipping_zip || "",
      country: metadata.shipping_country || "",
    }

    console.log("[Webhook] checkout.session.completed:", {
      session_id: session.id,
      items: parsedItems,
      email: customerEmail,
      amount_usd: amountUsd,
    })

    // --- Step 3: Look up products from Supabase ---
    const supabase = createServerClient()
    const slugs = parsedItems.map((i) => i.slug).filter(Boolean)

    let productMap: Map<string, { id: string; image_url: string; printful_variant_id: string | null; title: string }> = new Map()

    if (slugs.length > 0) {
      const { data: products } = await supabase
        .from("brainrothaus_products")
        .select("id, slug, title, image_url, printful_variant_id")
        .in("slug", slugs)

      if (products) {
        for (const p of products) {
          productMap.set(p.slug, {
            id: p.id,
            image_url: p.image_url,
            printful_variant_id: p.printful_variant_id,
            title: p.title,
          })
        }
      }
    }

    // Build order_items JSONB for the order
    const orderItems = parsedItems.map((item) => {
      const product = productMap.get(item.slug)
      return {
        product_slug: item.slug,
        product_title: product?.title || item.slug,
        product_id: product?.id || null,
        size: item.size,
        quantity: item.quantity,
      }
    })

    // --- Step 4: Create order in Supabase ---
    const baseOrder = {
      customer_email: customerEmail,
      shipping_address: { ...shippingAddress, items: orderItems },
      size: parsedItems[0]?.size || null,
      payment_method: "stripe",
      stripe_session_id: session.id,
      payment_status: "paid",
      fulfillment_status: "pending",
      amount_usd: amountUsd,
    }

    // Try with order_items column, fallback without it
    let order: { id: string } | null = null
    const { data: d1, error: e1 } = await supabase
      .from("brainrothaus_orders")
      .insert({ ...baseOrder, order_items: orderItems })
      .select("id")
      .single()

    if (e1 && e1.message?.includes("order_items")) {
      const { data: d2, error: e2 } = await supabase
        .from("brainrothaus_orders")
        .insert(baseOrder)
        .select("id")
        .single()
      if (e2) {
        console.error("[Webhook] Failed to create order in Supabase:", e2)
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
      }
      order = d2
    } else if (e1) {
      console.error("[Webhook] Failed to create order in Supabase:", e1)
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
    } else {
      order = d1
    }

    if (!order) {
      console.error("[Webhook] Order insert returned null")
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
    }

    console.log("[Webhook] Order created:", order.id)

    // --- Step 5: Submit to Printful (one order per item — each has different art) ---
    const printfulOrderIds: string[] = []

    for (const item of parsedItems) {
      const product = productMap.get(item.slug)
      if (!product?.image_url) {
        console.warn(`[Webhook] No image URL for ${item.slug} — skipping Printful`)
        continue
      }

      const variantId = getVariantId(item.size, product.printful_variant_id)
      if (!variantId) {
        console.warn(`[Webhook] No variant for size "${item.size}" — skipping Printful for ${item.slug}`)
        continue
      }

      try {
        const countryCode = normalizeCountryCode(shippingAddress.country)
        const printfulResponse = await submitPrintOrder({
          externalId: `${order.id}-${item.slug}`,
          recipient: {
            name: shippingAddress.name,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2 || undefined,
            city: shippingAddress.city,
            state_code: shippingAddress.state,
            country_code: countryCode,
            zip: shippingAddress.zip,
            email: customerEmail || undefined,
          },
          variantId,
          imageUrl: product.image_url,
          confirm: false,
        })

        if (printfulResponse) {
          printfulOrderIds.push(String(printfulResponse.result.id))
        }
      } catch (printfulError) {
        console.error(`[Webhook] Printful failed for ${item.slug} (non-fatal):`, printfulError)
      }
    }

    // Update order with Printful order IDs
    if (printfulOrderIds.length > 0) {
      const { error: updateError } = await supabase
        .from("brainrothaus_orders")
        .update({
          printful_order_id: printfulOrderIds.join(","),
          fulfillment_status: "submitted",
        })
        .eq("id", order.id)

      if (updateError) {
        console.error("[Webhook] Failed to update order with Printful IDs:", updateError)
      } else {
        console.log(`[Webhook] Printful orders [${printfulOrderIds.join(", ")}] linked to ${order.id}`)
      }
    }

    // --- Step 6: Increment units_sold on each product ---
    for (const item of parsedItems) {
      const product = productMap.get(item.slug)
      if (!product?.id) continue

      try {
        // Direct SQL increment via RPC
        const { error: rpcError } = await supabase.rpc("increment_units_sold", {
          p_product_id: product.id,
        })
        if (rpcError) {
          // RPC might not exist yet — fallback to read-then-write
          const { data: current } = await supabase
            .from("brainrothaus_products")
            .select("units_sold")
            .eq("id", product.id)
            .single()
          if (current) {
            await supabase
              .from("brainrothaus_products")
              .update({ units_sold: (current.units_sold || 0) + item.quantity })
              .eq("id", product.id)
          }
        }
      } catch {
        // Non-fatal — stock counter is nice-to-have
      }
    }
  }

  return NextResponse.json({ received: true })
}

/**
 * Normalize country input to 2-letter ISO code.
 */
function normalizeCountryCode(country: string): string {
  if (!country) return "US"

  const upper = country.trim().toUpperCase()

  if (upper.length === 2) return upper

  const countryMap: Record<string, string> = {
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    "USA": "US",
    "CANADA": "CA",
    "UNITED KINGDOM": "GB",
    "UK": "GB",
    "AUSTRALIA": "AU",
    "GERMANY": "DE",
    "FRANCE": "FR",
    "BRAZIL": "BR",
    "ARGENTINA": "AR",
    "MEXICO": "MX",
    "SPAIN": "ES",
    "ITALY": "IT",
    "JAPAN": "JP",
    "CHINA": "CN",
    "INDIA": "IN",
    "SOUTH KOREA": "KR",
    "NETHERLANDS": "NL",
    "SWEDEN": "SE",
    "NORWAY": "NO",
    "DENMARK": "DK",
    "FINLAND": "FI",
    "SWITZERLAND": "CH",
    "AUSTRIA": "AT",
    "BELGIUM": "BE",
    "PORTUGAL": "PT",
    "IRELAND": "IE",
    "NEW ZEALAND": "NZ",
    "SINGAPORE": "SG",
    "COLOMBIA": "CO",
    "CHILE": "CL",
    "PERU": "PE",
    "POLAND": "PL",
  }

  return countryMap[upper] || upper.slice(0, 2)
}
