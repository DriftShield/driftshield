"use client"

import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Card } from "@/components/ui/card"
import { useState, useMemo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PriceChartProps {
  data?: any[]
  outcomeName: string
  color: string
  currentPrice: number
  allOutcomes?: string[]
  allPrices?: number[]
}

// Seeded pseudo-random number generator (deterministic per market)
function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

type TimeRange = "1H" | "6H" | "1D" | "7D" | "30D" | "ALL"

const TIME_RANGES: { label: TimeRange; points: number; intervalMs: number; dateFormat: "time" | "short" | "date" }[] = [
  { label: "1H", points: 60, intervalMs: 60 * 1000, dateFormat: "time" },
  { label: "6H", points: 72, intervalMs: 5 * 60 * 1000, dateFormat: "time" },
  { label: "1D", points: 96, intervalMs: 15 * 60 * 1000, dateFormat: "time" },
  { label: "7D", points: 84, intervalMs: 2 * 60 * 60 * 1000, dateFormat: "short" },
  { label: "30D", points: 90, intervalMs: 8 * 60 * 60 * 1000, dateFormat: "date" },
  { label: "ALL", points: 120, intervalMs: 24 * 60 * 60 * 1000, dateFormat: "date" },
]

function formatTimestamp(ts: number, fmt: "time" | "short" | "date"): string {
  const d = new Date(ts)
  if (fmt === "time") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (fmt === "short") return d.toLocaleDateString([], { month: "short", day: "numeric" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

// Generate realistic price history using geometric brownian motion
// Deterministic per (outcomeName + timeRange) so it doesn't change on re-render
function generateRealisticSingleData(
  currentPrice: number,
  outcomeName: string,
  range: typeof TIME_RANGES[number]
): { time: string; ts: number; value: number }[] {
  const seed = hashString(outcomeName + range.label)
  const rng = seededRng(seed)

  const { points, intervalMs, dateFormat } = range
  const now = Date.now()
  const data: { time: string; ts: number; value: number }[] = []

  // Walk backwards from current price with mean-reverting brownian motion
  const volatility = range.label === "1H" ? 0.003 : range.label === "6H" ? 0.006 : range.label === "1D" ? 0.01 : range.label === "7D" ? 0.02 : 0.03
  const meanReversion = 0.02
  let price = currentPrice

  // Generate backwards
  const rawPrices: number[] = [price]
  for (let i = 1; i < points; i++) {
    // Ornstein-Uhlenbeck process (mean-reverting)
    const drift = meanReversion * (0.5 - price) // revert toward 0.5
    const noise = volatility * (rng() * 2 - 1)
    price = price - drift - noise // subtract because going backwards
    price = Math.max(0.02, Math.min(0.98, price))
    rawPrices.unshift(price)
  }

  // Smooth with simple moving average
  const smoothWindow = Math.max(1, Math.floor(points / 25))
  for (let i = 0; i < points; i++) {
    const start = Math.max(0, i - smoothWindow)
    const end = Math.min(points - 1, i + smoothWindow)
    let sum = 0
    let count = 0
    for (let j = start; j <= end; j++) {
      sum += rawPrices[j]
      count++
    }
    const smoothed = sum / count
    const ts = now - (points - 1 - i) * intervalMs

    data.push({
      time: formatTimestamp(ts, dateFormat),
      ts,
      value: Math.max(0.02, Math.min(0.98, smoothed)),
    })
  }

  // Ensure last point is exactly the current price
  data[data.length - 1].value = currentPrice

  return data
}

function generateRealisticMultiData(
  outcomes: string[],
  currentPrices: number[],
  range: typeof TIME_RANGES[number]
): any[] {
  const { points, intervalMs, dateFormat } = range
  const now = Date.now()
  const data: any[] = []

  // Generate individual price paths
  const paths: number[][] = outcomes.map((outcome, idx) => {
    const seed = hashString(outcome + range.label + idx)
    const rng = seededRng(seed)
    const volatility = range.label === "1H" ? 0.004 : range.label === "6H" ? 0.008 : range.label === "1D" ? 0.012 : range.label === "7D" ? 0.025 : 0.04
    const meanReversion = 0.03

    let price = currentPrices[idx]
    const raw: number[] = [price]
    for (let i = 1; i < points; i++) {
      const target = 1 / outcomes.length
      const drift = meanReversion * (target - price)
      const noise = volatility * (rng() * 2 - 1)
      price = price - drift - noise
      price = Math.max(0.01, Math.min(0.95, price))
      raw.unshift(price)
    }

    // Smooth
    const smoothWindow = Math.max(1, Math.floor(points / 25))
    const smoothed: number[] = []
    for (let i = 0; i < points; i++) {
      const start = Math.max(0, i - smoothWindow)
      const end = Math.min(points - 1, i + smoothWindow)
      let sum = 0
      let count = 0
      for (let j = start; j <= end; j++) { sum += raw[j]; count++ }
      smoothed.push(Math.max(0.01, Math.min(0.95, sum / count)))
    }

    // Normalize so all outcomes roughly sum to 1 at each point
    smoothed[smoothed.length - 1] = currentPrices[idx]
    return smoothed
  })

  // Normalize across outcomes so they sum close to 1
  for (let i = 0; i < points; i++) {
    let total = 0
    outcomes.forEach((_, idx) => { total += paths[idx][i] })
    if (total > 0) {
      outcomes.forEach((_, idx) => { paths[idx][i] = paths[idx][i] / total })
    }
  }

  // Ensure last point matches current prices exactly
  outcomes.forEach((_, idx) => { paths[idx][points - 1] = currentPrices[idx] })

  // Build data array
  for (let i = 0; i < points; i++) {
    const ts = now - (points - 1 - i) * intervalMs
    const point: any = { time: formatTimestamp(ts, dateFormat), ts }
    outcomes.forEach((outcome, idx) => {
      point[outcome] = paths[idx][i]
    })
    data.push(point)
  }

  return data
}

const COLORS = [
  "#22c55e", // green
  "#ef4444", // red
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

function CustomTooltip({ active, payload, label, isMulti }: any) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-zinc-950/95 border border-white/10 px-4 py-3 shadow-xl backdrop-blur-sm" style={{ clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}>
      <p className="text-[10px] font-mono text-zinc-500 mb-2 uppercase">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-mono text-zinc-300">{isMulti ? entry.dataKey : "Probability"}</span>
          </div>
          <span className="text-xs font-mono font-bold text-white">{(entry.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

export function PriceChart({ data, outcomeName, color, currentPrice, allOutcomes, allPrices }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1D")

  const isMultiOutcome = allOutcomes && allOutcomes.length > 2
  const rangeConfig = TIME_RANGES.find((r) => r.label === timeRange) || TIME_RANGES[2]

  const chartColor = color.includes("green") ? "#22c55e" : color.includes("blue") ? "#3b82f6" : "#ef4444"

  // Memoize chart data -- deterministic per (outcomeName + timeRange)
  const chartData = useMemo(() => {
    if (data) return data
    if (isMultiOutcome && allOutcomes && allPrices) {
      return generateRealisticMultiData(allOutcomes, allPrices, rangeConfig)
    }
    return generateRealisticSingleData(currentPrice, outcomeName, rangeConfig)
  }, [data, isMultiOutcome, allOutcomes, allPrices, currentPrice, outcomeName, rangeConfig])

  // Calculate price change for the period
  const firstValue = isMultiOutcome ? 0 : (chartData[0]?.value ?? currentPrice)
  const priceChange = currentPrice - firstValue
  const priceChangePct = firstValue > 0 ? (priceChange / firstValue) * 100 : 0
  const isPositive = priceChange >= 0

  return (
    <Card className="bg-zinc-950 border border-white/10 p-6 h-full min-h-[400px] flex flex-col cut-corners">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {isMultiOutcome ? (
            <div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Market Probability</div>
              <div className="flex items-center gap-2">
                {allOutcomes?.slice(0, 3).map((o, i) => (
                  <div key={o} className="flex items-center gap-1.5">
                    <div className="w-2 h-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-mono text-zinc-400">{o}</span>
                  </div>
                ))}
                {(allOutcomes?.length || 0) > 3 && (
                  <span className="text-[10px] font-mono text-zinc-600">+{(allOutcomes?.length || 0) - 3}</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">{outcomeName} Probability</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold font-mono text-white">{(currentPrice * 100).toFixed(1)}%</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-bold ${
                  isPositive
                    ? "text-green-400 bg-green-500/10 border border-green-500/20"
                    : "text-red-400 bg-red-500/10 border border-red-500/20"
                }`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? "+" : ""}{priceChangePct.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex border border-white/10 overflow-hidden" style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}>
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setTimeRange(range.label)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                timeRange === range.label
                  ? "bg-red-600 text-white"
                  : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {isMultiOutcome ? (
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
                minTickGap={60}
              />
              <YAxis
                domain={[0, 1]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                orientation="right"
                width={45}
              />
              <Tooltip content={<CustomTooltip isMulti />} />
              <ReferenceLine y={0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              {allOutcomes?.map((outcome, idx) => (
                <Line
                  key={outcome}
                  type="monotone"
                  dataKey={outcome}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: COLORS[idx % COLORS.length] }}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id={`grad-${outcomeName}-${timeRange}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
                minTickGap={60}
              />
              <YAxis
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin * 10) / 10 - 0.05),
                  (dataMax: number) => Math.min(1, Math.ceil(dataMax * 10) / 10 + 0.05),
                ]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                orientation="right"
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#grad-${outcomeName}-${timeRange})`}
                activeDot={{ r: 4, strokeWidth: 0, fill: chartColor }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
