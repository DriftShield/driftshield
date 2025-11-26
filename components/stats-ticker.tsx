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
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{stats.models.toLocaleString('en-US')}</div>
        <div className="text-muted-foreground">Total Bets</div>
      </div>
      <div className="hidden sm:block w-px h-8 bg-border" />
      <div className="text-center">
        <div className="text-2xl font-bold text-secondary">{stats.checks.toLocaleString('en-US')}</div>
        <div className="text-muted-foreground">Active Traders</div>
      </div>
      <div className="hidden sm:block w-px h-8 bg-border" />
      <div className="text-center">
        <div className="text-2xl font-bold text-accent">{stats.markets.toLocaleString('en-US')}</div>
        <div className="text-muted-foreground">Active Markets</div>
      </div>
      <div className="hidden sm:block w-px h-8 bg-border" />
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">${stats.volume.toFixed(1)}M</div>
        <div className="text-muted-foreground">Trading Volume</div>
      </div>
    </div>
  )
}
