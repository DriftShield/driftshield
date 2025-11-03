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
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your prediction markets and betting activity</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/dashboard/markets">
                <Plus className="w-4 h-4" />
                Browse Markets
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {!connected ? (
          <Card className="glass p-8 text-center">
            <p className="text-muted-foreground mb-4">Connect your wallet to view your dashboard</p>
            <Button asChild>
              <Link href="/dashboard/markets">Browse Markets</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Bets</span>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">{stats.activeBets}</div>
                <div className="text-xs text-muted-foreground">In open markets</div>
              </div>
            </Card>

            <Card className="glass p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Staked</span>
                <DollarSign className="w-4 h-4 text-secondary" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">{stats.totalStaked} SOL</div>
                <div className="text-xs text-muted-foreground">Across all markets</div>
              </div>
            </Card>

            <Card className="glass p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Potential Winnings</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">{stats.potentialWinnings} SOL</div>
                <div className="text-xs text-muted-foreground">If all bets win</div>
              </div>
            </Card>

            <Card className="glass p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Markets</span>
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">{stats.marketsParticipated}</div>
                <div className="text-xs text-muted-foreground">Participated in</div>
              </div>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="glass p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 bg-transparent" asChild>
              <Link href="/dashboard/markets">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">Browse Markets</div>
                  <div className="text-xs text-muted-foreground">Place bets</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 bg-transparent" asChild>
              <Link href="/dashboard/wallet">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-secondary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">View Wallet</div>
                  <div className="text-xs text-muted-foreground">Manage funds</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 bg-transparent" asChild>
              <Link href="/dashboard/leaderboard">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">Leaderboard</div>
                  <div className="text-xs text-muted-foreground">Top traders</div>
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
