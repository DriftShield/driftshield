"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Activity,
} from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

export default function WalletPage() {
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance()
      fetchTransactions()
    }
  }, [connected, publicKey])

  const fetchBalance = async () => {
    if (!publicKey) return
    setLoading(true)
    try {
      const bal = await connection.getBalance(publicKey)
      setBalance(bal / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error("Failed to fetch balance:", error)
    } finally {
      setLoading(false)
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

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58())
      alert("Address copied to clipboard!")
    }
  }

  const totalEarnings = 0 // TODO: Calculate from bet winnings
  const totalSpent = 0 // TODO: Calculate from bets placed

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <Card className="glass p-8 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">Please connect your Solana wallet to view your balance and transactions</p>
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
              <h1 className="text-4xl font-bold">Wallet</h1>
              <p className="text-muted-foreground mt-1">Manage your funds and transactions</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2 bg-transparent" onClick={fetchBalance}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

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
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-border/50">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Earned</div>
                  <div className="text-2xl font-bold text-secondary">{totalEarnings} SOL</div>
                  <div className="text-xs text-muted-foreground">From winning bets</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-2xl font-bold">{totalSpent} SOL</div>
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
                {publicKey?.toBase58()}
              </div>
              <Button variant="outline" size="icon" className="bg-transparent" onClick={copyAddress}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="bg-transparent"
                onClick={() => window.open(`https://explorer.solana.com/address/${publicKey?.toBase58()}?cluster=devnet`, '_blank')}
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
                        onClick={() => window.open(`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`, '_blank')}
                      >
                        View on Explorer
                        <ExternalLink className="w-3 h-3" />
                      </button>
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
