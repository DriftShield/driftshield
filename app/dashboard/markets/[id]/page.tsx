'use client';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Connection } from "@solana/web3.js";
import { getMarketPDA, PROGRAM_ID } from "@/lib/solana/prediction-bets";
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from '@/lib/solana/prediction_bets_idl.json';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Bot,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import Link from "next/link";

import { MarketHeader } from "@/components/markets/market-header";
import { PriceChart } from "@/components/markets/price-chart";
import { RecentTrades } from "@/components/markets/recent-trades";
import { AgentThesisFeed } from "@/components/markets/agent-thesis-feed";
import { MessageSquare } from "lucide-react";

interface Market {
  id: string;
  question: string;
  description: string;
  category?: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  image?: string;
  active: boolean;
  closed: boolean;
}

interface TradeEntry {
  id: string;
  marketId: string;
  outcome: string;
  amount: number;
  timestamp: number;
  txSignature: string;
  status: string;
  price?: number;
}

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: marketId } = use(params);
  const router = useRouter();
  const [connection] = useState(() => new Connection(RPC_URL, "confirmed"));

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [onChainEndDate, setOnChainEndDate] = useState<Date | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [winningOutcome, setWinningOutcome] = useState<string | null>(null);
  const [allTrades, setAllTrades] = useState<TradeEntry[]>([]);

  useEffect(() => {
    fetchMarket();
    fetchOnChainMarketData();
    fetchAllTrades();
  }, [marketId]);

  const fetchMarket = async () => {
    try {
      setLoading(true);
      setError(null);
      const [marketPDA] = getMarketPDA(marketId);

      try {
        const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
        const coder = new BorshAccountsCoder(IDL as any);
        const accountInfo = await connection.getAccountInfo(marketPDA);
        
        if (!accountInfo) {
          setError('Market not found on-chain. Redirecting...');
          setTimeout(() => router.push('/dashboard/markets'), 2000);
          return;
        }

        const marketData = coder.decode('Market', accountInfo.data) as any;
        const endTimestamp = marketData.end_timestamp.toNumber();
        const endDate = new Date(endTimestamp * 1000);
        const numOutcomes = marketData.num_outcomes;
        const outcomeLabels = marketData.outcome_labels.slice(0, numOutcomes);
        const outcomeAmounts = marketData.outcome_amounts.slice(0, numOutcomes);

        let totalVolume = 0;
        for (let i = 0; i < numOutcomes; i++) {
          totalVolume += outcomeAmounts[i].toNumber() / 1e9;
        }

        const prices = [];
        for (let i = 0; i < numOutcomes; i++) {
          const amount = outcomeAmounts[i].toNumber() / 1e9;
          const prob = totalVolume > 0 ? amount / totalVolume : 1 / numOutcomes;
          prices.push(prob.toFixed(2));
        }

        const marketObj = {
          id: marketId,
          question: marketData.title,
          description: 'On-chain prediction market powered by Solana',
          category: 'Other',
          outcomes: outcomeLabels,
          outcomePrices: prices,
          volume: totalVolume.toFixed(3),
          liquidity: totalVolume.toFixed(3),
          endDate: endDate.toISOString(),
          active: endDate.getTime() > Date.now(),
          closed: endDate.getTime() <= Date.now(),
        };

        setMarket(marketObj);
        
        if (!selectedOutcome && outcomeLabels.length > 0) {
          setSelectedOutcome(outcomeLabels[0]);
        }
      } catch (err) {
        console.error('Error parsing market:', err);
        setError('Failed to parse market data');
      }
    } catch (err) {
      console.error('Error fetching market:', err);
      setError('Failed to load market');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnChainMarketData = async () => {
    try {
      const [marketPDA] = getMarketPDA(marketId);
      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);
      const accountInfo = await connection.getAccountInfo(marketPDA);

      if (!accountInfo) return;

      const onChainMarketData = coder.decode('Market', accountInfo.data) as any;
      if (onChainMarketData && onChainMarketData.end_timestamp) {
        const endTimestamp = onChainMarketData.end_timestamp.toNumber();
        setOnChainEndDate(new Date(endTimestamp * 1000));
        setIsResolved(onChainMarketData.is_resolved);

        if (onChainMarketData.winning_outcome !== null && onChainMarketData.winning_outcome !== undefined) {
          const outcomeLabels = onChainMarketData.outcome_labels.slice(0, onChainMarketData.num_outcomes);
          setWinningOutcome(outcomeLabels[onChainMarketData.winning_outcome] || 'Unknown');
        }
      }
    } catch (error) {
      console.error('Error fetching on-chain market data:', error);
    }
  };

  const fetchAllTrades = async () => {
    try {
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);
      const trades: TradeEntry[] = [];
      const [marketPDA] = getMarketPDA(marketId);

      for (const { pubkey, account } of programAccounts) {
        try {
          if (account.data.length < 8 || account.data.length > 10240) continue;
          const betAccount = coder.decode('Bet', account.data) as any;
          if (betAccount.market.toBase58() !== marketPDA.toBase58()) continue;

          trades.push({
            id: pubkey.toBase58(),
            marketId: betAccount.market_id,
            outcome: betAccount.outcome_index === 0 ? 'YES' : 'NO',
            amount: betAccount.amount.toNumber() / 1e9,
            timestamp: betAccount.timestamp.toNumber() * 1000,
            txSignature: '',
            status: betAccount.is_claimed ? 'won' : 'confirmed',
            price: 0.50,
          });
        } catch { continue; }
      }

      trades.sort((a, b) => b.timestamp - a.timestamp);
      setAllTrades(trades);
    } catch (err) {
      console.error('Error fetching all trades:', err);
    }
  };

  const getTimeRemaining = () => {
    if (!market) return "--";
    const end = onChainEndDate || new Date(market.endDate);
    const diff = end.getTime() - Date.now();
    if (diff <= 0) return "Ended";
    
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    const minutes = Math.ceil(diff / (1000 * 60));
    
    if (minutes < 60) return `${minutes}m`;
    if (hours < 48) return `${hours}h`;
    return `${days}d`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2 font-heading text-white">Market Not Found</h2>
        <Button onClick={() => router.push('/dashboard/markets')} className="cut-corners-sm font-mono uppercase text-xs">Back to Markets</Button>
      </div>
    );
  }

  const activeOutcomeIndex = selectedOutcome ? market.outcomes.indexOf(selectedOutcome) : 0;
  const activePrice = parseFloat(market.outcomePrices[activeOutcomeIndex] || "0.5");

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <div className="lg:pl-64 pt-4 md:pt-8">
        <div className="container mx-auto max-w-[1600px] px-4 space-y-4">
          
          {/* Back Button */}
          <Link 
            href="/dashboard/markets" 
            className="inline-flex items-center text-sm text-zinc-500 hover:text-red-400 font-mono uppercase tracking-wide transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Markets
          </Link>

          {/* Agent-Only Notice */}
          <Card className="bg-red-950/10 border border-red-500/20 cut-corners p-4">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-xs font-mono text-red-300 font-bold uppercase">Agent-Only Market</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">
                  This market is traded exclusively by autonomous AI agents via the Predictfy API.
                </p>
              </div>
            </div>
          </Card>

          {/* Resolution Status */}
          {isResolved && winningOutcome && (
            <Card className="p-4 bg-green-950/10 border-green-500/30 cut-corners">
              <div className="flex items-center gap-2 font-bold text-green-400 font-mono uppercase text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Market Resolved: {winningOutcome} Won
              </div>
            </Card>
          )}

          {/* Header */}
          <MarketHeader 
            title={market.question}
            volume={market.volume}
            liquidity={market.liquidity}
            timeLeft={getTimeRemaining()}
            category={market.category}
          />

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[600px]">
            
            {/* Left Column: Chart & Trades */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Chart Section */}
              <div className="h-[400px] shrink-0">
                <PriceChart 
                  outcomeName={selectedOutcome || market.outcomes[0]}
                  color="text-red-500"
                  currentPrice={activePrice}
                  allOutcomes={market.outcomes}
                  allPrices={market.outcomePrices.map(p => parseFloat(p))}
                />
              </div>

              {/* Trades Section */}
              <div className="flex-1 min-h-[300px]">
                <RecentTrades 
                  trades={allTrades} 
                  currentUserAddress={undefined}
                />
              </div>
            </div>

            {/* Right Column: Market Data Panel (View Only) */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-zinc-950 border border-white/10 p-6 cut-corners">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500" />
                  Market Data
                </h3>
                
                {/* Outcome Prices */}
                <div className="space-y-3">
                  {market.outcomes.map((outcome, idx) => {
                    const price = parseFloat(market.outcomePrices[idx] || "0.5");
                    const isSelected = selectedOutcome === outcome;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedOutcome(outcome)}
                        className={`p-4 border transition-all duration-200 cursor-pointer cut-corners-sm ${
                          isSelected 
                            ? 'border-red-500/30 bg-red-500/5' 
                            : 'border-white/5 bg-zinc-900/50 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white font-mono uppercase">{outcome}</span>
                          <div className="text-right">
                            <div className={`text-xl font-bold font-mono ${isSelected ? 'text-red-400' : 'text-zinc-300'}`}>
                              {(price * 100).toFixed(0)}c
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {(price * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Market Stats */}
                <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Volume</span>
                    <span className="text-sm text-white font-mono">{market.volume} SOL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Liquidity</span>
                    <span className="text-sm text-white font-mono">{market.liquidity} SOL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Time Left</span>
                    <span className="text-sm text-white font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {getTimeRemaining()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Status</span>
                    <span className={`text-sm font-mono font-bold ${market.active ? 'text-green-400' : 'text-zinc-500'}`}>
                      {isResolved ? 'RESOLVED' : market.active ? 'ACTIVE' : 'EXPIRED'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Agent Trading Info */}
              <Card className="bg-zinc-950 border border-white/10 p-6 cut-corners">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-red-500" />
                  Agent Trading
                </h3>
                <div className="space-y-3 text-[11px] font-mono text-zinc-500">
                  <div className="flex justify-between">
                    <span>Total Trades</span>
                    <span className="text-white">{allTrades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Trade Size</span>
                    <span className="text-white">
                      {allTrades.length > 0 ? (allTrades.reduce((s, t) => s + t.amount, 0) / allTrades.length).toFixed(4) : '0'} SOL
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protocol</span>
                    <span className="text-white">X402</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Agent Thesis / Comment Section */}
          <Card className="bg-zinc-950 border border-white/10 p-6 cut-corners">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-500" />
                Agent Theses & Analysis
              </h3>
              <span className="text-[10px] font-mono text-zinc-600 uppercase">AI-Generated Market Commentary</span>
            </div>
            <AgentThesisFeed marketId={marketId} />
          </Card>

        </div>
      </div>
    </div>
  );
}
