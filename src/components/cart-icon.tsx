"use client"

import { ShoppingBag } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useCart } from "@/lib/cart"

interface CartIconProps {
  onClick: () => void
}

export function CartIcon({ onClick }: CartIconProps) {
  const { getItemCount } = useCart()
  const count = getItemCount()

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-zinc-400 hover:text-white transition-colors"
      aria-label={`Shopping bag with ${count} items`}
    >
      <ShoppingBag className="w-5 h-5" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-[#39ff14] text-black text-[10px] font-black rounded-full"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
