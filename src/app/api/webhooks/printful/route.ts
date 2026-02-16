import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

/**
 * Printful webhook handler for shipping updates.
 *
 * Events we care about:
 *   - package_shipped: Order has shipped, tracking info available
 *   - order_failed: Print/fulfillment failed
 *
 * Printful sends webhooks as POST with JSON body:
 * {
 *   "type": "package_shipped",
 *   "created": 1234567890,
 *   "retries": 0,
 *   "store": 17720117,
 *   "data": {
 *     "shipment": { "carrier", "tracking_number", "tracking_url", ... },
 *     "order": { "id", "external_id", "status", ... }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const { type, data } = payload

    console.log("[Printful Webhook]", type, JSON.stringify(data, null, 2).slice(0, 500))

    const supabase = createServerClient()

    if (type === "package_shipped") {
      const externalId = data?.order?.external_id
      const trackingUrl = data?.shipment?.tracking_url
      const trackingNumber = data?.shipment?.tracking_number
      const carrier = data?.shipment?.carrier

      if (!externalId) {
        console.warn("[Printful Webhook] No external_id in package_shipped event")
        return NextResponse.json({ received: true })
      }

      // external_id format is "order-uuid-slug" — extract the order UUID
      // It could be just the order UUID or "uuid-slug"
      const orderId = externalId.includes("-") && externalId.length > 36
        ? externalId.slice(0, 36)
        : externalId

      const { error } = await supabase
        .from("brainrothaus_orders")
        .update({
          fulfillment_status: "shipped",
          tracking_url: trackingUrl || null,
        })
        .eq("id", orderId)

      if (error) {
        console.error("[Printful Webhook] Failed to update order:", error)
      } else {
        console.log(`[Printful Webhook] Order ${orderId} shipped — ${carrier} ${trackingNumber}`)
      }
    }

    if (type === "order_failed") {
      const externalId = data?.order?.external_id
      if (externalId) {
        const orderId = externalId.includes("-") && externalId.length > 36
          ? externalId.slice(0, 36)
          : externalId

        await supabase
          .from("brainrothaus_orders")
          .update({ fulfillment_status: "failed" })
          .eq("id", orderId)

        console.error(`[Printful Webhook] Order ${orderId} FAILED:`, data?.reason)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Printful Webhook] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
