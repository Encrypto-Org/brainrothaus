"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { MOCK_PRODUCTS } from "@/lib/mock-products"
import { SPRING } from "@/lib/constants"

export default function VaultPage() {
  const vaultedProducts = MOCK_PRODUCTS.filter(
    p => p.status === "sold_out" || p.status === "vaulted"
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-widest">BACK</span>
          </Link>
          <Link href="/" className="text-lg font-black tracking-tighter text-white">
            BRAINROT<span className="text-[#39ff14]">HAUS</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
            THE <span className="text-zinc-500">VAULT</span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg">
            Expired and sold-out drops. These designs will never be reprinted.
            You missed them. They&apos;re gone. That&apos;s the point.
          </p>
        </motion.div>

        {vaultedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaultedProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-zinc-600 font-mono text-sm">NO VAULTED DROPS YET</p>
            <p className="text-zinc-700 text-xs mt-2">
              When drops expire or sell out, they end up here.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
