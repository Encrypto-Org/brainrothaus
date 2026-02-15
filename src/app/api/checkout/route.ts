import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { SIZES, CRYPTO_PAYMENT, type SizeKey } from "@/lib/constants"

// Force Node.js runtime
export const runtime = "nodejs"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://brainrothaus.com"

async function createStripeCheckoutSession(params: {
  email: string
  productName: string
  description: string
  amountCents: number
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
  body.set("line_items[0][price_data][currency]", "usd")
  body.set("line_items[0][price_data][product_data][name]", params.productName)
  body.set("line_items[0][price_data][product_data][description]", params.description)
  body.set("line_items[0][price_data][unit_amount]", String(params.amountCents))
  body.set("line_items[0][quantity]", "1")

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_id, product_slug, size, email, shipping, method } = body

    if ((!product_id && !product_slug) || !size || !email || !shipping) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sizeConfig = SIZES[size as SizeKey]
    if (!sizeConfig) {
      return NextResponse.json({ error: "Invalid size" }, { status: 400 })
    }

    // Stripe card payment
    if (method === "stripe") {
      const key = process.env.STRIPE_SECRET_KEY
      if (!key) {
        return NextResponse.json({ error: "Stripe key not configured" }, { status: 500 })
      }

      const session = await createStripeCheckoutSession({
        email,
        productName: `BRAINROTHAUS Tapestry — ${product_slug}`,
        description: `${sizeConfig.label} Wall Tapestry. Limited Edition.`,
        amountCents: sizeConfig.price * 100,
        metadata: {
          product_id: product_id || "",
          product_slug: product_slug || "",
          size,
          shipping_name: shipping.name,
          shipping_address1: shipping.address1,
          shipping_address2: shipping.address2 || "",
          shipping_city: shipping.city,
          shipping_state: shipping.state,
          shipping_zip: shipping.zip,
          shipping_country: shipping.country,
        },
        successUrl: `${SITE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${SITE_URL}/drop/${product_slug}`,
      })

      return NextResponse.json({ url: session.url })
    }

    // Encrypto crypto payment — create pending order in Supabase
    if (method === "encrypto") {
      const supabase = createServerClient()

      // Note: product_id omitted until products are seeded in DB
      // Product info tracked via shipping_address metadata
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
            product_slug: product_slug || "",
            product_id: product_id || "",
          },
          size,
          payment_method: "encrypto",
          payment_status: "pending",
          fulfillment_status: "pending",
          amount_usd: sizeConfig.price,
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
        amount_usdc: sizeConfig.price,
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
