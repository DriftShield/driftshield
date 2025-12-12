import { LandingNav } from "@/components/landing-nav"
import { StatsTicker } from "@/components/stats-ticker"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingUp, Zap, Lock, CheckCircle2, Coins, Globe, Shield, Rocket } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/10 pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="text-sm px-4 py-1.5">
              Powered by Solana • X402 Payments • Fully On-Chain
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight">
              Prediction Markets
              <br />
              <span className="text-primary">On Solana</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance">
              Trade real-world events with X402 payments. Pay-per-bet using X402 protocol.
              All bets recorded on-chain. No subscriptions needed.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8" asChild>
                <Link href="/dashboard/markets">
                  Browse Markets <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent" asChild>
                <Link href="/dashboard/leaderboard">View Leaderboard</Link>
              </Button>
            </div>

            <div className="pt-8">
              <StatsTicker />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why DriftShield?</h2>
            <p className="text-xl text-muted-foreground">
              The first prediction market platform with X402 payments on Solana
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">X402 Payments</h3>
              <p className="text-muted-foreground">
                Pay only $0.0004 per bet. No monthly subscriptions. No commitment.
                Just pay for what you use via the X402 protocol.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>0.002 SOL per bet (~$0.0004)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Instant blockchain verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Pay-per-use, no subscriptions</span>
                </li>
              </ul>
            </Card>

            <Card className="glass p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold">Real-Time Market Data</h3>
              <p className="text-muted-foreground">
                Browse trending prediction markets. Politics, crypto, sports, science, and more.
                Real-time probabilities and volume data.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Live on-chain market data</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>6+ categories to explore</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Search & filter markets easily</span>
                </li>
              </ul>
            </Card>

            <Card className="glass p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold">On-Chain Transparency</h3>
              <p className="text-muted-foreground">
                All bets recorded on Solana blockchain. Fully transparent. Fully verifiable.
                No hidden fees. No centralized control.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Bets stored on Solana (coming soon)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Decentralized & transparent</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Verify all transactions on-chain</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Start betting on real-world events in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-bold">Connect Wallet</h3>
              <p className="text-muted-foreground">
                Connect your Phantom or Solflare wallet. No signup required.
                Get some devnet SOL to test.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-secondary">2</span>
              </div>
              <h3 className="text-xl font-bold">Browse Markets</h3>
              <p className="text-muted-foreground">
                Explore real prediction markets. Filter by category.
                See live probabilities and volume.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-accent">3</span>
              </div>
              <h3 className="text-xl font-bold">Place Bets</h3>
              <p className="text-muted-foreground">
                Pay 0.002 SOL via X402. Transaction verified on-chain.
                Claim winnings when market resolves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powered By</h2>
            <p className="text-xl text-muted-foreground">
              Built on best-in-class Web3 infrastructure
            </p>
          </div>

          <div className="flex items-center justify-center gap-16 overflow-x-auto">
            <div className="text-center">
              <h3 className="font-bold text-lg">Solana</h3>
              <p className="text-sm text-muted-foreground whitespace-nowrap">Lightning-fast blockchain</p>
            </div>

            <div className="w-px h-12 bg-border" />

            <div className="text-center">
              <h3 className="font-bold text-lg">X402</h3>
              <p className="text-sm text-muted-foreground whitespace-nowrap">Micro-payments</p>
            </div>

            <div className="w-px h-12 bg-border" />

            <div className="text-center">
              <h3 className="font-bold text-lg">Real-Time</h3>
              <p className="text-sm text-muted-foreground whitespace-nowrap">Live market data</p>
            </div>

            <div className="w-px h-12 bg-border" />

            <div className="text-center">
              <h3 className="font-bold text-lg">On-Chain</h3>
              <p className="text-sm text-muted-foreground whitespace-nowrap">Transparent & verifiable</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass p-12 text-center space-y-6 border-2 border-primary/50">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-4xl font-bold">Ready to Start Betting?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the future of prediction markets. Pay-per-bet. On-chain. Transparent.
              No subscriptions. Just pure blockchain-powered predictions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8" asChild>
                <Link href="/dashboard/markets">
                  Browse Markets <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent" asChild>
                <Link href="/dashboard/leaderboard">
                  View Leaderboard
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground pt-4">
              Currently on Devnet • Mainnet launch coming soon
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">DriftShield</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Prediction markets on Solana with X402 payments.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Markets</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard/markets" className="hover:text-primary">Browse Markets</Link></li>
                <li><Link href="/dashboard/markets?category=Politics" className="hover:text-primary">Politics</Link></li>
                <li><Link href="/dashboard/markets?category=Crypto" className="hover:text-primary">Crypto</Link></li>
                <li><Link href="/dashboard/markets?category=Sports" className="hover:text-primary">Sports</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard/wallet" className="hover:text-primary">Wallet</Link></li>
                <li><Link href="/dashboard/leaderboard" className="hover:text-primary">Leaderboard</Link></li>
                <li><Link href="/dashboard/bets" className="hover:text-primary">My Bets</Link></li>
                <li><Link href="/dashboard/settings" className="hover:text-primary">Settings</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard/docs" className="hover:text-primary">Documentation</Link></li>
                <li><a href="https://solana.com/developers/guides/getstarted/intro-to-x402" target="_blank" rel="noopener noreferrer" className="hover:text-primary">X402 Protocol</a></li>
                <li><a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Solana</a></li>
                <li><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Phantom Wallet</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            <p>© 2025 DriftShield. Built on Solana with X402. Fully on-chain prediction markets.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
