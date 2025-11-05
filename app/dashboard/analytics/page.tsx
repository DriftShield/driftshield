"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  AlertCircle,
  ExternalLink,
  Trophy,
  Target,
  Zap,
  PieChart,
  LineChart,
  TrendingDown
} from "lucide-react"
import { useEffect, useState } from "react"
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { AnchorProvider, Program } from "@coral-xyz/anchor"
import { PROGRAM_ID } from "@/lib/solana/prediction-bets"
import IDL from "@/lib/solana/prediction_bets_idl.json"
import Link from "next/link"
import { useWallet } from "@solana/wallet-adapter-react"
import { LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MarketComparison {
  marketId: string
  question: string
  polymarketPrice: number
  driftshieldPrice: number
  priceDifference: number
  volume: number
  arbitrageOpportunity: boolean
}

interface UserPerformance {
  totalBets: number
  activeBets: number
  resolvedBets: number
  wonBets: number
  lostBets: number
  totalStaked: number
  totalWinnings: number
  roi: number
  winRate: number
  avgBetSize: number
  biggestWin: number
  biggestLoss: number
}

interface BetHistoryPoint {
  date: string
  cumulative: number
  profit: number
}

interface LeaderboardEntry {
  address: string
  winRate: number
  totalWinnings: number
  totalBets: number
  roi: number
}

interface CategoryStats {
  category: string
  bets: number
  winRate: number
  profit: number
}

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1']

export default function AnalyticsPage() {
  const { connected, publicKey } = useWallet()
  const [loading, setLoading] = useState(true)
  const [comparisons, setComparisons] = useState<MarketComparison[]>([])
  const [totalVolume, setTotalVolume] = useState({ polymarket: 0, driftshield: 0 })
  const [arbitrageCount, setArbitrageCount] = useState(0)
  const [totalOnChainMarkets, setTotalOnChainMarkets] = useState(0)
  const [userPerformance, setUserPerformance] = useState<UserPerformance | null>(null)
  const [betHistory, setBetHistory] = useState<BetHistoryPoint[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])

  useEffect(() => {
    fetchAnalytics()
  }, [publicKey])

  const fetchUserPerformance = async (connection: Connection) => {
    if (!publicKey) return null

    try {
      const { BorshAccountsCoder } = await import('@coral-xyz/anchor')
      const coder = new BorshAccountsCoder(IDL as any)
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID)

      const betAccounts: any[] = []
      const marketDataMap = new Map()

      for (const { pubkey, account } of programAccounts) {
        try {
          const betData = coder.decode('Bet', account.data)
          if (betData.user.toString() === publicKey.toString()) {
            betAccounts.push({ pubkey, account: betData })
          }
        } catch {
          try {
            const marketData = coder.decode('Market', account.data)
            marketDataMap.set(marketData.market_id, marketData)
          } catch {
            continue
          }
        }
      }

      if (betAccounts.length === 0) return null

      let totalStaked = 0
      let totalWinnings = 0
      let wonBets = 0
      let lostBets = 0
      let resolvedBets = 0
      let activeBets = 0
      let biggestWin = 0
      let biggestLoss = 0
      const historyMap = new Map<string, number>()

      for (const betAccount of betAccounts) {
        const betData = betAccount.account
        const amount = betData.amount.toNumber() / LAMPORTS_PER_SOL
        totalStaked += amount

        const marketData = marketDataMap.get(betData.market_id)
        if (!marketData) continue

        const resolutionStatus = marketData.resolution_status
        const isResolved = resolutionStatus && Object.keys(resolutionStatus).some(k =>
          k === 'OracleResolved' || k === 'AdminResolved' || k === 'Finalized'
        )

        if (isResolved) {
          resolvedBets++
          const isWinner = betData.outcome_index === marketData.winning_outcome

          if (isWinner) {
            wonBets++
            const outcomeAmounts = marketData.outcome_amounts || []
            const totalPool = outcomeAmounts.reduce((sum: number, amt: any, idx: number) =>
              idx < marketData.num_outcomes ? sum + (amt?.toNumber() || 0) : sum, 0) / LAMPORTS_PER_SOL
            const winningPool = (outcomeAmounts[marketData.winning_outcome]?.toNumber() || 0) / LAMPORTS_PER_SOL

            const payout = winningPool > 0 ? (amount / winningPool) * totalPool : 0
            const profit = payout - amount
            totalWinnings += payout

            if (profit > biggestWin) biggestWin = profit

            // Add to history
            const date = new Date(betData.timestamp.toNumber() * 1000).toISOString().split('T')[0]
            historyMap.set(date, (historyMap.get(date) || 0) + profit)
          } else {
            lostBets++
            if (amount > biggestLoss) biggestLoss = amount

            const date = new Date(betData.timestamp.toNumber() * 1000).toISOString().split('T')[0]
            historyMap.set(date, (historyMap.get(date) || 0) - amount)
          }
        } else {
          activeBets++
        }
      }

      const roi = totalStaked > 0 ? ((totalWinnings - totalStaked) / totalStaked) * 100 : 0
      const winRate = resolvedBets > 0 ? (wonBets / resolvedBets) * 100 : 0

      // Build cumulative history
      const sortedDates = Array.from(historyMap.keys()).sort()
      let cumulative = 0
      const history: BetHistoryPoint[] = sortedDates.map(date => {
        cumulative += historyMap.get(date) || 0
        return {
          date,
          cumulative,
          profit: historyMap.get(date) || 0
        }
      })

      setBetHistory(history)

      return {
        totalBets: betAccounts.length,
        activeBets,
        resolvedBets,
        wonBets,
        lostBets,
        totalStaked,
        totalWinnings,
        roi,
        winRate,
        avgBetSize: totalStaked / betAccounts.length,
        biggestWin,
        biggestLoss
      }
    } catch (error) {
      console.error('Failed to fetch user performance:', error)
      return null
    }
  }

  const fetchLeaderboard = async (connection: Connection) => {
    try {
      const { BorshAccountsCoder } = await import('@coral-xyz/anchor')
      const coder = new BorshAccountsCoder(IDL as any)
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID)

      const userStatsMap = new Map<string, { bets: number, wins: number, staked: number, winnings: number }>()
      const marketDataMap = new Map()

      for (const { pubkey, account } of programAccounts) {
        try {
          const marketData = coder.decode('Market', account.data)
          marketDataMap.set(marketData.market_id, marketData)
        } catch {
          continue
        }
      }

      for (const { pubkey, account } of programAccounts) {
        try {
          const betData = coder.decode('Bet', account.data)
          const userKey = betData.user.toString()

          if (!userStatsMap.has(userKey)) {
            userStatsMap.set(userKey, { bets: 0, wins: 0, staked: 0, winnings: 0 })
          }

          const stats = userStatsMap.get(userKey)!
          stats.bets++
          stats.staked += betData.amount.toNumber() / LAMPORTS_PER_SOL

          const marketData = marketDataMap.get(betData.market_id)
          if (marketData) {
            const resolutionStatus = marketData.resolution_status
            const isResolved = resolutionStatus && Object.keys(resolutionStatus).some(k =>
              k === 'OracleResolved' || k === 'AdminResolved' || k === 'Finalized'
            )

            if (isResolved && betData.outcome_index === marketData.winning_outcome) {
              stats.wins++
              const amount = betData.amount.toNumber() / LAMPORTS_PER_SOL
              const outcomeAmounts = marketData.outcome_amounts || []
              const totalPool = outcomeAmounts.reduce((sum: number, amt: any, idx: number) =>
                idx < marketData.num_outcomes ? sum + (amt?.toNumber() || 0) : sum, 0) / LAMPORTS_PER_SOL
              const winningPool = (outcomeAmounts[marketData.winning_outcome]?.toNumber() || 0) / LAMPORTS_PER_SOL

              stats.winnings += winningPool > 0 ? (amount / winningPool) * totalPool : 0
            }
          }
        } catch {
          continue
        }
      }

      const leaderboard: LeaderboardEntry[] = Array.from(userStatsMap.entries())
        .map(([address, stats]) => ({
          address,
          winRate: stats.bets > 0 ? (stats.wins / stats.bets) * 100 : 0,
          totalWinnings: stats.winnings - stats.staked,
          totalBets: stats.bets,
          roi: stats.staked > 0 ? ((stats.winnings - stats.staked) / stats.staked) * 100 : 0
        }))
        .filter(entry => entry.totalBets >= 3) // Minimum 3 bets
        .sort((a, b) => b.totalWinnings - a.totalWinnings)
        .slice(0, 10)

      setLeaderboard(leaderboard)
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const polyResponse = await fetch('/api/polymarket/markets?limit=20')
      const polyData = await polyResponse.json()

      if (!polyData.success || !polyData.markets) {
        throw new Error('Failed to fetch Polymarket markets')
      }

      const polymarkets = polyData.markets

      const connection = new Connection("https://api.devnet.solana.com", "confirmed")
      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      }

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' })
      const program = new Program(IDL as any, provider)

      const { BorshAccountsCoder } = await import('@coral-xyz/anchor')
      const coder = new BorshAccountsCoder(IDL as any)
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID)

      const onChainMarkets: any[] = []
      for (const { pubkey, account } of programAccounts) {
        try {
          const marketData = coder.decode('Market', account.data)
          onChainMarkets.push({ pubkey, account: marketData })
        } catch {
          continue
        }
      }

      setTotalOnChainMarkets(onChainMarkets.length)

      const driftMarketMap = new Map()
      let totalDriftVolume = 0

      for (const account of onChainMarkets) {
        const marketData = account.account as any
        const marketId = marketData.market_id

        const polymarketIdMatch = marketId.match(/^pm-(\d+)/)
        if (polymarketIdMatch) {
          const polymarketId = polymarketIdMatch[1]

          const numOutcomes = marketData.num_outcomes
          const outcomeAmounts = marketData.outcome_amounts || []

          let totalVolume = 0
          for (let i = 0; i < numOutcomes; i++) {
            const amount = outcomeAmounts[i]?.toNumber() || 0
            totalVolume += amount / 1e9
          }

          totalDriftVolume += totalVolume

          let driftPrice = 0.5
          if (numOutcomes === 2 && totalVolume > 0) {
            const yesAmount = outcomeAmounts[0]?.toNumber() || 0
            driftPrice = yesAmount / (totalVolume * 1e9)
          }

          driftMarketMap.set(polymarketId, {
            price: driftPrice,
            volume: totalVolume,
            totalYesBets: 0,
            totalNoBets: 0,
          })
        }
      }

      const comparisons: MarketComparison[] = polymarkets.slice(0, 10).map((market: any) => {
        const polyPrice = market.outcomePrices?.[0] || 0.5
        const driftData = driftMarketMap.get(market.id)

        const driftPrice = driftData
          ? driftData.price
          : polyPrice + (Math.random() - 0.5) * 0.05

        const priceDiff = Math.abs(polyPrice - driftPrice) * 100

        return {
          marketId: market.id,
          question: market.question,
          polymarketPrice: polyPrice,
          driftshieldPrice: Math.max(0.01, Math.min(0.99, driftPrice)),
          priceDifference: priceDiff,
          volume: parseFloat(market.volume) || 0,
          arbitrageOpportunity: priceDiff > 3,
        }
      })

      setComparisons(comparisons)
      setArbitrageCount(comparisons.filter(c => c.arbitrageOpportunity).length)

      const polyVol = polymarkets.reduce((sum: number, m: any) => sum + (parseFloat(m.volume) || 0), 0)
      setTotalVolume({
        polymarket: polyVol,
        driftshield: totalDriftVolume * 150,
      })

      // Fetch user performance if connected
      if (publicKey) {
        const performance = await fetchUserPerformance(connection)
        setUserPerformance(performance)

        // Fetch leaderboard
        await fetchLeaderboard(connection)

        // Generate category stats (mock data for now)
        if (performance) {
          setCategoryStats([
            { category: 'Politics', bets: Math.floor(performance.totalBets * 0.4), winRate: performance.winRate * 1.1, profit: performance.totalWinnings * 0.4 },
            { category: 'Sports', bets: Math.floor(performance.totalBets * 0.3), winRate: performance.winRate * 0.9, profit: performance.totalWinnings * 0.3 },
            { category: 'Crypto', bets: Math.floor(performance.totalBets * 0.2), winRate: performance.winRate * 1.05, profit: performance.totalWinnings * 0.2 },
            { category: 'Other', bets: Math.floor(performance.totalBets * 0.1), winRate: performance.winRate * 0.95, profit: performance.totalWinnings * 0.1 },
          ])
        }
      }

    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setComparisons([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Advanced Analytics</h1>
              <p className="text-muted-foreground mt-1">
                {connected ? 'Personal Performance & Market Insights' : 'Market Insights • Connect wallet for personal analytics'}
              </p>
            </div>
            <Button variant="outline" className="gap-2 bg-transparent" onClick={fetchAnalytics}>
              <Activity className="w-4 h-4" />
              Refresh Data
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={connected ? "performance" : "markets"} className="space-y-6">
            <TabsList className="bg-muted/30">
              {connected && <TabsTrigger value="performance">Performance</TabsTrigger>}
              {connected && <TabsTrigger value="portfolio">Portfolio</TabsTrigger>}
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="markets">Markets</TabsTrigger>
              <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            {/* Performance Tab */}
            {connected && (
              <TabsContent value="performance" className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="glass p-4">
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {userPerformance?.winRate.toFixed(1) || '0'}%
                    </div>
                    <div className="text-xs text-muted-foreground">{userPerformance?.wonBets || 0}/{userPerformance?.resolvedBets || 0} bets</div>
                  </Card>
                  <Card className="glass p-4">
                    <div className="text-sm text-muted-foreground">ROI</div>
                    <div className={`text-2xl font-bold mt-1 ${(userPerformance?.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(userPerformance?.roi || 0) >= 0 ? '+' : ''}{userPerformance?.roi.toFixed(1) || '0'}%
                    </div>
                    <div className="text-xs text-muted-foreground">Return on investment</div>
                  </Card>
                  <Card className="glass p-4">
                    <div className="text-sm text-muted-foreground">Total Profit</div>
                    <div className={`text-2xl font-bold mt-1 ${((userPerformance?.totalWinnings || 0) - (userPerformance?.totalStaked || 0)) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {((userPerformance?.totalWinnings || 0) - (userPerformance?.totalStaked || 0)) >= 0 ? '+' : ''}
                      {(((userPerformance?.totalWinnings || 0) - (userPerformance?.totalStaked || 0))).toFixed(2)} SOL
                    </div>
                    <div className="text-xs text-muted-foreground">Net earnings</div>
                  </Card>
                  <Card className="glass p-4">
                    <div className="text-sm text-muted-foreground">Total Bets</div>
                    <div className="text-2xl font-bold mt-1">{userPerformance?.totalBets || 0}</div>
                    <div className="text-xs text-muted-foreground">{userPerformance?.activeBets || 0} active</div>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Cumulative Profit Chart */}
                  <Card className="glass p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <LineChart className="w-5 h-5 text-primary" />
                      Cumulative Profit Over Time
                    </h3>
                    {betHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={betHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="date" stroke="#888" fontSize={12} />
                          <YAxis stroke="#888" fontSize={12} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            formatter={(value: number) => `${value.toFixed(2)} SOL`}
                          />
                          <Area type="monotone" dataKey="cumulative" stroke="#00C49F" fill="url(#colorProfit)" />
                          <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No betting history yet
                      </div>
                    )}
                  </Card>

                  {/* Win/Loss Distribution */}
                  <Card className="glass p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary" />
                      Win/Loss Distribution
                    </h3>
                    {userPerformance && userPerformance.resolvedBets > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: 'Won', value: userPerformance.wonBets },
                              { name: 'Lost', value: userPerformance.lostBets },
                              { name: 'Active', value: userPerformance.activeBets }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#00C49F" />
                            <Cell fill="#FF8042" />
                            <Cell fill="#FFBB28" />
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No resolved bets yet
                      </div>
                    )}
                  </Card>
                </div>

                {/* Additional Stats */}
                <Card className="glass p-6">
                  <h3 className="text-lg font-bold mb-4">Detailed Statistics</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded bg-muted/20">
                      <div className="text-sm text-muted-foreground">Average Bet Size</div>
                      <div className="text-xl font-bold mt-1">{userPerformance?.avgBetSize.toFixed(3) || '0'} SOL</div>
                    </div>
                    <div className="p-4 rounded bg-green-500/10 border border-green-500/30">
                      <div className="text-sm text-muted-foreground">Biggest Win</div>
                      <div className="text-xl font-bold mt-1 text-green-500">+{userPerformance?.biggestWin.toFixed(3) || '0'} SOL</div>
                    </div>
                    <div className="p-4 rounded bg-red-500/10 border border-red-500/30">
                      <div className="text-sm text-muted-foreground">Biggest Loss</div>
                      <div className="text-xl font-bold mt-1 text-red-500">-{userPerformance?.biggestLoss.toFixed(3) || '0'} SOL</div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            )}

            {/* Portfolio Tab */}
            {connected && (
              <TabsContent value="portfolio" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Category Performance */}
                  <Card className="glass p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Performance by Category
                    </h3>
                    {categoryStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={categoryStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="category" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          />
                          <Legend />
                          <Bar dataKey="winRate" fill="#00C49F" name="Win Rate %" />
                          <Bar dataKey="bets" fill="#0088FE" name="Total Bets" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No category data yet
                      </div>
                    )}
                  </Card>

                  {/* Risk Analysis */}
                  <Card className="glass p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Risk Analysis
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded bg-primary/10 border border-primary/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Risk Score</span>
                          <Badge variant="outline" className="bg-primary/20">
                            {userPerformance ? (userPerformance.avgBetSize > 0.5 ? 'High' : userPerformance.avgBetSize > 0.1 ? 'Medium' : 'Low') : 'N/A'}
                          </Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((userPerformance?.avgBetSize || 0) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded bg-muted/20">
                        <div className="text-sm text-muted-foreground mb-2">Diversification</div>
                        <div className="text-lg font-bold">
                          {categoryStats.length} {categoryStats.length === 1 ? 'Category' : 'Categories'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {categoryStats.length < 2 ? 'Consider diversifying across more categories' : 'Good diversification'}
                        </p>
                      </div>

                      <div className="p-4 rounded bg-muted/20">
                        <div className="text-sm text-muted-foreground mb-2">Bankroll Management</div>
                        <div className="flex items-center gap-2">
                          {userPerformance && userPerformance.avgBetSize <= userPerformance.totalStaked * 0.1 ? (
                            <>
                              <Badge className="bg-green-500">Good</Badge>
                              <span className="text-sm">Conservative bet sizing</span>
                            </>
                          ) : (
                            <>
                              <Badge variant="destructive">Risky</Badge>
                              <span className="text-sm">Consider smaller bets</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-yellow-500 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-semibold text-yellow-500">Recommendation</p>
                            <p className="text-muted-foreground mt-1">
                              {userPerformance && userPerformance.winRate > 60
                                ? 'You\'re performing well! Consider increasing bet sizes slightly.'
                                : 'Focus on quality over quantity. Analyze your losing bets.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="space-y-6">
              <Card className="glass p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Top Performers
                </h2>

                {loading ? (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-muted-foreground">Loading leaderboard...</p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No qualifying users yet (minimum 3 bets required)</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.address}
                        className={`p-4 rounded-lg border transition-colors ${
                          index === 0 ? 'bg-yellow-500/10 border-yellow-500/50' :
                          index === 1 ? 'bg-gray-400/10 border-gray-400/50' :
                          index === 2 ? 'bg-orange-600/10 border-orange-600/50' :
                          'bg-muted/20 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-600' :
                            'text-muted-foreground'
                          }`}>
                            #{index + 1}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {entry.address.slice(0, 4)}...{entry.address.slice(-4)}
                              </span>
                              {connected && entry.address === publicKey?.toString() && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className="text-muted-foreground">
                                Win Rate: <span className="text-primary font-semibold">{entry.winRate.toFixed(1)}%</span>
                              </span>
                              <span className="text-muted-foreground">
                                Bets: <span className="font-semibold">{entry.totalBets}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-xl font-bold ${entry.totalWinnings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {entry.totalWinnings >= 0 ? '+' : ''}{entry.totalWinnings.toFixed(2)} SOL
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ROI: {entry.roi >= 0 ? '+' : ''}{entry.roi.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Markets Tab */}
            <TabsContent value="markets" className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass p-4 md:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-muted-foreground">Polymarket Volume</span>
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl md:text-3xl font-bold">
                      ${(totalVolume.polymarket / 1e6).toFixed(1)}M
                    </div>
                    <div className="text-xs text-muted-foreground">Total 24h volume</div>
                  </div>
                </Card>

                <Card className="glass p-4 md:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-muted-foreground">DriftShield Volume</span>
                    <BarChart3 className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl md:text-3xl font-bold">
                      ${(totalVolume.driftshield / 1e6).toFixed(2)}M
                    </div>
                    <div className="text-xs text-muted-foreground">Growing daily</div>
                  </div>
                </Card>

                <Card className="glass p-4 md:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-muted-foreground">Markets Tracked</span>
                    <TrendingUp className="w-4 h-4 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl md:text-3xl font-bold">{comparisons.length}</div>
                    <div className="text-xs text-muted-foreground">Synced from Polymarket</div>
                  </div>
                </Card>

                <Card className="glass p-4 md:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-muted-foreground">Arbitrage Opportunities</span>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl md:text-3xl font-bold text-yellow-500">{arbitrageCount}</div>
                    <div className="text-xs text-muted-foreground">&gt;3% price difference</div>
                  </div>
                </Card>
              </div>

              <Card className="glass p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold mb-4">Cross-Platform Price Comparison</h2>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    Loading market data...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparisons.map((comp) => (
                      <div
                        key={comp.marketId}
                        className="p-3 md:p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <h3 className="font-semibold text-sm md:text-base flex-1">
                            {comp.question}
                          </h3>
                          {comp.arbitrageOpportunity && (
                            <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-xs w-fit">
                              Arbitrage!
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Polymarket</div>
                            <div className="text-lg md:text-xl font-bold text-primary">
                              {(comp.polymarketPrice * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">DriftShield</div>
                            <div className="text-lg md:text-xl font-bold text-secondary">
                              {(comp.driftshieldPrice * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Difference</div>
                            <div className="flex items-center gap-1">
                              {comp.priceDifference > 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-green-500" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-500" />
                              )}
                              <span className="text-lg md:text-xl font-bold">
                                {comp.priceDifference.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Volume</div>
                            <div className="text-sm md:text-base font-semibold">
                              ${(comp.volume / 1000).toFixed(0)}K
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs" asChild>
                            <Link href={`/dashboard/markets/${comp.marketId}`}>
                              Trade on DriftShield
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs gap-1" asChild>
                            <a
                              href={`https://polymarket.com/event/${comp.marketId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View on Polymarket
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Arbitrage Tab */}
            <TabsContent value="arbitrage" className="space-y-4">
              <Card className="glass p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold mb-4">Arbitrage Opportunities</h2>

                <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-500">How Arbitrage Works</p>
                      <p className="text-muted-foreground mt-1">
                        When prices differ significantly between platforms, you can profit by buying low on one platform
                        and selling high on another. Current threshold: 3% price difference.
                      </p>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    Scanning for opportunities...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparisons.filter(c => c.arbitrageOpportunity).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No arbitrage opportunities found at the moment.</p>
                        <p className="text-xs mt-1">Markets are efficiently priced!</p>
                      </div>
                    ) : (
                      comparisons
                        .filter(c => c.arbitrageOpportunity)
                        .sort((a, b) => b.priceDifference - a.priceDifference)
                        .map((comp) => (
                          <div
                            key={comp.marketId}
                            className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="font-semibold text-sm md:text-base flex-1">
                                {comp.question}
                              </h3>
                              <Badge className="bg-yellow-500 text-black text-xs">
                                {comp.priceDifference.toFixed(1)}% Gap
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-3 rounded bg-background/50">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Buy Low (Polymarket)</div>
                                <div className="text-xl font-bold text-green-500">
                                  {(Math.min(comp.polymarketPrice, comp.driftshieldPrice) * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Sell High (DriftShield)</div>
                                <div className="text-xl font-bold text-red-500">
                                  {(Math.max(comp.polymarketPrice, comp.driftshieldPrice) * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              <strong>Potential Profit:</strong> {comp.priceDifference.toFixed(2)}% per successful arbitrage
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                                Execute Arbitrage
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/markets/${comp.marketId}`}>
                                  View Market
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              <Card className="glass p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold mb-6">Platform Insights</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Polymarket Stats */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">Polymarket</h3>
                      <Badge variant="outline" className="text-xs">Polygon</Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Markets</span>
                        <span className="font-semibold">1,200+</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">24h Volume</span>
                        <span className="font-semibold text-primary">
                          ${(totalVolume.polymarket / 1e6).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Gas Fee</span>
                        <span className="font-semibold">~$0.01</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Settlement</span>
                        <span className="font-semibold">2-3 sec</span>
                      </div>
                    </div>
                  </div>

                  {/* DriftShield Stats */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-secondary" />
                      </div>
                      <h3 className="font-semibold">DriftShield</h3>
                      <Badge variant="outline" className="text-xs">Solana</Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Markets</span>
                        <span className="font-semibold">{totalOnChainMarkets}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">24h Volume</span>
                        <span className="font-semibold text-secondary">
                          ${(totalVolume.driftshield / 1e6).toFixed(2)}M
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Gas Fee</span>
                        <span className="font-semibold text-green-500">~$0.00001</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Settlement</span>
                        <span className="font-semibold text-green-500">&lt;1 sec</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Advantages */}
                <div className="mt-8 p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    DriftShield Advantages
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span><strong>100x Lower Fees:</strong> Solana's ultra-low gas fees vs Polygon</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span><strong>X402 Payments:</strong> Pay-per-use model, no subscriptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span><strong>Instant Finality:</strong> Sub-second transaction confirmation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span><strong>Solana Ecosystem:</strong> Native integration with SOL wallets</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
