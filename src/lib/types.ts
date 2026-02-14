export interface Product {
  id: string
  title: string
  slug: string
  description: string | null
  image_url: string
  price_usd: number
  size: string
  printful_variant_id: string | null
  trend_tag: string | null
  edition_size: number
  units_sold: number
  expires_at: string | null
  status: "active" | "sold_out" | "vaulted" | "coming_soon"
  created_at: string
}

export interface Order {
  id: string
  product_id: string
  customer_email: string
  shipping_address: ShippingAddress
  size: string
  payment_method: "stripe" | "encrypto"
  stripe_session_id: string | null
  encrypto_payment_id: string | null
  payment_status: "pending" | "paid" | "failed"
  fulfillment_status: "pending" | "submitted" | "shipped" | "delivered"
  printful_order_id: string | null
  tracking_url: string | null
  amount_usd: number
  created_at: string
}

export interface ShippingAddress {
  name: string
  address1: string
  address2?: string
  city: string
  state: string
  zip: string
  country: string
}
