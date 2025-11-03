'use client';

import { useState } from 'react';
import { useX402 } from '@/lib/hooks/useX402';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PredictionMarketData {
  marketId: string;
  betPlaced: boolean;
  position: string;
  amount: number;
  potentialPayout: number;
}

export function PredictionMarketPaid() {
  const { fetchPaidResource, paymentStatus, isWalletConnected, checkPaymentRequired } = useX402();
  const [betAmount, setBetAmount] = useState('10');
  const [position, setPosition] = useState<'YES' | 'NO'>('YES');
  const [marketData, setMarketData] = useState<PredictionMarketData | null>(null);
  const [pricing, setPricing] = useState<number | null>(null);

  // Check pricing on mount
  const handleCheckPrice = async () => {
    const paymentDetails = await checkPaymentRequired('prediction-market');
    if (paymentDetails) {
      setPricing(paymentDetails.amount);
    }
  };

  const handlePlaceBet = async () => {
    try {
      const data = await fetchPaidResource<PredictionMarketData>('prediction-market');
      setMarketData(data);
    } catch (error) {
      console.error('Failed to place bet:', error);
    }
  };

  if (!isWalletConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Premium Prediction Market
          </CardTitle>
          <CardDescription>
            Connect your wallet to participate in prediction markets
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Prediction Market - Pay Per Bet
        </CardTitle>
        <CardDescription>
          Place a bet with micro-payment via X402 protocol
          {pricing !== null && (
            <Badge variant="secondary" className="ml-2">
              {pricing} SOL per bet
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!marketData ? (
          <>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Market Question</h3>
                <p className="text-sm text-muted-foreground">
                  Will Bitcoin reach $100,000 by end of year?
                </p>
                <div className="flex gap-4 mt-3">
                  <div>
                    <span className="text-xs text-muted-foreground">YES Odds</span>
                    <p className="text-lg font-bold text-green-500">65%</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">NO Odds</span>
                    <p className="text-lg font-bold text-red-500">35%</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Total Pool</span>
                    <p className="text-lg font-bold">1,234 SOL</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="position">Your Position</Label>
                  <RadioGroup
                    value={position}
                    onValueChange={(value) => setPosition(value as 'YES' | 'NO')}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="YES" id="yes" />
                      <Label htmlFor="yes" className="font-normal">
                        YES
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NO" id="no" />
                      <Label htmlFor="no" className="font-normal">
                        NO
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="amount">Bet Amount (SOL)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0.1"
                    step="0.1"
                    className="mt-1"
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Potential Payout:</span>
                    <span className="font-bold">
                      {(parseFloat(betAmount || '0') * 1.55).toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Platform Fee (X402):</span>
                    <span className="text-muted-foreground">0.01 SOL</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePlaceBet}
              disabled={paymentStatus.isPaying || !betAmount}
              className="w-full"
              size="lg"
            >
              {paymentStatus.isPaying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Place Bet (Pay 0.01 SOL)
                </>
              )}
            </Button>

            {paymentStatus.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{paymentStatus.error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Bet placed successfully! Your position has been recorded.
              </AlertDescription>
            </Alert>

            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold">Bet Confirmation</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Market ID:</span>
                <span className="font-mono text-xs">{marketData.marketId.slice(0, 16)}...</span>

                <span className="text-muted-foreground">Position:</span>
                <span className="font-bold">{marketData.position}</span>

                <span className="text-muted-foreground">Amount:</span>
                <span>{marketData.amount} SOL</span>

                <span className="text-muted-foreground">Potential Payout:</span>
                <span className="text-green-600 font-bold">{marketData.potentialPayout} SOL</span>
              </div>
            </div>

            {paymentStatus.signature && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Transaction:{' '}
                  <a
                    href={`https://solscan.io/tx/${paymentStatus.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View on Explorer
                  </a>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => setMarketData(null)}
              variant="outline"
              className="w-full"
            >
              Place Another Bet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
