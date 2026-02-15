import { supabase } from "./supabase"
import type { Product } from "./types"
import { MOCK_PRODUCTS } from "./mock-products"

/**
 * Fetch products from Supabase brainrothaus_products table.
 * Falls back to MOCK_PRODUCTS if Supabase is empty or errors.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from("brainrothaus_products")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    if (!data || data.length === 0) return MOCK_PRODUCTS

    return data as Product[]
  } catch {
    console.error("Failed to fetch products from Supabase, using mock data")
    return MOCK_PRODUCTS
  }
}

/**
 * Fetch a single product by slug.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from("brainrothaus_products")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) throw error
    return data as Product
  } catch {
    // Fall back to mock
    return MOCK_PRODUCTS.find(p => p.slug === slug) ?? null
  }
}
