import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@/lib/supabase"
import { submitPrintOrder, getVariantId } from "@/lib/printful"

// Force Node.js runtime (avoid Edge runtime networking issues)
export const runtime = "nodejs"

/**
 * Stripe webhook handler for checkout.session.completed events.
 *
 * Flow:
 * 1. Verify webhook signature (Stripe SDK local crypto — works on Vercel)
 * 2. Extract session metadata (product, size, shipping)
 * 3. Create order in Supabase brainrothaus_orders table
 * 4. Submit print order to Printful (best-effort — failure doesn't break the webhook)
 * 5. Update units_sold on the product (if product_id is present)
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
  // Stripe SDK's constructEvent uses local crypto (no network call), safe on Vercel
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

    const {
      product_id,
      product_slug,
      size,
      shipping_name,
      shipping_address1,
      shipping_address2,
      shipping_city,
      shipping_state,
      shipping_zip,
      shipping_country,
    } = metadata

    const customerEmail = session.customer_email
    const amountUsd = session.amount_total ? session.amount_total / 100 : 0

    console.log("[Webhook] checkout.session.completed:", {
      session_id: session.id,
      product_slug,
      size,
      email: customerEmail,
      amount_usd: amountUsd,
    })

    // --- Step 3: Create order in Supabase ---
    const supabase = createServerClient()

    const shippingAddress = {
      name: shipping_name || "",
      address1: shipping_address1 || "",
      address2: shipping_address2 || "",
      city: shipping_city || "",
      state: shipping_state || "",
      zip: shipping_zip || "",
      country: shipping_country || "",
    }

    // Note: product_id omitted — mock product IDs are not real UUIDs and no
    // products are seeded in DB yet. Product info tracked via metadata fields.
    const { data: order, error: orderError } = await supabase
      .from("brainrothaus_orders")
      .insert({
        customer_email: customerEmail,
        shipping_address: {
          ...shippingAddress,
          product_slug: product_slug || "",
          product_id: product_id || "",
        },
        size: size || null,
        payment_method: "stripe",
        stripe_session_id: session.id,
        payment_status: "paid",
        fulfillment_status: "pending",
        amount_usd: amountUsd,
      })
      .select("id")
      .single()

    if (orderError) {
      console.error("[Webhook] Failed to create order in Supabase:", orderError)
      // Return 500 so Stripe retries the webhook
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      )
    }

    console.log("[Webhook] Order created:", order.id)

    // --- Step 4: Submit to Printful (best-effort) ---
    try {
      await submitToPrintful({
        orderId: order.id,
        size: size || "large",
        productSlug: product_slug || "",
        productId: product_id || null,
        shippingAddress,
        customerEmail: customerEmail || "",
        supabase,
      })
    } catch (printfulError) {
      // Log but don't fail the webhook — order is already recorded in Supabase
      console.error("[Webhook] Printful submission failed (non-fatal):", printfulError)
    }

    // --- Step 5: Increment units_sold on the product ---
    if (product_id) {
      try {
        // Use RPC for atomic increment. If the function doesn't exist yet,
        // this will fail gracefully and we log it.
        // To create the RPC:
        //   CREATE OR REPLACE FUNCTION increment_units_sold(p_product_id uuid)
        //   RETURNS void AS $$
        //     UPDATE brainrothaus_products
        //     SET units_sold = units_sold + 1
        //     WHERE id = p_product_id;
        //   $$ LANGUAGE sql;
        const { error: rpcError } = await supabase.rpc("increment_units_sold", {
          p_product_id: product_id,
        })
        if (rpcError) {
          console.warn("[Webhook] increment_units_sold RPC failed (non-fatal):", rpcError.message)
        }
      } catch (err) {
        console.error("[Webhook] units_sold update error (non-fatal):", err)
      }
    }
  }

  return NextResponse.json({ received: true })
}

// --- Printful submission helper ---

async function submitToPrintful(params: {
  orderId: string
  size: string
  productSlug: string
  productId: string | null
  shippingAddress: {
    name: string
    address1: string
    address2: string
    city: string
    state: string
    zip: string
    country: string
  }
  customerEmail: string
  supabase: ReturnType<typeof createServerClient>
}) {
  const {
    orderId,
    size,
    productSlug,
    productId,
    shippingAddress,
    customerEmail,
    supabase,
  } = params

  // Resolve the Printful variant ID for this size
  // First check if the product has a specific printful_variant_id in the DB
  let dbVariantId: string | null = null
  if (productId) {
    const { data: product } = await supabase
      .from("brainrothaus_products")
      .select("printful_variant_id, image_url")
      .eq("id", productId)
      .single()

    if (product?.printful_variant_id) {
      dbVariantId = product.printful_variant_id
    }
  }

  const variantId = getVariantId(size, dbVariantId)
  if (!variantId) {
    console.warn(`[Printful] No variant ID found for size "${size}" — skipping Printful submission`)
    return
  }

  // Get the product image URL for printing
  // Try to fetch from DB first, fall back to a placeholder
  let imageUrl: string | null = null
  if (productId) {
    const { data: product } = await supabase
      .from("brainrothaus_products")
      .select("image_url")
      .eq("id", productId)
      .single()

    imageUrl = product?.image_url || null
  }

  if (!imageUrl) {
    console.warn(`[Printful] No image URL for product ${productSlug || productId} — skipping Printful`)
    return
  }

  // Map country to 2-letter ISO code (shipping_country from metadata)
  // The checkout form should already send ISO codes, but normalize just in case
  const countryCode = normalizeCountryCode(shippingAddress.country)

  const printfulResponse = await submitPrintOrder({
    externalId: orderId,
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
    imageUrl,
    // Don't auto-confirm — let us review in Printful dashboard first
    confirm: false,
  })

  if (printfulResponse) {
    // Update the order with the Printful order ID
    const printfulOrderId = String(printfulResponse.result.id)
    const { error: updateError } = await supabase
      .from("brainrothaus_orders")
      .update({
        printful_order_id: printfulOrderId,
        fulfillment_status: "submitted",
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("[Webhook] Failed to update order with Printful ID:", updateError)
    } else {
      console.log(`[Webhook] Printful order ${printfulOrderId} linked to order ${orderId}`)
    }
  }
}

/**
 * Normalize country input to 2-letter ISO code.
 * Handles common cases; extend as needed.
 */
function normalizeCountryCode(country: string): string {
  if (!country) return "US"

  const upper = country.trim().toUpperCase()

  // Already a 2-letter code
  if (upper.length === 2) return upper

  // Common full names
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
