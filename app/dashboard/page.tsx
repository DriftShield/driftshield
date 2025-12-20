"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, DollarSign, ArrowUpRight, Plus, Trophy, Activity } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const { connected, publicKey } = useWallet()
  const [stats, setStats] = useState({
    activeBets: 0,
    totalStaked: 0,
    potentialWinnings: 0,
    marketsParticipated: 0
  })

  useEffect(() => {
    if (connected && publicKey) {
      // Fetch user stats from on-chain data
      fetchUserStats()
    }
  }, [connected, publicKey])

  const fetchUserStats = async () => {
    // TODO: Implement real on-chain data fetching
    // For now, showing placeholder that will be replaced with real data
    setStats({
      activeBets: 0,
      totalStaked: 0,
      potentialWinnings: 0,
      marketsParticipated: 0
    })
  }

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-cyan-900/30 selection:text-cyan-200">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-8 py-8 space-y-8 animate-enter">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-medium text-white font-heading tracking-tight">Dashboard</h1>
            <p className="text-zinc-400 mt-2 font-light">Track your prediction markets and betting activity</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" className="gap-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-medium shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]" asChild>
              <Link href="/dashboard/markets">
                <Plus className="w-4 h-4" />
                Browse Markets
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {!connected ? (
          <Card className="glass-card p-12 text-center border-dashed border-white/10 bg-zinc-900/30">
            <p className="text-zinc-400 mb-6 font-light text-lg">Connect your wallet to view your dashboard</p>
            <Button asChild className="bg-white text-black hover:bg-zinc-200">
              <Link href="/dashboard/markets">Browse Markets</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card p-6 space-y-4 hover:border-cyan-500/30 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Active Bets</span>
                <div className="p-2 bg-zinc-900 rounded-md border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                    <Activity className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium text-white">{stats.activeBets}</div>
                <div className="text-xs text-zinc-500">In open markets</div>
              </div>
            </Card>

            <Card className="glass-card p-6 space-y-4 hover:border-cyan-500/30 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Total Staked</span>
                <div className="p-2 bg-zinc-900 rounded-md border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium text-white">{stats.totalStaked} SOL</div>
                <div className="text-xs text-zinc-500">Across all markets</div>
              </div>
            </Card>

            <Card className="glass-card p-6 space-y-4 hover:border-cyan-500/30 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Potential Winnings</span>
                <div className="p-2 bg-zinc-900 rounded-md border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium text-white">{stats.potentialWinnings} SOL</div>
                <div className="text-xs text-zinc-500">If all bets win</div>
              </div>
            </Card>

            <Card className="glass-card p-6 space-y-4 hover:border-cyan-500/30 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Markets</span>
                <div className="p-2 bg-zinc-900 rounded-md border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                    <Trophy className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium text-white">{stats.marketsParticipated}</div>
                <div className="text-xs text-zinc-500">Participated in</div>
              </div>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="glass-card p-8 bg-zinc-900/20">
          <h2 className="text-xl font-medium text-white mb-6 font-heading">Quick Actions</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Button variant="outline" className="w-full justify-start gap-4 h-auto py-6 bg-zinc-950/50 border-white/5 hover:bg-zinc-900 hover:border-cyan-500/30 transition-all group" asChild>
              <Link href="/dashboard/markets">
                <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/20 transition-colors">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-white text-base">Browse Markets</div>
                  <div className="text-xs text-zinc-500 mt-1">Place bets on events</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="w-full justify-start gap-4 h-auto py-6 bg-zinc-950/50 border-white/5 hover:bg-zinc-900 hover:border-cyan-500/30 transition-all group" asChild>
              <Link href="/dashboard/wallet">
                <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/20 transition-colors">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-white text-base">View Wallet</div>
                  <div className="text-xs text-zinc-500 mt-1">Manage funds & payouts</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="w-full justify-start gap-4 h-auto py-6 bg-zinc-950/50 border-white/5 hover:bg-zinc-900 hover:border-cyan-500/30 transition-all group" asChild>
              <Link href="/dashboard/leaderboard">
                <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/20 transition-colors">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-white text-base">Leaderboard</div>
                  <div className="text-xs text-zinc-500 mt-1">View top traders</div>
                </div>
              </Link>
            </Button>
          </div>
        </Card>
        </div>
      </div>
    </div>
  )
}
