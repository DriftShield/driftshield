"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PredictionBondingCurve, Quote, formatOdds, formatPriceImpact, isAcceptablePriceImpact } from "@/lib/bonding-curve"
import { TrendingUp, AlertTriangle, Zap, Activity } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useMemo } from "react"

interface BondingCurveWidgetProps {
  curve: PredictionBondingCurve
  selectedOutcome: number
  betAmount: number
  quote: Quote | null
}

export function BondingCurveWidget({ curve, selectedOutcome, betAmount, quote }: BondingCurveWidgetProps) {
  const state = curve.getState()
  const odds = curve.getOdds()
  const graduationProgress = curve.getGraduationProgress()

  // Generate chart data for bonding curve visualization
  const chartData = useMemo(() => {
    const data = []
    const steps = 20
    const maxAmount = Math.max(10, betAmount * 2)

    for (let i = 0; i <= steps; i++) {
      const amount = (i / steps) * maxAmount
      if (amount === 0) {
        data.push({ amount: 0, price: odds[selectedOutcome] * 100 })
        continue
      }

      try {
        const tempQuote = curve.clone().getQuote(amount, selectedOutcome)
        data.push({
          amount,
          price: tempQuote.averagePrice * 100
        })
      } catch {
        break
      }
    }

    return data
  }, [curve, selectedOutcome, betAmount, odds])

  return (
    <div className="space-y-4">
      {/* Current Market State */}
      <Card className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Virtual Liquidity Pool
          </h3>
          <Badge variant={state.status === 'BONDING' ? 'default' : 'secondary'}>
            {state.status === 'BONDING' ? 'Bonding Curve' : 'Graduated'}
          </Badge>
        </div>

        {/* Odds Display */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {odds.map((odd, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                index === selectedOutcome
                  ? 'bg-primary/20 border border-primary/50'
                  : 'bg-muted/20'
              }`}
            >
              <div className="text-xs text-muted-foreground">Outcome {index + 1}</div>
              <div className="text-xl font-bold">{formatOdds(odd)}</div>
            </div>
          ))}
        </div>

        {/* Volume & Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Volume</span>
            <span className="font-semibold">{state.totalVolume.toFixed(2)} SOL</span>
          </div>

          {state.status === 'BONDING' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To Graduation</span>
                <span className="font-semibold">{graduationProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${graduationProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {graduationProgress < 100
                  ? `${(100 - state.totalVolume).toFixed(1)} SOL until real LP`
                  : 'Ready to graduate!'}
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Quote Display */}
      {quote && betAmount > 0 && (
        <Card className="glass p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Trade Preview
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">You Pay</span>
              <span className="font-semibold">{betAmount.toFixed(4)} SOL</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">You Receive</span>
              <span className="font-semibold">{quote.tokensOut.toFixed(2)} tokens</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Average Price</span>
              <span className="font-semibold">{formatOdds(quote.averagePrice)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">New Price</span>
              <span className="font-semibold">{formatOdds(quote.newOdds[selectedOutcome])}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price Impact</span>
              <span className={`font-semibold ${
                Math.abs(quote.priceImpact) > 5 ? 'text-destructive' :
                Math.abs(quote.priceImpact) > 2 ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {formatPriceImpact(quote.priceImpact)}
              </span>
            </div>
          </div>

          {/* Price Impact Warning */}
          {!isAcceptablePriceImpact(quote.priceImpact) && (
            <Alert className="mt-3 border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                High price impact ({Math.abs(quote.priceImpact).toFixed(1)}%)! Consider reducing your bet size.
              </AlertDescription>
            </Alert>
          )}
        </Card>
      )}

      {/* Bonding Curve Chart */}
      {chartData.length > 0 && (
        <Card className="glass p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Price Curve
          </h3>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="amount"
                stroke="#888"
                fontSize={12}
                tickFormatter={(value) => `${value.toFixed(1)}`}
              />
              <YAxis
                stroke="#888"
                fontSize={12}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Price']}
                labelFormatter={(value) => `Amount: ${Number(value).toFixed(2)} SOL`}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#00C49F"
                fill="url(#colorPrice)"
              />
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>

          <p className="text-xs text-muted-foreground mt-2">
            Shows how price increases with bet size due to bonding curve
          </p>
        </Card>
      )}

      {/* Info Box */}
      <Card className="glass p-4 bg-primary/5 border-primary/20">
        <div className="flex gap-2">
          <Activity className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-primary">How Virtual Liquidity Works</p>
            <p className="text-muted-foreground">
              No real liquidity needed! Prices adjust automatically based on demand using a bonding curve formula.
              As more people bet on an outcome, its price increases smoothly.
            </p>
            {state.status === 'BONDING' && (
              <p className="text-muted-foreground">
                When this market reaches 100 SOL volume, it will graduate to a real liquidity pool with permanent liquidity.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
