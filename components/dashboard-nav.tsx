"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Trophy,
  Settings,
  Menu,
  X,
  ChevronRight,
  Zap,
  Activity,
  BarChart3,
  Book,
  User,
  PieChart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WalletButton } from "@/components/wallet-button"
import { useWallet } from "@/lib/wallet-context"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/markets", label: "Markets", icon: TrendingUp },
  { href: "/dashboard/bets", label: "My Bets", icon: Activity },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/docs", label: "Docs", icon: Book },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useWallet()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-white/10 bg-zinc-950">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-white/10">
            <Link href="/" className="flex items-center justify-center w-8 h-8 bg-zinc-900 border border-white/5 rounded-sm hover:border-cyan-500/30 transition-colors group">
                <div className="text-zinc-200 group-hover:text-cyan-400 transition-colors font-bold text-lg">D</div>
            </Link>
            <span className="text-lg font-medium tracking-tight text-white font-heading">DriftShield</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              // For /dashboard route, only match exact path
              const isActive = item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-cyan-900/10 text-cyan-400 border border-cyan-500/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent",
                  )}
                >
                  <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", isActive ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-300 border-white/5">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-cyan-500/50" />}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/10 bg-zinc-950/50">
            <WalletButton />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-white/10 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center justify-center w-8 h-8 bg-zinc-900 border border-white/5 rounded-sm">
                <div className="text-zinc-200 font-bold text-lg">D</div>
            </Link>
            <span className="text-lg font-bold text-white">DriftShield</span>
          </div>

          <div className="flex items-center gap-2">
            <WalletButton />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-zinc-400 hover:text-white">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-zinc-950 p-4 space-y-1">
            {navItems.map((item) => {
              // For /dashboard route, only match exact path
              const isActive = item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-cyan-900/10 text-cyan-400"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Desktop Content Offset */}
      <div className="hidden lg:block lg:pl-64" />
    </>
  )
}
