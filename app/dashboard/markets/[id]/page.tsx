'use client';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useX402 } from "@/lib/hooks/useX402";
import { useX402Bet } from "@/lib/hooks/useX402Bet";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { placeBet as placeBetOnChain, BetOutcome, getMarketPDA, PROGRAM_ID, claimPayout, resolveMarket, getVaultPDA, getBetPDA } from "@/lib/solana/prediction-bets";
import { parseResolutionStatus } from "@/lib/solana/oracle-resolution";
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { SystemProgram, PublicKey as SolanaPublicKey } from '@solana/web3.js';
import IDL from '@/lib/solana/prediction_bets_idl.json';
import { isAdmin } from "@/lib/constants/admin";
import { DisputeDialog } from "@/components/dispute-dialog";
import { AdminResolutionPanel } from "@/components/admin-resolution-panel";
import { ResolutionStatusBadge } from "@/components/resolution-status-badge";
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Zap,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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

interface Bet {
  id: string;
  marketId: string;
  outcome: string;
  amount: number;
  timestamp: number;
  txSignature: string;
  status: 'pending' | 'confirmed' | 'won' | 'lost';
  payout?: number;
  betPubkey?: string; // Actual on-chain bet account public key
  betIndex?: number; // Bet index stored on-chain (for PDA derivation with fixed program)
}

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: marketId } = use(params);
  const router = useRouter();
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { makePayment, isLoading: paymentLoading } = useX402();
  const { placeBetWithX402, status: x402Status } = useX402Bet();

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0.01); // Default minimum bet
  const [customAmount, setCustomAmount] = useState<string>('0.01');
  const [placingBet, setPlacingBet] = useState(false);
  const [betSuccess, setBetSuccess] = useState(false);
  const [onChainEndDate, setOnChainEndDate] = useState<Date | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [winningOutcome, setWinningOutcome] = useState<'YES' | 'NO' | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [isMarketAuthority, setIsMarketAuthority] = useState(false);
  const [marketAuthority, setMarketAuthority] = useState<string | null>(null);

  // Oracle resolution state
  const [resolutionStatus, setResolutionStatus] = useState<string>("Pending");
  const [disputed, setDisputed] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEndTime, setDisputeEndTime] = useState<number | null>(null);

  const userIsAdmin = isAdmin(publicKey?.toString());

  useEffect(() => {
    fetchMarket();
    fetchOnChainMarketData();
    if (connected && publicKey) {
      fetchUserBets();
    }
  }, [marketId, connected, publicKey]);

  const fetchMarket = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from on-chain
      const [marketPDA] = getMarketPDA(marketId);
      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
      const program = new Program(IDL as any, provider);

      try {
        const marketData = await (program.account as any).market.fetch(marketPDA);

        const endTimestamp = marketData.endTimestamp.toNumber();
        const endDate = new Date(endTimestamp * 1000);

        // Calculate total volume and probabilities
        const totalYesAmount = marketData.totalYesAmount.toNumber() / 1e9;
        const totalNoAmount = marketData.totalNoAmount.toNumber() / 1e9;
        const totalVolume = totalYesAmount + totalNoAmount;
        const yesProbability = totalVolume > 0 ? totalYesAmount / totalVolume : 0.5;

        setMarket({
          id: marketId,
          question: marketData.title,
          description: 'On-chain prediction market powered by Solana',
          category: 'Other',
          outcomes: ['Yes', 'No'],
          outcomePrices: [yesProbability.toFixed(2), (1 - yesProbability).toFixed(2)],
          volume: totalVolume.toFixed(3),
          liquidity: totalVolume.toFixed(3),
          endDate: endDate.toISOString(),
          active: endDate.getTime() > Date.now(),
          closed: endDate.getTime() <= Date.now(),
        });
      } catch (err) {
        setError('Market not found on-chain');
      }
    } catch (err) {
      setError('Failed to load market');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnChainMarketData = async () => {
    try {
      const [marketPDA] = getMarketPDA(marketId);

      // Create a dummy wallet for reading (no signing needed)
      const dummyWallet = {
        publicKey: PROGRAM_ID, // Use any public key
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
      const program = new Program(IDL as any, provider);

      // Try to fetch on-chain market data
      const marketData = await (program.account as any).market.fetch(marketPDA);

      if (marketData && marketData.endTimestamp) {
        const endTimestamp = marketData.endTimestamp.toNumber();
        setOnChainEndDate(new Date(endTimestamp * 1000));

        // Set resolution status
        setIsResolved(marketData.isResolved);
        if (marketData.winningOutcome) {
          setWinningOutcome(marketData.winningOutcome.yes ? 'YES' : 'NO');
        }

        // Oracle resolution data
        if (marketData.resolutionStatus) {
          setResolutionStatus(parseResolutionStatus(marketData.resolutionStatus));
        }
        setDisputed(marketData.disputed || false);
        setDisputeReason(marketData.disputeReason || "");
        if (marketData.disputeEndTime) {
          setDisputeEndTime(marketData.disputeEndTime.toNumber());
        }

        // Check if connected wallet is the market authority
        if (publicKey && marketData.authority) {
          setMarketAuthority(marketData.authority.toBase58());
          setIsMarketAuthority(marketData.authority.toBase58() === publicKey.toBase58());
        }
      }
    } catch (error) {
      setOnChainEndDate(null);
    }
  };

  const fetchUserBets = async () => {
    if (!publicKey) return;

    try {
      // Fetch bets from blockchain
      const [marketPDA] = getMarketPDA(marketId);
      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };
      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
      const program = new Program(IDL as any, provider);

      // Fetch all bet accounts for this user on this market
      const betAccounts = await program.account.bet.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: publicKey.toBase58(),
          }
        }
      ]);

      // Filter bets for this specific market
      const marketBets: Bet[] = [];

      for (const bet of betAccounts) {
        const betAccount = bet.account as any;
        if (betAccount.market.toBase58() !== marketPDA.toBase58()) continue;

        // Get bet_index from the on-chain account
        const betIndex = betAccount.betIndex ? betAccount.betIndex.toNumber() : undefined;
        const onChainTimestamp = betAccount.timestamp.toNumber();

        marketBets.push({
          id: bet.publicKey.toBase58(),
          marketId: betAccount.marketId,
          outcome: betAccount.outcome.yes ? 'YES' : 'NO',
          amount: betAccount.amount.toNumber() / 1000000000, // Convert lamports to SOL
          timestamp: onChainTimestamp * 1000, // Convert to ms for display
          txSignature: '',
          status: betAccount.isClaimed ? 'won' : 'confirmed',
          betPubkey: bet.publicKey.toBase58(), // Store the actual bet account address
          betIndex: betIndex, // Store bet_index for PDA derivation
        });
      }

      setUserBets(marketBets);
    } catch (err) {
      // Fallback to localStorage
      try {
        const storedBets = localStorage.getItem(`bets_${publicKey?.toString()}_${marketId}`);
        if (storedBets) {
          setUserBets(JSON.parse(storedBets));
        }
      } catch (localErr) {
        // Silently ignore localStorage errors
      }
    }
  };

  const handlePlaceBet = async (outcome: string) => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!market) return;

    setSelectedOutcome(outcome);
    setPlacingBet(true);
    setBetSuccess(false);

    try {
      console.log('[Bet Flow] Starting X402 bet placement...');

      // Use X402 protocol for bet placement
      const result = await placeBetWithX402(
        market.id,
        outcome as 'YES' | 'NO',
        betAmount,
        async (x402Signature) => {
          // This callback is called after X402 payment is verified
          console.log('[Bet Flow] X402 payment verified, placing bet on-chain...');

          const betOutcome = outcome === 'YES' ? BetOutcome.Yes : BetOutcome.No;

          // Place bet on-chain (now authorized by X402 payment)
          const betSignature = await placeBetOnChain(
            connection,
            { publicKey, signTransaction, connected } as any,
            market.id,
            betOutcome,
            betAmount,
            market.endDate,
            market.question
          );

          console.log('[Bet Flow] Bet placed on-chain:', betSignature);

          // Create bet record
          const newBet: Bet = {
            id: betSignature,
            marketId: market.id,
            outcome,
            amount: betAmount,
            timestamp: Date.now(),
            txSignature: betSignature,
            status: 'confirmed',
          };

          // Update local state
          const updatedBets = [...userBets, newBet];
          setUserBets(updatedBets);

          // Also store locally as backup
          localStorage.setItem(
            `bets_${publicKey.toString()}_${marketId}`,
            JSON.stringify(updatedBets)
          );

          setBetSuccess(true);
          setTimeout(() => setBetSuccess(false), 5000);

          // Refresh market data to show updated percentages
          await fetchMarket();
          await fetchUserBets();
        }
      );

      if (result.success) {
        console.log('[Bet Flow] X402 bet flow completed successfully');
      } else {
        throw new Error(result.error || 'X402 bet failed');
      }

    } catch (err: any) {
      const errorMsg = err.message || err.transactionMessage || '';

      // Check if it's the "already processed" error
      if (errorMsg.includes('already been processed')) {
        // Transaction likely succeeded, refresh to get the bet from blockchain
        console.log('[Bet Flow] Transaction already processed, treating as success');
        setBetSuccess(true);
        setTimeout(() => {
          setBetSuccess(false);
          fetchUserBets(); // Fetch from blockchain
          fetchMarket(); // Refresh market data
        }, 2000);
        return;
      }

      // Only log actual errors
      console.error('[Bet Flow] Error:', errorMsg);

      // Show user-friendly error message
      let userMessage = 'Failed to place bet. Please try again.';

      if (errorMsg.includes('Wallet not connected')) {
        userMessage = 'Please connect your wallet to place a bet';
      } else if (errorMsg.includes('Insufficient')) {
        userMessage = 'Insufficient SOL balance. You need at least ' + (betAmount + 0.002).toFixed(4) + ' SOL';
      } else if (errorMsg.includes('Market not found')) {
        userMessage = 'This market needs to be initialized on-chain first';
      } else if (errorMsg.includes('market closed')) {
        userMessage = 'This market has closed and is no longer accepting bets';
      }

      alert(userMessage);
    } finally {
      setPlacingBet(false);
      setSelectedOutcome(null);
    }
  };

  const handleResolveMarket = async (outcome: 'YES' | 'NO') => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!isMarketAuthority) {
      alert('Only the market creator can resolve this market');
      return;
    }

    if (confirm(`Are you sure you want to resolve this market as ${outcome}? This action cannot be undone.`)) {
      setResolving(true);

      try {
        const signature = await resolveMarket(
          connection,
          { publicKey, signTransaction, connected } as any,
          marketId,
          outcome === 'YES' ? BetOutcome.Yes : BetOutcome.No
        );

        alert(`Market resolved successfully! Transaction: ${signature}`);

        // Refresh market data
        await fetchOnChainMarketData();
        await fetchMarket();
      } catch (error: any) {
        const errorMsg = error.message || error.transactionMessage || '';

        // Check if it's the "already processed" error - transaction likely succeeded
        if (errorMsg.includes('already been processed') || errorMsg.includes('MarketResolved')) {
          alert(`Market resolved successfully as ${outcome}!`);

          // Refresh market data to show resolution
          await fetchOnChainMarketData();
          await fetchMarket();
          await fetchUserBets();
        } else if (errorMsg.includes('NotAuthorized')) {
          alert('You are not authorized to resolve this market');
        } else if (errorMsg.includes('MarketNotEnded')) {
          alert('Market has not ended yet. Wait until the end date has passed.');
        } else if (errorMsg.includes('AlreadyResolved')) {
          alert('Market has already been resolved');
          // Still refresh to show current state
          await fetchOnChainMarketData();
          await fetchMarket();
        } else {
          alert(`Failed to resolve market: ${errorMsg}`);
        }
      } finally {
        setResolving(false);
      }
    }
  };

  const handleClaimPayout = async (bet: Bet) => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (bet.betIndex === undefined) {
      alert('Unable to claim: bet index not found');
      return;
    }

    setClaiming(true);

    try {
      // Derive bet PDA using bet_index (as expected by fixed deployed program)
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, connected } as any,
        { commitment: 'confirmed' }
      );
      const program = new Program(IDL as any, provider);

      const [marketPDA] = getMarketPDA(marketId);
      const [vaultPDA] = getVaultPDA(marketPDA);

      // Calculate bet PDA using bet_index (matching ClaimPayout constraint in fixed program)
      const [betPDA] = getBetPDA(marketPDA, publicKey, bet.betIndex);

      const tx = await program.methods
        .claimPayout()
        .accounts({
          market: marketPDA,
          bet: betPDA,
          vault: vaultPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert(`Payout claimed successfully! Transaction: ${tx}`);

      // Refresh user bets and market data
      await fetchUserBets();
      await fetchOnChainMarketData();
    } catch (error: any) {
      // Check if the transaction actually succeeded despite the error
      const logs = error?.logs || error?.transactionLogs || [];
      const claimSucceeded = logs.some((log: string) =>
        log.includes('Payout claimed:') || log.includes('Program CcrrFSJMVWLZU5w8WDCpXGCyZrBUA2XrwJitjL45UzZd success')
      );

      if (claimSucceeded) {
        alert(`Payout claimed successfully! Your winnings have been transferred.`);
        // Refresh user bets and market data
        await fetchUserBets();
        await fetchOnChainMarketData();
      } else if (error.message?.includes('AlreadyClaimed')) {
        alert('This bet has already been claimed');
      } else if (error.message?.includes('LosingBet')) {
        alert('This bet did not win');
      } else if (error.message?.includes('MarketNotResolved')) {
        alert('Market has not been resolved yet');
      } else {
        alert(`Failed to claim payout: ${error.message}`);
      }
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="lg:pl-64">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading market...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="lg:pl-64">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <Card className="glass p-12 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Market Not Found</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => router.push('/dashboard/markets')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Markets
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const volume = parseFloat(market.volume) || 0;
  const liquidity = parseFloat(market.liquidity) || 0;
  const yesPrice = parseFloat(market.outcomePrices[0]) || 0.5;
  const noPrice = parseFloat(market.outcomePrices[1]) || 0.5;

  // Use on-chain end date if available, otherwise use Polymarket's date
  const endDate = onChainEndDate || new Date(market.endDate);
  const timeUntilEndMs = endDate.getTime() - Date.now();
  const daysUntilEnd = Math.ceil(timeUntilEndMs / (1000 * 60 * 60 * 24));
  const hoursUntilEnd = Math.ceil(timeUntilEndMs / (1000 * 60 * 60));
  const minutesUntilEnd = Math.ceil(timeUntilEndMs / (1000 * 60));
  const isExpired = timeUntilEndMs <= 0 || market.closed;

  // Format time remaining
  const getTimeRemaining = () => {
    if (isExpired) return 'Ended';
    if (minutesUntilEnd < 60) return `${minutesUntilEnd} min${minutesUntilEnd === 1 ? '' : 's'}`;
    if (hoursUntilEnd < 48) return `${hoursUntilEnd} hour${hoursUntilEnd === 1 ? '' : 's'}`;
    return `${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'}`;
  };

  const totalBetAmount = userBets.reduce((sum, bet) => sum + bet.amount, 0);
  const userYesBets = userBets.filter(b => b.outcome === 'YES').length;
  const userNoBets = userBets.filter(b => b.outcome === 'NO').length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Back Button */}
          <Button variant="ghost" className="gap-2" asChild>
            <Link href="/dashboard/markets">
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Link>
          </Button>

          {/* Success Message */}
          {betSuccess && (
            <Card className="glass border-2 border-secondary bg-secondary/10 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary" />
                <div>
                  <div className="font-semibold text-secondary">Bet Placed Successfully!</div>
                  <div className="text-sm text-muted-foreground">
                    Your bet has been recorded on-chain via X402 payment
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Resolution Status Badge */}
          {resolutionStatus !== 'Pending' && (
            <ResolutionStatusBadge
              status={resolutionStatus}
              disputeEndTime={disputeEndTime}
            />
          )}

          {/* Market Resolved Banner */}
          {isResolved && winningOutcome && (
            <Card className={`glass border-2 p-4 ${
              winningOutcome === 'YES'
                ? 'border-green-500 bg-green-500/10'
                : 'border-red-500 bg-red-500/10'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-5 h-5 ${
                  winningOutcome === 'YES' ? 'text-green-500' : 'text-red-500'
                }`} />
                <div>
                  <div className={`font-semibold ${
                    winningOutcome === 'YES' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    Market Resolved - {winningOutcome} Won!
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Winners can claim their payouts below
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Admin Resolution Panel - Only shows if disputed */}
          <AdminResolutionPanel
            marketId={marketId}
            resolutionStatus={resolutionStatus}
            disputed={disputed}
            disputeReason={disputeReason}
            currentOutcome={winningOutcome || undefined}
            isAdmin={userIsAdmin}
          />

          {/* Dispute Dialog - Shows during dispute window */}
          {resolutionStatus === 'OracleResolved' && !disputed && (
            <div className="flex justify-end">
              <DisputeDialog
                marketId={marketId}
                resolutionStatus={resolutionStatus}
                disputeEndTime={disputeEndTime}
              />
            </div>
          )}

          {/* Resolve Market Section (Admin Only) */}
          {connected && userIsAdmin && isExpired && !isResolved && (
            <Card className="glass border-2 border-primary/50 bg-primary/10 p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="text-lg font-bold">Resolve Market (Admin Only)</h3>
                    <p className="text-sm text-muted-foreground">
                      This market has ended. As the creator, you can now resolve it by declaring the winning outcome.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleResolveMarket('YES')}
                    disabled={resolving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    {resolving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Resolve as YES
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleResolveMarket('NO')}
                    disabled={resolving}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    {resolving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Resolve as NO
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  ⚠️ Warning: This action cannot be undone. Make sure you are resolving based on accurate information.
                </div>
              </div>
            </Card>
          )}

          {/* Market Header */}
          <Card className="glass p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {market.category && (
                    <Badge variant="outline" className="text-xs">
                      {market.category}
                    </Badge>
                  )}
                  {volume > 100000 && (
                    <div className="flex items-center gap-1 text-xs text-secondary">
                      <TrendingUp className="w-3 h-3" />
                      <span>High Volume</span>
                    </div>
                  )}
                  <Badge variant="default" className="text-xs">
                    On-Chain
                  </Badge>
                  {isExpired && (
                    <Badge variant="destructive" className="text-xs">
                      Closed
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                  {market.question}
                </h1>
                {market.description && (
                  <p className="text-muted-foreground text-lg">
                    {market.description}
                  </p>
                )}
              </div>
            </div>

            {/* Market Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isExpired ? 'Ended' : 'Time Left'}
                </div>
                <div className="font-semibold">
                  {getTimeRemaining()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {endDate.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Volume
                </div>
                <div className="font-semibold">
                  ${volume >= 1000000
                    ? `${(volume / 1000000).toFixed(1)}M`
                    : `${(volume / 1000).toFixed(1)}K`}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Liquidity
                </div>
                <div className="font-semibold">
                  ${liquidity >= 1000000
                    ? `${(liquidity / 1000000).toFixed(1)}M`
                    : `${(liquidity / 1000).toFixed(1)}K`}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  X402 Fee
                </div>
                <div className="font-semibold">0.002 SOL</div>
              </div>
            </div>
          </Card>

          {/* Probability Chart */}
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold mb-4">Market Probabilities</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'YES', value: yesPrice * 100, amount: parseFloat(market.volume) * yesPrice },
                        { name: 'NO', value: noPrice * 100, amount: parseFloat(market.volume) * noPrice }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="font-semibold">YES</span>
                    </div>
                    <span className="text-2xl font-bold text-green-500">{(yesPrice * 100).toFixed(1)}%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total staked: {(parseFloat(market.volume) * yesPrice).toFixed(3)} SOL
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="font-semibold">NO</span>
                    </div>
                    <span className="text-2xl font-bold text-red-500">{(noPrice * 100).toFixed(1)}%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total staked: {(parseFloat(market.volume) * noPrice).toFixed(3)} SOL
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Pool:</span>
                    <span className="font-semibold">{parseFloat(market.volume).toFixed(3)} SOL</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Betting Interface */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Place Your Bet</h2>
                  <p className="text-muted-foreground text-sm">
                    Choose your bet amount and predict the outcome
                  </p>
                </div>

                {/* Bet Amount Input */}
                {connected && !isExpired && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bet Amount (SOL)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setBetAmount(val);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="0.002"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCustomAmount('0.01');
                          setBetAmount(0.01);
                        }}
                      >
                        Min
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCustomAmount('0.1');
                          setBetAmount(0.1);
                        }}
                      >
                        0.1
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCustomAmount('1');
                          setBetAmount(1);
                        }}
                      >
                        1 SOL
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum: 0.01 SOL (~$2) • Your bet: {betAmount} SOL (~${(betAmount * 200).toFixed(2)})
                    </p>
                  </div>
                )}

                {!connected ? (
                  <Card className="border-2 border-dashed border-border/50 p-8 text-center space-y-4">
                    <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Connect your Solana wallet to place bets on this market
                    </p>
                    <WalletMultiButton className="!bg-primary !mx-auto" />
                  </Card>
                ) : isExpired ? (
                  <Card className="border-2 border-destructive/50 bg-destructive/10 p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                    <h3 className="text-lg font-semibold mb-2">Market Closed</h3>
                    <p className="text-muted-foreground text-sm">
                      This market has ended and is no longer accepting bets
                    </p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* YES Button */}
                    <button
                      onClick={() => handlePlaceBet('YES')}
                      disabled={placingBet || isExpired}
                      className="group relative p-6 rounded-xl border-2 border-secondary/50 hover:border-secondary bg-secondary/10 hover:bg-secondary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-secondary">YES</span>
                          <span className="text-3xl font-bold text-secondary">
                            {(yesPrice * 100).toFixed(0)}¢
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground text-left">
                          {(yesPrice * 100).toFixed(1)}% chance
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3" />
                          <span>Bet {betAmount} SOL</span>
                        </div>
                      </div>
                      {placingBet && selectedOutcome === 'YES' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                        </div>
                      )}
                    </button>

                    {/* NO Button */}
                    <button
                      onClick={() => handlePlaceBet('NO')}
                      disabled={placingBet || isExpired}
                      className="group relative p-6 rounded-xl border-2 border-accent/50 hover:border-accent bg-accent/10 hover:bg-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-accent">NO</span>
                          <span className="text-3xl font-bold text-accent">
                            {(noPrice * 100).toFixed(0)}¢
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground text-left">
                          {(noPrice * 100).toFixed(1)}% chance
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3" />
                          <span>Bet {betAmount} SOL</span>
                        </div>
                      </div>
                      {placingBet && selectedOutcome === 'NO' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                      )}
                    </button>
                  </div>
                )}

                {/* X402 Payment Status */}
                {x402Status.isPaying && (
                  <Card className="bg-primary/10 border-2 border-primary/50 p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <div>
                        <div className="font-semibold text-primary">Processing X402 Payment...</div>
                        <div className="text-sm text-muted-foreground">
                          Step 1: Paying 0.01 SOL fee to access betting
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {x402Status.x402Signature && x402Status.isPlacingBet && (
                  <Card className="bg-secondary/10 border-2 border-secondary/50 p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                      <div>
                        <div className="font-semibold text-secondary">Placing Bet On-Chain...</div>
                        <div className="text-sm text-muted-foreground">
                          Step 2: Recording your bet on Solana blockchain
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Info */}
                <Card className="bg-muted/30 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold">X402 Protocol:</span> Pay 0.01 SOL per bet using the HTTP 402 "Payment Required" standard. No subscriptions, no complex setup - just instant micropayments.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold">On-Chain Recording:</span> After X402 payment verification, your bet is permanently recorded on Solana blockchain for full transparency
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold">Automatic Payouts:</span> Winnings
                      distributed from on-chain vault when market resolves
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    💡 Total cost: {betAmount} SOL (bet) + 0.01 SOL (X402 fee) = {(betAmount + 0.01).toFixed(4)} SOL
                  </div>
                </Card>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Your Bets */}
              <Card className="glass p-6 space-y-4">
                <h3 className="text-xl font-bold">Your Bets</h3>

                {!connected ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Connect wallet to view your bets
                  </div>
                ) : userBets.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No bets placed yet
                  </div>
                ) : (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pb-4 border-b border-border/50">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Total Bet</div>
                        <div className="font-bold">{totalBetAmount.toFixed(4)} SOL</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Position</div>
                        <div className="font-bold">
                          {userYesBets}Y / {userNoBets}N
                        </div>
                      </div>
                    </div>

                    {/* Bet List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {userBets.map((bet, index) => {
                        const isWinner = isResolved &&
                          ((winningOutcome === 'YES' && bet.outcome === 'YES') ||
                           (winningOutcome === 'NO' && bet.outcome === 'NO'));
                        const isClaimed = bet.status === 'won' || bet.payout !== undefined;

                        return (
                          <div
                            key={bet.id}
                            className={`p-3 rounded-lg space-y-2 ${
                              isWinner ? 'bg-green-500/10 border border-green-500/50' : 'bg-muted/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={bet.outcome === 'YES' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {bet.outcome}
                                </Badge>
                                {isResolved && (
                                  <Badge
                                    variant={isWinner ? 'default' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {isWinner ? '✓ Won' : '✗ Lost'}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-semibold text-sm">
                                {bet.amount.toFixed(4)} SOL
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(bet.timestamp).toLocaleDateString()}
                            </div>
                            {bet.txSignature && (
                              <a
                                href={`https://solscan.io/tx/${bet.txSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                View TX
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}

                            {/* Claim Payout Button */}
                            {isWinner && !isClaimed && bet.betIndex !== undefined && (
                              <Button
                                onClick={() => handleClaimPayout(bet)}
                                disabled={claiming}
                                className="w-full mt-2 bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                {claiming ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                    Claiming...
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="w-3 h-3 mr-2" />
                                    Claim Payout
                                  </>
                                )}
                              </Button>
                            )}

                            {isClaimed && (
                              <div className="text-xs text-green-500 flex items-center gap-1 mt-2">
                                <CheckCircle2 className="w-3 h-3" />
                                Payout Claimed
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>

              {/* Payout Explanation */}
              <Card className="glass p-6 space-y-4 border-2 border-secondary/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-secondary" />
                  <h3 className="text-xl font-bold">How Payouts Work</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/10">
                    <div className="font-semibold text-secondary mb-2">Payout Formula</div>
                    <code className="text-xs block">
                      Payout = Your Bet + (Your Bet / Winning Pool) × Losing Pool
                    </code>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Example:</div>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• You bet 0.1 SOL on YES</li>
                      <li>• Total YES pool: 1 SOL</li>
                      <li>• Total NO pool: 2 SOL</li>
                      <li>• If YES wins: 0.1 + (0.1/1) × 2 = <span className="text-secondary font-semibold">0.3 SOL</span></li>
                    </ul>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <div className="font-semibold mb-2">Resolution Process:</div>
                    <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                      <li>Market ends at specified date</li>
                      <li>Market creator resolves with outcome</li>
                      <li>Winners claim payouts from vault</li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        All funds are held in an on-chain vault and can only be withdrawn by winners after resolution
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Market Info */}
              <Card className="glass p-6 space-y-4">
                <h3 className="text-xl font-bold">Market Info</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Blockchain</div>
                    <div className="font-semibold">Solana Devnet</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Market ID</div>
                    <div className="font-mono text-xs break-all">{market.id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Status</div>
                    <Badge variant={market.active ? 'default' : 'secondary'}>
                      {market.active ? 'Active' : market.closed ? 'Closed' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Program</div>
                    <a
                      href={`https://solscan.io/address/${PROGRAM_ID.toString()}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline text-xs"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
