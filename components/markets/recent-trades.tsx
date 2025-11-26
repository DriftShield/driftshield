"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"

interface Trade {
  id: string
  outcome: string
  amount: number
  timestamp: number
  txSignature: string
  price?: number // Simulated price if not available
}

interface RecentTradesProps {
  trades: Trade[]
  currentUserAddress?: string
}

export function RecentTrades({ trades, currentUserAddress }: RecentTradesProps) {
  return (
    <Card className="glass flex flex-col h-full">
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-bold text-sm">Recent Trades</h3>
        <Badge variant="outline" className="text-xs font-normal">Live</Badge>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <tr className="text-muted-foreground border-b border-border/50">
              <th className="px-4 py-2 text-left font-medium">Time</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Side</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">Amount (SOL)</th>
              <th className="px-4 py-2 text-right font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No trades yet
                </td>
              </tr>
            ) : (
              trades.map((trade) => {
                const isBuy = true // For now all are buys
                const timeStr = new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                
                return (
                  <tr key={trade.id} className="hover:bg-muted/30 transition-colors border-b border-border/10 last:border-0">
                    <td className="px-4 py-2 text-muted-foreground font-mono">{timeStr}</td>
                    <td className={`px-4 py-2 font-medium ${isBuy ? "text-green-500" : "text-red-500"}`}>
                      {isBuy ? "Buy" : "Sell"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge 
                        variant="outline" 
                        className={`
                          h-5 text-[10px] px-1.5 
                          ${trade.outcome === "YES" 
                            ? "border-green-500/30 text-green-500 bg-green-500/5" 
                            : "border-red-500/30 text-red-500 bg-red-500/5"}
                        `}
                      >
                        {trade.outcome}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                      {(trade.price || 0.50).toFixed(2)}¢
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {trade.amount.toFixed(3)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={`https://solscan.io/tx/${trade.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-end text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

