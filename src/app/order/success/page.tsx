"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle, Package, ArrowRight, Loader2 } from "lucide-react"
import { SPRING } from "@/lib/constants"

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <motion.div
        className="max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#39ff14]/10 mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRING, delay: 0.2 }}
        >
          <CheckCircle className="w-10 h-10 text-[#39ff14]" />
        </motion.div>

        <h1 className="text-3xl font-black text-white mb-2">YOU COPPED IT</h1>
        <p className="text-zinc-500 text-sm mb-6">
          Your limited edition tapestry is being printed right now. You&apos;ll get an email with tracking once it ships.
        </p>

        <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-5 h-5 text-zinc-500" />
            <span className="text-zinc-400 text-xs font-mono uppercase">ORDER CONFIRMED</span>
          </div>
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">STATUS</span>
              <span className="text-[#39ff14] font-mono">PRINTING</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">ESTIMATED SHIP</span>
              <span className="text-zinc-400 font-mono">3-7 BUSINESS DAYS</span>
            </div>
            {sessionId && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">REF</span>
                <span className="text-zinc-500 font-mono text-[10px]">{sessionId.slice(0, 20)}...</span>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#39ff14] font-mono text-sm hover:underline"
        >
          BROWSE MORE DROPS
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
