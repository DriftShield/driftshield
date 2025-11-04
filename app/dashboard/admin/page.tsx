'use client';

import { useState, useEffect } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getMarketPDA, resolveMarket, PROGRAM_ID, emergencyWithdraw, getVaultPDA } from "@/lib/solana/prediction-bets";
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from '@/lib/solana/prediction_bets_idl.json';
import { CheckCircle2, XCircle, Loader2, DollarSign, AlertTriangle } from "lucide-react";

interface AdminMarket {
  id: string;
  title: string;
  authority: string;
  endTimestamp: number;
  numOutcomes: number;
  outcomeLabels: string[];
  outcomeAmounts: number[];
  isResolved: boolean;
  winningOutcome: number | null;
  vaultBalance: number;
}

export default function AdminDashboard() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      fetchMyMarkets();
    }
  }, [connected, publicKey]);

  const fetchMyMarkets = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);

      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
      const program = new Program(IDL as any, provider);

      // Use BorshAccountsCoder for reliable decoding
      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);

      // Filter for markets where I'm the authority
      const myMarkets: AdminMarket[] = [];

      for (const { pubkey, account } of programAccounts) {
        try {
          const marketData = coder.decode('Market', account.data);

          if (marketData.authority.toString() === publicKey.toString()) {
            const [marketPDA] = getMarketPDA(marketData.market_id);
            const [vaultPDA] = getVaultPDA(marketPDA);

            // Get vault balance
            const vaultBalance = await connection.getBalance(vaultPDA);

            // Extract outcome data
            const numOutcomes = marketData.num_outcomes;
            const outcomeLabels = marketData.outcome_labels.slice(0, numOutcomes);
            const outcomeAmounts = marketData.outcome_amounts.slice(0, numOutcomes).map((amt: any) => amt.toNumber() / 1e9);

            // Check resolution status
            const resolutionStatus = marketData.resolution_status;
            const isResolved = resolutionStatus && Object.keys(resolutionStatus).some(k =>
              k === 'OracleResolved' || k === 'AdminResolved' || k === 'Finalized'
            );
            const winningOutcome = isResolved ? marketData.winning_outcome : null;

            myMarkets.push({
              id: marketData.market_id,
              title: marketData.title,
              authority: marketData.authority.toString(),
              endTimestamp: marketData.end_timestamp.toNumber(),
              numOutcomes,
              outcomeLabels,
              outcomeAmounts,
              isResolved,
              winningOutcome,
              vaultBalance: vaultBalance / 1e9,
            });
          }
        } catch {
          // Not a Market account, skip
          continue;
        }
      }

      setMarkets(myMarkets);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (marketId: string, outcomeIndex: number, outcomeLabel: string) => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    const confirmed = confirm(`Resolve this market as "${outcomeLabel}"? This action cannot be undone!`);
    if (!confirmed) return;

    setResolving(marketId);

    try {
      const signature = await resolveMarket(
        connection,
        { publicKey, signTransaction, connected } as any,
        marketId,
        outcomeIndex
      );

      alert(`Market resolved as "${outcomeLabel}"! Transaction: ${signature}`);
      await fetchMyMarkets(); // Refresh
    } catch (error: any) {
      console.error('Error resolving market:', error);
      alert(`Failed to resolve: ${error.message}`);
    } finally {
      setResolving(null);
    }
  };

  const handleEmergencyWithdraw = async (marketId: string, vaultBalance: number) => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    const confirmed = confirm(
      `Emergency withdraw ${vaultBalance.toFixed(3)} SOL from vault?\n\n` +
      `This should only be used if there's a bug preventing normal payouts.\n` +
      `You must wait 30 days after market end.`
    );
    if (!confirmed) return;

    try {
      const signature = await emergencyWithdraw(
        connection,
        { publicKey, signTransaction, connected } as any,
        marketId,
        Math.floor(vaultBalance * 1e9) // Convert to lamports
      );

      alert(`Emergency withdrawal successful! TX: ${signature}`);
      await fetchMyMarkets(); // Refresh
    } catch (error: any) {
      console.error('Error withdrawing:', error);
      if (error.message.includes('EmergencyDelayNotMet')) {
        alert('Must wait 30 days after market ends');
      } else {
        alert(`Failed: ${error.message}`);
      }
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="lg:pl-64">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <Card className="glass p-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
              <p className="text-muted-foreground">Please connect your wallet to manage your markets</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your prediction markets
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading your markets...</span>
            </div>
          ) : markets.length === 0 ? (
            <Card className="glass p-12 text-center">
              <p className="text-muted-foreground">You haven't created any markets yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {markets.map((market) => {
                const isExpired = Date.now() / 1000 > market.endTimestamp;
                const canResolve = isExpired && !market.isResolved;
                const canEmergencyWithdraw = isExpired && (Date.now() / 1000 > market.endTimestamp + (30 * 24 * 60 * 60));

                return (
                  <Card key={market.id} className="glass p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{market.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={market.isResolved ? "default" : isExpired ? "destructive" : "secondary"}>
                              {market.isResolved
                                ? `Resolved - ${market.outcomeLabels[market.winningOutcome!]} Won`
                                : isExpired
                                ? 'Ended - Needs Resolution'
                                : 'Active'}
                            </Badge>
                            <Badge variant="outline">
                              {market.numOutcomes} Outcomes
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Ends: {new Date(market.endTimestamp * 1000).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {market.outcomeLabels.map((label, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <span className="font-medium">{label}</span>
                            <span className="text-sm text-muted-foreground">{market.outcomeAmounts[index].toFixed(3)} SOL</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/30">
                          <span className="font-semibold">Total Pool</span>
                          <span className="font-semibold">{market.outcomeAmounts.reduce((sum, amt) => sum + amt, 0).toFixed(3)} SOL</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-secondary/10 border border-secondary/30">
                          <span className="font-semibold flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Vault Balance
                          </span>
                          <span className="font-semibold">{market.vaultBalance.toFixed(3)} SOL</span>
                        </div>
                      </div>

                      {canResolve && (
                        <div className="space-y-2 pt-4 border-t border-border">
                          <p className="text-sm font-medium">Select Winning Outcome:</p>
                          <div className={`grid gap-2 ${market.numOutcomes === 2 ? 'grid-cols-2' : market.numOutcomes === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            {market.outcomeLabels.map((label, index) => {
                              const colors = [
                                'bg-green-600 hover:bg-green-700',
                                'bg-blue-600 hover:bg-blue-700',
                                'bg-amber-600 hover:bg-amber-700',
                                'bg-red-600 hover:bg-red-700',
                                'bg-purple-600 hover:bg-purple-700',
                                'bg-pink-600 hover:bg-pink-700',
                                'bg-indigo-600 hover:bg-indigo-700',
                                'bg-teal-600 hover:bg-teal-700',
                                'bg-orange-600 hover:bg-orange-700',
                                'bg-cyan-600 hover:bg-cyan-700',
                              ];
                              const colorClass = colors[index % colors.length];

                              return (
                                <Button
                                  key={index}
                                  onClick={() => handleResolve(market.id, index, label)}
                                  disabled={resolving === market.id}
                                  className={colorClass}
                                >
                                  {resolving === market.id ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resolving...</>
                                  ) : (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" />{label}</>
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {canEmergencyWithdraw && market.vaultBalance > 0 && (
                        <div className="pt-4 border-t border-border">
                          <Button
                            onClick={() => handleEmergencyWithdraw(market.id, market.vaultBalance)}
                            variant="destructive"
                            className="w-full"
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Emergency Withdraw ({market.vaultBalance.toFixed(3)} SOL)
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Only use if payouts are stuck due to a bug
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
