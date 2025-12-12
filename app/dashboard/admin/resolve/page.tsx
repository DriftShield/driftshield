'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Zap,
  Search,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { isAdmin } from '@/lib/constants/admin';
import { resolveMarket, PROGRAM_ID } from '@/lib/solana/prediction-bets';
import { oracleService } from '@/lib/oracle/oracle-service';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnchorProvider, BN } from '@coral-xyz/anchor';
import IDL from '@/lib/solana/prediction_bets_idl.json';

interface UnresolvedMarket {
  marketId: string;
  title: string;
  outcomes: string[];
  endTimestamp: number;
  ended: boolean;
}

export default function AdminResolvePage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();

  const [unresolvedMarkets, setUnresolvedMarkets] = useState<UnresolvedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);
  const [autoResolving, setAutoResolving] = useState<string | null>(null);

  const userIsAdmin = isAdmin(wallet.publicKey?.toString());

  useEffect(() => {
    if (!userIsAdmin) {
      router.push('/dashboard/markets');
      return;
    }
    loadUnresolvedMarkets();
  }, []);

  const loadUnresolvedMarkets = async () => {
    try {
      setLoading(true);

      // Fetch all program accounts
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);

      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);

      const markets: UnresolvedMarket[] = [];

      for (const { pubkey, account } of programAccounts) {
        try {
          if (account.data.length < 8) continue;

          const marketData = coder.decode('Market', account.data) as any;

          // Skip resolved markets
          if (marketData.is_resolved) continue;

          // Skip markets with 0 outcomes
          if (marketData.num_outcomes === 0) continue;

          const endTimestamp = marketData.end_timestamp.toNumber();
          const now = Date.now() / 1000;

          markets.push({
            marketId: marketData.market_id,
            title: marketData.title,
            outcomes: marketData.outcome_labels.slice(0, marketData.num_outcomes),
            endTimestamp: endTimestamp * 1000,
            ended: endTimestamp < now,
          });
        } catch (error) {
          continue;
        }
      }

      // Sort by end date (ended first)
      markets.sort((a, b) => {
        if (a.ended && !b.ended) return -1;
        if (!a.ended && b.ended) return 1;
        return a.endTimestamp - b.endTimestamp;
      });

      setUnresolvedMarkets(markets);
    } catch (error) {
      console.error('Error loading unresolved markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  const handleManualResolve = (marketId: string) => {
    router.push(`/dashboard/markets/${marketId}`);
  };

  const handleAutoResolve = async (market: UnresolvedMarket) => {
    if (!wallet.publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    setAutoResolving(market.marketId);

    try {
      // Try to auto-resolve using oracle
      toast.loading('Fetching oracle result...', { id: 'oracle' });

      const oracleResult = await oracleService.autoResolve(
        market.marketId,
        market.title,
        market.outcomes
      );

      toast.success('Oracle result received!', {
        id: 'oracle',
        description: `Outcome: ${market.outcomes[oracleResult.outcome]} (${oracleResult.confidence}% confidence)`,
      });

      // Confirm with user
      const confirmed = window.confirm(
        `Oracle suggests:\n\n` +
        `Outcome: ${market.outcomes[oracleResult.outcome]}\n` +
        `Confidence: ${oracleResult.confidence}%\n` +
        `Source: ${oracleResult.source}\n\n` +
        `Proceed with resolution?`
      );

      if (!confirmed) {
        toast.info('Resolution cancelled');
        return;
      }

      // Resolve on-chain
      toast.loading('Resolving on-chain...', { id: 'resolve' });

      const signature = await resolveMarket(
        connection,
        wallet,
        market.marketId,
        oracleResult.outcome
      );

      toast.success('Market resolved successfully!', {
        id: 'resolve',
        description: `Transaction: ${signature.slice(0, 8)}...`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank'),
        },
      });

      // Refresh markets list
      await loadUnresolvedMarkets();

    } catch (error: any) {
      console.error('Auto-resolve error:', error);
      toast.error('Auto-resolution failed', {
        id: 'oracle',
        description: error.message || 'Unknown error',
      });
    } finally {
      setAutoResolving(null);
    }
  };

  const filteredMarkets = unresolvedMarkets.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.marketId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const endedMarkets = filteredMarkets.filter(m => m.ended);
  const activeMarkets = filteredMarkets.filter(m => !m.ended);

  if (!userIsAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold">Market Resolution</h1>
            <p className="text-muted-foreground mt-1">
              Resolve ended markets manually or automatically using oracles
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{endedMarkets.length}</div>
                    <div className="text-sm text-muted-foreground">Ended & Unresolved</div>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{activeMarkets.length}</div>
                    <div className="text-sm text-muted-foreground">Still Active</div>
                  </div>
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{unresolvedMarkets.length}</div>
                    <div className="text-sm text-muted-foreground">Total Unresolved</div>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Refresh */}
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search markets by ID or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={loadUnresolvedMarkets}
                  variant="outline"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Markets List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading markets...</span>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <Card className="glass">
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No markets match your search' : 'All markets are resolved! 🎉'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Ended Markets */}
              {endedMarkets.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Ended Markets ({endedMarkets.length})</h2>
                    <Badge variant="destructive">Action Required</Badge>
                  </div>
                  {endedMarkets.map((market) => (
                    <MarketCard
                      key={market.marketId}
                      market={market}
                      onManualResolve={handleManualResolve}
                      onAutoResolve={handleAutoResolve}
                      resolving={resolving === market.marketId}
                      autoResolving={autoResolving === market.marketId}
                    />
                  ))}
                </div>
              )}

              {/* Active Markets */}
              {activeMarkets.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold">Active Markets ({activeMarkets.length})</h2>
                  {activeMarkets.map((market) => (
                    <MarketCard
                      key={market.marketId}
                      market={market}
                      onManualResolve={handleManualResolve}
                      onAutoResolve={handleAutoResolve}
                      resolving={resolving === market.marketId}
                      autoResolving={autoResolving === market.marketId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MarketCardProps {
  market: UnresolvedMarket;
  onManualResolve: (marketId: string) => void;
  onAutoResolve: (market: UnresolvedMarket) => void;
  resolving: boolean;
  autoResolving: boolean;
}

function MarketCard({
  market,
  onManualResolve,
  onAutoResolve,
  resolving,
  autoResolving,
}: MarketCardProps) {
  const timeUntilEnd = market.endTimestamp - Date.now();
  const daysUntilEnd = Math.ceil(timeUntilEnd / (1000 * 60 * 60 * 24));

  const canAutoResolve = market.marketId.startsWith('pm-') || market.marketId.startsWith('pm-multi-');

  return (
    <Card className={`glass ${market.ended ? 'border-orange-500/50' : ''}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={market.ended ? 'destructive' : 'default'}>
                  {market.ended ? 'Ended' : `Ends in ${daysUntilEnd}d`}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {market.outcomes.length} outcomes
                </Badge>
                <code className="text-xs text-muted-foreground">{market.marketId}</code>
              </div>
              <h3 className="text-lg font-semibold">{market.title}</h3>
            </div>
          </div>

          {/* Outcomes */}
          <div className="flex flex-wrap gap-2">
            {market.outcomes.map((outcome, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {outcome}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => onManualResolve(market.marketId)}
              variant="outline"
              disabled={resolving || autoResolving}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manual Resolve
            </Button>

            {canAutoResolve && market.ended && (
              <Button
                onClick={() => onAutoResolve(market)}
                disabled={resolving || autoResolving}
                className="flex-1"
              >
                {autoResolving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Auto-Resolving...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-Resolve
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
