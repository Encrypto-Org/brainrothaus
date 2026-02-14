import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata

    if (!metadata) {
      console.error("No metadata in session")
      return NextResponse.json({ received: true })
    }

    console.log("Payment successful:", {
      product_slug: metadata.product_slug,
      size: metadata.size,
      email: session.customer_email,
      amount: session.amount_total,
    })

    // TODO: Create order in Supabase
    // TODO: Submit order to Printful
    // TODO: Update units_sold on product
    // TODO: Send confirmation email

    // For now, log the successful payment
    // Once Supabase tables are created, this will:
    // 1. Insert into brainrothaus_orders
    // 2. Update brainrothaus_products.units_sold
    // 3. Call Printful API to create print order
    // 4. Send email via Supabase Edge Function
  }

  return NextResponse.json({ received: true })
}
