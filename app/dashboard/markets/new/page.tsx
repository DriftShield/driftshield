"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Info, Loader2, AlertTriangle, X } from "lucide-react"
import Link from "next/link"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { initializeMarket, getMarketPDA } from "@/lib/solana/prediction-bets"
import { v4 as uuidv4 } from 'uuid'
import { isAdmin } from "@/lib/constants/admin"

export default function NewMarketPage() {
  const router = useRouter()
  const wallet = useWallet()
  const { connected, publicKey, signTransaction } = wallet
  const { connection } = useConnection()

  // Force a re-render when wallet state changes
  const [walletReady, setWalletReady] = useState(false)

  useEffect(() => {
    setWalletReady(connected && !!publicKey)
  }, [connected, publicKey])

  const userIsAdmin = isAdmin(publicKey?.toString())

  const [question, setQuestion] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Other")
  const [duration, setDuration] = useState("30")
  const [customEndDate, setCustomEndDate] = useState("")
  const [creating, setCreating] = useState(false)

  // Multi-outcome support
  const [marketType, setMarketType] = useState<'binary' | 'multi'>('binary')
  const [outcomes, setOutcomes] = useState<string[]>(['Yes', 'No'])

  // Update outcomes when market type changes
  useEffect(() => {
    if (marketType === 'binary') {
      setOutcomes(['Yes', 'No'])
    } else {
      // Start with 3 empty outcomes for multi-outcome
      setOutcomes(['', '', ''])
    }
  }, [marketType])

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected || !publicKey) {
      alert('Please connect your wallet first')
      return
    }

    if (!question.trim()) {
      alert('Please enter a market question')
      return
    }

    // Validate outcomes
    const validOutcomes = outcomes.filter(o => o.trim().length > 0)
    if (validOutcomes.length < 2) {
      alert('Please provide at least 2 outcomes')
      return
    }
    if (validOutcomes.length > 10) {
      alert('Maximum 10 outcomes allowed')
      return
    }

    setCreating(true)

    // Generate unique market ID outside try block so it's accessible in catch
    const marketId = uuidv4().replace(/-/g, '').slice(0, 16)

    try {
      // Calculate end timestamp
      let endTimestamp: number
      if (duration === "custom") {
        if (!customEndDate) {
          alert('Please select a custom end date')
          setCreating(false)
          return
        }
        endTimestamp = Math.floor(new Date(customEndDate).getTime() / 1000)
      } else {
        const days = parseFloat(duration)
        endTimestamp = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60)
      }

      // Check if end date is in the future (allow at least 1 minute from now)
      const nowTimestamp = Math.floor(Date.now() / 1000)
      if (endTimestamp <= nowTimestamp + 60) {
        alert('End date must be at least 1 minute in the future')
        setCreating(false)
        return
      }

      // Initialize market on-chain
      if (!signTransaction) {
        throw new Error('Wallet does not support signing transactions. Please use a different wallet.');
      }

      const signature = await initializeMarket(
        connection,
        { publicKey, signTransaction, connected } as any,
        marketId,
        question.slice(0, 200), // Limit title to 200 chars
        validOutcomes, // Pass outcomes array
        endTimestamp
      )

      alert(`Market created successfully! Transaction: ${signature}`)

      // Redirect to markets page
      router.push('/dashboard/markets')
    } catch (error: any) {
      // Check error message in multiple possible locations
      const errorMsg = error.message || error.transactionMessage || JSON.stringify(error)

      // Check if market was actually created despite error
      if (errorMsg?.includes('already been processed')) {
        // Transaction was likely successful, check if market exists
        try {
          const [marketPDA] = getMarketPDA(marketId)
          const accountInfo = await connection.getAccountInfo(marketPDA)

          if (accountInfo) {
            // Market exists! Transaction was successful
            alert(`Market created successfully! Transaction was processed.\nMarket ID: ${marketId}`)
            router.push('/dashboard/markets')
            return
          }
        } catch (checkError) {
          // Silently ignore check errors
        }

        alert('Transaction may have been processed. Please check the markets page.')
        router.push('/dashboard/markets')
      } else if (errorMsg?.includes('already exists')) {
        alert('A market with this ID already exists. Please try again.')
      } else {
        alert(`Failed to create market: ${errorMsg}`)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
          {/* Debug wallet state - REMOVE IN PRODUCTION */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded text-xs space-y-1">
              <div><strong>Solana Wallet Adapter:</strong> connected={connected.toString()}, publicKey={publicKey?.toString().slice(0, 8)}..., hasSignTx={!!signTransaction ? 'yes' : 'no'}</div>
              <div><strong>Wallet Ready:</strong> {walletReady.toString()}</div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/markets">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create Prediction Market</h1>
              <p className="text-muted-foreground mt-1">Let traders bet on your model's performance</p>
            </div>
          </div>

          {/* Access Denied for Non-Admins */}
          {!userIsAdmin && (
            <Card className="glass p-6 border-destructive/50 bg-destructive/5">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive">Access Denied</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only administrators can create new markets. Users can place bets and claim payouts on existing markets.
                  </p>
                  <Button className="mt-4" variant="outline" asChild>
                    <Link href="/dashboard/markets">
                      View Available Markets
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Info Banner */}
          {userIsAdmin && (
            <Card className="glass p-4 border-primary/50 bg-primary/5">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold">How Prediction Markets Work</p>
                  <p className="text-muted-foreground">
                    Create a binary (Yes/No) or multi-outcome market about any future event. Users bet with SOL using X402 payments,
                    and winners get paid when the market resolves. Markets are stored on Solana blockchain.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Form */}
          {userIsAdmin && (
            <Card className="glass p-6 space-y-6">
            <form onSubmit={handleCreateMarket} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Market Question *</Label>
                <Input
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Will Bitcoin reach $100k by end of 2025?"
                  className="bg-background/50"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {marketType === 'binary'
                    ? 'Must be a yes/no question that can be objectively resolved'
                    : 'Must be a question with multiple possible outcomes'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketType">Market Type *</Label>
                <select
                  id="marketType"
                  value={marketType}
                  onChange={(e) => setMarketType(e.target.value as 'binary' | 'multi')}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background/50 text-sm"
                >
                  <option value="binary">Binary (Yes/No)</option>
                  <option value="multi">Multi-Outcome (3-10 choices)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {marketType === 'binary'
                    ? 'Two outcomes: Yes and No'
                    : 'Multiple possible outcomes for the market'}
                </p>
              </div>

              {marketType === 'multi' && (
                <div className="space-y-2">
                  <Label>Outcomes * (2-10 required)</Label>
                  <div className="space-y-2">
                    {outcomes.map((outcome, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={outcome}
                          onChange={(e) => {
                            const newOutcomes = [...outcomes]
                            newOutcomes[index] = e.target.value
                            setOutcomes(newOutcomes)
                          }}
                          placeholder={`Outcome ${index + 1}`}
                          className="bg-background/50"
                        />
                        {outcomes.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setOutcomes(outcomes.filter((_, i) => i !== index))
                            }}
                            className="flex-shrink-0"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {outcomes.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOutcomes([...outcomes, ''])}
                      className="w-full bg-transparent"
                    >
                      + Add Outcome
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Add between 2 and 10 possible outcomes for this market
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description / Resolution Criteria</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain how this market will be resolved and what data sources will be used..."
                  rows={4}
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the criteria, timeframe, and data sources
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background/50 text-sm"
                  >
                    <option>Politics</option>
                    <option>Crypto</option>
                    <option>Sports</option>
                    <option>Science</option>
                    <option>Economy</option>
                    <option>Entertainment</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Market Duration</Label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background/50 text-sm"
                  >
                    <option value="0.007">10 minutes (testing)</option>
                    <option value="0.042">1 hour (testing)</option>
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                    <option value="custom">Custom date</option>
                  </select>
                </div>
              </div>

              {duration === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customEndDate">Custom End Date</Label>
                  <Input
                    id="customEndDate"
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-background/50"
                    required={duration === "custom"}
                  />
                </div>
              )}

              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <h3 className="font-semibold text-sm">Market Creation</h3>
                <p className="text-xs text-muted-foreground">
                  Creating a market on Solana is free! You only pay gas fees (~0.00001 SOL).
                </p>
              </div>

              {!connected && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/50 space-y-3">
                  <p className="text-sm text-foreground">
                    <strong>Connect your Solana wallet to create a market</strong>
                  </p>
                  <WalletMultiButton className="!bg-primary hover:!bg-primary/90" />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-transparent" asChild type="button">
                  <Link href="/dashboard/markets">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!connected || creating || !question.trim()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Market'
                  )}
                </Button>
              </div>
            </form>
          </Card>
          )}
        </div>
      </div>
    </div>
  )
}
