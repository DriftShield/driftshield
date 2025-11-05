import { useState } from 'react';

export interface BetPaymentStatus {
  isProcessing: boolean;
  error: string | null;
  authorizationId: string | null;
}

/**
 * Simplified hook for X402-powered betting
 * Works with x402-next middleware that handles payment via facilitator
 */
export function useX402BetSimplified() {
  const [status, setStatus] = useState<BetPaymentStatus>({
    isProcessing: false,
    error: null,
    authorizationId: null,
  });

  /**
   * Place a bet using X402 protocol
   * The x402-next middleware automatically handles:
   * 1. Returning 402 Payment Required on first request
   * 2. Verifying payment with PayAI facilitator
   * 3. Forwarding authorized request to route handler
   */
  const placeBetWithX402 = async (
    marketId: string,
    outcome: 'YES' | 'NO',
    betAmount: number,
    userWallet: string
  ): Promise<{ success: boolean; authorizationId?: string; error?: string }> => {
    setStatus({
      isProcessing: true,
      error: null,
      authorizationId: null,
    });

    try {
      console.log('[X402 Bet Simplified] Placing bet...', {
        marketId,
        outcome,
        betAmount,
        userWallet,
      });

      // Make request to x402-protected endpoint
      // The middleware will:
      // 1. First request: Return 402 with payment details
      // 2. Client pays via facilitator
      // 3. Second request (with payment proof): Forward to route handler
      const response = await fetch('/api/x402-bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketId,
          outcome,
          betAmount,
          userWallet,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      if (data.success && data.authorization) {
        const authorizationId = data.authorization.authorizationId;

        setStatus({
          isProcessing: false,
          error: null,
          authorizationId,
        });

        console.log('[X402 Bet Simplified] Bet authorized!', data.authorization);

        return {
          success: true,
          authorizationId,
        };
      }

      throw new Error('Invalid response from server');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'X402 bet failed';
      console.error('[X402 Bet Simplified] Error:', errorMessage);

      setStatus({
        isProcessing: false,
        error: errorMessage,
        authorizationId: null,
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Reset the status
   */
  const resetStatus = () => {
    setStatus({
      isProcessing: false,
      error: null,
      authorizationId: null,
    });
  };

  return {
    placeBetWithX402,
    resetStatus,
    status,
    isLoading: status.isProcessing,
  };
}
