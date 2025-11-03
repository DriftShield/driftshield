"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User, TrendingUp, Trophy, Activity, Settings,
  Copy, Check, ExternalLink, Edit2, Save, X, Wallet, RefreshCw
} from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { PROGRAM_ID } from "@/lib/solana/prediction-bets"
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import IDL from '@/lib/solana/prediction_bets_idl.json'
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

interface Bet {
  marketId: string
  marketTitle: string
  outcome: string
  amount: number
  timestamp: number
  claimed: boolean
  payout?: number
}

interface UserProfile {
  username: string
  bio: string
  avatar: string
  twitter: string
  website: string
}

interface DailyData {
  date: string
  profit: number
  bets: number
  cumulative: number
}

interface MarketPerformance {
  marketId: string
  marketTitle: string
  invested: number
  returned: number
  roi: number
  bets: number
}

export default function ProfilePage() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Stats
  const [totalBets, setTotalBets] = useState(0)
  const [totalStaked, setTotalStaked] = useState(0)
  const [totalWon, setTotalWon] = useState(0)
  const [winRate, setWinRate] = useState(0)
  const [rank, setRank] = useState<number | null>(null)
  const [recentBets, setRecentBets] = useState<Bet[]>([])

  // Wallet
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])

  // Portfolio Analytics
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [marketPerformance, setMarketPerformance] = useState<MarketPerformance[]>([])
  const [roi, setRoi] = useState(0)
  const [largestWin, setLargestWin] = useState(0)
  const [largestLoss, setLargestLoss] = useState(0)

  // Profile
  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    bio: "",
    avatar: "",
    twitter: "",
    website: ""
  })

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile)

  useEffect(() => {
    loadProfile()
    fetchUserStats()
    fetchBalance()
    fetchTransactions()
  }, [publicKey])

  const loadProfile = () => {
    if (!publicKey) return
    const saved = localStorage.getItem(`profile_${publicKey.toString()}`)
    if (saved) {
      const loaded = JSON.parse(saved)
      setProfile(loaded)
      setEditedProfile(loaded)
    }
  }

  const saveProfile = () => {
    if (!publicKey) return
    localStorage.setItem(`profile_${publicKey.toString()}`, JSON.stringify(editedProfile))
    setProfile(editedProfile)
    setEditing(false)
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully."
    })
  }

  const fetchUserStats = async () => {
    if (!publicKey) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      }

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' })
      const program = new Program(IDL as any, provider)

      // Fetch user's bets
      const betAccounts = await program.account.bet.all()
      const userBets = betAccounts.filter((bet: any) =>
        bet.account.user.toString() === publicKey.toString()
      )

      // Fetch market data
      const marketAccounts = await program.account.market.all()
      const marketMap = new Map()
      marketAccounts.forEach((market: any) => {
        marketMap.set(market.account.marketId, market.account)
      })

      // Calculate stats
      let staked = 0
      let won = 0
      let winCount = 0
      let maxWin = 0
      let maxLoss = 0
      const bets: Bet[] = []
      const dailyMap = new Map<string, { profit: number, bets: number }>()
      const marketPerformanceMap = new Map<string, { invested: number, returned: number, bets: number, title: string }>()

      userBets.forEach((bet: any) => {
        const betData = bet.account
        const amount = betData.amount.toNumber() / 1e9
        staked += amount

        const market = marketMap.get(betData.marketId)
        if (market) {
          const marketId = betData.marketId
          const marketTitle = market.title || 'Unknown Market'
          const timestamp = betData.timestamp.toNumber()
          const dateStr = new Date(timestamp * 1000).toISOString().split('T')[0]

          // Update market performance map
          if (!marketPerformanceMap.has(marketId)) {
            marketPerformanceMap.set(marketId, { invested: 0, returned: 0, bets: 0, title: marketTitle })
          }
          const marketPerf = marketPerformanceMap.get(marketId)!
          marketPerf.invested += amount
          marketPerf.bets += 1

          let payout = 0

          // Check if bet won
          if (market.isResolved && market.winningOutcome) {
            const userOutcome = betData.outcome.yes ? "Yes" : "No"
            const winningOutcome = market.winningOutcome.yes ? "Yes" : "No"

            if (userOutcome === winningOutcome && betData.isClaimed) {
              // Calculate payout based on pool ratios
              const totalYes = market.totalYesAmount.toNumber() / 1e9
              const totalNo = market.totalNoAmount.toNumber() / 1e9
              const totalPool = totalYes + totalNo

              if (userOutcome === "Yes") {
                payout = (amount / totalYes) * totalPool
              } else {
                payout = (amount / totalNo) * totalPool
              }
              won += payout
              winCount++
              marketPerf.returned += payout

              // Track profit/loss
              const profit = payout - amount
              maxWin = Math.max(maxWin, profit)
              maxLoss = Math.min(maxLoss, profit)

              // Update daily data
              if (!dailyMap.has(dateStr)) {
                dailyMap.set(dateStr, { profit: 0, bets: 0 })
              }
              const daily = dailyMap.get(dateStr)!
              daily.profit += profit
              daily.bets += 1
            }
          }

          bets.push({
            marketId: betData.marketId,
            marketTitle,
            outcome: betData.outcome.yes ? "Yes" : "No",
            amount,
            timestamp,
            claimed: betData.isClaimed,
            payout
          })
        }
      })

      setTotalBets(userBets.length)
      setTotalStaked(staked)
      setTotalWon(won)
      setWinRate(userBets.length > 0 ? (winCount / userBets.length) * 100 : 0)
      setLargestWin(maxWin)
      setLargestLoss(maxLoss)

      // Calculate ROI
      const profit = won - staked
      const calculatedRoi = staked > 0 ? (profit / staked) * 100 : 0
      setRoi(calculatedRoi)

      // Process daily data for chart
      const sortedDates = Array.from(dailyMap.keys()).sort()
      let cumulative = 0
      const dailyDataArray: DailyData[] = sortedDates.map(date => {
        const data = dailyMap.get(date)!
        cumulative += data.profit
        return {
          date,
          profit: data.profit,
          bets: data.bets,
          cumulative,
        }
      })
      setDailyData(dailyDataArray)

      // Process market performance
      const marketPerfArray: MarketPerformance[] = Array.from(marketPerformanceMap.entries())
        .map(([marketId, data]) => ({
          marketId,
          marketTitle: data.title,
          invested: data.invested,
          returned: data.returned,
          roi: data.invested > 0 ? ((data.returned - data.invested) / data.invested) * 100 : 0,
          bets: data.bets,
        }))
        .sort((a, b) => b.roi - a.roi)
      setMarketPerformance(marketPerfArray)

      // Sort bets by timestamp (most recent first)
      bets.sort((a, b) => b.timestamp - a.timestamp)
      setRecentBets(bets.slice(0, 10))

      // Calculate rank
      const allBetAccounts = await program.account.bet.all()
      const traderMap = new Map<string, number>()
      allBetAccounts.forEach((bet: any) => {
        const userKey = bet.account.user.toString()
        const amount = bet.account.amount.toNumber() / 1e9
        traderMap.set(userKey, (traderMap.get(userKey) || 0) + amount)
      })

      const sortedTraders = Array.from(traderMap.entries()).sort((a, b) => b[1] - a[1])
      const userRank = sortedTraders.findIndex(([addr]) => addr === publicKey.toString())
      if (userRank !== -1) {
        setRank(userRank + 1)
      }

    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard"
      })
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const fetchBalance = async () => {
    if (!publicKey) return
    try {
      const bal = await connection.getBalance(publicKey)
      setBalance(bal / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error("Failed to fetch balance:", error)
    }
  }

  const fetchTransactions = async () => {
    if (!publicKey) return
    try {
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 })
      const txs = signatures.map(sig => ({
        signature: sig.signature,
        slot: sig.slot,
        time: sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Unknown',
        status: sig.err ? 'failed' : 'success'
      }))
      setTransactions(txs)
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchBalance(), fetchTransactions(), fetchUserStats()])
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "All data has been updated"
    })
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="lg:pl-64">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <Card className="glass p-12 text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground">
                Connect your wallet to view your profile and trading statistics
              </p>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Profile Header */}
          <Card className="glass p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {profile.username || formatAddress(publicKey.toString())}
                    </h1>
                    {profile.bio && (
                      <p className="text-muted-foreground mt-1">{profile.bio}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-muted/30 px-2 py-1 rounded font-mono">
                        {formatAddress(publicKey.toString())}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyAddress}
                        className="h-6 w-6 p-0"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                    {(profile.twitter || profile.website) && (
                      <div className="flex items-center gap-3 mt-2">
                        {profile.twitter && (
                          <a
                            href={`https://twitter.com/${profile.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            @{profile.twitter} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {profile.website && (
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            Website <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant={editing ? "default" : "outline"}
                  onClick={() => setEditing(!editing)}
                  className="gap-2"
                >
                  {editing ? (
                    <>
                      <X className="w-4 h-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Edit Profile Form */}
          {editing && (
            <Card className="glass p-6">
              <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Your username"
                    value={editedProfile.username}
                    onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself"
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter Handle</Label>
                  <Input
                    id="twitter"
                    placeholder="username (without @)"
                    value={editedProfile.twitter}
                    onChange={(e) => setEditedProfile({ ...editedProfile, twitter: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://yourwebsite.com"
                    value={editedProfile.website}
                    onChange={(e) => setEditedProfile({ ...editedProfile, website: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button onClick={saveProfile} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Profile
                </Button>
              </div>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{totalBets}</div>
                  <div className="text-xs text-muted-foreground">Total Bets</div>
                </div>
              </div>
            </Card>
            <Card className="glass p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-secondary" />
                <div>
                  <div className="text-2xl font-bold">{totalStaked.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">SOL Staked</div>
                </div>
              </div>
            </Card>
            <Card className="glass p-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-accent" />
                <div>
                  <div className="text-2xl font-bold">{winRate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
              </div>
            </Card>
            <Card className="glass p-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">#{rank || '-'}</div>
                  <div className="text-xs text-muted-foreground">Rank</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="activity" className="space-y-6">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="activity">Betting Activity</TabsTrigger>
              <TabsTrigger value="analytics">Portfolio Analytics</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              <Card className="glass p-6">
                <h2 className="text-xl font-bold mb-4">Recent Bets</h2>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : recentBets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No betting activity yet. <Link href="/dashboard/markets" className="text-primary hover:underline">Place your first bet!</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentBets.map((bet, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{bet.marketTitle}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Badge variant={bet.outcome === "Yes" ? "secondary" : "default"} className="text-xs">
                              {bet.outcome}
                            </Badge>
                            <span>{formatDate(bet.timestamp)}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-secondary">{bet.amount.toFixed(4)} SOL</div>
                          {bet.claimed && (
                            <Badge variant="outline" className="text-xs mt-1">Claimed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {/* ROI and Performance */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="glass-strong p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-sm text-muted-foreground mb-2">Total ROI</div>
                    <div className={`text-3xl font-bold ${roi >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Return on investment</div>
                  </div>
                </Card>

                <Card className="glass p-6">
                  <div className="text-sm text-muted-foreground mb-2">Total Profit</div>
                  <div className={`text-3xl font-bold ${(totalWon - totalStaked) >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                    {(totalWon - totalStaked) >= 0 ? '+' : ''}{(totalWon - totalStaked).toFixed(4)} SOL
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ≈ ${((totalWon - totalStaked) * 200).toFixed(2)} USD
                  </div>
                </Card>

                <Card className="glass p-6">
                  <div className="text-sm text-muted-foreground mb-2">Win Rate</div>
                  <div className="text-3xl font-bold">{winRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round(winRate * totalBets / 100)}W / {totalBets - Math.round(winRate * totalBets / 100)}L
                  </div>
                </Card>
              </div>

              {/* Profit Curve */}
              <Card className="glass p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Profit Curve Over Time
                </h3>
                {loading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Loading chart data...
                  </div>
                ) : dailyData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No resolved bets yet. Start betting to see your profit curve!
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-64 relative">
                      <div className="absolute inset-0 flex items-end gap-1">
                        {dailyData.map((day, index) => {
                          const maxProfit = Math.max(...dailyData.map(d => Math.abs(d.cumulative)), 0.01)
                          const height = (Math.abs(day.cumulative) / maxProfit) * 100
                          const isPositive = day.cumulative >= 0

                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                              <div
                                className={`w-full rounded-t transition-all cursor-pointer ${
                                  isPositive ? 'bg-secondary/50 hover:bg-secondary' : 'bg-destructive/50 hover:bg-destructive'
                                }`}
                                style={{ height: `${Math.max(height, 2)}%` }}
                                title={`${day.date}: ${day.cumulative >= 0 ? '+' : ''}${day.cumulative.toFixed(4)} SOL (${day.bets} bets, ${day.profit >= 0 ? '+' : ''}${day.profit.toFixed(4)} SOL)`}
                              />
                              {index % Math.max(1, Math.floor(dailyData.length / 5)) === 0 && (
                                <div className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      Cumulative profit: {dailyData[dailyData.length - 1]?.cumulative >= 0 ? '+' : ''}
                      {dailyData[dailyData.length - 1]?.cumulative.toFixed(4)} SOL • Hover bars for details
                    </div>
                  </div>
                )}
              </Card>

              {/* Best & Worst Bets */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="glass p-6">
                  <h3 className="text-lg font-bold mb-4">Investment Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                      <span className="text-sm">Total Invested</span>
                      <span className="font-bold">{totalStaked.toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                      <span className="text-sm">Total Returned</span>
                      <span className="font-bold text-secondary">{totalWon.toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                      <span className="text-sm font-semibold">Net Profit/Loss</span>
                      <span className={`font-bold ${(totalWon - totalStaked) >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                        {(totalWon - totalStaked) >= 0 ? '+' : ''}{(totalWon - totalStaked).toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="glass p-6">
                  <h3 className="text-lg font-bold mb-4">Best & Worst</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/10">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-secondary" />
                        <span className="text-sm">Largest Win</span>
                      </div>
                      <span className="font-bold text-secondary">+{largestWin.toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-destructive" />
                        <span className="text-sm">Largest Loss</span>
                      </div>
                      <span className="font-bold text-destructive">{largestLoss.toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                      <span className="text-sm">Average Bet Size</span>
                      <span className="font-bold">{(totalStaked / Math.max(totalBets, 1)).toFixed(4)} SOL</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Market Performance */}
              <Card className="glass p-6">
                <h3 className="text-lg font-bold mb-4">Performance by Market</h3>
                {marketPerformance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No resolved markets yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {marketPerformance.slice(0, 5).map((market, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{market.marketTitle}</div>
                          <div className="text-sm text-muted-foreground">
                            {market.bets} bets • {market.invested.toFixed(4)} SOL invested
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-lg font-bold ${market.roi >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                            {market.roi >= 0 ? '+' : ''}{market.roi.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {market.returned.toFixed(4)} SOL returned
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-4">
              {/* Balance Card */}
              <Card className="glass-strong p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Solana Balance</div>
                      <div className="text-5xl font-bold">{balance.toFixed(4)} SOL</div>
                      <div className="text-sm text-muted-foreground">≈ ${(balance * 200).toFixed(2)} USD</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="bg-transparent"
                        onClick={refreshData}
                        disabled={refreshing}
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-border/50">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Total Earned</div>
                      <div className="text-2xl font-bold text-secondary">{totalWon.toFixed(4)} SOL</div>
                      <div className="text-xs text-muted-foreground">From winning bets</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Total Spent</div>
                      <div className="text-2xl font-bold">{totalStaked.toFixed(4)} SOL</div>
                      <div className="text-xs text-muted-foreground">On bets placed</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Network</div>
                      <div className="text-2xl font-bold">Devnet</div>
                      <div className="text-xs text-muted-foreground">Solana testnet</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Wallet Address */}
              <Card className="glass p-6 space-y-4">
                <h2 className="text-xl font-bold">Wallet Address</h2>
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-4 rounded-lg bg-muted/30 font-mono text-sm break-all">
                    {publicKey?.toString()}
                  </div>
                  <Button variant="outline" size="icon" className="bg-transparent" onClick={copyAddress}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-transparent"
                    onClick={() => window.open(`https://solscan.io/account/${publicKey?.toString()}?cluster=devnet`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Solana wallet address on devnet. Use for testing only.
                </p>
              </Card>

              {/* Transactions */}
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Recent Transactions</h2>
                  <Button variant="ghost" size="sm" className="gap-2" onClick={fetchTransactions}>
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No recent transactions found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.signature}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            tx.status === 'success' ? 'bg-secondary/20' : 'bg-destructive/20'
                          }`}>
                            <Activity className={`w-5 h-5 ${tx.status === 'success' ? 'text-secondary' : 'text-destructive'}`} />
                          </div>
                          <div>
                            <div className="font-semibold font-mono text-xs">{tx.signature.slice(0, 20)}...</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>{tx.time}</span>
                              <span>•</span>
                              <span>Slot: {tx.slot}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={tx.status === 'success' ? 'secondary' : 'destructive'} className="text-xs">
                            {tx.status}
                          </Badge>
                          <button
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-1"
                            onClick={() => window.open(`https://solscan.io/tx/${tx.signature}?cluster=devnet`, '_blank')}
                          >
                            View on Solscan
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <Card className="glass p-6">
                <h2 className="text-xl font-bold mb-4">Achievements</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {totalBets >= 1 && (
                    <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg">
                      <Trophy className="w-10 h-10 text-primary" />
                      <div>
                        <div className="font-bold">First Bet</div>
                        <div className="text-sm text-muted-foreground">Placed your first bet</div>
                      </div>
                    </div>
                  )}
                  {totalBets >= 10 && (
                    <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg">
                      <Activity className="w-10 h-10 text-secondary" />
                      <div>
                        <div className="font-bold">Active Trader</div>
                        <div className="text-sm text-muted-foreground">Placed 10+ bets</div>
                      </div>
                    </div>
                  )}
                  {totalStaked >= 1 && (
                    <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg">
                      <TrendingUp className="w-10 h-10 text-accent" />
                      <div>
                        <div className="font-bold">Big Spender</div>
                        <div className="text-sm text-muted-foreground">Staked over 1 SOL</div>
                      </div>
                    </div>
                  )}
                  {rank && rank <= 10 && (
                    <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg">
                      <Trophy className="w-10 h-10 text-primary" />
                      <div>
                        <div className="font-bold">Top 10 Trader</div>
                        <div className="text-sm text-muted-foreground">Ranked in top 10</div>
                      </div>
                    </div>
                  )}
                </div>
                {totalBets === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Start betting to unlock achievements!
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
