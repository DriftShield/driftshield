import type React from "react"
import type { Metadata } from "next"
import { Inter, Manrope, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { WalletProvider } from "@/lib/wallet-context"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

export const metadata: Metadata = {
  title: "DriftShield - Insure Your AI. Predict the Future.",
  description: "Monitor AI model drift, trade prediction markets, and protect your models with insurance on Solana",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}>
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-900/10 blur-[120px] rounded-full"></div>
        </div>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
