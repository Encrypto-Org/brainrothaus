"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, CreditCard, Loader2, Wallet, Copy, Check, ExternalLink, Trash2, ShoppingBag } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart"
import { SIZES, SPRING, CRYPTO_PAYMENT } from "@/lib/constants"
import { toast } from "sonner"

type PaymentMethod = "stripe" | "encrypto"

function CryptoPaymentPanel({ amount, orderId }: { amount: number; orderId: string | null }) {
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    await navigator.clipboard.writeText(CRYPTO_PAYMENT.address)
    setCopied(true)
    toast.success("Address copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={SPRING}
      className="space-y-6"
    >
      {/* Amount */}
      <div className="text-center p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
          SEND EXACTLY
        </span>
        <div className="text-3xl font-black text-white tabular-nums">
          {amount.toFixed(2)} <span className="text-[#39ff14]">USDC</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 block mt-1">
          ON {CRYPTO_PAYMENT.chain} NETWORK
        </span>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-xl">
          <QRCodeSVG
            value={CRYPTO_PAYMENT.address}
            size={180}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
          USDC ADDRESS ({CRYPTO_PAYMENT.chain})
        </span>
        <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <code className="text-xs text-zinc-300 font-mono flex-1 break-all">
            {CRYPTO_PAYMENT.address}
          </code>
          <button
            onClick={copyAddress}
            className="shrink-0 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#39ff14]" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-500" />
            )}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-2 text-xs text-zinc-500">
        <p className="flex items-start gap-2">
          <span className="text-[#39ff14] font-bold">1.</span>
          Send exactly <span className="text-white font-mono">{amount.toFixed(2)} USDC</span> on <span className="text-white">{CRYPTO_PAYMENT.chain}</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="text-[#39ff14] font-bold">2.</span>
          Payment is detected automatically (usually within 1 minute)
        </p>
        <p className="flex items-start gap-2">
          <span className="text-[#39ff14] font-bold">3.</span>
          You&apos;ll receive email confirmation once verified
        </p>
      </div>

      {orderId && (
        <div className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest block mb-1">
            ORDER ID
          </span>
          <code className="text-xs text-zinc-400 font-mono">{orderId}</code>
        </div>
      )}

      {/* Powered by Encrypto */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <span className="text-zinc-600 text-[10px] font-mono">POWERED BY</span>
        <a
          href="https://encrypto.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono font-bold text-[#39ff14] hover:underline flex items-center gap-1"
        >
          ENCRYPTO <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, removeItem, getTotal, clearCart } = useCart()

  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe")
  const [cryptoOrderId, setCryptoOrderId] = useState<string | null>(null)
  const [showCryptoPayment, setShowCryptoPayment] = useState(false)

  const [form, setForm] = useState({
    email: "",
    name: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  })

  const total = getTotal()

  if (items.length === 0 && !showCryptoPayment) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">YOUR BAG IS EMPTY</h1>
          <p className="text-zinc-500 mb-4 text-sm">Add some drops before checking out.</p>
          <Link href="/" className="text-[#39ff14] font-mono text-sm hover:underline">
            SHOP DROPS
          </Link>
        </div>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validateForm = () => {
    if (!form.email || !form.name || !form.address1 || !form.city || !form.state || !form.zip) {
      toast.error("Please fill in all required fields")
      return false
    }
    return true
  }

  const handleStripeCheckout = async () => {
    if (!validateForm()) return
    setLoading(true)

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_slug: item.productSlug,
            product_title: item.productTitle,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
          })),
          email: form.email,
          shipping: {
            name: form.name,
            address1: form.address1,
            address2: form.address2,
            city: form.city,
            state: form.state,
            zip: form.zip,
            country: form.country,
          },
          method: "stripe",
        }),
      })

      const data = await res.json()

      if (data.url) {
        clearCart()
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to create checkout session")
        setLoading(false)
      }
    } catch {
      toast.error("Something went wrong. Try again.")
      setLoading(false)
    }
  }

  const handleCryptoCheckout = async () => {
    if (!validateForm()) return
    setLoading(true)

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_slug: item.productSlug,
            product_title: item.productTitle,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
          })),
          email: form.email,
          shipping: {
            name: form.name,
            address1: form.address1,
            address2: form.address2,
            city: form.city,
            state: form.state,
            zip: form.zip,
            country: form.country,
          },
          method: "encrypto",
        }),
      })

      const data = await res.json()

      if (data.order_id) {
        setCryptoOrderId(data.order_id)
        setShowCryptoPayment(true)
        clearCart()
      } else {
        toast.error(data.error || "Failed to create crypto payment")
      }
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentMethod === "stripe") {
      await handleStripeCheckout()
    } else {
      await handleCryptoCheckout()
    }
  }

  const inputClass =
    "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#39ff14]/40 transition-colors"

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-widest">BACK</span>
          </button>
          <Link href="/" className="text-lg font-black tracking-tighter text-white">
            BRAINROT<span className="text-[#39ff14]">HAUS</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <h1 className="text-2xl font-black text-white mb-8">CHECKOUT</h1>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Order summary */}
            <div className="md:col-span-2">
              <div className="sticky top-24 space-y-4">
                <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-4">
                    ORDER SUMMARY ({items.reduce((a, i) => a + i.quantity, 0)} {items.reduce((a, i) => a + i.quantity, 0) === 1 ? "ITEM" : "ITEMS"})
                  </span>

                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={`${item.productSlug}-${item.size}`}
                        className="flex gap-3"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-800/50 shrink-0">
                          <Image
                            src={item.imageUrl}
                            alt={item.productTitle}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white text-sm font-bold leading-tight truncate">
                            {item.productTitle}
                          </h3>
                          <p className="text-zinc-500 text-[10px] font-mono mt-0.5">
                            {SIZES[item.size].label} x{item.quantity}
                          </p>
                        </div>

                        {/* Price + remove */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-white font-mono font-bold text-sm">
                            ${item.price * item.quantity}
                          </span>
                          <button
                            onClick={() => removeItem(item.productSlug, item.size)}
                            className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-4 pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs font-mono">TOTAL</span>
                      <span className="text-white font-black text-xl tabular-nums">${total}</span>
                    </div>
                    <p className="text-zinc-600 text-[10px] font-mono mt-2">FREE SHIPPING INCLUDED</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form + Payment */}
            <div className="md:col-span-3 space-y-6">
              <AnimatePresence mode="wait">
                {showCryptoPayment ? (
                  <CryptoPaymentPanel
                    key="crypto-payment"
                    amount={total}
                    orderId={cryptoOrderId}
                  />
                ) : (
                  <motion.form
                    key="checkout-form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Payment method toggle */}
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-3">
                        PAYMENT METHOD
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("stripe")}
                          className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                            paymentMethod === "stripe"
                              ? "border-[#39ff14] bg-[#39ff14]/5 text-white"
                              : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span className="text-sm font-bold">CARD</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("encrypto")}
                          className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                            paymentMethod === "encrypto"
                              ? "border-[#39ff14] bg-[#39ff14]/5 text-white"
                              : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm font-bold">CRYPTO</span>
                        </button>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
                        EMAIL
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                        className={inputClass}
                        style={{ fontSize: "16px" }}
                      />
                    </div>

                    {/* Shipping */}
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
                        SHIPPING ADDRESS
                      </label>
                      <div className="space-y-3">
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Full name"
                          required
                          className={inputClass}
                        />
                        <input
                          type="text"
                          name="address1"
                          value={form.address1}
                          onChange={handleChange}
                          placeholder="Address line 1"
                          required
                          className={inputClass}
                        />
                        <input
                          type="text"
                          name="address2"
                          value={form.address2}
                          onChange={handleChange}
                          placeholder="Address line 2 (optional)"
                          className={inputClass}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            placeholder="City"
                            required
                            className={inputClass}
                          />
                          <input
                            type="text"
                            name="state"
                            value={form.state}
                            onChange={handleChange}
                            placeholder="State"
                            required
                            className={inputClass}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            name="zip"
                            value={form.zip}
                            onChange={handleChange}
                            placeholder="ZIP code"
                            required
                            className={inputClass}
                          />
                          <select
                            name="country"
                            value={form.country}
                            onChange={handleChange}
                            className={inputClass}
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="GB">United Kingdom</option>
                            <option value="AU">Australia</option>
                            <option value="DE">Germany</option>
                            <option value="FR">France</option>
                            <option value="BR">Brazil</option>
                            <option value="AR">Argentina</option>
                            <option value="MX">Mexico</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-4 border-t border-zinc-800/50">
                      <Button
                        type="submit"
                        variant="neon"
                        size="xl"
                        className="w-full text-base"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            PROCESSING...
                          </>
                        ) : paymentMethod === "stripe" ? (
                          <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            PAY ${total} WITH CARD
                          </>
                        ) : (
                          <>
                            <Wallet className="w-5 h-5 mr-2" />
                            PAY {total} USDC
                          </>
                        )}
                      </Button>
                      <p className="text-zinc-600 text-[10px] font-mono text-center mt-3">
                        {paymentMethod === "stripe"
                          ? "SECURE CHECKOUT POWERED BY STRIPE"
                          : `${total} USDC ON BASE — POWERED BY ENCRYPTO`}
                      </p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
