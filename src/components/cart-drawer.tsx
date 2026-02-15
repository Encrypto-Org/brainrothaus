"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart"
import { SIZES } from "@/lib/constants"
import { SPRING } from "@/lib/constants"

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart()
  const total = getTotal()

  const handleCheckout = () => {
    onClose()
    router.push("/checkout")
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={SPRING}
            className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-md bg-zinc-950 border-l border-zinc-800/50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#39ff14]" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  YOUR BAG
                </h2>
                {items.length > 0 && (
                  <span className="text-xs font-mono text-zinc-500">
                    ({items.reduce((acc, i) => acc + i.quantity, 0)})
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <ShoppingBag className="w-12 h-12 text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-mono text-sm mb-2">
                    YOUR BAG IS EMPTY
                  </p>
                  <p className="text-zinc-700 text-xs mb-6">
                    Add some drops to get started
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="text-xs font-mono uppercase tracking-widest"
                  >
                    CONTINUE SHOPPING
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={`${item.productSlug}-${item.size}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-6 py-4"
                      >
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-800/50 shrink-0">
                            <Image
                              src={item.imageUrl}
                              alt={item.productTitle}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white text-sm font-bold leading-tight truncate">
                              {item.productTitle}
                            </h3>
                            <p className="text-zinc-500 text-xs font-mono mt-0.5">
                              {SIZES[item.size].label}
                            </p>
                            <p className="text-white font-mono font-black text-sm mt-1">
                              ${item.price}
                            </p>

                            {/* Quantity controls */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productSlug,
                                      item.size,
                                      item.quantity - 1
                                    )
                                  }
                                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 text-xs font-mono font-bold text-white tabular-nums min-w-[28px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productSlug,
                                      item.size,
                                      item.quantity + 1
                                    )
                                  }
                                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() =>
                                  removeItem(item.productSlug, item.size)
                                }
                                className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Line total */}
                          <div className="text-right shrink-0">
                            <span className="text-white font-mono font-black text-sm">
                              ${item.price * item.quantity}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-zinc-800/50 px-6 py-4 space-y-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
                    SUBTOTAL
                  </span>
                  <span className="text-white font-black text-xl tabular-nums">
                    ${total}
                  </span>
                </div>
                <p className="text-zinc-600 text-[10px] font-mono">
                  FREE SHIPPING ON ALL ORDERS
                </p>

                {/* Checkout button */}
                <Button
                  variant="neon"
                  size="xl"
                  className="w-full text-base"
                  onClick={handleCheckout}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  CHECKOUT — ${total}
                </Button>

                {/* Continue shopping + clear */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="text-zinc-500 text-xs font-mono uppercase tracking-widest hover:text-white transition-colors"
                  >
                    CONTINUE SHOPPING
                  </button>
                  <button
                    onClick={clearCart}
                    className="text-zinc-600 text-xs font-mono uppercase tracking-widest hover:text-red-400 transition-colors"
                  >
                    CLEAR BAG
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
