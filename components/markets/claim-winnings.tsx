'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, TrendingUp, Loader2, PartyPopper } from 'lucide-react';
import { claimPayout } from '@/lib/solana/prediction-bets';
import { toast } from 'sonner';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface UserBet {
  betIndex: number;
  outcomeIndex: number;
  amount: number;
  isClaimed: boolean;
  potentialPayout: number;
}

interface ClaimWinningsProps {
  marketId: string;
  isResolved: boolean;
  winningOutcome: number;
  outcomes: string[];
  userBets: UserBet[];
}

export function ClaimWinnings({
  marketId,
  isResolved,
  winningOutcome,
  outcomes,
  userBets,
}: ClaimWinningsProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [claiming, setClaiming] = useState<number | null>(null);
  const [claimedBets, setClaimedBets] = useState<Set<number>>(new Set());

  const winningBets = userBets.filter(
    (bet) => bet.outcomeIndex === winningOutcome && !bet.isClaimed && !claimedBets.has(bet.betIndex)
  );

  const losingBets = userBets.filter((bet) => bet.outcomeIndex !== winningOutcome);
  const alreadyClaimedBets = userBets.filter((bet) => bet.isClaimed || claimedBets.has(bet.betIndex));

  const totalWinnings = winningBets.reduce((sum, bet) => sum + bet.potentialPayout, 0);

  const handleClaim = async (betIndex: number) => {
    if (!wallet.publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    setClaiming(betIndex);
    try {
      const signature = await claimPayout(
        connection,
        wallet,
        marketId,
        betIndex
      );

      const bet = winningBets.find(b => b.betIndex === betIndex);

      toast.success('Winnings claimed successfully! 🎉', {
        description: `Claimed ${bet?.potentialPayout.toFixed(4)} SOL`,
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank'),
        },
      });

      // Mark as claimed locally
      setClaimedBets(prev => new Set([...prev, betIndex]));
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error('Failed to claim winnings', {
        description: error.message || 'Unknown error occurred',
      });
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimAll = async () => {
    if (!wallet.publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    for (const bet of winningBets) {
      try {
        await handleClaim(bet.betIndex);
        // Wait a bit between claims to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error claiming bet:', bet.betIndex, error);
        break; // Stop on first error
      }
    }
  };

  if (!isResolved) {
    return null;
  }

  if (userBets.length === 0) {
    return null;
  }

  if (winningBets.length === 0 && alreadyClaimedBets.length === 0 && losingBets.length > 0) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader>
          <CardTitle className="text-red-500">No Winning Bets</CardTitle>
          <CardDescription>Unfortunately, none of your bets were on the winning outcome</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm">Winning Outcome:</span>
              <Badge variant="default">{outcomes[winningOutcome]}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm">Your Bets:</span>
              <span className="text-sm text-muted-foreground">
                {losingBets.map(bet => outcomes[bet.outcomeIndex]).join(', ')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-500/50 bg-gradient-to-br from-green-500/5 to-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PartyPopper className="w-5 h-5 text-green-500" />
          <CardTitle>You Won! 🎉</CardTitle>
        </div>
        <CardDescription>
          Claim your winnings from the resolved market
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Winnings Available</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-500">
            {totalWinnings.toFixed(4)} SOL
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            From {winningBets.length} winning bet{winningBets.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Winning Outcome */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <span className="text-sm font-medium">Winning Outcome:</span>
          <Badge variant="default" className="bg-green-500">
            {outcomes[winningOutcome]}
          </Badge>
        </div>

        {/* Individual Bets */}
        {winningBets.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">Your Winning Bets:</div>
            {winningBets.map((bet) => (
              <div
                key={bet.betIndex}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{outcomes[bet.outcomeIndex]}</div>
                  <div className="text-xs text-muted-foreground">
                    Bet: {bet.amount.toFixed(4)} SOL → Win: {bet.potentialPayout.toFixed(4)} SOL
                  </div>
                </div>
                <Button
                  onClick={() => handleClaim(bet.betIndex)}
                  disabled={claiming !== null}
                  size="sm"
                >
                  {claiming === bet.betIndex ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    'Claim'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Claim All Button */}
        {winningBets.length > 1 && (
          <Button
            onClick={handleClaimAll}
            disabled={claiming !== null}
            className="w-full"
            size="lg"
          >
            {claiming !== null ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                Claim All ({totalWinnings.toFixed(4)} SOL)
              </>
            )}
          </Button>
        )}

        {/* Already Claimed */}
        {alreadyClaimedBets.length > 0 && (
          <Alert>
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription className="text-sm">
              You've already claimed {alreadyClaimedBets.length} bet{alreadyClaimedBets.length !== 1 ? 's' : ''} from this market
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
