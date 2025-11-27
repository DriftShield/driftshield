'use client';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useX402BetSimplified } from "@/lib/hooks/useX402BetSimplified";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { placeBet as placeBetOnChain, getMarketPDA, PROGRAM_ID, claimPayout, resolveMarket, getVaultPDA, getBetPDA } from "@/lib/solana/prediction-bets";
import { parseResolutionStatus } from "@/lib/solana/oracle-resolution";
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { SystemProgram } from '@solana/web3.js';
import IDL from '@/lib/solana/prediction_bets_idl.json';
import { isAdmin } from "@/lib/constants/admin";
import { DisputeDialog } from "@/components/dispute-dialog";
import { AdminResolutionPanel } from "@/components/admin-resolution-panel";
import { ResolutionStatusBadge } from "@/components/resolution-status-badge";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

// New Components
import { MarketHeader } from "@/components/markets/market-header";
import { PriceChart } from "@/components/markets/price-chart";
import { TradingPanel } from "@/components/markets/trading-panel";
import { RecentTrades } from "@/components/markets/recent-trades";

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
  betPubkey?: string;
  betIndex?: number;
  price?: number; // Added for trade history
}

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: marketId } = use(params);
  const router = useRouter();
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { placeBetWithX402, status: x402Status } = useX402BetSimplified();

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0.01);
  const [placingBet, setPlacingBet] = useState(false);
  const [onChainEndDate, setOnChainEndDate] = useState<Date | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [winningOutcome, setWinningOutcome] = useState<'YES' | 'NO' | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [isMarketAuthority, setIsMarketAuthority] = useState(false);

  // Oracle resolution state
  const [resolutionStatus, setResolutionStatus] = useState<string>("Pending");
  const [disputed, setDisputed] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEndTime, setDisputeEndTime] = useState<number | null>(null);

  // AMM state
  const [marketData, setMarketData] = useState<any>(null);
  const [userShares, setUserShares] = useState<{ yes: number; no: number }>({ yes: 0, no: 0 });

  const userIsAdmin = isAdmin(publicKey?.toString());

  useEffect(() => {
    fetchMarket();
    fetchOnChainMarketData();
    if (connected && publicKey) {
      fetchUserBets();
    }
  }, [marketId, connected, publicKey]);

  // Fetch user shares when marketData is loaded
  useEffect(() => {
    if (connected && publicKey && marketData) {
      fetchUserShares();
    }
  }, [connected, publicKey, marketData]);

  // Simplified fetch logic reusing existing
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
        
        // If no outcome selected yet, select the first one
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

  // Reuse existing fetchOnChainMarketData
  const fetchOnChainMarketData = async () => {
    try {
      const [marketPDA] = getMarketPDA(marketId);
      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);
      const accountInfo = await connection.getAccountInfo(marketPDA);

      if (!accountInfo) return;

      const onChainMarketData = coder.decode('Market', accountInfo.data) as any;
      if (onChainMarketData && onChainMarketData.end_timestamp) {
        // Save raw market data for AMM calculations
        setMarketData(onChainMarketData);

        const endTimestamp = onChainMarketData.end_timestamp.toNumber();
        setOnChainEndDate(new Date(endTimestamp * 1000));
        setIsResolved(onChainMarketData.is_resolved);

        if (onChainMarketData.winning_outcome !== null && onChainMarketData.winning_outcome !== undefined) {
          const outcomeLabels = onChainMarketData.outcome_labels.slice(0, onChainMarketData.num_outcomes);
          setWinningOutcome(outcomeLabels[onChainMarketData.winning_outcome] || 'Unknown');
        }

        if (onChainMarketData.resolution_status) {
          setResolutionStatus(parseResolutionStatus(onChainMarketData.resolution_status));
        }
        setDisputed(onChainMarketData.disputed || false);
        setDisputeReason(onChainMarketData.dispute_reason || "");
        if (onChainMarketData.dispute_end_time) {
          setDisputeEndTime(onChainMarketData.dispute_end_time.toNumber());
        }

        if (publicKey && onChainMarketData.authority) {
          setIsMarketAuthority(onChainMarketData.authority.toBase58() === publicKey.toBase58());
        }
      }
    } catch (error) {
      console.error('Error fetching on-chain market data:', error);
    }
  };

  // Reuse existing fetchUserBets with minor tweaks for Trade object compatibility
  const fetchUserBets = async () => {
    if (!publicKey) return;
    try {
      const [marketPDA] = getMarketPDA(marketId);
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
        ]
      });

      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);
      const marketBets: Bet[] = [];

      // Need current prices to estimate trade price if not stored
      // For now just using 0.5 default if we can't calculate
      const currentPriceMap: Record<string, number> = {};
      
      for (const { pubkey, account } of programAccounts) {
        try {
          const betAccount = coder.decode('Bet', account.data) as any;
          if (betAccount.market.toBase58() !== marketPDA.toBase58()) continue;

          // Approximate outcome label since we might not have full market data in this loop
          // In a real app we'd fetch this properly or cache it
          const outcomeIndex = betAccount.outcome_index;
          const outcomeLabel = market?.outcomes[outcomeIndex] || (outcomeIndex === 0 ? 'YES' : 'NO');

          marketBets.push({
            id: pubkey.toBase58(),
            marketId: betAccount.market_id,
            outcome: outcomeLabel,
            amount: betAccount.amount.toNumber() / 1000000000,
            timestamp: betAccount.timestamp.toNumber() * 1000,
            txSignature: '', // Can't get from account data
            status: betAccount.is_claimed ? 'won' : 'confirmed',
            betPubkey: pubkey.toBase58(),
            betIndex: betAccount.bet_index ? betAccount.bet_index.toNumber() : undefined,
            price: 0.50 // Mock price for display
          });
        } catch (err) { continue; }
      }
      
      // Sort by time desc
      marketBets.sort((a, b) => b.timestamp - a.timestamp);
      setUserBets(marketBets);
    } catch (err) {
      console.error('Error fetching user bets:', err);
    }
  };

  // Fetch user shares for AMM sell functionality
  const fetchUserShares = async () => {
    if (!publicKey || !marketData) return;

    try {
      const [marketPDA] = getMarketPDA(marketId);

      // Get Position PDA for this user and market
      const [positionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('position'), marketPDA.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
      const coder = new BorshAccountsCoder(IDL as any);

      try {
        const accountInfo = await connection.getAccountInfo(positionPDA);

        if (!accountInfo) {
          // No position account = no shares
          setUserShares({ yes: 0, no: 0 });
          return;
        }

        const positionAccount = coder.decode('Position', accountInfo.data) as any;

        // Position account stores shares directly from AMM
        const yesShares = positionAccount.yes_shares?.toNumber() / 1e9 || 0;
        const noShares = positionAccount.no_shares?.toNumber() / 1e9 || 0;

        setUserShares({ yes: yesShares, no: noShares });
        console.log('User shares:', { yes: yesShares, no: noShares });
      } catch (err) {
        console.error('Error decoding position account:', err);
        setUserShares({ yes: 0, no: 0 });
      }
    } catch (err) {
      console.error('Error fetching user shares:', err);
      setUserShares({ yes: 0, no: 0 });
    }
  };

  const handlePlaceBet = async () => {
    if (!connected || !publicKey || !signTransaction || !market || !selectedOutcome) {
      alert('Please connect wallet and select an outcome');
      return;
    }

    setPlacingBet(true);
    try {
      const outcomeIndex = market.outcomes.indexOf(selectedOutcome);
      if (outcomeIndex === -1) throw new Error("Invalid outcome");

      // X402 Payment
      const result = await placeBetWithX402(
        market.id,
        selectedOutcome as 'YES' | 'NO', // Type cast for now
        betAmount,
        publicKey.toBase58()
      );

      if (!result.success) throw new Error(result.error || 'X402 bet failed');

      // On-Chain Bet
      const betSignature = await placeBetOnChain(
        connection,
        { publicKey, signTransaction, connected } as any,
        market.id,
        outcomeIndex,
        betAmount,
        market.endDate,
        market.question,
        market.outcomes
      );

      // Optimistic Update
      const newBet: Bet = {
        id: betSignature,
        marketId: market.id,
        outcome: selectedOutcome,
        amount: betAmount,
        timestamp: Date.now(),
        txSignature: betSignature,
        status: 'confirmed',
        price: parseFloat(market.outcomePrices[outcomeIndex] || "0.5")
      };

      setUserBets([newBet, ...userBets]);
      await fetchMarket();
      await fetchUserBets(); // Full refresh
      await fetchUserShares();

    } catch (err: any) {
      console.error('Bet error:', err);
      alert(`Failed to place bet: ${err.message || 'Unknown error'}`);
    } finally {
      setPlacingBet(false);
    }
  };

  const handleSellShares = async (shares: number) => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect wallet');
      return;
    }

    setPlacingBet(true);
    try {
      // Import sell helper
      const { sellShares } = await import('@/lib/amm/sell-shares');

      const outcomeType = selectedOutcome === market?.outcomes[0] ? 'YES' : 'NO';

      // Get program
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction } as any,
        { commitment: 'confirmed' }
      );
      const program = new Program(IDL as any, provider);
      const [marketPDA] = getMarketPDA(marketId);

      const result = await sellShares(
        connection,
        { publicKey, signTransaction } as any,
        marketPDA,
        program,
        shares,
        outcomeType
      );

      if (result.success) {
        alert(`Sold ${shares.toFixed(4)} shares for ${result.solReceived?.toFixed(4)} SOL!`);
        await fetchMarket();
        await fetchUserBets();
        await fetchUserShares();
      } else {
        alert(`Sell failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error('Sell error:', err);
      alert(`Failed to sell shares: ${err.message || 'Unknown error'}`);
    } finally {
      setPlacingBet(false);
    }
  };

  // Format time remaining
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Market Not Found</h2>
        <Button onClick={() => router.push('/dashboard/markets')}>Back to Markets</Button>
      </div>
    );
  }

  const activeOutcomeIndex = selectedOutcome ? market.outcomes.indexOf(selectedOutcome) : 0;
  const activePrice = parseFloat(market.outcomePrices[activeOutcomeIndex] || "0.5");
  const activeColorClass = activeOutcomeIndex === 0 ? "text-green-500" : "text-red-500"; // Simple color logic

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <div className="lg:pl-64 pt-4 md:pt-8">
        <div className="container mx-auto max-w-[1600px] px-4 space-y-4">
          
          {/* Back Button */}
          <Link 
            href="/dashboard/markets" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Markets
          </Link>

          {/* Resolution / Admin Status Banners */}
          {resolutionStatus !== 'Pending' && (
            <div className="mb-4">
              <ResolutionStatusBadge status={resolutionStatus} disputeEndTime={disputeEndTime} />
            </div>
          )}
          
          {isResolved && winningOutcome && (
            <Card className="p-4 mb-4 bg-primary/10 border-primary/50">
              <div className="flex items-center gap-2 font-bold text-primary">
                <CheckCircle2 className="w-5 h-5" />
                Market Resolved: {winningOutcome} Won
              </div>
            </Card>
          )}

          {/* Header Ticker */}
          <MarketHeader 
            title={market.question}
            volume={market.volume}
            liquidity={market.liquidity}
            timeLeft={getTimeRemaining()}
            category={market.category}
          />

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-250px)] min-h-[600px]">
            
            {/* Left Column: Chart & Trades */}
            <div className="lg:col-span-2 flex flex-col gap-4 h-full">
              {/* Chart Section */}
              <div className="h-[400px] shrink-0">
                <PriceChart 
                  outcomeName={selectedOutcome || market.outcomes[0]}
                  color={activeColorClass}
                  currentPrice={activePrice}
                  allOutcomes={market.outcomes}
                  allPrices={market.outcomePrices.map(p => parseFloat(p))}
                />
              </div>

              {/* Trades / Info Section */}
              <div className="flex-1 min-h-[300px]">
                <RecentTrades 
                  trades={userBets} 
                  currentUserAddress={publicKey?.toString()}
                />
              </div>
            </div>

            {/* Right Column: Trading Panel */}
            <div className="lg:col-span-1 h-full">
              <TradingPanel
                marketData={marketData}
                outcomes={market.outcomes}
                outcomePrices={market.outcomePrices}
                selectedOutcome={selectedOutcome}
                onOutcomeSelect={setSelectedOutcome}
                betAmount={betAmount}
                onAmountChange={setBetAmount}
                onPlaceBet={handlePlaceBet}
                onSellShares={handleSellShares}
                userShares={userShares}
                isPlacingBet={placingBet}
                isExpired={market.closed}
                connected={connected}
                x402Status={x402Status}
              />
            </div>
          </div>

          {/* Admin Resolution Section (Below Fold) */}
          {userIsAdmin && (
            <div className="mt-12 pt-8 border-t border-border/20">
              <h3 className="text-lg font-bold mb-4">Admin Controls</h3>
              
              {/* Resolution Panel */}
              <AdminResolutionPanel
                marketId={marketId}
                resolutionStatus={resolutionStatus}
                disputed={disputed}
                disputeReason={disputeReason}
                currentOutcome={winningOutcome || undefined}
                isAdmin={userIsAdmin}
              />

              {/* Manual Resolve Buttons if expired & not resolved */}
              {market.closed && !isResolved && (
                <Card className="p-6 mt-4 glass border-destructive/30">
                  <h4 className="font-semibold mb-2 text-destructive">Force Resolution</h4>
                  <div className="flex gap-2">
                    {market.outcomes.map((outcome, idx) => (
                      <Button 
                        key={idx}
                        variant="outline" 
                        onClick={() => {
                          // Need to implement or import handleResolveMarket logic if needed here
                          // Keeping it simple for now as AdminResolutionPanel handles most logic
                          alert("Use the Admin Resolution Panel above or standard flow.");
                        }}
                      >
                        Resolve {outcome}
                      </Button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
