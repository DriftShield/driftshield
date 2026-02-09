"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 animate-enter" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center gap-1 p-2 bg-black/80 border border-white/10 backdrop-blur-xl shadow-2xl shadow-red-900/10 cut-corners">
        <Link href="/" className="flex items-center justify-center w-[40px] h-[40px] bg-zinc-900 border border-white/5 hover:border-red-500/30 transition-colors group cut-corners-sm">
          <div className="w-4 h-4 bg-zinc-200 group-hover:bg-red-400 transition-colors mask-icon font-bold flex items-center justify-center text-[10px] text-black font-mono">P</div>
        </Link>

        <div className="hidden md:flex items-center px-2 gap-1 text-sm font-medium text-zinc-400 font-mono uppercase tracking-wide">
          <Link href="/dashboard" className="px-4 py-2 hover:text-red-300 transition-colors">Dashboard</Link>
          <Link href="/dashboard/markets" className="px-4 py-2 hover:text-red-300 transition-colors">Markets</Link>
          <Link href="/dashboard/leaderboard" className="px-4 py-2 hover:text-red-300 transition-colors">Leaderboard</Link>
        </div>

        <div className="flex items-center gap-2 ml-2">
           <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_-5px_rgba(220,38,38,0.4)] cut-corners-sm font-mono text-xs uppercase tracking-wider">
             <Link href="/dashboard">Dashboard</Link>
           </Button>
            <Button variant="ghost" size="icon" className="md:hidden text-zinc-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-4 right-4 mt-2 p-4 bg-black/90 border border-white/10 backdrop-blur-xl flex flex-col gap-2 cut-corners">
            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-red-300 hover:bg-white/5 transition-colors font-mono uppercase" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            <Link href="/dashboard/markets" className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-red-300 hover:bg-white/5 transition-colors font-mono uppercase" onClick={() => setMobileMenuOpen(false)}>Markets</Link>
            <Link href="/dashboard/leaderboard" className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-red-300 hover:bg-white/5 transition-colors font-mono uppercase" onClick={() => setMobileMenuOpen(false)}>Leaderboard</Link>
        </div>
      )}
    </nav>
  )
}
