"use client"

import { useState, useEffect } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AgentActivityFeed } from "@/components/agents/agent-activity-feed"
import { AGENT_PROFILES, AgentProfile } from "@/lib/agents/agent-profiles"
import {
  Bot, Activity, TrendingUp, Zap, Brain, Eye, Radio,
  Target, BarChart3, Clock, ChevronRight, Cpu,
} from "lucide-react"

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 10) return "just now"
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function statusColor(status: AgentProfile["status"]) {
  switch (status) {
    case "online": return "bg-green-500"
    case "processing": return "bg-yellow-500"
    case "idle": return "bg-zinc-500"
  }
}

function statusLabel(status: AgentProfile["status"]) {
  switch (status) {
    case "online": return "ONLINE"
    case "processing": return "PROCESSING"
    case "idle": return "IDLE"
  }
}

function agentColorClasses(color: string) {
  const map: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    red: { bg: "bg-red-950/20", text: "text-red-400", border: "border-red-500/30", glow: "shadow-red-500/10" },
    blue: { bg: "bg-blue-950/20", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/10" },
    orange: { bg: "bg-orange-950/20", text: "text-orange-400", border: "border-orange-500/30", glow: "shadow-orange-500/10" },
    purple: { bg: "bg-purple-950/20", text: "text-purple-400", border: "border-purple-500/30", glow: "shadow-purple-500/10" },
    green: { bg: "bg-green-950/20", text: "text-green-400", border: "border-green-500/30", glow: "shadow-green-500/10" },
    cyan: { bg: "bg-cyan-950/20", text: "text-cyan-400", border: "border-cyan-500/30", glow: "shadow-cyan-500/10" },
  }
  return map[color] || map.red
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(interval)
  }, [])

  const totalTrades = AGENT_PROFILES.reduce((s, a) => s + a.stats.totalTrades, 0)
  const totalVolume = AGENT_PROFILES.reduce((s, a) => s + a.stats.volume, 0)
  const totalPnl = AGENT_PROFILES.reduce((s, a) => s + a.stats.pnl, 0)
  const onlineCount = AGENT_PROFILES.filter((a) => a.status !== "idle").length

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white font-heading uppercase tracking-tight flex items-center gap-3">
                <Cpu className="w-8 h-8 text-red-500" />
                Agent Network
              </h1>
              <p className="text-zinc-500 mt-1 font-mono text-sm uppercase">
                {AGENT_PROFILES.length} Autonomous Agents // {onlineCount} Active
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-green-500/20 bg-green-950/10 cut-corners-sm">
              <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-green-400 uppercase">Network Healthy</span>
            </div>
          </div>

          {/* Network Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Total Agents</div>
              <div className="text-2xl font-bold text-white font-mono">{AGENT_PROFILES.length}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
                <span className="text-[10px] text-green-400 font-mono">{onlineCount} ACTIVE</span>
              </div>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Total Trades</div>
              <div className="text-2xl font-bold text-white font-mono">{totalTrades.toLocaleString()}</div>
              <span className="text-[10px] text-zinc-500 font-mono">ACROSS ALL AGENTS</span>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Total Volume</div>
              <div className="text-2xl font-bold text-white font-mono">{totalVolume.toFixed(1)} SOL</div>
              <span className="text-[10px] text-zinc-500 font-mono">COMBINED</span>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Network P&L</div>
              <div className="text-2xl font-bold text-green-400 font-mono">+{totalPnl.toFixed(1)} SOL</div>
              <span className="text-[10px] text-green-400/60 font-mono">PROFITABLE</span>
            </Card>
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENT_PROFILES.map((agent) => {
              const c = agentColorClasses(agent.color)
              return (
                <Card
                  key={agent.id}
                  className={`bg-zinc-950 border border-white/10 p-0 cut-corners group cursor-pointer hover:border-white/20 transition-all ${
                    selectedAgent?.id === agent.id ? `border-white/30 shadow-lg ${c.glow}` : ""
                  }`}
                  onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                >
                  {/* Agent Header */}
                  <div className={`px-6 pt-6 pb-4 border-b border-white/5`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${c.bg} border ${c.border} flex items-center justify-center cut-corners-sm`}>
                          <span className={`text-lg font-bold font-mono ${c.text}`}>{agent.avatar}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white font-heading uppercase">{agent.name}</h3>
                          <p className="text-[10px] text-zinc-500 font-mono uppercase">{agent.strategy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 ${statusColor(agent.status)} ${agent.status !== "idle" ? "animate-pulse" : ""}`} />
                        <span className="text-[10px] font-mono text-zinc-500">{statusLabel(agent.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b border-white/5">
                    <div>
                      <div className="text-[10px] text-zinc-600 font-mono uppercase">Win Rate</div>
                      <div className={`text-sm font-bold font-mono ${agent.stats.winRate >= 65 ? "text-green-400" : agent.stats.winRate >= 55 ? "text-yellow-400" : "text-red-400"}`}>
                        {agent.stats.winRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 font-mono uppercase">P&L</div>
                      <div className="text-sm font-bold font-mono text-green-400">+{agent.stats.pnl} SOL</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 font-mono uppercase">Trades</div>
                      <div className="text-sm font-bold font-mono text-white">{agent.stats.totalTrades}</div>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="px-6 py-3 border-b border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      {agent.specialties.map((s) => (
                        <span key={s} className={`text-[9px] px-2 py-0.5 font-mono uppercase ${c.bg} ${c.text} border ${c.border}`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Last Action */}
                  <div className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-zinc-500 font-mono truncate flex-1 mr-2">{agent.lastAction}</p>
                      <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap">{timeAgo(agent.lastActionTime)}</span>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {selectedAgent?.id === agent.id && (
                    <div className="px-6 py-4 border-t border-white/10 bg-zinc-900/30 space-y-3">
                      <p className="text-xs text-zinc-400 font-mono leading-relaxed">{agent.description}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-600 font-mono uppercase">Volume</span>
                          <span className="text-xs text-white font-mono">{agent.stats.volume} SOL</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-600 font-mono uppercase">Markets Made</span>
                          <span className="text-xs text-white font-mono">{agent.stats.marketsCreated}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-600 font-mono uppercase">Avg Confidence</span>
                          <span className="text-xs text-white font-mono">{(agent.stats.avgConfidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-600 font-mono uppercase">Uptime</span>
                          <span className="text-xs text-white font-mono">{agent.uptime}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Live Feed */}
          <Card className="bg-zinc-950 border border-white/10 p-8 cut-corners">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white font-heading uppercase tracking-wide">Live Agent Feed</h2>
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
