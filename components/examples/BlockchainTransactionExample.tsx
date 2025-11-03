'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { useBlockchainTransaction } from '@/hooks/useBlockchainTransaction';
import { purchaseInsurancePolicy } from '@/lib/solana/insurance';
import { placeBet } from '@/lib/solana/predictionMarket';
import { registerModel } from '@/lib/solana/modelRegistry';

/**
 * Example component demonstrating blockchain transactions
 */
export default function BlockchainTransactionExample() {
  const { connected, walletAddress } = useWallet();
  const { loading, success, error, signature, executeTransaction, reset } =
    useBlockchainTransaction();

  const [txType, setTxType] = useState<'insurance' | 'bet' | 'model' | null>(null);

  // Example: Purchase Insurance Policy
  const handlePurchaseInsurance = async () => {
    setTxType('insurance');

    const result = await executeTransaction(
      async (wallet: any) => {
        return purchaseInsurancePolicy(wallet, {
          modelPubkey: 'ExampleModelPublicKeyHere',
          coverageAmount: 1000_000000, // 1000 USDC (6 decimals)
          premium: 100_000000, // 100 USDC
          accuracyThreshold: 8500, // 85%
          durationDays: 30,
        });
      },
      window.solana // Pass Phantom wallet
    );

    if (result.success) {
      console.log('Insurance purchased! Signature:', result.signature);
    }
  };

  // Example: Place Bet on Prediction Market
  const handlePlaceBet = async () => {
    setTxType('bet');

    const result = await executeTransaction(
      async (wallet: any) => {
        return placeBet(wallet, {
          marketAddress: 'MarketPublicKeyHere',
          outcome: true, // YES
          amount: 50_000000, // 50 USDC
        });
      },
      window.solana
    );

    if (result.success) {
      console.log('Bet placed! Signature:', result.signature);
    }
  };

  // Example: Register Model
  const handleRegisterModel = async () => {
    setTxType('model');

    const result = await executeTransaction(
      async (wallet: any) => {
        return registerModel(wallet, {
          modelId: 'my-model-id',
          metadata: 'ipfs://QmExample',
          initialAccuracy: 9200, // 92%
        });
      },
      window.solana
    );

    if (result.success) {
      console.log('Model registered! Signature:', result.signature);
    }
  };

  if (!connected) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Please connect your wallet to interact with blockchain</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Blockchain Transactions</h2>

      <div className="space-y-4">
        <button
          onClick={handlePurchaseInsurance}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && txType === 'insurance' ? 'Processing...' : 'Purchase Insurance'}
        </button>

        <button
          onClick={handlePlaceBet}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 ml-4"
        >
          {loading && txType === 'bet' ? 'Processing...' : 'Place Bet'}
        </button>

        <button
          onClick={handleRegisterModel}
          disabled={loading}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 ml-4"
        >
          {loading && txType === 'model' ? 'Processing...' : 'Register Model'}
        </button>
      </div>

      {/* Transaction Status */}
      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-800">Transaction processing...</p>
        </div>
      )}

      {success && signature && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 font-medium">Transaction successful!</p>
          <a
            href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            View on Solana Explorer
          </a>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
          <button
            onClick={reset}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Wallet Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Connected Wallet:</span>{' '}
          {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}
        </p>
      </div>
    </div>
  );
}
