"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard, TrendingUp, Trophy, Menu, X, ChevronRight, BarChart3, Book, Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/markets", label: "Markets", icon: TrendingUp },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/docs", label: "Docs", icon: Book },
]

export function DashboardNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-white/10 bg-zinc-950">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-3 h-16 px-6 border-b border-white/10">
            <Link href="/" className="flex items-center justify-center w-8 h-8 bg-red-600 cut-corners-sm hover:bg-red-500 transition-colors group">
                <div className="text-white font-bold text-lg font-mono">P</div>
            </Link>
            <span className="text-lg font-bold tracking-tight text-white font-heading">Predictfy <span className="text-red-400 text-sm">AGENT</span></span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link key={item.href} href={item.href}
                  className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 group font-mono uppercase tracking-wide cut-corners-sm",
                    isActive ? "bg-red-950/20 text-red-400 border border-red-500/20" : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent",
                  )}>
                  <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", isActive ? "text-red-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                  <span className="flex-1 text-xs">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-red-500/50" />}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t border-white/10 bg-zinc-950/50">
            <div className="flex items-center gap-2 px-3 py-2 border border-white/5 bg-zinc-900/50 cut-corners-sm">
              <div className="w-2 h-2 bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase">6 Agents Online</span>
            </div>
          </div>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-white/10 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center justify-center w-8 h-8 bg-red-600 cut-corners-sm">
                <div className="text-white font-bold text-lg font-mono">P</div>
            </Link>
            <span className="text-lg font-bold text-white font-heading">Predictfy <span className="text-red-400 text-sm">AGENT</span></span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-zinc-400 hover:text-white">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-zinc-950 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors font-mono uppercase",
                    isActive ? "bg-red-950/20 text-red-400" : "text-zinc-400 hover:bg-white/5 hover:text-white",
                  )}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </header>
      <div className="hidden lg:block lg:pl-64" />
    </>
  )
}
