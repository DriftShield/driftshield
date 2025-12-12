'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { resolveMarket } from '@/lib/solana/prediction-bets';
import { toast } from 'sonner';

interface MarketResolutionAdminProps {
  marketId: string;
  outcomes: string[];
  endDate: string;
  isResolved: boolean;
  winningOutcome?: number;
  isAdmin: boolean;
}

export function MarketResolutionAdmin({
  marketId,
  outcomes,
  endDate,
  isResolved,
  winningOutcome,
  isAdmin,
}: MarketResolutionAdminProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);

  const marketEnded = new Date(endDate).getTime() < Date.now();

  const handleResolve = async () => {
    if (selectedOutcome === null) {
      toast.error('Please select a winning outcome');
      return;
    }

    if (!wallet.publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    setResolving(true);
    try {
      const signature = await resolveMarket(
        connection,
        wallet,
        marketId,
        selectedOutcome
      );

      toast.success('Market resolved successfully!', {
        description: `Transaction: ${signature.slice(0, 8)}...`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank'),
        },
      });

      // Refresh page after 2 seconds
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Resolution error:', error);
      toast.error('Failed to resolve market', {
        description: error.message || 'Unknown error occurred',
      });
    } finally {
      setResolving(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isResolved) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <CardTitle>Market Resolved</CardTitle>
          </div>
          <CardDescription>This market has been resolved</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="font-medium">Winning Outcome:</span>
              <Badge variant="default" className="bg-green-500">
                {outcomes[winningOutcome || 0]}
              </Badge>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                Winners can now claim their payouts. Losing bets remain on-chain for record keeping.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketEnded) {
    return (
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <CardTitle>Market Still Active</CardTitle>
          </div>
          <CardDescription>Cannot resolve until market end date</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="text-sm">
              Market ends on <strong>{new Date(endDate).toLocaleString()}</strong>.
              Resolution will be available after this time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-orange-500" />
          <CardTitle>Resolve Market</CardTitle>
        </div>
        <CardDescription>
          Select the winning outcome to resolve this market and enable payouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Winning Outcome:</label>
          <div className="grid gap-2">
            {outcomes.map((outcome, index) => (
              <button
                key={index}
                onClick={() => setSelectedOutcome(index)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedOutcome === index
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{outcome}</span>
                  {selectedOutcome === index && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>Warning:</strong> Resolution is permanent and cannot be undone.
            Ensure you have verified the correct outcome before proceeding.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleResolve}
          disabled={selectedOutcome === null || resolving}
          className="w-full"
          size="lg"
        >
          {resolving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resolving...
            </>
          ) : (
            'Resolve Market'
          )}
        </Button>

        {selectedOutcome !== null && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm">
              <strong>You are about to resolve this market with:</strong>
            </p>
            <p className="text-sm font-bold text-primary mt-1">
              {outcomes[selectedOutcome]}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
