import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { WalletProvider } from "@/lib/wallet-context"

const inter = Inter({ subsets: ["latin"] })

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
    <html lang="en" className="dark">
      <body className={`${inter.className} font-sans antialiased`}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
