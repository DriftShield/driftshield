import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

export interface BetPaymentStatus {
  isProcessing: boolean;
  error: string | null;
  authorizationId: string | null;
}

// USDC mint address on Solana
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;

/**
 * Simplified hook for X402-powered betting
 * Handles the full X402 payment flow:
 * 1. Request returns 402 with payment details
 * 2. Client makes USDC payment
 * 3. Retry request with payment signature
 */
export function useX402BetSimplified() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [status, setStatus] = useState<BetPaymentStatus>({
    isProcessing: false,
    error: null,
    authorizationId: null,
  });

  /**
   * Make USDC payment to recipient
   */
  const makeUSDCPayment = async (
    recipientAddress: string,
    amountUSDC: number
  ): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    const recipient = new PublicKey(recipientAddress);

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      publicKey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      recipient
    );

    // Convert USDC amount to smallest unit
    const amount = Math.floor(amountUSDC * Math.pow(10, USDC_DECIMALS));

    // Create transfer instruction
    const transaction = new Transaction().add(
      createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Get recent blockhash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    transaction.feePayer = publicKey;

    // Sign and send transaction
    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  };

  /**
   * Place a bet using X402 protocol
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

      // Step 1: Make initial request (will return 402)
      const initialResponse = await fetch('/api/x402-bet', {
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

      // If 402, handle payment
      if (initialResponse.status === 402) {
        console.log('[X402] Payment required, processing payment...');

        const paymentDetails = await initialResponse.json();
        console.log('[X402] Payment details:', paymentDetails);

        // Extract payment info from x402-next response
        // The middleware should return payment details in the response
        const recipientAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET ||
                                process.env.ADDRESS ||
                                '53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp';
        const paymentAmount = 1.0; // $1.00 USDC per bet

        console.log('[X402] Making USDC payment:', { recipientAddress, paymentAmount });

        // Make USDC payment
        const paymentSignature = await makeUSDCPayment(recipientAddress, paymentAmount);

        console.log('[X402] Payment completed:', paymentSignature);

        // Step 2: Retry request with payment proof
        const retryResponse = await fetch('/api/x402-bet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': paymentSignature, // Provide payment proof
          },
          body: JSON.stringify({
            marketId,
            outcome,
            betAmount,
            userWallet,
          }),
        });

        const data = await retryResponse.json();

        if (!retryResponse.ok) {
          throw new Error(data.error || `Request failed with status ${retryResponse.status}`);
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
      } else if (initialResponse.ok) {
        // Payment already done or not required
        const data = await initialResponse.json();

        if (data.success && data.authorization) {
          setStatus({
            isProcessing: false,
            error: null,
            authorizationId: data.authorization.authorizationId,
          });

          return {
            success: true,
            authorizationId: data.authorization.authorizationId,
          };
        }
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
