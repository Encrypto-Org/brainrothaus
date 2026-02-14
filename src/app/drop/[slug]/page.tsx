"use client"

import { useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CountdownTimer } from "@/components/countdown-timer"
import { StockCounter } from "@/components/stock-counter"
import { MOCK_PRODUCTS } from "@/lib/mock-products"
import { SIZES, SPRING, type SizeKey } from "@/lib/constants"

export default function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const product = MOCK_PRODUCTS.find(p => p.slug === slug)
  const [selectedSize, setSelectedSize] = useState<SizeKey>("small")

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white mb-2">DROP NOT FOUND</h1>
          <p className="text-zinc-500 mb-4">This drop doesn&apos;t exist or has been removed.</p>
          <Link href="/" className="text-[#39ff14] font-mono text-sm hover:underline">
            BACK TO DROPS
          </Link>
        </div>
      </div>
    )
  }

  const remaining = product.edition_size - product.units_sold
  const isVaulted = product.status === "vaulted" || product.status === "sold_out"
  const price = SIZES[selectedSize].price

  const handleBuy = () => {
    router.push(`/checkout?product=${product.slug}&size=${selectedSize}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-widest">BACK</span>
          </Link>
          <span className="text-lg font-black tracking-tighter text-white">
            BRAINROT<span className="text-[#39ff14]">HAUS</span>
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <motion.div
            className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={SPRING}
          >
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              className={`object-cover ${isVaulted ? "grayscale opacity-50" : ""}`}
              priority
            />
            {isVaulted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rotate-[-15deg] border-4 border-red-500/60 rounded px-8 py-3">
                  <span className="text-red-500/80 font-black text-4xl uppercase tracking-[0.2em]">
                    VAULTED
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            className="flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
          >
            {/* Trend tag */}
            {product.trend_tag && (
              <span className="inline-block w-fit px-3 py-1 bg-[#39ff14]/10 border border-[#39ff14]/20 rounded text-[10px] font-mono text-[#39ff14] uppercase tracking-widest mb-3">
                {product.trend_tag}
              </span>
            )}

            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
              {product.title}
            </h1>

            {product.description && (
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                {product.description}
              </p>
            )}

            {/* Countdown */}
            {product.expires_at && !isVaulted && (
              <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest block mb-2">
                  DROP EXPIRES IN
                </span>
                <CountdownTimer expiresAt={product.expires_at} />
              </div>
            )}

            {/* Stock */}
            {!isVaulted && (
              <div className="mb-6">
                <StockCounter remaining={remaining} total={product.edition_size} />
              </div>
            )}

            {/* Size selector */}
            {!isVaulted && (
              <div className="mb-6">
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest block mb-3">
                  SELECT SIZE
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(SIZES) as [SizeKey, typeof SIZES[SizeKey]][]).map(([key, size]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedSize(key)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedSize === key
                          ? "border-[#39ff14] bg-[#39ff14]/5 text-white"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="text-xs font-mono font-bold">{size.label}</div>
                      <div className="text-lg font-black mt-1">${size.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price + Buy */}
            {!isVaulted ? (
              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 text-xs font-mono">TOTAL</span>
                    <div className="text-3xl font-black text-white tabular-nums">
                      ${price}
                    </div>
                    <span className="text-zinc-600 text-[10px] font-mono">FREE SHIPPING</span>
                  </div>
                </div>
                <Button
                  variant="neon"
                  size="xl"
                  className="w-full text-base"
                  onClick={handleBuy}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  COP THIS DROP
                </Button>
                <p className="text-zinc-600 text-[10px] font-mono text-center">
                  SECURE CHECKOUT WITH STRIPE. CRYPTO COMING SOON.
                </p>
              </div>
            ) : (
              <div className="mt-auto p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-center">
                <p className="text-zinc-500 font-mono text-sm mb-2">THIS DROP HAS BEEN VAULTED</p>
                <p className="text-zinc-600 text-xs">
                  All {product.edition_size} editions have been claimed. This design will never be reprinted.
                </p>
              </div>
            )}

            {/* Product details */}
            <div className="mt-8 pt-6 border-t border-zinc-800/50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-mono">MATERIAL</span>
                <span className="text-zinc-400">100% Polyester, Sublimation Print</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-mono">EDITION</span>
                <span className="text-zinc-400">Limited to {product.edition_size} units</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-mono">FULFILLMENT</span>
                <span className="text-zinc-400">Print-on-demand, ships in 3-7 days</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-mono">GENERATED BY</span>
                <span className="text-zinc-400">AI (DALL-E 3 / Flux Pro)</span>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
