/**
 * On-Chain AMM Integration
 *
 * Helper functions to interact with the AMM-enabled Solana program
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { ConstantProductAMM, type AMMPool } from './constant-product';

/**
 * Convert on-chain market data to AMM pool
 */
export function marketToAMMPool(marketData: any): AMMPool {
  return {
    yesReserve: marketData.virtualYesReserve?.toNumber() || 0,
    noReserve: marketData.virtualNoReserve?.toNumber() || 0,
    k: marketData.kConstant?.toNumber() || 0,
    realYesBets: (marketData.yesPool?.toNumber() || 0) / 1e9, // Convert lamports to SOL
    realNoBets: (marketData.noPool?.toNumber() || 0) / 1e9,
  };
}

/**
 * Get current prices from on-chain market
 */
export function getOnChainPrices(marketData: any): { yes: number; no: number } {
  const pool = marketToAMMPool(marketData);
  return {
    yes: ConstantProductAMM.getYesPrice(pool),
    no: ConstantProductAMM.getNoPrice(pool),
  };
}

/**
 * Calculate shares user will receive for a bet
 */
export function calculateBetShares(
  marketData: any,
  betAmount: number,
  outcome: 'YES' | 'NO'
): {
  shares: number;
  avgPrice: number;
  priceImpact: number;
  newYesPrice: number;
  newNoPrice: number;
} {
  const pool = marketToAMMPool(marketData);

  const shareResult = ConstantProductAMM.calculateSharesOut(pool, betAmount, outcome);
  const impact = ConstantProductAMM.calculatePriceImpact(pool, betAmount, outcome);

  return {
    shares: shareResult.shares,
    avgPrice: shareResult.avgPrice,
    priceImpact: impact.priceImpact,
    newYesPrice: ConstantProductAMM.getYesPrice(shareResult.newPool),
    newNoPrice: ConstantProductAMM.getNoPrice(shareResult.newPool),
  };
}

/**
 * Calculate expected payout for user shares
 */
export function calculateExpectedPayout(
  marketData: any,
  userShares: number,
  outcome: 'YES' | 'NO',
  assumedWinningOutcome: 'YES' | 'NO'
): number {
  const pool = marketToAMMPool(marketData);
  return ConstantProductAMM.calculatePayout(pool, userShares, outcome, assumedWinningOutcome);
}

/**
 * Get formatted market statistics
 */
export function getMarketStats(marketData: any) {
  const pool = marketToAMMPool(marketData);
  const stats = ConstantProductAMM.getPoolStats(pool);

  return {
    ...stats,
    totalYesShares: marketData.totalYesShares?.toNumber() || 0,
    totalNoShares: marketData.totalNoShares?.toNumber() || 0,
    ammEnabled: marketData.ammEnabled || false,
  };
}

/**
 * Format price as percentage string
 */
export function formatPrice(price: number): string {
  return `${(price * 100).toFixed(1)}%`;
}

/**
 * Format price impact for display
 */
export function formatPriceImpact(impact: number): {
  formatted: string;
  severity: 'low' | 'medium' | 'high';
  color: string;
} {
  const impactPercent = impact * 100;

  let severity: 'low' | 'medium' | 'high';
  let color: string;

  if (impactPercent < 1) {
    severity = 'low';
    color = 'text-green-500';
  } else if (impactPercent < 5) {
    severity = 'medium';
    color = 'text-yellow-500';
  } else {
    severity = 'high';
    color = 'text-red-500';
  }

  return {
    formatted: `${impactPercent.toFixed(2)}%`,
    severity,
    color,
  };
}

/**
 * Check if bet size is reasonable given current liquidity
 */
export function validateBetSize(
  marketData: any,
  betAmount: number,
  outcome: 'YES' | 'NO',
  maxSlippagePercent: number = 10
): {
  valid: boolean;
  reason?: string;
  priceImpact: number;
} {
  const pool = marketToAMMPool(marketData);
  const impact = ConstantProductAMM.calculatePriceImpact(pool, betAmount, outcome);

  const impactPercent = impact.priceImpact * 100;

  if (impactPercent > maxSlippagePercent) {
    return {
      valid: false,
      reason: `Price impact too high (${impactPercent.toFixed(1)}%). Max allowed: ${maxSlippagePercent}%`,
      priceImpact: impact.priceImpact,
    };
  }

  return {
    valid: true,
    priceImpact: impact.priceImpact,
  };
}

/**
 * Get recommended bet sizes based on current liquidity
 */
export function getRecommendedBetSizes(marketData: any): number[] {
  const pool = marketToAMMPool(marketData);
  const totalLiquidity = pool.realYesBets + pool.realNoBets;

  // Recommend bets at 1%, 5%, and 10% of current liquidity
  const sizes = [
    totalLiquidity * 0.01,
    totalLiquidity * 0.05,
    totalLiquidity * 0.10,
  ].filter(size => size > 0);

  // If no liquidity yet, suggest starter amounts
  if (sizes.length === 0 || sizes[0] < 0.01) {
    return [0.01, 0.1, 0.5, 1.0]; // SOL
  }

  return sizes;
}

/**
 * Example usage with Anchor
 */
export async function fetchMarketWithAMM(
  connection: Connection,
  marketPubkey: PublicKey,
  program: Program
) {
  try {
    const marketData = await program.account.market.fetch(marketPubkey);

    const ammPool = marketToAMMPool(marketData);
    const prices = getOnChainPrices(marketData);
    const stats = getMarketStats(marketData);

    return {
      marketData,
      ammPool,
      prices,
      stats,
    };
  } catch (error) {
    console.error('Error fetching market with AMM:', error);
    throw error;
  }
}
