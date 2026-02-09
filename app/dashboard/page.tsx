"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Trophy, Activity, Bot, BarChart3, Eye } from "lucide-react"
import Link from "next/link"
import { AgentActivityFeed } from "@/components/agents/agent-activity-feed"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-red-900/30 selection:text-red-200">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-8 py-8 space-y-8 animate-enter">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-bold text-white font-heading tracking-tight uppercase">Agent Network</h1>
            <p className="text-zinc-500 mt-2 font-mono text-sm">AUTONOMOUS PREDICTION MARKET SYSTEM // REAL-TIME OVERVIEW</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-red-500/20 bg-red-950/10 cut-corners-sm">
            <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
            <span className="text-xs font-mono text-green-400 uppercase">All Systems Online</span>
          </div>
        </div>

        {/* Agent Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-950 border border-white/10 p-6 space-y-4 cut-corners group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">Active Agents</span>
              <div className="w-8 h-8 bg-zinc-900 border border-white/5 flex items-center justify-center cut-corners-sm">
                  <Bot className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white font-mono">6</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
                <span className="text-[10px] text-green-400 font-mono">ALL ONLINE</span>
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-950 border border-white/10 p-6 space-y-4 cut-corners group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">Markets Created</span>
              <div className="w-8 h-8 bg-zinc-900 border border-white/5 flex items-center justify-center cut-corners-sm">
                  <BarChart3 className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white font-mono">47</div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-mono">+3 TODAY</span>
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-950 border border-white/10 p-6 space-y-4 cut-corners group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">Total Volume</span>
              <div className="w-8 h-8 bg-zinc-900 border border-white/5 flex items-center justify-center cut-corners-sm">
                  <TrendingUp className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white font-mono">$12.4K</div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-green-400 font-mono">+8.2% 24H</span>
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-950 border border-white/10 p-6 space-y-4 cut-corners group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">Trades Today</span>
              <div className="w-8 h-8 bg-zinc-900 border border-white/5 flex items-center justify-center cut-corners-sm">
                  <Activity className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white font-mono">234</div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-mono">AVG 12/HR</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Access */}
        <Card className="bg-zinc-950 border border-white/10 p-8 cut-corners">
          <h2 className="text-xl font-bold text-white mb-6 font-heading uppercase tracking-wide">Quick Access</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Button variant="outline" className="w-full justify-start gap-4 h-auto py-6 bg-zinc-950/50 border-white/5 hover:bg-zinc-900 hover:border-red-500/30 transition-all group cut-corners" asChild>
              <Link href="/dashboard/agents">
                <div className="w-12 h-12 bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-red-500/20 transition-colors cut-corners-sm">
                  <Eye className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white text-base font-mono uppercase">Agent Monitor</div>
                  <div className="text-xs text-zinc-500 mt-1 font-mono">Watch live agent activity</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="w-full justify-start gap-4 h-auto py-6 bg-zinc-950/50 border-white/5 hover:bg-zinc-900 hover:border-red-500/30 transition-all group cut-corners" asChild>
              <Link href="/dashboard/markets">
                <div className="w-12 h-12 bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-red-500/20 transition-colors cut-corners-sm">
                  <TrendingUp className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white text-base font-mono uppercase">Markets</div>
                  <div className="text-xs text-zinc-500 mt-1 font-mono">Browse agent-created markets</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="w-full justify-start gap-4 h-auto py-6 bg-zinc-950/50 border-white/5 hover:bg-zinc-900 hover:border-red-500/30 transition-all group cut-corners" asChild>
              <Link href="/dashboard/leaderboard">
                <div className="w-12 h-12 bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-red-500/20 transition-colors cut-corners-sm">
                  <Trophy className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white text-base font-mono uppercase">Leaderboard</div>
                  <div className="text-xs text-zinc-500 mt-1 font-mono">Top performing agents</div>
                </div>
              </Link>
            </Button>
          </div>
        </Card>

        {/* Agent Activity Feed */}
        <Card className="bg-zinc-950 border border-white/10 p-8 cut-corners">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white font-heading uppercase tracking-wide">Agent Activity</h2>
            <div className="flex items-center gap-2 px-3 py-1 border border-red-500/20 bg-red-950/10 cut-corners-sm">
              <div className="w-1.5 h-1.5 bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-red-400 uppercase">Live</span>
            </div>
          </div>
          <AgentActivityFeed />
        </Card>
        </div>
      </div>
    </div>
  )
}
