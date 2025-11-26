"use client"

import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

interface PriceChartProps {
  data?: any[]
  outcomeName: string
  color: string
  currentPrice: number
  allOutcomes?: string[]
  allPrices?: number[]
}

// Generate mock data for single outcome
const generateSingleMockData = (currentPrice: number) => {
  const data = []
  const points = 50
  let price = currentPrice
  
  for (let i = 0; i < points; i++) {
    data.unshift({
      time: new Date(Date.now() - i * 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: Math.max(0.01, Math.min(0.99, price * (1 + (Math.random() - 0.5) * 0.1)))
    })
    price = price * (1 + (Math.random() - 0.5) * 0.05)
  }
  data[data.length - 1].value = currentPrice
  return data
}

// Generate mock data for multiple outcomes
const generateMultiMockData = (outcomes: string[], currentPrices: number[]) => {
  const data = []
  const points = 50
  let prices = [...currentPrices]
  
  for (let i = 0; i < points; i++) {
    const point: any = {
      time: new Date(Date.now() - i * 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    
    outcomes.forEach((outcome, idx) => {
      point[outcome] = Math.max(0.01, Math.min(0.99, prices[idx] * (1 + (Math.random() - 0.5) * 0.1)))
      prices[idx] = prices[idx] * (1 + (Math.random() - 0.5) * 0.05)
    })
    
    data.unshift(point)
  }
  
  // Set last point to exact current prices
  outcomes.forEach((outcome, idx) => {
    data[data.length - 1][outcome] = currentPrices[idx]
  })
  
  return data
}

const COLORS = [
  "#10b981", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

export function PriceChart({ data, outcomeName, color, currentPrice, allOutcomes, allPrices }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState("24H")
  
  const isMultiOutcome = allOutcomes && allOutcomes.length > 2
  
  // Extract color hex from Tailwind class or use default
  const getColorHex = (c: string) => {
    if (c.includes("green")) return "#10b981"
    if (c.includes("red")) return "#ef4444"
    if (c.includes("blue")) return "#3b82f6"
    return "#8884d8"
  }

  const chartColor = getColorHex(color)
  const chartData = data || (isMultiOutcome && allOutcomes && allPrices 
    ? generateMultiMockData(allOutcomes, allPrices) 
    : generateSingleMockData(currentPrice))

  return (
    <Card className="glass p-6 h-full min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {isMultiOutcome ? (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Market Overview</div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="h-fit">
                  {allOutcomes?.length} Outcomes
                </Badge>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm text-muted-foreground">Price</div>
                <div className="text-3xl font-bold" style={{ color: chartColor }}>
                  {(currentPrice * 100).toFixed(1)}¢
                </div>
              </div>
              <Badge variant="outline" className="h-fit">
                {outcomeName}
              </Badge>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          {["1H", "4H", "24H", "7D", "ALL"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeRange === range 
                  ? "bg-primary/20 text-primary font-medium" 
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {isMultiOutcome ? (
            <LineChart data={chartData}>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                minTickGap={50}
              />
              <YAxis 
                domain={[0, 1]} 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}¢`}
                orientation="right"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(20, 20, 25, 0.9)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}¢`, ""]}
              />
              <Legend />
              {allOutcomes?.map((outcome, idx) => (
                <Line
                  key={outcome}
                  type="monotone"
                  dataKey={outcome}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${outcomeName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                minTickGap={50}
              />
              <YAxis 
                domain={[0, 1]} 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}¢`}
                orientation="right"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(20, 20, 25, 0.9)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}¢`, "Price"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${outcomeName})`}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
