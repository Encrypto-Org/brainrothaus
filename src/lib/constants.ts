export const SITE_NAME = "BRAINROTHAUS"
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://brainrothaus.com"

export const SPRING = { type: "spring" as const, stiffness: 200, damping: 24 }
export const SPRING_BOUNCY = { type: "spring" as const, stiffness: 300, damping: 20 }

export const SIZES = {
  small: { label: '36"×36"', price: 49 },
  large: { label: '51"×60"', price: 69 },
  sigma: { label: '68"×80" SIGMA EDITION', price: 89 },
} as const

export type SizeKey = keyof typeof SIZES

export const ACTIVITY_FEED = [
  { name: "chad_thundercock", action: "just copped", item: "Terachad Ascension", time: "2s ago" },
  { name: "sigma.sol", action: "just copped", item: "Lone Wolf Protocol", time: "8s ago" },
  { name: "mewing_master42", action: "just copped", item: "Jawline Renaissance", time: "15s ago" },
  { name: "0xSkibidi", action: "just copped", item: "Toilet Dimension", time: "32s ago" },
  { name: "gymbro_alex", action: "just copped", item: "Iron Temple Deity", time: "1m ago" },
  { name: "aura_farmer", action: "just copped", item: "Aura Maximizer", time: "2m ago" },
  { name: "looksmaxKing", action: "just copped", item: "Mewing Cathedral", time: "3m ago" },
  { name: "rizzler.eth", action: "just copped", item: "Supreme Rizz Tapestry", time: "4m ago" },
]
