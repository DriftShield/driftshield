"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trophy,
  Skull,
  Zap,
} from "lucide-react"

interface AgentProfile {
  agent: {
    id: string
    name: string
    strategy: string | null
    status: string
    is_built_in: boolean
    created_at: string
  }
  wallet: {
    address: string
    balance_sol: number
    network: string
  }
  stats: {
    total_bets: number
    active_bets: number
    resolved_bets: number
    wins: number
    losses: number
    win_rate: number
    claimable: number
    total_invested_sol: number
    markets_created: number
  }
  positions: Position[]
}

interface Position {
  bet_pda: string
  market_id: string
  market_title: string
  outcome_index: number
  outcome_label: string
  amount_sol: number
  bet_index: number
  timestamp: string
  is_claimed: boolean
  market_resolved: boolean
  winning_outcome: number | null
  is_winner: boolean | null
  claimable: boolean
}

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "active" | "won" | "lost">("all")

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/v1/agents/profile?id=${encodeURIComponent(id)}`)
        const data = await res.json()
        if (data.success) {
          setProfile(data)
        } else {
          setError(data.error || "Failed to load agent profile")
        }
      } catch {
        setError("Network error")
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
    const interval = setInterval(fetchProfile, 30000)
    return () => clearInterval(interval)
  }, [id])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const filteredPositions = profile?.positions.filter((p) => {
    if (filter === "active") return !p.market_resolved
    if (filter === "won") return p.is_winner === true
    if (filter === "lost") return p.is_winner === false
    return true
  }) || []

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Back link */}
          <Link
            href="/dashboard/agents"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Agents
          </Link>

          {loading && (
            <div className="text-center py-24">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto mb-4" />
              <p className="text-zinc-500 font-mono text-sm">Loading agent profile...</p>
            </div>
          )}

          {error && (
            <Card className="bg-zinc-950 border border-red-500/30 p-8 cut-corners text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="text-sm font-heading font-bold uppercase text-red-400 mb-2">Error</h3>
              <p className="text-xs text-zinc-500 font-mono">{error}</p>
            </Card>
          )}

          {profile && (
            <>
              {/* Agent Header */}
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 bg-red-950/30 border-2 border-red-500/40 flex items-center justify-center cut-corners-sm flex-shrink-0">
                    <span className="text-2xl font-bold font-mono text-red-400">
                      {profile.agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl font-bold text-white font-heading uppercase tracking-tight truncate">
                      {profile.agent.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 ${profile.agent.status === "active" ? "bg-green-500 animate-pulse" : "bg-zinc-500"}`} />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">{profile.agent.status}</span>
                      </div>
                      {profile.agent.strategy && (
                        <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[300px]">
                          Strategy: {profile.agent.strategy}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-zinc-700 mt-0.5">
                      ID: {profile.agent.id} · Since {new Date(profile.agent.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Wallet Card */}
                <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm md:w-72 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-zinc-600 font-mono uppercase flex items-center gap-1.5">
                      <Wallet className="w-3 h-3" /> Wallet
                    </span>
                    <span className="text-[10px] text-zinc-700 font-mono uppercase">{profile.wallet.network}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(profile.wallet.address, "wallet")}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono hover:text-red-400 transition-colors mb-3 w-full"
                  >
                    <span className="truncate">{profile.wallet.address}</span>
                    <Copy className="w-3 h-3 flex-shrink-0" />
                    {copiedField === "wallet" && <span className="text-green-400 text-[10px] flex-shrink-0">copied</span>}
                  </button>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white font-mono">{profile.wallet.balance_sol.toFixed(4)}</span>
                    <span className="text-xs text-zinc-500 font-mono">SOL</span>
                  </div>
                  <a
                    href={`https://explorer.solana.com/address/${profile.wallet.address}?cluster=${profile.wallet.network === "mainnet-beta" ? "" : "devnet"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-red-400/60 font-mono hover:text-red-400 transition-colors mt-2"
                  >
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </Card>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <StatCard
                  label="Total Bets"
                  value={profile.stats.total_bets}
                  icon={<Target className="w-4 h-4 text-red-400" />}
                />
                <StatCard
                  label="Active"
                  value={profile.stats.active_bets}
                  icon={<Zap className="w-4 h-4 text-yellow-400" />}
                  highlight="yellow"
                />
                <StatCard
                  label="Wins"
                  value={profile.stats.wins}
                  icon={<Trophy className="w-4 h-4 text-green-400" />}
                  highlight="green"
                />
                <StatCard
                  label="Losses"
                  value={profile.stats.losses}
                  icon={<Skull className="w-4 h-4 text-red-400" />}
                  highlight="red"
                />
                <StatCard
                  label="Win Rate"
                  value={`${profile.stats.win_rate}%`}
                  icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
                  highlight={profile.stats.win_rate >= 50 ? "green" : "red"}
                />
              </div>

              {/* P&L Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-zinc-950 border border-white/10 p-5 cut-corners-sm">
                  <div className="text-[10px] text-zinc-600 font-mono uppercase mb-1">Total Invested</div>
                  <div className="text-xl font-bold text-white font-mono">{profile.stats.total_invested_sol.toFixed(3)} SOL</div>
                  <div className="text-[10px] text-zinc-600 font-mono mt-1">
                    Across {profile.stats.total_bets} positions
                  </div>
                </Card>
                <Card className="bg-zinc-950 border border-white/10 p-5 cut-corners-sm">
                  <div className="text-[10px] text-zinc-600 font-mono uppercase mb-1">Claimable Wins</div>
                  <div className="text-xl font-bold text-green-400 font-mono">{profile.stats.claimable}</div>
                  <div className="text-[10px] text-green-400/60 font-mono mt-1">
                    Positions ready to claim
                  </div>
                </Card>
                <Card className="bg-zinc-950 border border-white/10 p-5 cut-corners-sm">
                  <div className="text-[10px] text-zinc-600 font-mono uppercase mb-1">Markets Created</div>
                  <div className="text-xl font-bold text-blue-400 font-mono">{profile.stats.markets_created}</div>
                  <div className="text-[10px] text-zinc-600 font-mono mt-1">
                    By this agent
                  </div>
                </Card>
              </div>

              {/* Positions Section */}
              <Card className="bg-zinc-950 border border-white/10 p-0 cut-corners overflow-hidden">
                {/* Positions Header */}
                <div className="px-5 py-4 border-b border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h2 className="text-lg font-bold text-white font-heading uppercase tracking-wide">
                    Bet History
                  </h2>
                  <div className="flex gap-1">
                    {(["all", "active", "won", "lost"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 text-[10px] font-mono uppercase transition-colors cut-corners-sm ${
                          filter === f
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "text-zinc-500 hover:text-zinc-300 border border-white/5"
                        }`}
                      >
                        {f} {f === "all" ? `(${profile.positions.length})` : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Positions List */}
                {filteredPositions.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Target className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-600 font-mono">
                      {filter === "all" ? "No bets placed yet" : `No ${filter} bets`}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredPositions.map((pos) => (
                      <PositionRow key={pos.bet_pda} position={pos} />
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  highlight?: "green" | "red" | "yellow" | "blue"
}) {
  const colorMap = {
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    blue: "text-blue-400",
  }

  return (
    <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] text-zinc-600 font-mono uppercase">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${highlight ? colorMap[highlight] : "text-white"}`}>
        {value}
      </div>
    </Card>
  )
}

// ── Position Row ──

function PositionRow({ position }: { position: Position }) {
  const getStatusBadge = () => {
    if (!position.market_resolved) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">
          <Clock className="w-3 h-3" /> ACTIVE
        </span>
      )
    }
    if (position.is_winner) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 border border-green-500/20">
          <CheckCircle2 className="w-3 h-3" /> WON
          {position.claimable && !position.is_claimed && " · CLAIMABLE"}
          {position.is_claimed && " · CLAIMED"}
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 border border-red-500/20">
        <XCircle className="w-3 h-3" /> LOST
      </span>
    )
  }

  return (
    <div className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Market info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white font-heading uppercase truncate">
              {position.market_title}
            </h4>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
            <span>Picked: <span className="text-zinc-300">{position.outcome_label}</span></span>
            <span>·</span>
            <span>{new Date(position.timestamp).toLocaleDateString()} {new Date(position.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold text-white font-mono">{position.amount_sol.toFixed(4)} SOL</div>
            <div className="text-[10px] text-zinc-600 font-mono">Bet #{position.bet_index}</div>
          </div>
          {position.is_winner === true && (
            <TrendingUp className="w-4 h-4 text-green-400" />
          )}
          {position.is_winner === false && (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          {position.is_winner === null && (
            <Clock className="w-4 h-4 text-yellow-400" />
          )}
        </div>
      </div>
    </div>
  )
}
