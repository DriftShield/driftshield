"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AgentActivityFeed } from "@/components/agents/agent-activity-feed"
import { Bot, Cpu, Copy, UserPlus, ChevronRight } from "lucide-react"

interface RegisteredAgent {
  id: string
  name: string
  strategy: string | null
  status: string
  is_built_in: boolean
  wallet_address: string
  created_at: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<RegisteredAgent[]>([])
  const [counts, setCounts] = useState({ total: 0, builtIn: 0, userCreated: 0 })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/v1/agents/list")
        const data = await res.json()
        if (data.success) {
          setAgents(data.agents)
          setCounts(data.counts)
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    fetchAgents()
    const interval = setInterval(fetchAgents, 15000)
    return () => clearInterval(interval)
  }, [])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const userCreated = agents.filter((a) => !a.is_built_in)

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
                {userCreated.length} Registered Agents // Anyone can create one
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-green-500/20 bg-green-950/10 cut-corners-sm">
              <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-green-400 uppercase">Live from Registry</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Registered Agents</div>
              <div className="text-2xl font-bold text-white font-mono">{userCreated.length}</div>
              <span className="text-[10px] text-zinc-500 font-mono">CREATED VIA API</span>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Active</div>
              <div className="text-2xl font-bold text-green-400 font-mono">{userCreated.filter(a => a.status === "active").length}</div>
              <span className="text-[10px] text-green-400/60 font-mono">ONLINE NOW</span>
            </Card>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-zinc-500 font-mono text-sm">Loading agents from registry...</p>
            </div>
          )}

          {/* Registered Agents */}
          {userCreated.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userCreated.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          )}

          {!loading && userCreated.length === 0 && (
            <Card className="bg-zinc-950 border border-white/10 p-8 cut-corners text-center">
              <UserPlus className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-heading font-bold uppercase text-zinc-400 mb-2">No user-created agents yet</h3>
              <p className="text-xs text-zinc-600 font-mono max-w-md mx-auto">
                Anyone can create an agent via the API. Call POST /api/v1/agents/register to get started.
              </p>
            </Card>
          )}

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

// ── Agent Card Component ──

function AgentCard({
  agent,
  copiedId,
  onCopy,
}: {
  agent: RegisteredAgent
  copiedId: string | null
  onCopy: (text: string, id: string) => void
}) {
  const initial = agent.name.charAt(0).toUpperCase()

  return (
    <Link href={`/dashboard/agents/${agent.id}`} className="block group">
      <Card className="bg-zinc-950 border border-red-500/10 p-0 cut-corners-sm hover:border-red-500/30 transition-all group-hover:shadow-lg group-hover:shadow-red-500/5">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-950/20 border border-red-500/30 flex items-center justify-center cut-corners-sm">
                <span className="text-base font-bold font-mono text-red-400">{initial}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white font-heading uppercase truncate group-hover:text-red-400 transition-colors">{agent.name}</h3>
                <p className="text-[10px] text-zinc-600 font-mono truncate">{agent.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-2 h-2 ${agent.status === "active" ? "bg-green-500 animate-pulse" : "bg-zinc-500"}`} />
              <span className="text-[10px] font-mono text-zinc-500 uppercase">{agent.status}</span>
            </div>
          </div>
        </div>

        {/* Strategy */}
        {agent.strategy && (
          <div className="px-5 py-2 border-b border-white/5">
            <span className="text-[10px] text-zinc-600 font-mono uppercase">Strategy: </span>
            <span className="text-[10px] text-zinc-400 font-mono">{agent.strategy}</span>
          </div>
        )}

        {/* Details */}
        <div className="px-5 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-mono uppercase">Wallet</span>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCopy(agent.wallet_address, agent.id)
              }}
              className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono hover:text-red-400 transition-colors"
            >
              {agent.wallet_address.slice(0, 8)}...{agent.wallet_address.slice(-6)}
              <Copy className="w-3 h-3" />
              {copiedId === agent.id && <span className="text-green-400 ml-1">copied</span>}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-mono uppercase">Created</span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {new Date(agent.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* View Profile Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 font-mono uppercase group-hover:text-zinc-400 transition-colors">View Profile</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-red-400 transition-colors" />
        </div>
      </Card>
    </Link>
  )
}
