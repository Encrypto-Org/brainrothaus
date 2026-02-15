/**
 * Printful API client for submitting and tracking print orders.
 *
 * Docs: https://developers.printful.com/docs/
 * Base URL: https://api.printful.com
 * Auth: Bearer token via PRINTFUL_API_KEY env var
 *
 * Products used:
 *   - Indoor Wall Tapestry (product_id 973): small + large sizes
 *   - Throw Blanket (product_id 395): sigma size (60"×80")
 *
 * Variant IDs confirmed via GET /products/973 and GET /products/395
 */

const PRINTFUL_BASE_URL = "https://api.printful.com"

/**
 * Map our internal size keys to Printful variant IDs.
 *
 * small + large → Indoor Wall Tapestry (product 973)
 * sigma → Throw Blanket 60"×80" (product 395) — closest to our 68"×80" SIGMA EDITION
 */
const SIZE_TO_VARIANT: Record<string, number> = {
  small: 24970,  // Indoor Wall Tapestry 26"×36" — $15.75 cost
  large: 24969,  // Indoor Wall Tapestry 50"×60" — $23.08 cost
  sigma: 13222,  // Throw Blanket 60"×80" — $38.98 cost (used as large wall tapestry)
}

export interface PrintfulRecipient {
  name: string
  address1: string
  address2?: string
  city: string
  state_code: string
  country_code: string
  zip: string
  email?: string
}

export interface PrintfulOrderItem {
  /** Printful variant ID from the catalog */
  variant_id: number
  /** Number of items (usually 1) */
  quantity: number
  /** Files to print on the product */
  files: Array<{
    /** "default" for the main print area */
    type: string
    /** Public URL of the image to print */
    url: string
  }>
}

export interface PrintfulOrderResponse {
  code: number
  result: {
    id: number
    external_id: string | null
    status: string
    shipping: string
    created: number
    updated: number
    recipient: PrintfulRecipient
    items: Array<{
      id: number
      external_id: string | null
      variant_id: number
      quantity: number
      name: string
      status: string
    }>
    retail_costs: {
      currency: string
      subtotal: string
      discount: string
      shipping: string
      tax: string
      total: string
    }
  }
}

export interface PrintfulStatusResponse {
  code: number
  result: {
    id: number
    status: string
    shipping: string
    created: number
    updated: number
    shipments: Array<{
      id: number
      carrier: string
      service: string
      tracking_number: string
      tracking_url: string
      created: number
      ship_date: string
      shipped_at: number
      reshipment: boolean
    }>
  }
}

function getApiKey(): string | null {
  const key = process.env.PRINTFUL_API_KEY
  if (!key) {
    console.warn("[Printful] PRINTFUL_API_KEY not set — Printful integration disabled")
    return null
  }
  return key
}

// Store ID from Printful dashboard (required for API v2)
const PRINTFUL_STORE_ID = process.env.PRINTFUL_STORE_ID || "17720117"

async function printfulFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("Printful API key not configured")
  }

  const url = `${PRINTFUL_BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": PRINTFUL_STORE_ID,
      ...options.headers,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("[Printful] API error:", {
      status: res.status,
      url,
      error: data,
    })
    throw new Error(
      `Printful API error ${res.status}: ${data?.error?.message || data?.result || JSON.stringify(data)}`
    )
  }

  return data as T
}

/**
 * Resolve our internal size key to a Printful variant ID.
 * If a product has a `printful_variant_id` stored in the DB, use that instead.
 */
export function getVariantId(size: string, overrideVariantId?: string | null): number | null {
  if (overrideVariantId) {
    const parsed = parseInt(overrideVariantId, 10)
    if (!isNaN(parsed)) return parsed
  }
  return SIZE_TO_VARIANT[size] ?? null
}

/**
 * Submit a print order to Printful.
 *
 * @param params.externalId   - Our order ID (from brainrothaus_orders.id)
 * @param params.recipient    - Shipping destination
 * @param params.variantId    - Printful catalog variant ID
 * @param params.imageUrl     - Public URL of the image to print on the tapestry
 * @param params.confirm      - If true, Printful charges and starts production immediately.
 *                              Set to false for draft orders (useful for testing).
 *
 * @returns The Printful order response, or null if Printful is not configured.
 */
export async function submitPrintOrder(params: {
  externalId: string
  recipient: PrintfulRecipient
  variantId: number
  imageUrl: string
  confirm?: boolean
}): Promise<PrintfulOrderResponse | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn("[Printful] Skipping order submission — API key not set")
    return null
  }

  const { externalId, recipient, variantId, imageUrl, confirm = false } = params

  const orderPayload = {
    external_id: externalId,
    recipient,
    items: [
      {
        variant_id: variantId,
        quantity: 1,
        files: [
          {
            type: "default",
            url: imageUrl,
          },
        ],
      },
    ],
  }

  // If confirm=true, append ?confirm=true to auto-submit for production
  const path = confirm ? "/orders?confirm=true" : "/orders"

  const response = await printfulFetch<PrintfulOrderResponse>(path, {
    method: "POST",
    body: JSON.stringify(orderPayload),
  })

  console.log("[Printful] Order created:", {
    printful_id: response.result.id,
    external_id: externalId,
    status: response.result.status,
  })

  return response
}

/**
 * Check the status of an existing Printful order.
 *
 * @param printfulOrderId - The Printful order ID (numeric)
 * @returns Order status including shipment/tracking info, or null if not configured.
 */
export async function getOrderStatus(
  printfulOrderId: string | number
): Promise<PrintfulStatusResponse | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    return null
  }

  return printfulFetch<PrintfulStatusResponse>(`/orders/${printfulOrderId}`)
}

/**
 * List available variants for a given Printful product.
 * Useful for looking up the correct variant IDs during setup.
 *
 * Example: listProductVariants(327) for Indoor Wall Tapestry
 */
export async function listProductVariants(productId: number) {
  return printfulFetch<{
    code: number
    result: {
      product: { id: number; title: string }
      variants: Array<{
        id: number
        product_id: number
        name: string
        size: string
        color: string
        price: string
      }>
    }
  }>(`/products/${productId}`)
}
