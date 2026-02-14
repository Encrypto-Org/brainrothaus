"use client"

import { motion } from "framer-motion"

interface StockCounterProps {
  remaining: number
  total: number
}

export function StockCounter({ remaining, total }: StockCounterProps) {
  const percentage = (remaining / total) * 100
  const isLow = remaining <= 10
  const isCritical = remaining <= 5

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          className={`font-mono text-xs font-bold uppercase tracking-wider ${
            isCritical
              ? "text-red-500"
              : isLow
              ? "text-orange-400"
              : "text-zinc-400"
          }`}
        >
          {remaining}/{total} REMAINING
        </span>
        {isCritical && (
          <motion.span
            className="text-[10px] font-mono text-red-500 uppercase"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ALMOST GONE
          </motion.span>
        )}
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isCritical
              ? "bg-red-500"
              : isLow
              ? "bg-orange-400"
              : "bg-[#39ff14]"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
