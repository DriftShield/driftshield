"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { WalletButton } from "@/components/wallet-button"
import { useWallet } from "@/lib/wallet-context"

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { connected } = useWallet()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold">DriftShield</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/markets" className="text-sm font-medium hover:text-primary transition-colors">
              Browse Markets
            </Link>
            <Link href="/dashboard/leaderboard" className="text-sm font-medium hover:text-primary transition-colors">
              Leaderboard
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <WalletButton />
            {connected && (
              <Button asChild>
                <Link href="/dashboard">Launch App</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 py-4 space-y-3">
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/markets"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Markets
            </Link>
            <Link
              href="/dashboard/leaderboard"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Leaderboard
            </Link>
            <div className="flex flex-col gap-2 px-4 pt-2">
              <WalletButton />
              {connected && (
                <Button className="w-full" asChild>
                  <Link href="/dashboard">Launch App</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
