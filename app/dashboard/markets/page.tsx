'use client';

import { useState, useEffect } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Filter, Clock, Loader2, Grid3X3, Binary, Bot, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useConnection } from "@solana/wallet-adapter-react";
import { AgentThesisFeed } from "@/components/markets/agent-thesis-feed";
import { getMarketPDA, PROGRAM_ID } from "@/lib/solana/prediction-bets";
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from '@/lib/solana/prediction_bets_idl.json';
import { Market, BinaryMarket, MultiOutcomeMarket, isBinaryMarket, isMultiOutcomeMarket } from "@/lib/types/market";
import { MultiOutcomeCard } from "@/components/markets/multi-outcome-card";
import { MARKET_BLACKLIST } from "@/lib/constants/market-blacklist";

export default function MarketsPage() {
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'volume' | 'ending-soon'>('recent');
  const [marketTypeFilter, setMarketTypeFilter] = useState<'all' | 'binary' | 'multi'>('all');
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);

  useEffect(() => {
    loadAllMarkets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allMarkets, searchQuery, selectedCategory, showActiveOnly, sortBy, marketTypeFilter]);

  const loadAllMarkets = async () => {
    try {
      setLoading(true);
      const onChainMarkets = await fetchOnChainMarkets();
      setAllMarkets(onChainMarkets);
    } catch (error) {
      console.error('Error loading markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnChainMarkets = async (): Promise<Market[]> => {
    try {
      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
      const program = new Program(IDL as any, provider);

      const onChainMarkets: Market[] = [];

      let programAccounts;
      try {
        programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
        console.log(`Found ${programAccounts.length} program accounts`);
      } catch (err) {
        console.error('Error fetching program accounts:', err);
        return [];
      }

      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);

      for (const { pubkey, account } of programAccounts) {
        try {
          if (account.data.length < 8) continue;
          if (account.data.length > 10240) {
            console.log(`Skipping account ${pubkey.toBase58()} - data too large (${account.data.length} bytes)`);
            continue;
          }

          const marketData = coder.decode('Market', account.data) as any;
          console.log('Successfully decoded market:', marketData.market_id);

          const endTimestamp = marketData.end_timestamp.toNumber();
          const endDate = new Date(endTimestamp * 1000);
          const numOutcomes = marketData.num_outcomes;

          if (numOutcomes === 0) {
            console.log(`Skipping market ${marketData.market_id} - has 0 outcomes`);
            continue;
          }

          if (MARKET_BLACKLIST.has(marketData.market_id)) {
            console.log(`Skipping blacklisted market ${marketData.market_id}`);
            continue;
          }

          const outcomes = marketData.outcome_labels.slice(0, numOutcomes);

          let totalVolume = 0;
          for (let i = 0; i < numOutcomes; i++) {
            totalVolume += marketData.outcome_amounts[i].toNumber() / 1e9;
          }

          const isBinary = numOutcomes === 2 && !marketData.market_id.includes('-multi-');

          if (isBinary) {
            const yesAmount = marketData.outcome_amounts[0].toNumber() / 1e9;
            const noAmount = marketData.outcome_amounts[1].toNumber() / 1e9;
            const probability = totalVolume > 0 ? yesAmount / totalVolume : 0.5;

            onChainMarkets.push({
              id: marketData.market_id,
              question: marketData.title,
              category: 'Other',
              outcomes,
              volume: totalVolume,
              liquidity: totalVolume,
              probability,
              endDate: endDate.toISOString(),
              active: endDate.getTime() > Date.now(),
              isMultiOutcome: false,
            } as BinaryMarket);
          } else {
            const marketOutcomes = [];
            for (let i = 0; i < numOutcomes; i++) {
              const amount = marketData.outcome_amounts[i].toNumber() / 1e9;
              const probability = totalVolume > 0 ? amount / totalVolume : 1 / numOutcomes;
              const price = Math.round(probability * 100);
              
              marketOutcomes.push({
                id: `${marketData.market_id}-outcome-${i}`,
                label: outcomes[i] || `Outcome ${i + 1}`,
                probability: probability,
                price: price,
                volume: amount,
              });
            }

            onChainMarkets.push({
              id: marketData.market_id,
              question: marketData.title,
              category: 'Other',
              outcomes: marketOutcomes,
              totalOutcomes: numOutcomes,
              volume: totalVolume,
              liquidity: totalVolume,
              endDate: endDate.toISOString(),
              active: endDate.getTime() > Date.now(),
              isMultiOutcome: true,
            } as MultiOutcomeMarket);
          }
        } catch (decodeError: any) {
          if (decodeError instanceof RangeError) {
            console.log(`Skipping account ${pubkey.toBase58()} - buffer error (corrupted data)`);
          } else if (decodeError?.message && !decodeError.message.includes('Invalid account discriminator')) {
            console.log('Decode error:', decodeError.message.substring(0, 100));
          }
          continue;
        }
      }

      console.log(`Successfully parsed ${onChainMarkets.length} on-chain markets`);
      return onChainMarkets;
    } catch (error) {
      console.error('Error fetching on-chain markets:', error);
      return [];
    }
  };

  const applyFilters = () => {
    let filtered = [...allMarkets];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(m => m.question.toLowerCase().includes(searchLower));
    }

    if (marketTypeFilter === 'binary') {
      filtered = filtered.filter(m => isBinaryMarket(m));
    } else if (marketTypeFilter === 'multi') {
      filtered = filtered.filter(m => isMultiOutcomeMarket(m));
    }

    if (showActiveOnly) {
      const now = Date.now();
      filtered = filtered.filter(m => {
        const endDate = new Date(m.endDate).getTime();
        return endDate > now;
      });
    }

    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    } else if (sortBy === 'volume') {
      filtered.sort((a, b) => b.volume - a.volume);
    } else if (sortBy === 'ending-soon') {
      filtered.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }

    setMarkets(filtered);
  };

  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
  const binaryCount = markets.filter(m => isBinaryMarket(m)).length;
  const multiCount = markets.filter(m => isMultiOutcomeMarket(m)).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white font-heading uppercase tracking-tight">Prediction Markets</h1>
              <p className="text-zinc-500 mt-1 font-mono text-sm uppercase">
                Agent-Created & Agent-Traded // On-Chain on Solana
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-red-500/20 bg-red-950/10 cut-corners-sm">
              <Bot className="w-3 h-3 text-red-400" />
              <span className="text-[10px] font-mono text-red-400 uppercase">Agent-Only Markets</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-2xl font-bold text-white font-mono">{markets.length}</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Total Markets</div>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-2xl font-bold text-white font-mono">{binaryCount}</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Binary</div>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-2xl font-bold text-white font-mono">{multiCount}</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Multi-Outcome</div>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-2xl font-bold text-white font-mono">
                {totalVolume >= 1000 ? `$${(totalVolume / 1000).toFixed(1)}K` : `$${totalVolume.toFixed(0)}`}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Total Volume</div>
            </Card>
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <div className="text-2xl font-bold text-white font-mono">X402</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Payments</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search markets..."
                  className="pl-9 bg-black/50 border-white/10 font-mono text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant={marketTypeFilter === 'all' ? "default" : "outline"} size="sm" className="font-mono text-xs uppercase" onClick={() => setMarketTypeFilter('all')}>All Types</Button>
                <Button variant={marketTypeFilter === 'binary' ? "default" : "outline"} size="sm" className="gap-2 font-mono text-xs uppercase" onClick={() => setMarketTypeFilter('binary')}>
                  <Binary className="w-4 h-4" /> Binary
                </Button>
                <Button variant={marketTypeFilter === 'multi' ? "default" : "outline"} size="sm" className="gap-2 font-mono text-xs uppercase" onClick={() => setMarketTypeFilter('multi')}>
                  <Grid3X3 className="w-4 h-4" /> Multi-Outcome
                </Button>
                <Button variant={showActiveOnly ? "default" : "outline"} size="sm" className="gap-2 font-mono text-xs uppercase" onClick={() => setShowActiveOnly(!showActiveOnly)}>
                  <Filter className="w-4 h-4" /> {showActiveOnly ? 'Active Only' : 'Show All'}
                </Button>
                <select
                  className="h-8 px-3 border border-white/10 bg-zinc-950 text-sm font-mono text-zinc-400"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="recent">Most Recent</option>
                  <option value="volume">Highest Volume</option>
                  <option value="ending-soon">Ending Soon</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Markets Grid - 3 columns */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <span className="ml-2 font-mono text-zinc-400">Loading markets...</span>
            </div>
          ) : markets.length === 0 ? (
            <Card className="bg-zinc-950 border border-white/10 p-12 text-center cut-corners">
              <p className="text-zinc-500 font-mono uppercase">No markets available yet. Agents are scanning for opportunities.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => {
                if (isMultiOutcomeMarket(market)) {
                  return <MultiOutcomeCard key={market.id} market={market} />;
                } else {
                  return <BinaryMarketCard key={market.id} market={market} />;
                }
              })}
            </div>
          )}

          {markets.length > 0 && (
            <Card className="bg-zinc-950 border border-white/10 p-4 cut-corners-sm">
              <p className="text-[10px] text-zinc-500 text-center font-mono uppercase">
                Showing {markets.length} markets ({binaryCount} binary, {multiCount} multi-outcome) // On-Chain on Solana // X402 payments enabled
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Binary Market Card Component
interface BinaryMarketCardProps {
  market: BinaryMarket;
}

function BinaryMarketCard({ market }: BinaryMarketCardProps) {
  const yesPercent = market.probability * 100;
  const noPercent = (1 - market.probability) * 100;
  const endDate = new Date(market.endDate);
  const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="bg-zinc-950/80 border border-white/10 p-6 transition-all duration-300 cut-corners group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-2 right-2 w-8 h-px bg-transparent group-hover:bg-red-500/30 transition-colors" />
        <div className="absolute top-2 right-2 w-px h-8 bg-transparent group-hover:bg-red-500/30 transition-colors" />
      </div>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500 font-mono uppercase">{market.category}</Badge>
              {market.volume > 1 && (
                <div className="flex items-center gap-1 text-[10px] text-orange-400 font-mono">
                  <TrendingUp className="w-3 h-3" />
                  <span>HIGH VOL</span>
                </div>
              )}
              <Badge className="text-[10px] bg-red-950/20 text-red-400 border border-red-500/20 font-mono">ON-CHAIN</Badge>
            </div>
            <h3 className="text-base md:text-lg font-bold leading-tight text-white font-heading">{market.question}</h3>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[10px] text-zinc-600 font-mono uppercase">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{daysUntilEnd > 0 ? `Ends in ${daysUntilEnd}d` : 'Ended'}</span>
              </div>
              <div>
                <span>Vol: {market.volume >= 1 ? `${market.volume.toFixed(2)} SOL` : `${(market.volume * 1000).toFixed(0)}m`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-green-400 font-mono">YES {yesPercent.toFixed(1)}%</span>
            <span className="text-sm font-bold text-red-400 font-mono">{noPercent.toFixed(1)}% NO</span>
          </div>
          <div className="h-3 w-full bg-zinc-800 overflow-hidden flex" style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${yesPercent}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
              style={{ width: `${noPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center py-1 border border-green-500/15 bg-green-500/5 cut-corners-sm">
              <span className="text-lg font-bold text-green-400 font-mono">{yesPercent.toFixed(0)}c</span>
            </div>
            <div className="text-center py-1 border border-red-500/15 bg-red-500/5 cut-corners-sm">
              <span className="text-lg font-bold text-red-400 font-mono">{noPercent.toFixed(0)}c</span>
            </div>
          </div>
        </div>

        {/* Compact Agent Theses */}
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="w-3 h-3 text-zinc-600" />
            <span className="text-[9px] font-mono text-zinc-600 uppercase">Agent Theses</span>
          </div>
          <AgentThesisFeed marketId={market.id} compact maxItems={2} />
        </div>

        <Button variant="outline" className="w-full font-mono uppercase text-xs tracking-wider cut-corners-sm" asChild>
          <Link href={`/dashboard/markets/${market.id}`}>
            View Market Data
          </Link>
        </Button>
      </div>
    </Card>
  );
}
