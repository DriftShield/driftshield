"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Book,
  Rocket,
  Code,
  Zap,
  Shield,
  Coins,
  TrendingUp,
  Users,
  FileText,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Book className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Documentation</h1>
                <p className="text-muted-foreground mt-1">
                  Complete guide to DriftShield prediction markets
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-muted/30 flex-wrap h-auto">
              <TabsTrigger value="overview" className="gap-2">
                <FileText className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="getting-started" className="gap-2">
                <Rocket className="w-4 h-4" />
                Getting Started
              </TabsTrigger>
              <TabsTrigger value="how-it-works" className="gap-2">
                <Zap className="w-4 h-4" />
                How It Works
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-2">
                <Shield className="w-4 h-4" />
                Features
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-2">
                <Code className="w-4 h-4" />
                API Reference
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    What is DriftShield?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    DriftShield is a decentralized prediction market platform built on Solana that enables users to bet on real-world events.
                    We sync markets from Polymarket and bring them on-chain with ultra-low fees and instant settlement.
                  </p>

                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <Coins className="w-8 h-8 text-primary mb-2" />
                      <h3 className="font-semibold mb-1">583+ Markets</h3>
                      <p className="text-sm text-muted-foreground">
                        Synced from Polymarket on-chain
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                      <Zap className="w-8 h-8 text-secondary mb-2" />
                      <h3 className="font-semibold mb-1">Ultra-Low Fees</h3>
                      <p className="text-sm text-muted-foreground">
                        ~$0.00001 per transaction on Solana
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <Shield className="w-8 h-8 text-accent mb-2" />
                      <h3 className="font-semibold mb-1">Secure & Fast</h3>
                      <p className="text-sm text-muted-foreground">
                        Sub-second finality on Solana
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        title: "Cross-Platform Analytics",
                        description: "Compare prices between Polymarket and DriftShield to find arbitrage opportunities"
                      },
                      {
                        title: "X402 Payment Protocol",
                        description: "Pay-per-use model with 0.002 SOL per bet, no subscriptions required"
                      },
                      {
                        title: "Admin-Controlled Resolution",
                        description: "Only authorized admins can create and resolve markets, ensuring fairness"
                      },
                      {
                        title: "Real-Time Leaderboard",
                        description: "Track top traders and compete for rankings based on on-chain performance"
                      },
                      {
                        title: "Wallet Integration",
                        description: "Seamless integration with Phantom, Solflare, and other Solana wallets"
                      }
                    ].map((feature, index) => (
                      <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Getting Started Tab */}
            <TabsContent value="getting-started" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-primary" />
                    Quick Start Guide
                  </CardTitle>
                  <CardDescription>
                    Get started with DriftShield in 5 easy steps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    {
                      step: 1,
                      title: "Connect Your Wallet",
                      description: "Click 'Connect Wallet' in the top right corner and select your Solana wallet (Phantom, Solflare, etc.)",
                      action: "Go to Wallet Settings",
                      href: "/dashboard/wallet"
                    },
                    {
                      step: 2,
                      title: "Get SOL on Devnet",
                      description: "For testing, get free SOL from the Solana devnet faucet. On mainnet, you'll need real SOL.",
                      code: "solana airdrop 2 <your-wallet-address> --url devnet"
                    },
                    {
                      step: 3,
                      title: "Browse Markets",
                      description: "Explore 583+ prediction markets synced from Polymarket. Filter by category or search for specific topics.",
                      action: "View Markets",
                      href: "/dashboard/markets"
                    },
                    {
                      step: 4,
                      title: "Place Your First Bet",
                      description: "Choose YES or NO, enter the amount (minimum 0.002 SOL), and confirm the transaction in your wallet.",
                      note: "X402 payment of 0.002 SOL is required per bet"
                    },
                    {
                      step: 5,
                      title: "Track Your Bets",
                      description: "Monitor your active positions in the Bets page and claim winnings when markets resolve.",
                      action: "View My Bets",
                      href: "/dashboard/bets"
                    }
                  ].map((item) => (
                    <div key={item.step} className="relative pl-8 pb-6 border-l-2 border-primary/20 last:border-0 last:pb-0">
                      <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                        <span className="text-sm font-bold text-primary">{item.step}</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                        {item.code && (
                          <div className="p-3 rounded-lg bg-black/50 font-mono text-xs overflow-x-auto">
                            <code className="text-green-400">{item.code}</code>
                          </div>
                        )}
                        {item.note && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-500/90">{item.note}</p>
                          </div>
                        )}
                        {item.action && item.href && (
                          <Button variant="outline" size="sm" className="mt-2" asChild>
                            <Link href={item.href}>
                              {item.action}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* How It Works Tab */}
            <TabsContent value="how-it-works" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Platform Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">On-Chain Program</h3>
                    <p className="text-muted-foreground">
                      DriftShield is powered by a Solana smart contract (program) deployed on devnet. The program handles all market operations:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                        <h4 className="font-semibold mb-2">Program ID</h4>
                        <code className="text-xs bg-black/50 p-2 rounded block overflow-x-auto">
                          AsYA2mgp5jV4xiKiebQw7Te1rEnMJmUEyXjhcDsEouRe
                        </code>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                        <h4 className="font-semibold mb-2">Network</h4>
                        <Badge variant="secondary">Solana Devnet</Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          Ready for mainnet deployment
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Market Lifecycle</h3>
                    <div className="space-y-3">
                      {[
                        {
                          phase: "Creation",
                          description: "Markets are synced from Polymarket and created on-chain with extended end dates (30 days from sync)",
                          color: "blue"
                        },
                        {
                          phase: "Active Betting",
                          description: "Users can place YES or NO bets using the placeBet instruction. Each bet requires 0.002 SOL X402 payment",
                          color: "green"
                        },
                        {
                          phase: "Market Closure",
                          description: "When the end date is reached, the market automatically stops accepting new bets",
                          color: "yellow"
                        },
                        {
                          phase: "Resolution",
                          description: "Admin resolves the market based on real-world outcomes using the resolveMarket instruction",
                          color: "purple"
                        },
                        {
                          phase: "Payout",
                          description: "Winners can claim their proportional share of the losing side's bets using claimPayout",
                          color: "pink"
                        }
                      ].map((item, index) => (
                        <div key={index} className="flex gap-3 p-4 rounded-lg bg-muted/20 border border-border/50">
                          <div className={`w-2 h-2 rounded-full bg-${item.color}-500 flex-shrink-0 mt-2`} />
                          <div>
                            <h4 className="font-semibold">{item.phase}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Payout Calculation</h3>
                    <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                      <p className="text-muted-foreground mb-4">
                        DriftShield uses a parimutuel betting system where winners split the total pool:
                      </p>
                      <div className="space-y-2 font-mono text-sm">
                        <div>Total Pool = Total YES Bets + Total NO Bets</div>
                        <div>Your Share = (Your Bet / Winning Side Total) × Total Pool</div>
                        <div className="text-green-500">Profit = Your Share - Your Bet</div>
                      </div>
                      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm font-semibold">Example:</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You bet 1 SOL on YES. Total YES bets: 10 SOL, Total NO bets: 5 SOL.
                          <br />
                          If YES wins: Your payout = (1/10) × 15 = 1.5 SOL (0.5 SOL profit)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Platform Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {[
                    {
                      title: "Cross-Platform Analytics",
                      icon: TrendingUp,
                      description: "Compare prices between Polymarket and DriftShield in real-time to identify arbitrage opportunities",
                      features: [
                        "Side-by-side price comparison for 10+ markets",
                        "Automatic arbitrage detection (>3% threshold)",
                        "Volume tracking across both platforms",
                        "Real-time on-chain data fetching"
                      ]
                    },
                    {
                      title: "X402 Payment Protocol",
                      icon: Coins,
                      description: "Revolutionary HTTP 402 Payment Required standard for instant micropayments on Solana",
                      features: [
                        "Standards-based: Uses official HTTP 402 status code",
                        "Pay-per-bet: 0.002 SOL (~$0.0004) per bet, no subscriptions",
                        "Instant verification: Payment confirmed before bet placement",
                        "4-step flow: Request → Pay → Verify → Execute",
                        "No complex setup: Works with any Solana wallet",
                        "Transparent on-chain: All payments recorded on blockchain"
                      ]
                    },
                    {
                      title: "Leaderboard System",
                      icon: Users,
                      description: "Compete with other traders and track your performance on-chain",
                      features: [
                        "Real-time rankings based on total bets",
                        "Public profile display (optional)",
                        "Win/loss ratio tracking",
                        "Historical performance data"
                      ]
                    },
                    {
                      title: "Wallet Management",
                      icon: Shield,
                      description: "Secure wallet integration with multiple Solana wallet providers",
                      features: [
                        "Support for Phantom, Solflare, and more",
                        "Network switching (devnet/mainnet)",
                        "Slippage tolerance settings",
                        "Auto-approve for small transactions"
                      ]
                    }
                  ].map((feature, index) => (
                    <div key={index} className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{feature.title}</h3>
                          <p className="text-muted-foreground mt-1">{feature.description}</p>
                        </div>
                      </div>
                      <ul className="grid md:grid-cols-2 gap-2 ml-13">
                        {feature.features.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Security Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      {
                        title: "Admin-Only Resolution",
                        description: "Only authorized admins can resolve markets, preventing manipulation"
                      },
                      {
                        title: "On-Chain Verification",
                        description: "All bets and outcomes are stored on Solana blockchain for transparency"
                      },
                      {
                        title: "Emergency Withdrawal",
                        description: "30-day timelock for admin withdrawals as a safety mechanism"
                      },
                      {
                        title: "Wallet Security",
                        description: "Never store private keys - all signing happens in your wallet"
                      }
                    ].map((item, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/20 border border-border/50">
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Reference Tab */}
            <TabsContent value="api" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-primary" />
                    SDK Reference
                  </CardTitle>
                  <CardDescription>
                    TypeScript SDK for interacting with DriftShield
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Installation</h3>
                    <div className="p-4 rounded-lg bg-black/50 font-mono text-sm overflow-x-auto">
                      <code className="text-green-400">
                        npm install @solana/web3.js @coral-xyz/anchor
                      </code>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Core Functions</h3>

                    {[
                      {
                        name: "placeBet",
                        description: "Place a bet on a market outcome",
                        params: [
                          "connection: Connection",
                          "wallet: WalletContextState",
                          "marketId: string",
                          "outcomeIndex: number (0=Yes, 1=No for binary)",
                          "amountSOL: number"
                        ],
                        returns: "Promise<string>",
                        example: `import { placeBet } from '@/lib/solana/prediction-bets'

const tx = await placeBet(
  connection,
  wallet,
  "pm-123456-0",
  0, // 0 for Yes, 1 for No
  0.1 // 0.1 SOL
)`
                      },
                      {
                        name: "claimPayout",
                        description: "Claim winnings from a resolved market",
                        params: [
                          "connection: Connection",
                          "wallet: WalletContextState",
                          "marketId: string",
                          "betIndex: number"
                        ],
                        returns: "Promise<string>",
                        example: `import { claimPayout } from '@/lib/solana/prediction-bets'

const tx = await claimPayout(
  connection,
  wallet,
  "pm-123456-0",
  0 // Your first bet on this market
)`
                      },
                      {
                        name: "getMarketPDA",
                        description: "Get the program-derived address for a market",
                        params: [
                          "marketId: string"
                        ],
                        returns: "[PublicKey, number]",
                        example: `import { getMarketPDA } from '@/lib/solana/prediction-bets'

const [marketPDA, bump] = getMarketPDA("pm-123456-0")
console.log("Market address:", marketPDA.toBase58())`
                      }
                    ].map((func, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-mono font-semibold">{func.name}()</h4>
                          <Badge variant="outline" className="font-mono text-xs">{func.returns}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{func.description}</p>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold">Parameters:</p>
                          <ul className="space-y-1">
                            {func.params.map((param, i) => (
                              <li key={i} className="text-xs font-mono text-muted-foreground pl-4">
                                • {param}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold">Example:</p>
                          <div className="p-3 rounded-lg bg-black/50 font-mono text-xs overflow-x-auto">
                            <pre className="text-green-400">{func.example}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Program Constants</h3>
                    <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">PROGRAM_ID</span>
                          <code className="text-xs bg-black/50 p-1 rounded">
                            AsYA2mgp5jV4xiKiebQw7Te1rEnMJmUEyXjhcDsEouRe
                          </code>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">ADMIN_ADDRESS</span>
                          <code className="text-xs bg-black/50 p-1 rounded">
                            9wfAUGMwbVQ28qZN5iCFffzwbMVpKs1UemazQeHZv3xd
                          </code>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">X402_PAYMENT</span>
                          <code className="text-xs bg-black/50 p-1 rounded">
                            0.002 SOL
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-yellow-500">Development Note</p>
                        <p className="text-muted-foreground mt-1">
                          The current deployment is on Solana devnet. For mainnet deployment, update the connection URL
                          and redeploy the program using <code className="bg-black/50 px-1 rounded">anchor deploy</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>External Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        title: "Solana Explorer (Devnet)",
                        url: "https://solscan.io/?cluster=devnet",
                        description: "View transactions and accounts on devnet"
                      },
                      {
                        title: "Polymarket API",
                        url: "https://docs.polymarket.com",
                        description: "Documentation for Polymarket integration"
                      },
                      {
                        title: "Anchor Framework",
                        url: "https://www.anchor-lang.com",
                        description: "Solana smart contract framework"
                      }
                    ].map((resource, index) => (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors group"
                      >
                        <div>
                          <h4 className="font-semibold group-hover:text-primary transition-colors">
                            {resource.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">{resource.description}</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer CTA */}
          <Card className="glass bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">Ready to start trading?</h3>
                  <p className="text-muted-foreground">
                    Explore 583+ markets and start making predictions today.
                  </p>
                </div>
                <Button size="lg" asChild>
                  <Link href="/dashboard/markets">
                    Browse Markets
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
