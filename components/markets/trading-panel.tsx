"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, TrendingUp, AlertTriangle, Info } from "lucide-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { ConstantProductAMM } from "@/lib/amm/constant-product"
import { marketToAMMPool, calculateBetShares, formatPriceImpact, validateBetSize } from "@/lib/amm/on-chain-integration"
import { calculatePotentialGains, calculateExpectedValue } from "@/lib/amm/polymarket-gains"

interface TradingPanelProps {
  marketData: any // On-chain market data
  outcomes: string[]
  outcomePrices: string[]
  selectedOutcome: string | null
  onOutcomeSelect: (outcome: string) => void
  betAmount: number
  onAmountChange: (amount: number) => void
  onPlaceBet: () => void
  onSellShares?: (shares: number) => void
  userShares?: { yes: number; no: number }
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
  marketData,
  outcomes,
  outcomePrices,
  selectedOutcome,
  onOutcomeSelect,
  betAmount,
  onAmountChange,
  onPlaceBet,
  onSellShares,
  userShares,
  isPlacingBet,
  isExpired,
  connected,
  x402Status
}: TradingPanelProps) {
  const [customAmount, setCustomAmount] = useState(betAmount.toString())
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [sellAmount, setSellAmount] = useState("0")

  const activeOutcomeIndex = selectedOutcome
    ? outcomes.indexOf(selectedOutcome)
    : 0

  const activePrice = parseFloat(outcomePrices[activeOutcomeIndex] || "0.5")
  const outcomeType = activeOutcomeIndex === 0 ? 'YES' : 'NO'

  // AMM Calculations for BUY
  const buyPreview = useMemo(() => {
    if (!marketData || betAmount <= 0) return null
    try {
      return calculateBetShares(marketData, betAmount, outcomeType)
    } catch {
      return null
    }
  }, [marketData, betAmount, outcomeType])

  // Validation
  const validation = useMemo(() => {
    if (!marketData || betAmount <= 0) return { valid: true, priceImpact: 0 }
    try {
      return validateBetSize(marketData, betAmount, outcomeType, 15)
    } catch {
      return { valid: true, priceImpact: 0 }
    }
  }, [marketData, betAmount, outcomeType])

  // Gain scenarios
  const gainScenarios = useMemo(() => {
    if (!buyPreview || betAmount <= 0) return null
    try {
      return calculatePotentialGains(activePrice, buyPreview.shares, activePrice)
    } catch {
      return null
    }
  }, [buyPreview, activePrice, betAmount])

  // Expected Value
  const expectedValue = useMemo(() => {
    if (betAmount <= 0) return null
    // User can adjust their own win probability estimate
    const userEstimate = activePrice // Default to market price
    return calculateExpectedValue(activePrice, userEstimate)
  }, [activePrice, betAmount])

  // SELL calculations
  const sellPreview = useMemo(() => {
    if (!marketData || !userShares) return null
    const shares = parseFloat(sellAmount)
    if (shares <= 0) return null

    const availableShares = activeOutcomeIndex === 0 ? userShares.yes : userShares.no
    if (shares > availableShares) return null

    try {
      const pool = marketToAMMPool(marketData)
      const result = ConstantProductAMM.calculateSellReturn(pool, shares, outcomeType)

      const newPrice = outcomeType === 'YES'
        ? ConstantProductAMM.getYesPrice(result.newPool)
        : ConstantProductAMM.getNoPrice(result.newPool)

      return {
        solReceived: result.return,
        avgPrice: result.avgPrice,
        priceImpact: result.priceImpact,
        newPrice,
      }
    } catch {
      return null
    }
  }, [marketData, sellAmount, userShares, activeOutcomeIndex, outcomeType])

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
    ]
    return colors[index % colors.length]
  }

  const activeColor = getOutcomeColor(activeOutcomeIndex)
  const userOutcomeShares = userShares ? (activeOutcomeIndex === 0 ? userShares.yes : userShares.no) : 0

  return (
    <Card className="glass p-4 h-full flex flex-col border-l border-border/50 rounded-none md:rounded-xl">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "buy" | "sell")} className="w-full flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="buy" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500">
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500" disabled={!userOutcomeShares}>
            Sell {userOutcomeShares > 0 && `(${userOutcomeShares.toFixed(2)} shares)`}
          </TabsTrigger>
        </TabsList>

        {/* BUY TAB */}
        <TabsContent value="buy" className="flex-1 flex flex-col space-y-4">
          {/* Outcome Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {outcomes.map((outcome, idx) => {
                const price = parseFloat(outcomePrices[idx])
                const color = getOutcomeColor(idx)
                const isSelected = selectedOutcome === outcome || (!selectedOutcome && idx === 0)

                return (
                  <button
                    key={outcome}
                    onClick={() => onOutcomeSelect(outcome)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected ? `${color.border} ${color.bg}/10` : "border-border/50 hover:border-border"
                    }`}
                  >
                    <div className="flex justify-between items-end">
                      <span className={`font-bold ${isSelected ? color.text : ''}`}>{outcome}</span>
                      <span className="font-mono">{(price * 100).toFixed(0)}¢</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Amount (SOL)</label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg px-4 py-3 font-mono"
              placeholder="0.00"
              step="0.001"
            />
            <div className="grid grid-cols-4 gap-2">
              {[0.1, 0.5, 1, 5].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAmountChange(amt.toString())}
                  className="px-2 py-1 text-xs rounded bg-secondary/20 hover:bg-secondary/30"
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* AMM Preview */}
          {buyPreview && (
            <div className="p-3 rounded-lg bg-muted/20 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SOL Spent</span>
                <span className="font-mono font-bold text-red-500">{betAmount.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shares Received</span>
                <span className="font-mono font-bold text-green-500">{buyPreview.shares.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Price</span>
                <span className="font-mono">{(buyPreview.avgPrice * 100).toFixed(1)}¢</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={formatPriceImpact(buyPreview.priceImpact).color}>
                  {formatPriceImpact(buyPreview.priceImpact).formatted}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-muted-foreground">New Price</span>
                <span className="font-mono">
                  {((activeOutcomeIndex === 0 ? buyPreview.newYesPrice : buyPreview.newNoPrice) * 100).toFixed(1)}¢
                </span>
              </div>
            </div>
          )}

          {/* Gain Potential */}
          {gainScenarios && gainScenarios.scenarios.length > 0 && (
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Potential Gains
              </div>
              {gainScenarios.scenarios.slice(0, 2).map((scenario, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {scenario.multiplier.toFixed(1)}x at ${scenario.targetPrice.toFixed(2)}
                  </span>
                  <span className="text-green-500 font-bold">
                    +${scenario.profit.toFixed(2)}
                  </span>
                </div>
              ))}
              {gainScenarios.maxGain && (
                <div className="flex justify-between pt-2 border-t border-green-500/20">
                  <span className="text-sm font-medium">Max (if wins)</span>
                  <span className="text-green-500 font-bold">
                    {gainScenarios.maxGain.multiplier.toFixed(1)}x
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          {!validation.valid && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div className="text-xs text-red-500">{validation.reason}</div>
            </div>
          )}

          {/* Buy Button */}
          {!connected ? (
            <WalletMultiButton className="!w-full !h-12" />
          ) : isExpired ? (
            <Button disabled className="w-full h-12">Market Closed</Button>
          ) : (
            <Button
              onClick={onPlaceBet}
              disabled={isPlacingBet || !validation.valid || betAmount <= 0}
              className={`w-full h-12 font-bold ${activeColor.bg} hover:opacity-90`}
            >
              {isPlacingBet ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" />Placing...</>
              ) : (
                `Buy ${betAmount.toFixed(2)} SOL`
              )}
            </Button>
          )}
        </TabsContent>

        {/* SELL TAB */}
        <TabsContent value="sell" className="flex-1 flex flex-col space-y-4">
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              You own <strong>{userOutcomeShares.toFixed(4)}</strong> {selectedOutcome || outcomes[0]} shares
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Shares to Sell</label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg px-4 py-3 font-mono"
              placeholder="0.00"
              max={userOutcomeShares}
              step="0.001"
            />
            <div className="grid grid-cols-4 gap-2">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setSellAmount((userOutcomeShares * pct).toFixed(4))}
                  className="px-2 py-1 text-xs rounded bg-secondary/20 hover:bg-secondary/30"
                >
                  {(pct * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Sell Preview */}
          {sellPreview && (
            <div className="p-3 rounded-lg bg-muted/20 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shares Sold</span>
                <span className="font-mono font-bold text-red-500">
                  {parseFloat(sellAmount).toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SOL Received</span>
                <span className="font-mono font-bold text-green-500">
                  {sellPreview.solReceived.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Price</span>
                <span className="font-mono">{(sellPreview.avgPrice * 100).toFixed(1)}¢</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price Impact</span>
                <span className="text-red-500">-{(sellPreview.priceImpact * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-muted-foreground">New Price</span>
                <span className="font-mono">
                  {(sellPreview.newPrice * 100).toFixed(1)}¢
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={() => onSellShares?.(parseFloat(sellAmount))}
            disabled={!sellPreview || isPlacingBet}
            className="w-full h-12 font-bold bg-red-500 hover:bg-red-600"
          >
            {isPlacingBet ? <Loader2 className="w-5 h-5 animate-spin" /> : `Sell ${sellAmount} Shares`}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
