/**
 * Sell Shares Functionality
 *
 * Allow users to sell their shares back to the AMM pool
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { ConstantProductAMM } from './constant-product';
import { marketToAMMPool } from './on-chain-integration';

export interface SellResult {
  success: boolean;
  signature?: string;
  solReceived?: number;
  error?: string;
}

/**
 * Sell shares on-chain
 * Note: This requires updating the Rust program to support selling
 */
export async function sellShares(
  connection: Connection,
  wallet: any,
  marketPubkey: PublicKey,
  program: Program,
  shares: number,
  outcome: 'YES' | 'NO'
): Promise<SellResult> {
  try {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return { success: false, error: 'Wallet not connected' };
    }

    // Fetch current market state
    const marketData = await program.account.market.fetch(marketPubkey);

    // Calculate SOL to receive using AMM
    const pool = marketToAMMPool(marketData);
    const sellResult = ConstantProductAMM.executeSell(pool, shares, outcome);

    // For now, this is a placeholder
    // You'll need to add a `sell_shares` instruction to your Rust program
    // The instruction should:
    // 1. Burn user's shares
    // 2. Update virtual reserves
    // 3. Transfer SOL from vault to user

    /**
     * Future implementation:
     *
     * const tx = await program.methods
     *   .sellShares(shares, outcome === 'YES')
     *   .accounts({
     *     market: marketPubkey,
     *     position: positionPDA,
     *     vault: vaultPDA,
     *     user: wallet.publicKey,
     *   })
     *   .rpc();
     *
     * return {
     *   success: true,
     *   signature: tx,
     *   solReceived: sellResult.solReceived,
     * };
     */

    // For now, return estimated result
    return {
      success: false,
      error: 'Sell functionality requires Rust program update. Coming soon!',
      solReceived: sellResult.solReceived,
    };
  } catch (error: any) {
    console.error('Error selling shares:', error);
    return {
      success: false,
      error: error.message || 'Failed to sell shares',
    };
  }
}

/**
 * Calculate what user would receive for selling shares (off-chain preview)
 */
export function previewSellShares(
  marketData: any,
  shares: number,
  outcome: 'YES' | 'NO'
): {
  solReceived: number;
  avgPrice: number;
  priceImpact: number;
  newPrice: number;
} {
  const pool = marketToAMMPool(marketData);
  const result = ConstantProductAMM.executeSell(pool, shares, outcome);

  const newPrice = outcome === 'YES'
    ? ConstantProductAMM.getYesPrice(result.newState)
    : ConstantProductAMM.getNoPrice(result.newState);

  return {
    solReceived: result.solReceived,
    avgPrice: result.avgPrice,
    priceImpact: -(1 - newPrice / ConstantProductAMM.getCurrentPrice(pool, outcome)),
    newPrice,
  };
}
