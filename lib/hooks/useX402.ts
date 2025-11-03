import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState } from 'react';

export interface PaymentDetails {
  recipient: string;
  amount: number;
  token: string;
  reference: string;
  memo: string;
  expiresIn: number;
}

export interface X402Response {
  message: string;
  statusCode: number;
  paymentDetails: PaymentDetails;
}

export interface PaymentStatus {
  isPaying: boolean;
  error: string | null;
  signature: string | null;
}

/**
 * Hook for X402 micro-payments on Solana
 * Handles pay-per-use access to premium features
 */
export function useX402() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isPaying: false,
    error: null,
    signature: null,
  });

  /**
   * Fetches a URL and handles X402 payment if required
   * @param url - The API endpoint to fetch
   * @param options - Optional fetch options
   * @returns The final response after payment (if required)
   */
  const payAndFetch = async (url: string, options?: RequestInit) => {
    setPaymentStatus({ isPaying: false, error: null, signature: null });

    try {
      // 1. Initial fetch to check if payment is required
      const initialResponse = await fetch(url, options);

      // If not 402, return response directly
      if (initialResponse.status !== 402) {
        return initialResponse;
      }

      // 2. Parse payment requirements
      const x402Data: X402Response = await initialResponse.json();
      console.log('Received 402 payment request:', x402Data);

      const { paymentDetails } = x402Data;

      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('Payment details:', paymentDetails);

      setPaymentStatus({ isPaying: true, error: null, signature: null });

      // 3. Create payment transaction
      const recipientPubkey = new PublicKey(paymentDetails.recipient);
      const lamports = Math.floor(paymentDetails.amount * LAMPORTS_PER_SOL);

      console.log('Creating payment transaction:', {
        from: publicKey.toString(),
        to: recipientPubkey.toString(),
        amount: paymentDetails.amount,
        lamports,
      });

      // Check if trying to send to yourself
      if (publicKey.equals(recipientPubkey)) {
        throw new Error(
          `Cannot send payment to yourself! Please use a different wallet for testing. ` +
          `Treasury wallet: ${recipientPubkey.toString().slice(0, 8)}... ` +
          `Your wallet: ${publicKey.toString().slice(0, 8)}...`
        );
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // 4. Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 5. Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Payment transaction sent:', signature);

      // 6. Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Payment confirmed:', signature);

      setPaymentStatus({ isPaying: false, error: null, signature });

      // 7. Submit proof of payment and get protected content
      console.log('Submitting payment verification:', {
        signature,
        reference: paymentDetails.reference,
      });

      const verifyResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature,
          reference: paymentDetails.reference,
        }),
      });

      console.log('Verification response status:', verifyResponse.status);

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error('Verification failed:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Payment verification failed' };
        }
        throw new Error(error.error || 'Payment verification failed');
      }

      const result = await verifyResponse.json();
      console.log('Payment verified successfully!', result);

      // Return a new Response with the result data
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentStatus({ isPaying: false, error: errorMessage, signature: null });
      throw error;
    }
  };

  /**
   * Makes a paid request and returns the data directly
   * @param resource - The resource identifier (e.g., 'analytics', 'market-data')
   * @returns The protected data
   */
  const fetchPaidResource = async <T = any>(resource: string): Promise<T> => {
    const response = await payAndFetch(`/api/x402?resource=${resource}`);
    const data = await response.json();

    if (data.success) {
      return data.data as T;
    }

    throw new Error(data.error || 'Failed to fetch resource');
  };

  /**
   * Checks if payment is required for a resource
   * @param resource - The resource identifier
   * @returns Payment details or null if no payment required
   */
  const checkPaymentRequired = async (resource: string): Promise<PaymentDetails | null> => {
    const response = await fetch(`/api/x402?resource=${resource}`);

    if (response.status === 402) {
      const data: X402Response = await response.json();
      return data.paymentDetails;
    }

    return null;
  };

  /**
   * Make a direct payment (simplified for betting)
   * @param amount - Amount in SOL
   * @param memo - Payment memo/description
   * @returns Payment result with signature
   */
  const makePayment = async (amount: number, memo: string = ''): Promise<{ success: boolean; signature?: string; error?: string }> => {
    if (!publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    setPaymentStatus({ isPaying: true, error: null, signature: null });

    try {
      // Get treasury wallet from environment
      const treasuryWallet = process.env.NEXT_PUBLIC_X402_TREASURY_WALLET || '53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp';
      const recipientPubkey = new PublicKey(treasuryWallet);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      console.log('Making payment:', {
        from: publicKey.toString(),
        to: recipientPubkey.toString(),
        amount,
        lamports,
        memo,
      });

      // Check if trying to send to yourself
      if (publicKey.equals(recipientPubkey)) {
        throw new Error(
          `Cannot send payment to yourself! Please use a different wallet for testing.`
        );
      }

      // Create payment transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Payment transaction sent:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Payment confirmed:', signature);

      setPaymentStatus({ isPaying: false, error: null, signature });

      return { success: true, signature };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentStatus({ isPaying: false, error: errorMessage, signature: null });
      return { success: false, error: errorMessage };
    }
  };

  return {
    payAndFetch,
    fetchPaidResource,
    checkPaymentRequired,
    makePayment,
    paymentStatus,
    isLoading: paymentStatus.isPaying,
    isWalletConnected: !!publicKey,
  };
}
