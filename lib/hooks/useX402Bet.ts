import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState } from 'react';

export interface BetPaymentDetails {
  recipient: string;
  amount: number;
  token: string;
  reference: string;
  memo: string;
  expiresIn: number;
  betDetails: {
    marketId: string;
    outcome: string;
    betAmount: number;
  };
}

export interface X402BetResponse {
  message: string;
  statusCode: number;
  paymentDetails: BetPaymentDetails;
}

export interface BetAuthorization {
  marketId: string;
  outcome: string;
  betAmount: number;
  x402Signature: string;
  x402Reference: string;
  timestamp: number;
}

export interface BetPaymentStatus {
  isPaying: boolean;
  isPlacingBet: boolean;
  error: string | null;
  x402Signature: string | null;
  betSignature: string | null;
  authorization: BetAuthorization | null;
}

/**
 * Hook for X402-powered betting
 * Implements the X402 protocol for pay-per-bet model
 */
export function useX402Bet() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [status, setStatus] = useState<BetPaymentStatus>({
    isPaying: false,
    isPlacingBet: false,
    error: null,
    x402Signature: null,
    betSignature: null,
    authorization: null,
  });

  /**
   * Place a bet using X402 protocol
   * 1. Request bet placement (get 402 response with payment details)
   * 2. Pay X402 fee to treasury
   * 3. Verify payment and get authorization
   * 4. Place bet on-chain with authorization
   */
  const placeBetWithX402 = async (
    marketId: string,
    outcome: 'YES' | 'NO',
    betAmount: number,
    onBetPlaced?: (betSignature: string) => Promise<void>
  ): Promise<{ success: boolean; betSignature?: string; error?: string }> => {
    if (!publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    setStatus({
      isPaying: false,
      isPlacingBet: false,
      error: null,
      x402Signature: null,
      betSignature: null,
      authorization: null,
    });

    try {
      // Step 1: Request bet placement (expect 402 response)
      console.log('[X402 Bet] Step 1: Requesting bet placement...');
      const betRequest = await fetch(
        `/api/bet?marketId=${marketId}&outcome=${outcome}&betAmount=${betAmount}&userWallet=${publicKey.toString()}`
      );

      if (betRequest.status !== 402) {
        throw new Error('Expected 402 Payment Required response');
      }

      const x402Response: X402BetResponse = await betRequest.json();
      console.log('[X402 Bet] Received 402 payment request:', x402Response);

      const { paymentDetails } = x402Response;

      // Step 2: Pay X402 fee
      console.log('[X402 Bet] Step 2: Paying X402 fee...');
      setStatus(prev => ({ ...prev, isPaying: true }));

      const recipientPubkey = new PublicKey(paymentDetails.recipient);
      const lamports = Math.floor(paymentDetails.amount * LAMPORTS_PER_SOL);

      console.log('[X402 Bet] Creating X402 payment transaction:', {
        from: publicKey.toString(),
        to: recipientPubkey.toString(),
        amount: paymentDetails.amount,
        lamports,
      });

      // Check if trying to send to yourself
      if (publicKey.equals(recipientPubkey)) {
        throw new Error(
          `Cannot send X402 payment to yourself! Please use a different wallet for testing. ` +
          `Treasury: ${recipientPubkey.toString().slice(0, 8)}... ` +
          `Your wallet: ${publicKey.toString().slice(0, 8)}...`
        );
      }

      // Create X402 payment transaction
      const paymentTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      paymentTransaction.recentBlockhash = blockhash;
      paymentTransaction.feePayer = publicKey;

      // Send X402 payment
      const x402Signature = await sendTransaction(paymentTransaction, connection);
      console.log('[X402 Bet] X402 payment sent:', x402Signature);

      // Wait for confirmation
      await connection.confirmTransaction(x402Signature, 'confirmed');
      console.log('[X402 Bet] X402 payment confirmed');

      setStatus(prev => ({ ...prev, x402Signature, isPaying: false }));

      // Step 3: Verify payment and get authorization
      console.log('[X402 Bet] Step 3: Verifying X402 payment...');
      const verifyResponse = await fetch('/api/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: x402Signature,
          reference: paymentDetails.reference,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'X402 payment verification failed');
      }

      const verifyResult = await verifyResponse.json();
      console.log('[X402 Bet] X402 payment verified!', verifyResult);

      const authorization: BetAuthorization = verifyResult.authorization;
      setStatus(prev => ({ ...prev, authorization }));

      // Step 4: Place bet on-chain (this is now authorized by X402 payment)
      console.log('[X402 Bet] Step 4: Placing bet on-chain...');
      setStatus(prev => ({ ...prev, isPlacingBet: true }));

      if (onBetPlaced) {
        // Call the provided callback to place the bet
        // The callback should use the regular placeBet function
        await onBetPlaced(x402Signature);
      }

      return {
        success: true,
        betSignature: x402Signature, // For now, return X402 signature as proof
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'X402 bet failed';

      // Only log if it's not the "already processed" error
      if (!errorMessage.includes('already been processed')) {
        console.error('[X402 Bet] Error:', errorMessage);
      }

      setStatus(prev => ({
        ...prev,
        isPaying: false,
        isPlacingBet: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Reset the status
   */
  const resetStatus = () => {
    setStatus({
      isPaying: false,
      isPlacingBet: false,
      error: null,
      x402Signature: null,
      betSignature: null,
      authorization: null,
    });
  };

  return {
    placeBetWithX402,
    resetStatus,
    status,
    isLoading: status.isPaying || status.isPlacingBet,
    isWalletConnected: !!publicKey,
  };
}
