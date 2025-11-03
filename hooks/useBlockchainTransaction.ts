import { useState } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { TransactionResult } from '@/lib/solana/transactions';
import { apiClient } from '@/lib/api-client';

export interface TransactionState {
  loading: boolean;
  success: boolean;
  error: string | null;
  signature: string | null;
}

export function useBlockchainTransaction() {
  const { walletAddress } = useWallet();
  const [state, setState] = useState<TransactionState>({
    loading: false,
    success: false,
    error: null,
    signature: null,
  });

  const executeTransaction = async <T extends any[]>(
    transactionFn: (...args: T) => Promise<TransactionResult>,
    ...args: T
  ): Promise<TransactionResult> => {
    setState({
      loading: true,
      success: false,
      error: null,
      signature: null,
    });

    try {
      const result = await transactionFn(...args);

      if (result.success) {
        setState({
          loading: false,
          success: true,
          error: null,
          signature: result.signature,
        });

        // Record transaction in backend
        if (walletAddress && result.signature) {
          await apiClient.recordTransaction({
            walletAddress,
            signature: result.signature,
            type: 'blockchain',
            status: 'confirmed',
          });
        }
      } else {
        setState({
          loading: false,
          success: false,
          error: result.error || 'Transaction failed',
          signature: null,
        });
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Transaction failed';
      setState({
        loading: false,
        success: false,
        error: errorMessage,
        signature: null,
      });

      return {
        signature: '',
        success: false,
        error: errorMessage,
      };
    }
  };

  const reset = () => {
    setState({
      loading: false,
      success: false,
      error: null,
      signature: null,
    });
  };

  return {
    ...state,
    executeTransaction,
    reset,
  };
}
