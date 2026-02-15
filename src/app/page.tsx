"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ProductCard } from "@/components/product-card"
import { ActivityTicker } from "@/components/activity-ticker"
import { CartIcon } from "@/components/cart-icon"
import { CartDrawer } from "@/components/cart-drawer"
import { MOCK_PRODUCTS } from "@/lib/mock-products"
import { SPRING } from "@/lib/constants"
import Link from "next/link"

type FilterTab = "all" | "active" | "ending_soon"

export default function HomePage() {
  const [filter, setFilter] = useState<FilterTab>("all")
  const [cartOpen, setCartOpen] = useState(false)

  const activeProducts = useMemo(() => {
    const products = MOCK_PRODUCTS.filter(p => p.status === "active")
    if (filter === "ending_soon") {
      return products
        .filter(p => p.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
    }
    return products
  }, [filter])

  const soldOutProducts = MOCK_PRODUCTS.filter(
    p => p.status === "sold_out" || p.status === "vaulted"
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white">
              BRAINROT<span className="text-[#39ff14]">HAUS</span>
            </h1>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/vault"
              className="text-zinc-500 text-xs font-mono uppercase tracking-widest hover:text-white transition-colors"
            >
              Vault
            </Link>
            <CartIcon onClick={() => setCartOpen(true)} />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-gradient-to-b from-[#39ff14]/[0.03] to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block h-2 w-2 rounded-full bg-[#39ff14] animate-pulse" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
                LIMITED DROPS LIVE
              </span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-white leading-[0.95] tracking-tight mb-4">
              AI-GENERATED{" "}
              <span className="text-[#39ff14]">TAPESTRIES</span>{" "}
              FOR THE CHRONICALLY ONLINE
            </h2>
            <p className="text-zinc-500 text-base sm:text-lg max-w-xl leading-relaxed mb-6">
              Limited edition wall art born from internet culture.
              When the trend dies, the drop dies. 50 units max per design.
              No restocks. No exceptions.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#drops"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#39ff14] text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-[#45ff28] active:scale-[0.97] transition-all shadow-[0_0_30px_rgba(57,255,20,0.2)]"
              >
                SHOP DROPS
              </a>
              <Link
                href="/vault"
                className="inline-flex items-center justify-center h-12 px-6 border-2 border-zinc-800 text-zinc-400 font-bold text-sm uppercase tracking-wider rounded-xl hover:border-zinc-600 hover:text-white transition-all"
              >
                VIEW VAULT
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Activity Ticker */}
      <div className="border-b border-zinc-800/50 py-2.5 bg-zinc-950/50">
        <ActivityTicker />
      </div>

      {/* Drops Grid */}
      <section id="drops" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-8 p-1 bg-zinc-900/50 border border-zinc-800/50 rounded-lg w-fit">
          {(["all", "active", "ending_soon"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-md transition-all ${
                filter === tab
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "ending_soon" ? "ENDING SOON" : tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>

        {/* Sold out section */}
        {soldOutProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs font-mono uppercase tracking-[0.2em]">
                RECENTLY VAULTED
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {soldOutProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-lg font-black text-white tracking-tighter">
                BRAINROT<span className="text-[#39ff14]">HAUS</span>
              </span>
              <p className="text-zinc-600 text-xs mt-1">
                AI-generated tapestries for the terminally online.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/vault" className="text-zinc-500 text-xs font-mono hover:text-white transition-colors">
                VAULT
              </Link>
              <a
                href="https://x.com/brainrothaus"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 text-xs font-mono hover:text-white transition-colors"
              >
                X / TWITTER
              </a>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-zinc-800/30 text-center">
            <p className="text-zinc-700 text-[10px] font-mono">
              POWERED BY AI. PRINTED ON DEMAND. SHIPPED WORLDWIDE.
            </p>
          </div>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
