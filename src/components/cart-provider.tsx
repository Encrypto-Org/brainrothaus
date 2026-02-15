"use client"

import { CartContext, useCartStore } from "@/lib/cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCartStore()

  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>
}
