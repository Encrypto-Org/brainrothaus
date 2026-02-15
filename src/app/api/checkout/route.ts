import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { SIZES, CRYPTO_PAYMENT, type SizeKey } from "@/lib/constants"

// Force Node.js runtime
export const runtime = "nodejs"

// Hardcoded — NEXT_PUBLIC_ env vars can be unreliable at runtime in serverless
const SITE_URL = "https://brainrothaus.vercel.app"

interface CheckoutItem {
  product_slug: string
  product_title?: string
  product_id?: string
  size: SizeKey
  price: number
  quantity: number
}

async function createStripeCheckoutSession(params: {
  email: string
  lineItems: Array<{
    name: string
    description: string
    amountCents: number
    quantity: number
  }>
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
}) {
  const body = new URLSearchParams()
  body.set("mode", "payment")
  body.set("customer_email", params.email)
  body.set("payment_method_types[0]", "card")
  body.set("success_url", params.successUrl)
  body.set("cancel_url", params.cancelUrl)

  // Add each line item
  params.lineItems.forEach((item, index) => {
    body.set(`line_items[${index}][price_data][currency]`, "usd")
    body.set(`line_items[${index}][price_data][product_data][name]`, item.name)
    body.set(`line_items[${index}][price_data][product_data][description]`, item.description)
    body.set(`line_items[${index}][price_data][unit_amount]`, String(item.amountCents))
    body.set(`line_items[${index}][quantity]`, String(item.quantity))
  })

  // Add metadata
  for (const [key, value] of Object.entries(params.metadata)) {
    body.set(`metadata[${key}]`, value)
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(JSON.stringify({ status: res.status, param: data.error?.param, message: data.error?.message, type: data.error?.type }))
  }
  return data
}

function normalizeItems(body: Record<string, unknown>): CheckoutItem[] {
  // New format: items array
  if (Array.isArray(body.items) && body.items.length > 0) {
    return (body.items as Array<Record<string, unknown>>).map((item) => {
      const size = item.size as SizeKey
      const sizeConfig = SIZES[size]
      return {
        product_slug: (item.product_slug as string) || "",
        product_title: (item.product_title as string) || "",
        product_id: (item.product_id as string) || "",
        size,
        price: sizeConfig ? sizeConfig.price : (item.price as number) || 0,
        quantity: (item.quantity as number) || 1,
      }
    })
  }

  // Legacy format: single product via product_slug + size
  const size = (body.size as SizeKey) || "small"
  const sizeConfig = SIZES[size]
  if (!sizeConfig) return []

  return [
    {
      product_slug: (body.product_slug as string) || "",
      product_title: "",
      product_id: (body.product_id as string) || "",
      size,
      price: sizeConfig.price,
      quantity: 1,
    },
  ]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, shipping, method } = body

    const items = normalizeItems(body)

    if (items.length === 0) {
      return NextResponse.json({ error: "No valid items" }, { status: 400 })
    }

    if (!email || !shipping) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate all sizes
    for (const item of items) {
      if (!SIZES[item.size]) {
        return NextResponse.json({ error: `Invalid size: ${item.size}` }, { status: 400 })
      }
    }

    const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

    // Stripe card payment
    if (method === "stripe") {
      const key = process.env.STRIPE_SECRET_KEY
      if (!key) {
        return NextResponse.json({ error: "Stripe key not configured" }, { status: 500 })
      }

      const successUrl = `${SITE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${SITE_URL}/`

      const lineItems = items.map((item) => {
        const sizeConfig = SIZES[item.size]
        return {
          name: `BRAINROTHAUS Tapestry — ${item.product_slug}`,
          description: `${sizeConfig.label} Wall Tapestry. Limited Edition.`,
          amountCents: item.price * 100,
          quantity: item.quantity,
        }
      })

      // Store item details in metadata (Stripe metadata values must be strings, max 500 chars)
      const itemsSummary = items.map((item) => `${item.product_slug}|${item.size}|${item.quantity}`).join(",")

      const session = await createStripeCheckoutSession({
        email,
        lineItems,
        metadata: {
          items: itemsSummary,
          total_amount: String(totalAmount),
          shipping_name: shipping.name,
          shipping_address1: shipping.address1,
          shipping_address2: shipping.address2 || "",
          shipping_city: shipping.city,
          shipping_state: shipping.state,
          shipping_zip: shipping.zip,
          shipping_country: shipping.country,
        },
        successUrl,
        cancelUrl,
      })

      return NextResponse.json({ url: session.url })
    }

    // Encrypto crypto payment — create pending order in Supabase
    if (method === "encrypto") {
      const supabase = createServerClient()

      // Create one order with all items in the metadata
      const { data: order, error } = await supabase
        .from("brainrothaus_orders")
        .insert({
          customer_email: email,
          shipping_address: {
            name: shipping.name,
            address1: shipping.address1,
            address2: shipping.address2 || "",
            city: shipping.city,
            state: shipping.state,
            zip: shipping.zip,
            country: shipping.country,
          },
          size: items[0].size, // Primary size for legacy compat
          payment_method: "encrypto",
          payment_status: "pending",
          fulfillment_status: "pending",
          amount_usd: totalAmount,
          // Store all items as JSON in metadata
          order_items: items.map((item) => ({
            product_slug: item.product_slug,
            product_title: item.product_title || item.product_slug,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
          })),
        })
        .select("id")
        .single()

      if (error) {
        console.error("Failed to create crypto order:", error)
        return NextResponse.json(
          { error: "Failed to create order" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        order_id: order.id,
        amount_usdc: totalAmount,
        payment_address: CRYPTO_PAYMENT.address,
        chain: CRYPTO_PAYMENT.chain,
        token: CRYPTO_PAYMENT.token,
      })
    }

    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Checkout error:", message, error)
    return NextResponse.json(
      { error: "Failed to create checkout session", detail: message },
      { status: 500 }
    )
  }
}
