"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, Clock, DollarSign } from "lucide-react"

interface MarketHeaderProps {
  title: string
  volume: string
  liquidity: string
  timeLeft: string
  category?: string
}

export function MarketHeader({ title, volume, liquidity, timeLeft, category }: MarketHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-4 glass rounded-xl border-l-4 border-primary">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl md:text-2xl font-bold truncate max-w-2xl" title={title}>
            {title}
          </h1>
          {category && <Badge variant="secondary" className="text-xs">{category}</Badge>}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
          <div>Solana Devnet</div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex flex-col items-end">
          <div className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wider">
            <DollarSign className="w-3 h-3" /> Volume
          </div>
          <div className="font-mono font-bold">{volume} SOL</div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wider">
            <Users className="w-3 h-3" /> Liquidity
          </div>
          <div className="font-mono font-bold">{liquidity} SOL</div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wider">
            <Clock className="w-3 h-3" /> Time Left
          </div>
          <div className="font-mono font-bold text-secondary">{timeLeft}</div>
        </div>
      </div>
    </div>
  )
}

