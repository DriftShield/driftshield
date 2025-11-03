"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  Filter,
  Activity,
  ExternalLink,
} from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { PROGRAM_ID, getMarketPDA } from "@/lib/solana/prediction-bets"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import Link from "next/link"
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import IDL from '@/lib/solana/prediction_bets_idl.json'

interface BetData {
  marketId: string
  marketTitle: string
  outcome: string
  amount: number
  timestamp: Date
  isClaimed: boolean
  isResolved: boolean
  winningOutcome: string | null
  isWinner: boolean
  status: 'active' | 'won' | 'lost' | 'claimed'
  signature?: string
}

export default function MyBetsPage() {
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const [bets, setBets] = useState<BetData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'won' | 'lost'>('all')

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserBets()
    }
  }, [connected, publicKey])

  const fetchUserBets = async () => {
    if (!publicKey) return

    setLoading(true)
    try {
      // Create provider for reading
      const dummyWallet = {
        publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      }
      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' })
      const program = new Program(IDL as any, provider)

      console.log('Fetching bets for user:', publicKey.toBase58())

      // OPTIMIZED: Fetch all bet accounts for this user in ONE query
      const betAccounts = await program.account.bet.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: publicKey.toBase58(),
          }
        }
      ])

      console.log('Found total bets for user:', betAccounts.length)

      if (betAccounts.length === 0) {
        setBets([])
        setLoading(false)
        return
      }

      // Collect unique market public keys from all bets
      const marketPubkeys = new Set(betAccounts.map(bet => (bet.account as any).market.toBase58()))
      console.log('Found unique markets:', marketPubkeys.size)

      // Fetch only the markets that user has bet on
      const marketDataMap = new Map()
      for (const marketPubkeyStr of marketPubkeys) {
        try {
          const marketPubkey = new PublicKey(marketPubkeyStr)
          const marketData = await program.account.market.fetch(marketPubkey)
          marketDataMap.set(marketPubkeyStr, marketData)
        } catch (e) {
          console.log('Error fetching market:', marketPubkeyStr, e)
        }
      }

      // Process all bets
      const userBets: BetData[] = []
      for (const betAccount of betAccounts) {
        try {
          const betData = betAccount.account as any
          const marketPubkeyStr = betData.market.toBase58()
          const marketData = marketDataMap.get(marketPubkeyStr)

          if (!marketData) continue

          const outcome = betData.outcome.yes ? 'YES' : 'NO'
          const isResolved = (marketData as any).isResolved
          let winningOutcome = null
          let isWinner = false

          if (isResolved) {
            const winOutcome = (marketData as any).winningOutcome
            winningOutcome = winOutcome?.yes ? 'YES' : 'NO'
            isWinner = outcome === winningOutcome
          }

          let status: 'active' | 'won' | 'lost' | 'claimed' = 'active'
          if (isResolved) {
            if (betData.isClaimed) {
              status = 'claimed'
            } else if (isWinner) {
              status = 'won'
            } else {
              status = 'lost'
            }
          }

          userBets.push({
            marketId: betData.marketId,
            marketTitle: (marketData as any).title || betData.marketId,
            outcome,
            amount: betData.amount.toNumber() / LAMPORTS_PER_SOL,
            timestamp: new Date(betData.timestamp.toNumber() * 1000),
            isClaimed: betData.isClaimed,
            isResolved,
            winningOutcome,
            isWinner,
            status,
          })
        } catch (e) {
          console.log('Error processing bet:', e)
        }
      }

      console.log('Total bets processed:', userBets.length)

      // Sort by timestamp (newest first)
      userBets.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      setBets(userBets)
    } catch (error) {
      console.error('Failed to fetch user bets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBets = bets
    .filter(bet => {
      // Filter by status
      if (filterStatus !== 'all' && bet.status !== filterStatus) {
        return false
      }
      // Filter by search query
      if (searchQuery && !bet.marketTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })

  const stats = {
    total: bets.length,
    active: bets.filter(b => b.status === 'active').length,
    won: bets.filter(b => b.status === 'won' || b.status === 'claimed').length,
    lost: bets.filter(b => b.status === 'lost').length,
    totalStaked: bets.reduce((sum, b) => sum + b.amount, 0),
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <Card className="glass p-8 text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">Please connect your wallet to view your betting history</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">My Bets</h1>
              <p className="text-muted-foreground mt-1">Track all your betting activity</p>
            </div>
            <Button onClick={fetchUserBets} variant="outline" className="gap-2 bg-transparent">
              <Activity className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="glass p-4">
              <div className="text-sm text-muted-foreground">Total Bets</div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-sm text-muted-foreground">Active</div>
              <div className="text-2xl font-bold mt-1 text-primary">{stats.active}</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-sm text-muted-foreground">Won</div>
              <div className="text-2xl font-bold mt-1 text-secondary">{stats.won}</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-sm text-muted-foreground">Lost</div>
              <div className="text-2xl font-bold mt-1 text-destructive">{stats.lost}</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-sm text-muted-foreground">Total Staked</div>
              <div className="text-2xl font-bold mt-1">{stats.totalStaked.toFixed(2)} SOL</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="glass p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                  className="bg-transparent"
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('active')}
                  className="bg-transparent"
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === 'won' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('won')}
                  className="bg-transparent"
                >
                  Won
                </Button>
                <Button
                  variant={filterStatus === 'lost' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('lost')}
                  className="bg-transparent"
                >
                  Lost
                </Button>
              </div>
            </div>
          </Card>

          {/* Bets List */}
          <Card className="glass p-6 space-y-4">
            {loading ? (
              <div className="p-8 text-center">
                <Activity className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading your bets...</p>
              </div>
            ) : filteredBets.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery || filterStatus !== 'all'
                    ? 'No bets match your filters'
                    : 'You haven\'t placed any bets yet. Browse markets to get started!'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/markets">Browse Markets</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBets.map((bet, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border transition-colors ${
                      bet.status === 'won' || bet.status === 'claimed'
                        ? 'bg-secondary/10 border-secondary/50'
                        : bet.status === 'lost'
                          ? 'bg-destructive/10 border-destructive/50'
                          : 'bg-muted/20 border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Link href={`/dashboard/markets/${bet.marketId}`}>
                            <h3 className="font-semibold hover:text-primary transition-colors">
                              {bet.marketTitle}
                            </h3>
                          </Link>
                          <Badge
                            variant={bet.outcome === 'YES' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {bet.outcome}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{bet.amount.toFixed(4)} SOL</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{bet.timestamp.toLocaleDateString()}</span>
                          </div>
                          {bet.isResolved && (
                            <div className="flex items-center gap-1">
                              {bet.isWinner ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-secondary" />
                                  <span className="text-secondary">Won - {bet.winningOutcome}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-destructive" />
                                  <span className="text-destructive">Lost - {bet.winningOutcome}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {bet.status === 'active' && (
                          <Badge variant="outline" className="bg-primary/10">
                            <Clock className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        {bet.status === 'won' && (
                          <Badge variant="default" className="bg-secondary">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Claimable
                          </Badge>
                        )}
                        {bet.status === 'claimed' && (
                          <Badge variant="secondary">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Claimed
                          </Badge>
                        )}
                        {bet.status === 'lost' && (
                          <Badge variant="destructive">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            Lost
                          </Badge>
                        )}
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                        >
                          <Link href={`/dashboard/markets/${bet.marketId}`}>
                            View Market
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
