import { LandingNav } from "@/components/landing-nav"
import { StatsTicker } from "@/components/stats-ticker"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingUp, Zap, Lock, CheckCircle2, Coins, Globe, Shield, Rocket } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-cyan-900/30 selection:text-cyan-200">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-4 overflow-hidden">
        {/* Animated Background Elements */}
        
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none animate-grid-fade" />
        
        {/* Primary Floating Orb - Cyan */}
        <div className="absolute top-20 right-[10%] w-[600px] h-[600px] rounded-full pointer-events-none animate-float">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse-glow" />
        </div>
        
        {/* Secondary Floating Orb - Teal */}
        <div className="absolute top-[40%] left-[5%] w-[400px] h-[400px] rounded-full pointer-events-none animate-float-delayed">
          <div className="absolute inset-0 bg-teal-600/15 rounded-full blur-[100px] animate-pulse-glow-delayed" />
        </div>
        
        {/* Tertiary Floating Orb - Darker */}
        <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] rounded-full pointer-events-none animate-float-slow">
          <div className="absolute inset-0 bg-indigo-900/20 rounded-full blur-[80px] animate-pulse-glow" />
        </div>
        
        {/* Aurora Gradient Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-30 animate-aurora bg-gradient-to-br from-cyan-900/0 via-cyan-500/10 to-teal-900/0" />
        
        {/* Orbiting Particles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none">
          <div className="absolute inset-0 animate-orbit">
            <div className="w-2 h-2 bg-cyan-400/60 rounded-full blur-[2px] shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          </div>
          <div className="absolute inset-0 animate-orbit-reverse">
            <div className="w-1.5 h-1.5 bg-teal-300/40 rounded-full blur-[1px]" />
          </div>
        </div>
        
        {/* Radial Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#030303_70%)] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10 animate-enter">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-500/30 bg-cyan-950/20 rounded-full">
               <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
               <span className="text-xs font-medium text-cyan-300 uppercase tracking-widest font-mono">Powered by Solana • X402</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-medium tracking-tighter text-white font-heading leading-[1.1]">
              Prediction Markets
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-600">On Solana</span>
            </h1>

            <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
              Trade real-world events with X402 payments. Pay-per-bet using X402 protocol.
              All bets recorded on-chain. No subscriptions needed.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <Button size="lg" className="h-14 px-8 text-lg font-medium bg-cyan-500 text-zinc-950 shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] hover:bg-cyan-400 active:scale-95 transition-all" asChild>
                <Link href="/dashboard/markets">
                  Browse Markets <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-medium border border-white/10 bg-zinc-900 text-white hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-zinc-800 active:scale-95 transition-all" asChild>
                <Link href="/dashboard/leaderboard">View Leaderboard</Link>
              </Button>
            </div>

            <div className="pt-16">
              <StatsTicker />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-4 relative overflow-hidden">
        {/* Subtle background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none">
          <div className="absolute inset-0 bg-cyan-900/5 rounded-full blur-[150px] animate-pulse-glow" />
        </div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-medium text-white font-heading mb-6">Why DriftShield?</h2>
            <p className="text-xl text-zinc-400 font-light">
              The first prediction market platform with X402 payments on Solana
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="glass p-8 space-y-6 bg-zinc-950/50 border-white/5 hover:border-cyan-500/30 group">
              <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg shadow-cyan-900/10 group-hover:scale-110 transition-transform duration-300">
                <Coins className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                  <h3 className="text-xl font-medium text-white mb-2">X402 Payments</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Pay only $0.0004 per bet. No monthly subscriptions. No commitment.
                    Just pay for what you use via the X402 protocol.
                  </p>
              </div>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>0.002 SOL per bet (~$0.0004)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>Instant blockchain verification</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>Pay-per-use, no subscriptions</span>
                </li>
              </ul>
            </Card>

            <Card className="glass p-8 space-y-6 bg-zinc-950/50 border-white/5 hover:border-cyan-500/30 group">
              <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg shadow-cyan-900/10 group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                  <h3 className="text-xl font-medium text-white mb-2">Real-Time Market Data</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Browse trending prediction markets. Politics, crypto, sports, science, and more.
                    Real-time probabilities and volume data.
                  </p>
              </div>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>Live on-chain market data</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>6+ categories to explore</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>Search & filter markets easily</span>
                </li>
              </ul>
            </Card>

            <Card className="glass p-8 space-y-6 bg-zinc-950/50 border-white/5 hover:border-cyan-500/30 group">
              <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg shadow-cyan-900/10 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                  <h3 className="text-xl font-medium text-white mb-2">On-Chain Transparency</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    All bets recorded on Solana blockchain. Fully transparent. Fully verifiable.
                    No hidden fees. No centralized control.
                  </p>
              </div>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>Bets stored on Solana (coming soon)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>Decentralized & transparent</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/50" />
                  <span>Verify all transactions on-chain</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-zinc-900/20 border-y border-white/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium text-white font-heading mb-4">How It Works</h2>
            <p className="text-xl text-zinc-400 font-light">
              Start betting on real-world events in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
             {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="text-center space-y-6 relative">
              <div className="w-16 h-16 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center mx-auto relative z-10 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]">
                <span className="text-2xl font-bold text-cyan-400 font-mono">1</span>
              </div>
              <div>
                  <h3 className="text-xl font-medium text-white mb-2">Connect Wallet</h3>
                  <p className="text-zinc-400 font-light text-sm leading-relaxed">
                    Connect your Phantom or Solflare wallet. No signup required.
                    Get some devnet SOL to test.
                  </p>
              </div>
            </div>

            <div className="text-center space-y-6 relative">
              <div className="w-16 h-16 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center mx-auto relative z-10 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]">
                <span className="text-2xl font-bold text-cyan-400 font-mono">2</span>
              </div>
              <div>
                  <h3 className="text-xl font-medium text-white mb-2">Browse Markets</h3>
                  <p className="text-zinc-400 font-light text-sm leading-relaxed">
                    Explore real prediction markets. Filter by category.
                    See live probabilities and volume.
                  </p>
              </div>
            </div>

            <div className="text-center space-y-6 relative">
              <div className="w-16 h-16 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center mx-auto relative z-10 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]">
                <span className="text-2xl font-bold text-cyan-400 font-mono">3</span>
              </div>
              <div>
                  <h3 className="text-xl font-medium text-white mb-2">Place Bets</h3>
                  <p className="text-zinc-400 font-light text-sm leading-relaxed">
                    Pay 0.002 SOL via X402. Transaction verified on-chain.
                    Claim winnings when market resolves.
                  </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium text-white font-heading mb-4">Powered By</h2>
            <p className="text-xl text-zinc-400 font-light">
              Built on best-in-class Web3 infrastructure
            </p>
          </div>

          <div className="flex items-center justify-center gap-16 overflow-x-auto py-4">
            <div className="text-center group">
              <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">Solana</h3>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mt-1">Lightning-fast blockchain</p>
            </div>

            <div className="w-px h-12 bg-white/10" />

            <div className="text-center group">
              <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">X402</h3>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mt-1">Micro-payments</p>
            </div>

            <div className="w-px h-12 bg-white/10" />

            <div className="text-center group">
              <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">Real-Time</h3>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mt-1">Live market data</p>
            </div>

            <div className="w-px h-12 bg-white/10" />

            <div className="text-center group">
              <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">On-Chain</h3>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mt-1">Transparent & verifiable</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyan-900/5" />
        
        {/* Animated background for CTA */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none animate-float">
          <div className="absolute inset-0 bg-cyan-600/10 rounded-full blur-[100px] animate-pulse-glow" />
        </div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none animate-float-delayed">
          <div className="absolute inset-0 bg-teal-500/10 rounded-full blur-[80px] animate-pulse-glow-delayed" />
        </div>
        <div className="container mx-auto max-w-4xl relative z-10">
          <Card className="glass p-12 text-center space-y-8 border border-cyan-500/20 shadow-[0_0_50px_-20px_rgba(6,182,212,0.2)] bg-black/40 backdrop-blur-xl">
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]">
              <Rocket className="w-10 h-10 text-cyan-400" />
            </div>
            
            <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-medium text-white font-heading">Ready to Start Betting?</h2>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
                  Join the future of prediction markets. Pay-per-bet. On-chain. Transparent.
                  No subscriptions. Just pure blockchain-powered predictions.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
              <Button size="lg" className="h-14 px-10 text-lg font-medium bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] transition-all" asChild>
                <Link href="/dashboard/markets">
                  Browse Markets <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-medium border border-white/10 bg-zinc-900 text-white hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-zinc-800 transition-all" asChild>
                <Link href="/dashboard/leaderboard">
                  View Leaderboard
                </Link>
              </Button>
            </div>
            
            <div className="pt-6 border-t border-white/5 mt-8">
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                  Currently on Devnet • Mainnet launch coming soon
                </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-white/5 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-zinc-900 border border-white/5 rounded-sm">
                    <div className="text-zinc-200 font-bold text-lg">D</div>
                </div>
                <span className="font-medium text-xl text-white font-heading">DriftShield</span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Prediction markets on Solana with X402 payments. Fully on-chain, transparent, and decentralized.
              </p>
              <div className="flex gap-4">
                  <Link href="#" className="text-zinc-600 hover:text-white transition-colors"><Shield className="w-5 h-5" /></Link>
                  <Link href="#" className="text-zinc-600 hover:text-white transition-colors"><Globe className="w-5 h-5" /></Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white uppercase tracking-wider mb-6 font-mono">Markets</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><Link href="/dashboard/markets" className="hover:text-cyan-400 transition-colors">Browse Markets</Link></li>
                <li><Link href="/dashboard/markets?category=Politics" className="hover:text-cyan-400 transition-colors">Politics</Link></li>
                <li><Link href="/dashboard/markets?category=Crypto" className="hover:text-cyan-400 transition-colors">Crypto</Link></li>
                <li><Link href="/dashboard/markets?category=Sports" className="hover:text-cyan-400 transition-colors">Sports</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white uppercase tracking-wider mb-6 font-mono">Platform</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><Link href="/dashboard/wallet" className="hover:text-cyan-400 transition-colors">Wallet</Link></li>
                <li><Link href="/dashboard/leaderboard" className="hover:text-cyan-400 transition-colors">Leaderboard</Link></li>
                <li><Link href="/dashboard/bets" className="hover:text-cyan-400 transition-colors">My Bets</Link></li>
                <li><Link href="/dashboard/settings" className="hover:text-cyan-400 transition-colors">Settings</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white uppercase tracking-wider mb-6 font-mono">Resources</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><Link href="/dashboard/docs" className="hover:text-cyan-400 transition-colors">Documentation</Link></li>
                <li><a href="https://solana.com/developers/guides/getstarted/intro-to-x402" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">X402 Protocol</a></li>
                <li><a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Solana</a></li>
                <li><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Phantom Wallet</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-sm text-zinc-600">
            <p>© 2025 DriftShield. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
                <Link href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
