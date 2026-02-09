"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMarketTheses, AgentThesis } from "@/lib/agents/agent-profiles"
import { Bot, TrendingUp, TrendingDown, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 10) return "just now"
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function agentColorClasses(color: string) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: "bg-red-950/20", text: "text-red-400", border: "border-red-500/30" },
    blue: { bg: "bg-blue-950/20", text: "text-blue-400", border: "border-blue-500/30" },
    orange: { bg: "bg-orange-950/20", text: "text-orange-400", border: "border-orange-500/30" },
    purple: { bg: "bg-purple-950/20", text: "text-purple-400", border: "border-purple-500/30" },
    green: { bg: "bg-green-950/20", text: "text-green-400", border: "border-green-500/30" },
    cyan: { bg: "bg-cyan-950/20", text: "text-cyan-400", border: "border-cyan-500/30" },
  }
  return map[color] || map.red
}

interface AgentThesisFeedProps {
  marketId: string
  compact?: boolean
  maxItems?: number
}

export function AgentThesisFeed({ marketId, compact = false, maxItems }: AgentThesisFeedProps) {
  const [theses, setTheses] = useState<AgentThesis[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const data = getMarketTheses(marketId)
    setTheses(maxItems ? data.slice(0, maxItems) : data)
  }, [marketId, maxItems])

  if (theses.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-xs text-zinc-600 font-mono uppercase">No agent theses yet</p>
      </div>
    )
  }

  // Compact mode for market cards
  if (compact) {
    return (
      <div className="space-y-2">
        {theses.slice(0, 2).map((thesis) => {
          const c = agentColorClasses(thesis.agentColor)
          return (
            <div key={thesis.id} className="flex items-start gap-2 p-2 bg-white/[0.02] border border-white/[0.04] cut-corners-sm">
              <div className={`w-6 h-6 ${c.bg} border ${c.border} flex items-center justify-center shrink-0 text-[10px] font-bold font-mono ${c.text}`}>
                {thesis.agentName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-zinc-300">{thesis.agentName}</span>
                  <span className={`text-[9px] font-mono font-bold px-1 ${
                    thesis.position === "YES" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                  }`}>
                    {thesis.position}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-600">{(thesis.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono leading-tight truncate">{thesis.thesis}</p>
              </div>
            </div>
          )
        })}
        {theses.length > 2 && (
          <p className="text-[9px] text-zinc-600 font-mono text-center">+{theses.length - 2} more theses</p>
        )}
      </div>
    )
  }

  // Full mode for market detail page
  return (
    <div className="space-y-3">
      {theses.map((thesis) => {
        const c = agentColorClasses(thesis.agentColor)
        const isExpanded = expandedId === thesis.id
        return (
          <div
            key={thesis.id}
            className={`border border-white/[0.06] bg-white/[0.02] transition-all cut-corners-sm hover:border-white/10 ${
              isExpanded ? "border-white/10" : ""
            }`}
          >
            {/* Thesis Header */}
            <div
              className="flex items-start gap-3 p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : thesis.id)}
            >
              <div className={`w-10 h-10 ${c.bg} border ${c.border} flex items-center justify-center shrink-0 cut-corners-sm`}>
                <span className={`text-sm font-bold font-mono ${c.text}`}>{thesis.agentName[0]}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-sm font-mono font-bold text-white">{thesis.agentName}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 ${
                    thesis.position === "YES"
                      ? "text-green-400 bg-green-500/10 border border-green-500/20"
                      : "text-red-400 bg-red-500/10 border border-red-500/20"
                  }`}>
                    {thesis.position === "YES" ? (
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{thesis.position}</span>
                    ) : (
                      <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" />{thesis.position}</span>
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Confidence: <span className={`font-bold ${
                      thesis.confidence >= 0.8 ? "text-green-400" : thesis.confidence >= 0.6 ? "text-yellow-400" : "text-zinc-400"
                    }`}>{(thesis.confidence * 100).toFixed(0)}%</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 ml-auto">{timeAgo(thesis.timestamp)}</span>
                </div>
                <p className="text-xs text-zinc-400 font-mono leading-relaxed">{thesis.thesis}</p>
              </div>

              <div className="shrink-0 mt-1">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-600" />
                )}
              </div>
            </div>

            {/* Expanded Reasoning */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 ml-[52px] space-y-3 border-t border-white/5 mt-0 pt-3">
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Reasoning</h4>
                  <p className="text-xs text-zinc-400 font-mono leading-relaxed">{thesis.reasoning}</p>
                </div>
                {thesis.sources && thesis.sources.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Data Sources</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {thesis.sources.map((src) => (
                        <span key={src} className="text-[9px] px-2 py-0.5 font-mono bg-zinc-900 border border-white/5 text-zinc-400">
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
