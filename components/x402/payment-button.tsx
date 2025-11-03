'use client';

import { useState } from 'react';
import { useX402, PaymentDetails } from '@/lib/hooks/useX402';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface X402PaymentButtonProps {
  resource: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  disabled?: boolean;
}

export function X402PaymentButton({
  resource,
  onSuccess,
  onError,
  buttonText,
  disabled = false,
}: X402PaymentButtonProps) {
  const { fetchPaidResource, paymentStatus, isWalletConnected } = useX402();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handlePayment = async () => {
    try {
      setShowDetails(true);
      const data = await fetchPaidResource(resource);
      onSuccess?.(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onError?.(errorMessage);
    }
  };

  if (!isWalletConnected) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please connect your wallet to access premium features
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePayment}
        disabled={disabled || paymentStatus.isPaying}
        className="w-full"
      >
        {paymentStatus.isPaying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : paymentStatus.signature ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Payment Complete
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            {buttonText || 'Unlock Premium Feature'}
          </>
        )}
      </Button>

      {paymentStatus.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{paymentStatus.error}</AlertDescription>
        </Alert>
      )}

      {paymentStatus.signature && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Payment confirmed! Transaction:{' '}
            <a
              href={`https://explorer.solana.com/tx/${paymentStatus.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Explorer
            </a>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
