"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MOCK_PRODUCTS } from "@/lib/mock-products"
import { SIZES, SPRING, type SizeKey } from "@/lib/constants"
import { toast } from "sonner"

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productSlug = searchParams.get("product")
  const sizeParam = (searchParams.get("size") || "small") as SizeKey

  const product = MOCK_PRODUCTS.find(p => p.slug === productSlug)
  const [loading, setLoading] = useState(false)

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

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white mb-2">NO PRODUCT SELECTED</h1>
          <Link href="/" className="text-[#39ff14] font-mono text-sm hover:underline">
            BACK TO DROPS
          </Link>
        </div>
      </div>
    )
  }

  const price = SIZES[sizeParam].price

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.name || !form.address1 || !form.city || !form.state || !form.zip) {
      toast.error("Please fill in all required fields")
      return
    }
    setLoading(true)

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          product_slug: product.slug,
          size: sizeParam,
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
              <div className="sticky top-24 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                  <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{product.title}</h3>
                <p className="text-zinc-500 text-xs font-mono mb-3">{SIZES[sizeParam].label}</p>
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                  <span className="text-zinc-500 text-xs font-mono">TOTAL</span>
                  <span className="text-white font-black text-xl">${price}</span>
                </div>
                <p className="text-zinc-600 text-[10px] font-mono mt-2">FREE SHIPPING INCLUDED</p>
              </div>
            </div>

            {/* Shipping form */}
            <form onSubmit={handleSubmit} className="md:col-span-3 space-y-6">
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
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      PAY ${price} WITH CARD
                    </>
                  )}
                </Button>
                <p className="text-zinc-600 text-[10px] font-mono text-center mt-3">
                  SECURE CHECKOUT POWERED BY STRIPE
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  )
}
