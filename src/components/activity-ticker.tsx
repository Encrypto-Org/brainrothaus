"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ACTIVITY_FEED } from "@/lib/constants"

export function ActivityTicker() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % ACTIVITY_FEED.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const item = ACTIVITY_FEED[index]

  return (
    <div className="h-5 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="flex items-center justify-center gap-1.5 text-zinc-500 text-[11px] font-mono"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="relative flex h-1 w-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75" />
            <span className="relative inline-flex rounded-full h-1 w-1 bg-[#39ff14]" />
          </span>
          <span className="text-zinc-400">{item.name}</span>
          <span>{item.action}</span>
          <span className="text-[#39ff14] font-semibold">{item.item}</span>
          <span className="text-zinc-700">{item.time}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
