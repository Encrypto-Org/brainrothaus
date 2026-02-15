"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { getProducts, getProductBySlug } from "@/lib/products"
import type { Product } from "@/lib/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

const TABLE = "brainrothaus_products"

/**
 * Hook that fetches all products and subscribes to real-time changes.
 * New products from BrainrotRadar appear automatically without page refresh.
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Handle real-time events
  const handleInsert = useCallback((payload: { new: Product }) => {
    setProducts(prev => {
      // Avoid duplicates
      if (prev.some(p => p.id === payload.new.id)) return prev
      // Insert at front (newest first, matching our order)
      return [payload.new, ...prev]
    })
  }, [])

  const handleUpdate = useCallback((payload: { new: Product }) => {
    setProducts(prev =>
      prev.map(p => (p.id === payload.new.id ? payload.new : p))
    )
  }, [])

  const handleDelete = useCallback((payload: { old: { id: string } }) => {
    setProducts(prev => prev.filter(p => p.id !== payload.old.id))
  }, [])

  useEffect(() => {
    let cancelled = false

    // 1. Initial fetch
    getProducts().then(data => {
      if (!cancelled) {
        setProducts(data)
        setLoading(false)
      }
    })

    // 2. Subscribe to real-time changes (graceful degradation if Realtime isn't enabled)
    try {
      const channel = supabase
        .channel("products-realtime")
        .on<Product>(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: TABLE },
          (payload) => handleInsert(payload as unknown as { new: Product })
        )
        .on<Product>(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: TABLE },
          (payload) => handleUpdate(payload as unknown as { new: Product })
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: TABLE },
          (payload) => handleDelete(payload as unknown as { old: { id: string } })
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR") {
            console.warn(
              "[useProducts] Realtime subscription failed, falling back to static data.",
              err
            )
          }
        })

      channelRef.current = channel
    } catch (e) {
      console.warn("[useProducts] Could not set up Realtime subscription:", e)
    }

    // 3. Cleanup
    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [handleInsert, handleUpdate, handleDelete])

  return { products, loading }
}

/**
 * Hook that fetches a single product by slug and subscribes to real-time updates.
 * Stock counters and status update live on the drop detail page.
 */
export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let cancelled = false

    // 1. Initial fetch
    getProductBySlug(slug).then(data => {
      if (!cancelled) {
        setProduct(data)
        setLoading(false)
      }
    })

    // 2. Subscribe to changes for this specific product's slug
    //    We filter by slug since we don't know the id yet at subscribe time.
    //    Supabase Realtime filter works on column values.
    try {
      const channel = supabase
        .channel(`product-${slug}`)
        .on<Product>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: TABLE,
            filter: `slug=eq.${slug}`,
          },
          (payload) => {
            setProduct(payload.new as Product)
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: TABLE,
            filter: `slug=eq.${slug}`,
          },
          () => {
            // Product was deleted, mark as null
            setProduct(null)
          }
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR") {
            console.warn(
              `[useProduct:${slug}] Realtime subscription failed, using static data.`,
              err
            )
          }
        })

      channelRef.current = channel
    } catch (e) {
      console.warn(`[useProduct:${slug}] Could not set up Realtime:`, e)
    }

    // 3. Cleanup
    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [slug])

  return { product, loading }
}
