'use client';

import { useState, useEffect } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Plus, Filter, Clock, Loader2, Grid3X3, Binary } from "lucide-react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getMarketPDA, PROGRAM_ID } from "@/lib/solana/prediction-bets";
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from '@/lib/solana/prediction_bets_idl.json';
import { isAdmin } from "@/lib/constants/admin";
import { Market, BinaryMarket, MultiOutcomeMarket, isBinaryMarket, isMultiOutcomeMarket } from "@/lib/types/market";
import { MultiOutcomeCard } from "@/components/markets/multi-outcome-card";

export default function MarketsPage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'volume' | 'ending-soon'>('recent');
  const [marketTypeFilter, setMarketTypeFilter] = useState<'all' | 'binary' | 'multi'>('all');
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);

  const userIsAdmin = isAdmin(publicKey?.toString());

  useEffect(() => {
    loadAllMarkets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allMarkets, searchQuery, selectedCategory, showActiveOnly, sortBy, marketTypeFilter]);

  const loadAllMarkets = async () => {
    try {
      setLoading(true);

      // Load on-chain markets only
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

      // Get all program accounts
      let programAccounts;
      try {
        programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
        console.log(`Found ${programAccounts.length} program accounts`);
      } catch (err) {
        console.error('Error fetching program accounts:', err);
        return [];
      }

      // Use BorshAccountsCoder directly for more reliable decoding
      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);

      // Try to deserialize each account
      for (const { pubkey, account } of programAccounts) {
        try {
          // Skip if account data is too small (less than 8 bytes for discriminator)
          if (account.data.length < 8) {
            continue;
          }

          // Try to decode as Market account using BorshAccountsCoder directly
          const marketData = coder.decode('Market', account.data) as any;

          // Borsh uses snake_case field names
          console.log('Successfully decoded market:', marketData.market_id);

          const endTimestamp = marketData.end_timestamp.toNumber();
          const endDate = new Date(endTimestamp * 1000);

          const numOutcomes = marketData.num_outcomes;

          // Skip markets with 0 outcomes (broken/incomplete markets)
          if (numOutcomes === 0) {
            console.log(`Skipping market ${marketData.market_id} - has 0 outcomes`);
            continue;
          }

          const outcomes = marketData.outcome_labels.slice(0, numOutcomes);

          // Calculate total volume and probabilities
          let totalVolume = 0;
          for (let i = 0; i < numOutcomes; i++) {
            totalVolume += marketData.outcome_amounts[i].toNumber() / 1e9;
          }

          const isBinary = numOutcomes === 2;

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
            // Multi-outcome market
            const outcomeProbabilities: number[] = [];
            for (let i = 0; i < numOutcomes; i++) {
              const amount = marketData.outcome_amounts[i].toNumber() / 1e9;
              outcomeProbabilities.push(totalVolume > 0 ? amount / totalVolume : 1 / numOutcomes);
            }

            onChainMarkets.push({
              id: marketData.market_id,
              question: marketData.title,
              category: 'Other',
              outcomes,
              outcomeProbabilities,
              volume: totalVolume,
              liquidity: totalVolume,
              endDate: endDate.toISOString(),
              active: endDate.getTime() > Date.now(),
              isMultiOutcome: true,
            } as MultiOutcomeMarket);
          }
        } catch (decodeError: any) {
          // Skip accounts that can't be decoded as Market (could be Bet or Vault accounts)
          if (decodeError?.message && !decodeError.message.includes('Invalid account discriminator')) {
            console.log('Decode error:', decodeError.message.substring(0, 100));
          }
          continue;
        }
      }

      console.log(`Successfully parsed ${onChainMarkets.length} on-chain markets`);

      // Log market IDs for debugging (first 20)
      if (onChainMarkets.length > 0) {
        const sampleIds = onChainMarkets.slice(0, 20).map(m => m.id).join(', ');
        console.log('Sample market IDs:', sampleIds);
        if (onChainMarkets.length > 20) {
          console.log(`... and ${onChainMarkets.length - 20} more markets`);
        }
      }

      return onChainMarkets;
    } catch (error) {
      console.error('Error fetching on-chain markets:', error);
      return [];
    }
  };

  const applyFilters = () => {
    let filtered = [...allMarkets];

    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.question.toLowerCase().includes(searchLower)
      );
    }

    // Market type filter
    if (marketTypeFilter === 'binary') {
      filtered = filtered.filter(m => isBinaryMarket(m));
    } else if (marketTypeFilter === 'multi') {
      filtered = filtered.filter(m => isMultiOutcomeMarket(m));
    }

    // Active only filter
    if (showActiveOnly) {
      const now = Date.now();
      filtered = filtered.filter(m => {
        const endDate = new Date(m.endDate).getTime();
        return endDate > now;
      });
    }

    // Sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.endDate).getTime();
        const dateB = new Date(b.endDate).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === 'volume') {
      filtered.sort((a, b) => b.volume - a.volume);
    } else if (sortBy === 'ending-soon') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.endDate).getTime();
        const dateB = new Date(b.endDate).getTime();
        return dateA - dateB;
      });
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
              <h1 className="text-4xl font-bold">Prediction Markets</h1>
              <p className="text-muted-foreground mt-1">
                Binary & Multi-Outcome Markets • Fully On-Chain on Solana
              </p>
            </div>
            {userIsAdmin && (
              <Button size="lg" className="gap-2" asChild>
                <Link href="/dashboard/markets/new">
                  <Plus className="w-4 h-4" />
                  Create Market
                </Link>
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="glass p-4">
              <div className="text-2xl font-bold">{markets.length}</div>
              <div className="text-sm text-muted-foreground">Total Markets</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-2xl font-bold">{binaryCount}</div>
              <div className="text-sm text-muted-foreground">Binary</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-2xl font-bold">{multiCount}</div>
              <div className="text-sm text-muted-foreground">Multi-Outcome</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-2xl font-bold">
                {totalVolume >= 1000
                  ? `$${(totalVolume / 1000).toFixed(1)}K`
                  : `$${totalVolume.toFixed(0)}`}
              </div>
              <div className="text-sm text-muted-foreground">Total Volume</div>
            </Card>
            <Card className="glass p-4">
              <div className="text-2xl font-bold">X402</div>
              <div className="text-sm text-muted-foreground">Payments</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="glass p-4">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
                  className="pl-9 bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={marketTypeFilter === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMarketTypeFilter('all')}
                >
                  All Types
                </Button>
                <Button
                  variant={marketTypeFilter === 'binary' ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setMarketTypeFilter('binary')}
                >
                  <Binary className="w-4 h-4" />
                  Binary
                </Button>
                <Button
                  variant={marketTypeFilter === 'multi' ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setMarketTypeFilter('multi')}
                >
                  <Grid3X3 className="w-4 h-4" />
                  Multi-Outcome
                </Button>
                <Button
                  variant={showActiveOnly ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                >
                  <Filter className="w-4 h-4" />
                  {showActiveOnly ? 'Active Only' : 'Show All'}
                </Button>
                <select
                  className="h-9 px-3 rounded-lg border border-input bg-background/50 text-sm"
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

          {/* Markets Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading markets...</span>
            </div>
          ) : markets.length === 0 ? (
            <Card className="glass p-12 text-center">
              <p className="text-muted-foreground">
                {userIsAdmin ? 'No markets found. Create your first market!' : 'No markets available yet. Check back soon!'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {markets.map((market) => {
                if (isMultiOutcomeMarket(market)) {
                  return <MultiOutcomeCard key={market.id} market={market} />;
                } else {
                  return <BinaryMarketCard key={market.id} market={market} />;
                }
              })}
            </div>
          )}

          {/* Footer Info */}
          {markets.length > 0 && (
            <Card className="glass p-4">
              <p className="text-sm text-muted-foreground text-center">
                Showing {markets.length} markets ({binaryCount} binary, {multiCount} multi-outcome) •
                Fully On-Chain on Solana •
                X402 payments enabled
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
  const yesPrice = market.probability;
  const noPrice = 1 - market.probability;
  const endDate = new Date(market.endDate);
  const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="glass p-6 hover:border-primary/50 transition-colors">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{market.category}</Badge>
              {market.volume > 1 && (
                <div className="flex items-center gap-1 text-xs text-secondary">
                  <TrendingUp className="w-3 h-3" />
                  <span>High Volume</span>
                </div>
              )}
              <Badge variant="default" className="text-xs">On-Chain</Badge>
            </div>
            <h3 className="text-base md:text-lg font-semibold leading-tight">{market.question}</h3>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span>{daysUntilEnd > 0 ? `Ends in ${daysUntilEnd}d` : 'Ended'}</span>
              </div>
              <div>
                <span>Vol: {market.volume >= 1 ? `${market.volume.toFixed(2)} SOL` : `${(market.volume * 1000).toFixed(0)}m`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <button className="p-3 md:p-4 rounded-lg border-2 border-secondary/50 hover:border-secondary bg-secondary/10 hover:bg-secondary/20 transition-colors text-left">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <span className="text-sm md:text-base font-semibold text-secondary">YES</span>
              <span className="text-xl md:text-2xl font-bold text-secondary">
                {(yesPrice * 100).toFixed(0)}¢
              </span>
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground">
              {(yesPrice * 100).toFixed(1)}%
            </div>
          </button>

          <button className="p-3 md:p-4 rounded-lg border-2 border-accent/50 hover:border-accent bg-accent/10 hover:bg-accent/20 transition-colors text-left">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <span className="text-sm md:text-base font-semibold text-accent">NO</span>
              <span className="text-xl md:text-2xl font-bold text-accent">
                {(noPrice * 100).toFixed(0)}¢
              </span>
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground">
              {(noPrice * 100).toFixed(1)}%
            </div>
          </button>
        </div>

        <Button variant="outline" className="w-full bg-transparent" asChild>
          <Link href={`/dashboard/markets/${market.id}`}>
            View Market Details & Place Bet
          </Link>
        </Button>
      </div>
    </Card>
  );
}
