import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@/lib/supabase"
import { SIZES, CRYPTO_PAYMENT, type SizeKey } from "@/lib/constants"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://brainrothaus.com"

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
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `BRAINROTHAUS Tapestry — ${product_slug}`,
                description: `${sizeConfig.label} Wall Tapestry. Limited Edition.`,
              },
              unit_amount: sizeConfig.price * 100,
            },
            quantity: 1,
          },
        ],
        metadata: {
          product_id,
          product_slug,
          size,
          shipping_name: shipping.name,
          shipping_address1: shipping.address1,
          shipping_address2: shipping.address2 || "",
          shipping_city: shipping.city,
          shipping_state: shipping.state,
          shipping_zip: shipping.zip,
          shipping_country: shipping.country,
        },
        success_url: `${SITE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/drop/${product_slug}`,
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
