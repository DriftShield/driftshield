/**
 * Polymarket-Style Gain Calculations
 *
 * Show users their potential 10x, 20x, 100x gains
 * Works with prediction markets (not bonding curves)
 */

import { ConstantProductAMM, type AMMPool } from './constant-product';

export interface GainScenario {
  targetPrice: number;
  multiplier: number;
  profit: number;
  profitPercent: number;
  requiredPriceMove: number;
  likelihood: 'moon' | 'realistic' | 'conservative';
}

/**
 * Calculate potential gains at different price targets
 */
export function calculatePotentialGains(
  buyPrice: number,  // Price you bought at (0-1)
  tokenAmount: number,
  currentPrice: number
): {
  scenarios: GainScenario[];
  breakEven: number;
  maxGain: GainScenario;
} {
  const invested = buyPrice * tokenAmount;

  const scenarios: GainScenario[] = [
    // 2x scenario
    {
      targetPrice: Math.min(buyPrice * 2, 1.0),
      multiplier: 2,
      profit: invested,
      profitPercent: 100,
      requiredPriceMove: ((buyPrice * 2 - currentPrice) / currentPrice) * 100,
      likelihood: 'conservative',
    },
    // 5x scenario
    {
      targetPrice: Math.min(buyPrice * 5, 1.0),
      multiplier: 5,
      profit: invested * 4,
      profitPercent: 400,
      requiredPriceMove: ((buyPrice * 5 - currentPrice) / currentPrice) * 100,
      likelihood: 'realistic',
    },
    // 10x scenario
    {
      targetPrice: Math.min(buyPrice * 10, 1.0),
      multiplier: 10,
      profit: invested * 9,
      profitPercent: 900,
      requiredPriceMove: ((buyPrice * 10 - currentPrice) / currentPrice) * 100,
      likelihood: 'moon',
    },
    // Max gain (if outcome wins)
    {
      targetPrice: 1.0,
      multiplier: 1.0 / buyPrice,
      profit: (1.0 - buyPrice) * tokenAmount,
      profitPercent: ((1.0 - buyPrice) / buyPrice) * 100,
      requiredPriceMove: ((1.0 - currentPrice) / currentPrice) * 100,
      likelihood: 'moon',
    },
  ].filter(s => s.targetPrice > currentPrice); // Only show upside scenarios

  const maxGain = scenarios[scenarios.length - 1];

  return {
    scenarios,
    breakEven: buyPrice,
    maxGain,
  };
}

/**
 * Calculate how much SOL you need to move price to target
 * (Shows how much buying pressure needed for moon)
 */
export function calculateSOLNeededForPrice(
  pool: AMMPool,
  targetPrice: number,
  outcome: 'YES' | 'NO'
): {
  solNeeded: number;
  priceImpact: number;
  feasible: boolean;
} {
  const currentPrice = outcome === 'YES'
    ? ConstantProductAMM.getYesPrice(pool)
    : ConstantProductAMM.getNoPrice(pool);

  if (targetPrice <= currentPrice) {
    return { solNeeded: 0, priceImpact: 0, feasible: true };
  }

  // Binary search for required SOL
  let low = 0;
  let high = pool.realYesBets + pool.realNoBets + 10000; // Upper bound
  let solNeeded = 0;
  const tolerance = 0.01;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const result = ConstantProductAMM.calculateSharesOut(pool, mid, outcome);
    const newPrice = outcome === 'YES'
      ? ConstantProductAMM.getYesPrice(result.newPool)
      : ConstantProductAMM.getNoPrice(result.newPool);

    if (newPrice < targetPrice) {
      low = mid;
    } else {
      high = mid;
      solNeeded = mid;
    }
  }

  const priceImpact = ((targetPrice - currentPrice) / currentPrice) * 100;
  const totalLiquidity = pool.realYesBets + pool.realNoBets;
  const feasible = solNeeded < totalLiquidity * 10; // Within 10x current volume

  return {
    solNeeded,
    priceImpact,
    feasible,
  };
}

/**
 * Real Polymarket examples for inspiration
 */
export const HistoricalMoonShots = [
  {
    event: 'Trump Indictment 2023',
    buyPrice: 0.15,
    sellPrice: 1.00,
    gain: '6.6x',
    timeframe: '3 months',
  },
  {
    event: 'FTX Bankruptcy',
    buyPrice: 0.02,
    sellPrice: 1.00,
    gain: '50x',
    timeframe: '1 week',
  },
  {
    event: 'Ukraine Invasion',
    buyPrice: 0.10,
    sellPrice: 0.95,
    gain: '9.5x',
    timeframe: '2 weeks',
  },
  {
    event: 'Bitcoin $100K (2024)',
    buyPrice: 0.05,
    currentPrice: 0.35,
    gain: '7x (so far)',
    timeframe: '1 year',
  },
  {
    event: 'AI Achieves AGI by 2025',
    buyPrice: 0.01,
    targetPrice: 1.00,
    potentialGain: '100x',
    status: 'pending',
  },
];

/**
 * Trading strategies for 10x+ gains
 */
export const MoonStrategies = {
  /**
   * Long Shot Strategy
   * Buy very unlikely events at 1-5%
   * If they happen, massive gains
   */
  LONG_SHOT: {
    targetBuyPrice: 0.01, // 1%
    targetSellPrice: 1.00,
    potentialGain: '100x',
    winRate: 1, // out of 100
    description: 'Buy black swan events. 1% chance to win, but 100x if it hits',
  },

  /**
   * Contrarian Strategy
   * Buy undervalued at 10-20%
   * Sell at 50%+
   */
  CONTRARIAN: {
    targetBuyPrice: 0.15, // 15%
    targetSellPrice: 0.75,
    potentialGain: '5x',
    winRate: 20, // out of 100
    description: 'Bet against the crowd on undervalued outcomes',
  },

  /**
   * Momentum Strategy
   * Buy at 20-30%, sell at 80-90%
   * Ride the wave
   */
  MOMENTUM: {
    targetBuyPrice: 0.25, // 25%
    targetSellPrice: 0.85,
    potentialGain: '3.4x',
    winRate: 40, // out of 100
    description: 'Buy rising trends early, sell near peak',
  },

  /**
   * Arbitrage Strategy
   * Buy YES at 40%, buy NO at 40%
   * One must pay out $1
   */
  ARBITRAGE: {
    targetBuyPrice: 0.40, // Both YES and NO
    guaranteedReturn: 0.20, // $1 - $0.80 = $0.20
    potentialGain: '1.25x',
    winRate: 100, // Guaranteed
    description: 'Risk-free when YES + NO < $1',
  },
};

/**
 * Calculate expected value of a bet
 */
export function calculateExpectedValue(
  buyPrice: number,
  estimatedWinProbability: number
): {
  ev: number;
  evPercent: number;
  isPositiveEV: boolean;
  recommendation: string;
} {
  const payout = 1.0;
  const cost = buyPrice;

  // EV = (probability × payout) - cost
  const ev = (estimatedWinProbability * payout) - cost;
  const evPercent = (ev / cost) * 100;

  let recommendation: string;
  if (ev > cost * 0.5) {
    recommendation = '🚀 STRONG BUY - Heavily undervalued';
  } else if (ev > cost * 0.2) {
    recommendation = '✅ BUY - Good value';
  } else if (ev > 0) {
    recommendation = '↗️ SLIGHT BUY - Small edge';
  } else if (ev > -cost * 0.2) {
    recommendation = '⚠️ NEUTRAL - Fair price';
  } else {
    recommendation = '❌ AVOID - Overpriced';
  }

  return {
    ev,
    evPercent,
    isPositiveEV: ev > 0,
    recommendation,
  };
}

/**
 * Example Usage:
 *
 * // User buys YES at $0.20
 * const gains = calculatePotentialGains(0.20, 100, 0.20);
 * console.log('Max gain:', gains.maxGain.multiplier + 'x');
 * // Output: Max gain: 5x
 *
 * // Show scenarios
 * gains.scenarios.forEach(s => {
 *   console.log(`${s.multiplier}x at $${s.targetPrice.toFixed(2)}`);
 * });
 * // Output:
 * // 2x at $0.40
 * // 5x at $1.00
 *
 * // Calculate what's needed for 10x
 * const needed = calculateSOLNeededForPrice(pool, 0.90, 'YES');
 * console.log(`Need ${needed.solNeeded.toFixed(2)} SOL to moon`);
 *
 * // Check if bet has positive EV
 * const ev = calculateExpectedValue(0.20, 0.35);
 * console.log(ev.recommendation);
 * // Output: ✅ BUY - Good value
 */
