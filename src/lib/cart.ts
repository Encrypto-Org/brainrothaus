"use client"

import { createContext, useContext, useCallback, useSyncExternalStore } from "react"
import type { SizeKey } from "@/lib/constants"

// ── Types ──────────────────────────────────────────────────────────
export interface CartItem {
  productSlug: string
  productTitle: string
  imageUrl: string
  size: SizeKey
  price: number
  quantity: number
}

export interface CartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => boolean
  removeItem: (productSlug: string, size: SizeKey) => void
  updateQuantity: (productSlug: string, size: SizeKey, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

// ── LocalStorage cart store ────────────────────────────────────────
const CART_KEY = "brainrothaus_cart"
const MAX_ITEMS = 10

let listeners: Array<() => void> = []
let cachedItems: CartItem[] | null = null

function getStoredItems(): CartItem[] {
  if (cachedItems !== null) return cachedItems
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    cachedItems = raw ? (JSON.parse(raw) as CartItem[]) : []
    return cachedItems
  } catch {
    return []
  }
}

function setStoredItems(items: CartItem[]) {
  cachedItems = items
  if (typeof window !== "undefined") {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }
  // Notify all subscribers
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot(): CartItem[] {
  return getStoredItems()
}

function getServerSnapshot(): CartItem[] {
  return []
}

// ── Hook ───────────────────────────────────────────────────────────
export function useCartStore() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    const current = getStoredItems()
    const existingIndex = current.findIndex(
      (i) => i.productSlug === item.productSlug && i.size === item.size
    )

    if (existingIndex >= 0) {
      // Increase quantity of existing item
      const updated = [...current]
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      }
      setStoredItems(updated)
    } else {
      // Check max items limit
      const totalItems = current.reduce((acc, i) => acc + i.quantity, 0)
      if (totalItems >= MAX_ITEMS) return false

      setStoredItems([...current, { ...item, quantity: 1 }])
    }
    return true
  }, [])

  const removeItem = useCallback((productSlug: string, size: SizeKey) => {
    const current = getStoredItems()
    setStoredItems(
      current.filter((i) => !(i.productSlug === productSlug && i.size === size))
    )
  }, [])

  const updateQuantity = useCallback(
    (productSlug: string, size: SizeKey, quantity: number) => {
      const current = getStoredItems()
      if (quantity <= 0) {
        setStoredItems(
          current.filter(
            (i) => !(i.productSlug === productSlug && i.size === size)
          )
        )
        return
      }

      // Enforce max
      const otherTotal = current
        .filter((i) => !(i.productSlug === productSlug && i.size === size))
        .reduce((acc, i) => acc + i.quantity, 0)

      const clampedQty = Math.min(quantity, MAX_ITEMS - otherTotal)
      if (clampedQty <= 0) return

      const updated = current.map((i) =>
        i.productSlug === productSlug && i.size === size
          ? { ...i, quantity: clampedQty }
          : i
      )
      setStoredItems(updated)
    },
    []
  )

  const clearCart = useCallback(() => {
    setStoredItems([])
  }, [])

  const getTotal = useCallback(() => {
    return getStoredItems().reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    )
  }, [])

  const getItemCount = useCallback(() => {
    return getStoredItems().reduce((acc, item) => acc + item.quantity, 0)
  }, [])

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
  }
}

// ── Context (for provider pattern) ─────────────────────────────────
export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}
