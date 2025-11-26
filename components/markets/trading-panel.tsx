"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, DollarSign, Wallet, AlertCircle } from "lucide-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

interface TradingPanelProps {
  outcomes: string[]
  outcomePrices: string[]
  selectedOutcome: string | null
  onOutcomeSelect: (outcome: string) => void
  betAmount: number
  onAmountChange: (amount: number) => void
  onPlaceBet: () => void
  isPlacingBet: boolean
  isExpired: boolean
  connected: boolean
  x402Status?: {
    isPaying: boolean
    isPlacingBet: boolean
    x402Signature?: string
  }
}

export function TradingPanel({
  outcomes,
  outcomePrices,
  selectedOutcome,
  onOutcomeSelect,
  betAmount,
  onAmountChange,
  onPlaceBet,
  isPlacingBet,
  isExpired,
  connected,
  x402Status
}: TradingPanelProps) {
  const [customAmount, setCustomAmount] = useState(betAmount.toString())
  const [activeTab, setActiveTab] = useState("buy")

  const handleAmountChange = (val: string) => {
    setCustomAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      onAmountChange(num)
    }
  }

  const getOutcomeColor = (index: number) => {
    const colors = [
      { text: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500' },
      { text: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500' },
      { text: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-500' }
    ]
    return colors[index % colors.length]
  }

  // Default to first outcome if none selected
  const activeOutcomeIndex = selectedOutcome 
    ? outcomes.indexOf(selectedOutcome)
    : 0
  
  const activePrice = parseFloat(outcomePrices[activeOutcomeIndex] || "0.5")
  const activeColor = getOutcomeColor(activeOutcomeIndex)

  return (
    <Card className="glass p-4 h-full flex flex-col border-l border-border/50 rounded-none md:rounded-xl">
      <Tabs defaultValue="buy" className="w-full flex-1 flex flex-col" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="buy" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500">
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500" disabled>
            Sell (Coming Soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="flex-1 flex flex-col space-y-6">
          {/* Outcome Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {outcomes.map((outcome, idx) => {
                const price = parseFloat(outcomePrices[idx])
                const color = getOutcomeColor(idx)
                const isSelected = selectedOutcome === outcome || (!selectedOutcome && idx === 0)
                
                return (
                  <button
                    key={outcome}
                    onClick={() => onOutcomeSelect(outcome)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left relative overflow-hidden
                      ${isSelected 
                        ? `${color.border} ${color.bg}/10` 
                        : "border-border/50 hover:border-border bg-background/50"}
                    `}
                  >
                    <div className="flex justify-between items-end relative z-10">
                      <span className={`font-bold ${isSelected ? color.text : 'text-muted-foreground'}`}>
                        {outcome}
                      </span>
                      <span className="text-lg font-mono">
                        {(price * 100).toFixed(0)}¢
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount (SOL)</label>
              <div className="text-xs text-muted-foreground flex gap-1">
                <Wallet className="w-3 h-3" />
                <span>Balance: --</span>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full bg-background/50 border border-border rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
                min="0.001"
                step="0.001"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                SOL
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0.1, 0.5, 1, 5].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAmountChange(amt.toString())}
                  className="px-2 py-1 text-xs rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 transition-colors"
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-4 rounded-lg bg-muted/20 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-mono">{(activePrice * 100).toFixed(1)}¢</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shares</span>
              <span className="font-mono">{(betAmount / activePrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Potential Return</span>
              <span className="font-mono text-green-500">
                {((betAmount / activePrice) - betAmount).toFixed(4)} SOL ({(((1/activePrice) - 1) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/50">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{betAmount} SOL</span>
            </div>
          </div>

          {/* Action Button */}
          {!connected ? (
            <WalletMultiButton className="!w-full !h-12 !bg-primary hover:!bg-primary/90 !justify-center" />
          ) : isExpired ? (
            <Button disabled className="w-full h-12 text-lg" variant="destructive">
              Market Closed
            </Button>
          ) : (
            <Button
              onClick={onPlaceBet}
              disabled={isPlacingBet || !betAmount}
              className={`w-full h-12 text-lg font-bold ${
                activeOutcomeIndex === 0 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isPlacingBet ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {x402Status?.isPaying ? "Paying Fee..." : "Placing Bet..."}
                </div>
              ) : (
                `Buy ${selectedOutcome || outcomes[0]}`
              )}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

