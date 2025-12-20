"use client"

import { useState } from "react"

export function StatsTicker() {
  const [stats] = useState({
    models: 2847,
    checks: 1453892,
    markets: 583,
    volume: 3.8,
  })

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
      <div className="text-center group">
        <div className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors font-mono">{stats.models.toLocaleString('en-US')}</div>
        <div className="text-zinc-500 uppercase tracking-wider text-xs mt-1">Total Bets</div>
      </div>
      <div className="hidden sm:block w-px h-8 bg-white/10" />
      <div className="text-center group">
        <div className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors font-mono">{stats.checks.toLocaleString('en-US')}</div>
        <div className="text-zinc-500 uppercase tracking-wider text-xs mt-1">Active Traders</div>
      </div>
      <div className="hidden sm:block w-px h-8 bg-white/10" />
      <div className="text-center group">
        <div className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors font-mono">{stats.markets.toLocaleString('en-US')}</div>
        <div className="text-zinc-500 uppercase tracking-wider text-xs mt-1">Active Markets</div>
      </div>
      <div className="hidden sm:block w-px h-8 bg-white/10" />
      <div className="text-center group">
        <div className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors font-mono">${stats.volume.toFixed(1)}M</div>
        <div className="text-zinc-500 uppercase tracking-wider text-xs mt-1">Trading Volume</div>
      </div>
    </div>
  )
}
