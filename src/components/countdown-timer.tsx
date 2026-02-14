"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface CountdownTimerProps {
  expiresAt: string
  onExpired?: () => void
}

function getTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  }
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const [time, setTime] = useState(getTimeLeft(expiresAt))

  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeLeft(expiresAt)
      setTime(t)
      if (t.expired) {
        clearInterval(interval)
        onExpired?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  if (time.expired) {
    return (
      <div className="font-mono text-sm font-black text-red-500 uppercase tracking-widest">
        EXPIRED
      </div>
    )
  }

  const isUrgent = time.days === 0 && time.hours < 24
  const isCritical = time.days === 0 && time.hours < 6

  const pad = (n: number) => n.toString().padStart(2, "0")

  return (
    <motion.div
      className={`font-mono text-sm font-black uppercase tracking-wider ${
        isCritical
          ? "text-red-500 urgent-pulse"
          : isUrgent
          ? "text-orange-400"
          : "text-zinc-400"
      }`}
      animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      {isCritical && (
        <span className="text-red-500 mr-1">THIS DROP DIES IN </span>
      )}
      {time.days > 0 && `${time.days}d `}
      {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
    </motion.div>
  )
}
