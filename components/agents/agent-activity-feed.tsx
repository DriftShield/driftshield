"use client"

import { useState, useEffect } from "react"
import { getDemoActions } from "@/lib/agents/demo-feed"
import type { AgentAction } from "@/lib/agents/types"

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function actionTypeColor(type: AgentAction["type"]): string {
  switch (type) {
    case "monitor": return "bg-blue-500/10 text-blue-400 border-blue-500/30"
    case "analyze": return "bg-purple-500/10 text-purple-400 border-purple-500/30"
    case "create_market": return "bg-green-500/10 text-green-400 border-green-500/30"
    case "trade": return "bg-red-500/10 text-red-400 border-red-500/30"
    case "resolve": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
    case "claim": return "bg-orange-500/10 text-orange-400 border-orange-500/30"
    default: return "bg-white/5 text-zinc-400 border-white/10"
  }
}

function actionTypeLabel(type: AgentAction["type"]): string {
  switch (type) {
    case "monitor": return "SCAN"
    case "analyze": return "ANALYZE"
    case "create_market": return "CREATE"
    case "trade": return "TRADE"
    case "resolve": return "RESOLVE"
    case "claim": return "CLAIM"
    default: return type.toUpperCase()
  }
}

export function AgentActivityFeed() {
  const [actions, setActions] = useState<AgentAction[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setActions(getDemoActions(15))
    const interval = setInterval(() => {
      setActions((prev) => {
        const newActions = getDemoActions(1)
        return [...newActions, ...prev].slice(0, 20)
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  if (!isClient) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm animate-pulse">Connecting to agent network...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="max-h-[280px] overflow-hidden space-y-2 py-4">
        {actions.slice(0, 10).map((action, index) => (
          <div key={action.id}
            className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.02] border border-white/[0.05] hover:border-red-500/30 transition-all group cut-corners-sm"
            style={{ opacity: Math.max(0.3, 1 - index * 0.08) }}>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${actionTypeColor(action.type)}`}>
              {actionTypeLabel(action.type)}
            </span>
            <span className="text-sm text-zinc-300 flex-1 truncate group-hover:text-white transition-colors font-mono">
              {action.description}
            </span>
            <span className="text-xs text-zinc-600 font-mono whitespace-nowrap">
              {timeAgo(action.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
