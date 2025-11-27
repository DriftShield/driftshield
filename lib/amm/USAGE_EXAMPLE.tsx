/**
 * Complete AMM Usage Example
 *
 * This file shows how to integrate the AMM functionality into your DriftShield components
 */

'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { ConstantProductAMM } from './constant-product';
import {
  marketToAMMPool,
  calculateBetShares,
  formatPrice,
  formatPriceImpact,
  validateBetSize,
  getRecommendedBetSizes
} from './on-chain-integration';
import IDL from '@/lib/solana/prediction_market_idl.json'; // You'll need to generate this

const PROGRAM_ID = new PublicKey('APvSf7hDoZDyYgshb4LPm2mpBanbiWgdqJ53TKvKQ7Da');

export function AMMMarketExample({ marketId }: { marketId: string }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [marketData, setMarketData] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');
  const [loading, setLoading] = useState(true);

  // Fetch market data
  useEffect(() => {
    fetchMarketData();
  }, [marketId]);

  const fetchMarketData = async () => {
    try {
      if (!publicKey) return;

      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction: signTransaction! } as any,
        { commitment: 'confirmed' }
      );
      const program = new Program(IDL as any, provider);

      const marketPubkey = new PublicKey(marketId);
      const data = await program.account.market.fetch(marketPubkey);

      setMarketData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching market:', error);
      setLoading(false);
    }
  };

  if (loading || !marketData) {
    return <div>Loading market...</div>;
  }

  // Get AMM data
  const ammPool = marketToAMMPool(marketData);
  const yesPrice = ConstantProductAMM.getYesPrice(ammPool);
  const noPrice = ConstantProductAMM.getNoPrice(ammPool);

  // Calculate bet preview
  const amount = parseFloat(betAmount) || 0;
  const betPreview = amount > 0
    ? calculateBetShares(marketData, amount, selectedOutcome)
    : null;

  // Validate bet size
  const validation = amount > 0
    ? validateBetSize(marketData, amount, selectedOutcome, 15) // 15% max slippage
    : { valid: true, priceImpact: 0 };

  // Get recommended sizes
  const recommendedSizes = getRecommendedBetSizes(marketData);

  return (
    <div className="space-y-6">
      {/* Market Question */}
      <div>
        <h2 className="text-2xl font-bold">{marketData.question}</h2>
        <p className="text-sm text-muted-foreground">
          AMM-powered prediction market
        </p>
      </div>

      {/* Current Prices */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="text-sm text-muted-foreground">YES</div>
          <div className="text-3xl font-bold text-green-500">
            {formatPrice(yesPrice)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {ammPool.realYesBets.toFixed(2)} SOL volume
          </div>
        </div>
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="text-sm text-muted-foreground">NO</div>
          <div className="text-3xl font-bold text-red-500">
            {formatPrice(noPrice)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {ammPool.realNoBets.toFixed(2)} SOL volume
          </div>
        </div>
      </div>

      {/* Betting Interface */}
      <div className="p-6 bg-card rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Place Bet</h3>

        {/* Outcome Selection */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setSelectedOutcome('YES')}
            className={`p-3 rounded-lg border-2 transition-colors ${
              selectedOutcome === 'YES'
                ? 'border-green-500 bg-green-500/10'
                : 'border-border hover:border-green-500/50'
            }`}
          >
            <div className="font-medium">YES</div>
            <div className="text-sm text-muted-foreground">
              {formatPrice(yesPrice)}
            </div>
          </button>
          <button
            onClick={() => setSelectedOutcome('NO')}
            className={`p-3 rounded-lg border-2 transition-colors ${
              selectedOutcome === 'NO'
                ? 'border-red-500 bg-red-500/10'
                : 'border-border hover:border-red-500/50'
            }`}
          >
            <div className="font-medium">NO</div>
            <div className="text-sm text-muted-foreground">
              {formatPrice(noPrice)}
            </div>
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            Bet Amount (SOL)
          </label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="w-full p-3 rounded-lg border bg-background"
            min="0.01"
            step="0.01"
            placeholder="0.1"
          />

          {/* Recommended amounts */}
          <div className="flex gap-2 mt-2">
            {recommendedSizes.slice(0, 3).map((size) => (
              <button
                key={size}
                onClick={() => setBetAmount(size.toFixed(2))}
                className="px-3 py-1 text-sm rounded bg-secondary hover:bg-secondary/80"
              >
                {size.toFixed(2)} SOL
              </button>
            ))}
          </div>
        </div>

        {/* Bet Preview */}
        {betPreview && (
          <div className="p-4 bg-secondary/50 rounded-lg space-y-2 mb-4">
            <div className="text-sm font-medium">Bet Preview</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shares:</span>
                <span className="font-medium">{betPreview.shares.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Price:</span>
                <span className="font-medium">
                  {formatPrice(betPreview.avgPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New {selectedOutcome} Price:</span>
                <span className="font-medium">
                  {formatPrice(
                    selectedOutcome === 'YES'
                      ? betPreview.newYesPrice
                      : betPreview.newNoPrice
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price Impact:</span>
                <span className={formatPriceImpact(betPreview.priceImpact).color}>
                  {formatPriceImpact(betPreview.priceImpact).formatted}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Error */}
        {!validation.valid && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <div className="text-sm text-red-500">{validation.reason}</div>
          </div>
        )}

        {/* Place Bet Button */}
        <button
          disabled={!validation.valid || amount === 0}
          className="w-full p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Place Bet: {amount.toFixed(2)} SOL on {selectedOutcome}
        </button>
      </div>

      {/* Market Statistics */}
      <div className="p-6 bg-card rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Market Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total Volume</div>
            <div className="font-medium">
              {(ammPool.realYesBets + ammPool.realNoBets).toFixed(2)} SOL
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Virtual Liquidity</div>
            <div className="font-medium">
              {marketData.virtualYesReserve?.toNumber() || 0}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Total YES Shares</div>
            <div className="font-medium">
              {marketData.totalYesShares?.toNumber() || 0}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Total NO Shares</div>
            <div className="font-medium">
              {marketData.totalNoShares?.toNumber() || 0}
            </div>
          </div>
        </div>
      </div>

      {/* How AMM Works */}
      <details className="p-4 bg-secondary/50 rounded-lg">
        <summary className="cursor-pointer font-medium">
          How does the AMM work?
        </summary>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            This market uses a <strong>Constant Product AMM</strong> (like Uniswap).
          </p>
          <p>
            • Virtual reserves start at {marketData.virtualYesReserve?.toNumber()}{' '}
            YES and NO tokens
          </p>
          <p>
            • When you bet, the formula <code>x × y = k</code> determines your price
          </p>
          <p>
            • Larger bets move the price more (price impact/slippage)
          </p>
          <p>
            • You receive <strong>shares</strong>, not 1:1 tokens
          </p>
          <p>
            • If your outcome wins, you claim:{' '}
            <code>shares × (total_pot / total_winning_shares)</code>
          </p>
        </div>
      </details>
    </div>
  );
}

/**
 * Example: Creating a market with AMM
 */
export async function createAMMMarket(
  connection: any,
  wallet: any,
  question: string,
  resolutionTime: number,
  virtualLiquidity: number = 1000
) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  const modelPubkey = new PublicKey('YOUR_MODEL_PUBKEY'); // Replace

  const [marketPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('market'),
      wallet.publicKey.toBuffer(),
      modelPubkey.toBuffer(),
    ],
    PROGRAM_ID
  );

  const tx = await program.methods
    .createMarket(
      modelPubkey,
      question,
      new BN(resolutionTime),
      new BN(0.01 * 1e9), // Min stake: 0.01 SOL
      new BN(virtualLiquidity) // Virtual liquidity for AMM
    )
    .accounts({
      market: marketPDA,
      creator: wallet.publicKey,
      marketVault: marketVaultPDA, // Derive this
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, marketPDA };
}
