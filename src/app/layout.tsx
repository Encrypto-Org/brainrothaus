import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "BRAINROTHAUS — Limited Edition AI Tapestries",
  description: "AI-generated tapestries inspired by internet culture. Limited drops. When the trend dies, the drop dies.",
  openGraph: {
    title: "BRAINROTHAUS",
    description: "Limited edition AI-generated tapestries. Ironic luxury for the chronically online.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BRAINROTHAUS",
    description: "Limited edition AI-generated tapestries. When the trend dies, the drop dies.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-white`}
      >
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(24, 24, 27, 0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#fafafa",
            },
          }}
        />
      </body>
    </html>
  )
}
