"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { CountdownTimer } from "./countdown-timer"
import { StockCounter } from "./stock-counter"
import { SPRING } from "@/lib/constants"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
  index: number
}

export function ProductCard({ product, index }: ProductCardProps) {
  const remaining = product.edition_size - product.units_sold
  const isVaulted = product.status === "vaulted" || product.status === "sold_out"

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.1 }}
    >
      <Link href={`/drop/${product.slug}`} className="block group">
        <div className="relative rounded-xl overflow-hidden border border-zinc-800/50 bg-zinc-900 transition-all duration-200 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                isVaulted ? "grayscale opacity-50" : ""
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* Glassmorphic overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent p-4 pt-16">
              {/* Trend tag */}
              {product.trend_tag && (
                <span className="inline-block px-2 py-0.5 bg-[#39ff14]/10 border border-[#39ff14]/20 rounded text-[10px] font-mono text-[#39ff14] uppercase tracking-widest mb-2">
                  {product.trend_tag}
                </span>
              )}

              <h3 className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-[#39ff14] transition-colors">
                {product.title}
              </h3>

              <div className="flex items-center justify-between">
                <span className="text-white font-mono text-xl font-black">
                  ${product.price_usd}
                </span>
                {isVaulted && (
                  <span className="text-xs font-mono font-black text-zinc-500 uppercase tracking-widest line-through">
                    SOLD OUT
                  </span>
                )}
              </div>
            </div>

            {/* VAULTED stamp overlay */}
            {isVaulted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rotate-[-15deg] border-4 border-red-500/60 rounded px-6 py-2">
                  <span className="text-red-500/80 font-black text-3xl uppercase tracking-[0.2em]">
                    VAULTED
                  </span>
                </div>
              </div>
            )}

            {/* Coming soon badge */}
            {product.status === "coming_soon" && (
              <div className="absolute top-3 right-3 px-3 py-1 bg-zinc-900/90 border border-zinc-700 rounded-lg">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                  COMING SOON
                </span>
              </div>
            )}
          </div>

          {/* Bottom info bar */}
          {!isVaulted && product.status === "active" && (
            <div className="px-4 py-3 border-t border-zinc-800/50 space-y-2">
              <StockCounter
                remaining={remaining}
                total={product.edition_size}
              />
              {product.expires_at && (
                <CountdownTimer expiresAt={product.expires_at} />
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
