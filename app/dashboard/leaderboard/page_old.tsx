"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingUp, Medal, Crown, Award, Activity } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { PROGRAM_ID } from "@/lib/solana/prediction-bets"
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import IDL from '@/lib/solana/prediction_bets_idl.json'

interface TraderStats {
  address: string
  totalBets: number
  totalStaked: number
  rank: number
}

interface MarketStats {
  marketId: string
  title: string
  totalVolume: number
  totalBets: number
  rank: number
}

export default function LeaderboardPage() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [topTraders, setTopTraders] = useState<TraderStats[]>([])
  const [topMarkets, setTopMarkets] = useState<MarketStats[]>([])
  const [loading, setLoading] = useState(true)
  const [yourRank, setYourRank] = useState<number | null>(null)
  const [yourStats, setYourStats] = useState({ bets: 0, staked: 0 })

  useEffect(() => {
    fetchLeaderboardData()
  }, [publicKey])

  const fetchLeaderboardData = async () => {
    setLoading(true)
    try {
      // Create a dummy wallet for reading
      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      }

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' })
      const program = new Program(IDL as any, provider)

      // Fetch all bet accounts
      const betAccounts = await program.account.bet.all()

      // Fetch all market accounts for market data
      const marketAccounts = await program.account.market.all()

      // Aggregate trader stats
      const traderMap = new Map<string, { bets: number, staked: number }>()
      const marketMap = new Map<string, { title: string, volume: number, bets: number }>()

      // Process bets
      betAccounts.forEach((bet: any) => {
        const betData = bet.account
        const userKey = betData.user.toString()
        const marketId = betData.marketId
        const amount = betData.amount.toNumber() / 1e9 // Convert lamports to SOL

        // Aggregate trader stats
        if (!traderMap.has(userKey)) {
          traderMap.set(userKey, { bets: 0, staked: 0 })
        }
        const stats = traderMap.get(userKey)!
        stats.bets += 1
        stats.staked += amount

        // Aggregate market stats
        if (!marketMap.has(marketId)) {
          marketMap.set(marketId, { title: '', volume: 0, bets: 0 })
        }
        const marketStats = marketMap.get(marketId)!
        marketStats.volume += amount
        marketStats.bets += 1
      })

      // Add market titles
      marketAccounts.forEach((market: any) => {
        const marketData = market.account
        const marketId = marketData.marketId
        if (marketMap.has(marketId)) {
          marketMap.get(marketId)!.title = marketData.title
        }
      })

      // Convert traders to sorted array
      const sortedTraders = Array.from(traderMap.entries())
        .map(([address, stats]) => ({
          address,
          totalBets: stats.bets,
          totalStaked: stats.staked,
        }))
        .sort((a, b) => b.totalStaked - a.totalStaked) // Sort by total staked

      const traders: TraderStats[] = sortedTraders
        .slice(0, 20)
        .map((trader, index) => ({
          address: trader.address.slice(0, 8) + '...' + trader.address.slice(-4),
          totalBets: trader.totalBets,
          totalStaked: parseFloat(trader.totalStaked.toFixed(4)),
          rank: index + 1
        }))

      setTopTraders(traders)

      // Convert markets to sorted array
      const sortedMarkets = Array.from(marketMap.entries())
        .map(([marketId, stats]) => ({
          marketId,
          title: stats.title || 'Unknown Market',
          totalVolume: stats.volume,
          totalBets: stats.bets,
        }))
        .sort((a, b) => b.totalVolume - a.totalVolume)

      const markets: MarketStats[] = sortedMarkets
        .slice(0, 10)
        .map((market, index) => ({
          marketId: market.marketId.slice(0, 8) + '...',
          title: market.title,
          totalVolume: parseFloat(market.totalVolume.toFixed(4)),
          totalBets: market.totalBets,
          rank: index + 1
        }))

      setTopMarkets(markets)

      // Find user rank if connected
      if (publicKey) {
        const userKey = publicKey.toString()
        const userIndex = sortedTraders.findIndex(t => t.address === userKey)
        if (userIndex !== -1) {
          setYourRank(userIndex + 1)
          setYourStats({
            bets: sortedTraders[userIndex].totalBets,
            staked: parseFloat(sortedTraders[userIndex].totalStaked.toFixed(4))
          })
        }
      }

    } catch (error) {
      // Silently handle errors
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
              <h1 className="text-4xl font-bold">Leaderboard</h1>
              <p className="text-muted-foreground mt-1">Top traders on DriftShield prediction markets</p>
            </div>
            <Button variant="outline" className="gap-2 bg-transparent" onClick={fetchLeaderboardData}>
              <Trophy className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Your Rank */}
          {publicKey && yourRank && (
            <Card className="glass-strong p-4 md:p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs md:text-sm text-muted-foreground">Your Rank</div>
                      <div className="text-2xl md:text-3xl font-bold">#{yourRank}</div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {yourRank <= 10 ? 'Top Trader' : 'Active Trader'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-6 text-center">
                    <div>
                      <div className="text-xs md:text-sm text-muted-foreground">Bets</div>
                      <div className="text-lg md:text-xl font-bold">{yourStats.bets}</div>
                    </div>
                    <div>
                      <div className="text-xs md:text-sm text-muted-foreground">Staked</div>
                      <div className="text-lg md:text-xl font-bold text-secondary">{yourStats.staked} SOL</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="traders" className="space-y-6">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="traders">Top Traders</TabsTrigger>
              <TabsTrigger value="markets">Top Markets</TabsTrigger>
            </TabsList>

            <TabsContent value="traders" className="space-y-4">
              {loading ? (
                <Card className="glass p-8 text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading leaderboard data...</p>
                </Card>
              ) : topTraders.length === 0 ? (
                <Card className="glass p-8 text-center">
                  <p className="text-muted-foreground">No trading activity yet. Be the first to place a bet!</p>
                </Card>
              ) : (
                <>
                  {/* Top 3 Podium */}
                  {topTraders.length >= 3 && (
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      {topTraders.slice(0, 3).map((trader, i) => (
                        <Card
                          key={trader.rank}
                          className={`glass p-6 space-y-4 ${
                            i === 0
                              ? "md:order-2 border-primary/50 bg-primary/5"
                              : i === 1
                                ? "md:order-1 border-secondary/50 bg-secondary/5"
                                : "md:order-3 border-accent/50 bg-accent/5"
                          }`}
                        >
                          <div className="text-center space-y-3">
                            <div className="flex justify-center">
                              {i === 0 ? (
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                                  <Crown className="w-10 h-10 text-primary" />
                                </div>
                              ) : i === 1 ? (
                                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
                                  <Medal className="w-8 h-8 text-secondary" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                                  <Award className="w-8 h-8 text-accent" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-2xl font-bold">#{trader.rank}</div>
                              <div className="text-xs text-muted-foreground font-mono">{trader.address}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Bets</span>
                                <span className="font-bold">{trader.totalBets}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Staked</span>
                                <span className="font-semibold text-secondary">{trader.totalStaked} SOL</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Rest of Leaderboard */}
                  <Card className="glass p-4 md:p-6 space-y-4">
                    <h2 className="text-lg md:text-xl font-bold">All Traders</h2>
                    <div className="space-y-2">
                      {topTraders.map((trader) => (
                        <div
                          key={trader.rank}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary text-sm md:text-base flex-shrink-0">
                              #{trader.rank}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs md:text-sm text-muted-foreground font-mono truncate">{trader.address}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 md:gap-6 pl-13 sm:pl-0">
                            <div className="text-right">
                              <div className="text-xs md:text-sm text-muted-foreground">Bets</div>
                              <div className="text-sm md:text-base font-bold">{trader.totalBets}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs md:text-sm text-muted-foreground">Staked</div>
                              <div className="text-sm md:text-base font-semibold text-secondary">{trader.totalStaked} SOL</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="markets" className="space-y-4">
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xl font-bold">Top Markets by Volume</h2>
                {loading ? (
                  <div className="p-8 text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading market data...</p>
                  </div>
                ) : topMarkets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No markets created yet. Create the first market!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topMarkets.map((market) => (
                      <div
                        key={market.marketId}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary">
                            #{market.rank}
                          </div>
                          <div>
                            <div className="font-semibold">{market.title}</div>
                            <div className="text-sm text-muted-foreground font-mono">{market.marketId}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Volume</div>
                            <div className="font-bold text-secondary">{market.totalVolume} SOL</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Bets</div>
                            <div className="font-semibold">{market.totalBets}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
