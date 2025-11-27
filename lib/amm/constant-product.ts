/**
 * Constant Product AMM for Prediction Markets
 * Formula: x * y = k
 *
 * This provides virtual liquidity for markets without needing
 * real funds upfront. Perfect for prediction markets.
 */

export interface AMMPool {
  yesReserve: number;  // Virtual YES tokens
  noReserve: number;   // Virtual NO tokens
  k: number;           // Constant product
  realYesBets: number; // Actual SOL bet on YES
  realNoBets: number;  // Actual SOL bet on NO
}

export class ConstantProductAMM {
  /**
   * Initialize a new pool with virtual liquidity
   * @param virtualLiquidity - Starting virtual reserves for each outcome (default: 50)
   * Recommended: 20-100 for responsive markets, 500-1000 for stable markets
   */
  static initializePool(virtualLiquidity: number = 50): AMMPool {
    return {
      yesReserve: virtualLiquidity,
      noReserve: virtualLiquidity,
      k: virtualLiquidity * virtualLiquidity,
      realYesBets: 0,
      realNoBets: 0,
    };
  }

  /**
   * Calculate current price of YES outcome
   * Price = yesReserve / (yesReserve + noReserve)
   */
  static getYesPrice(pool: AMMPool): number {
    return pool.yesReserve / (pool.yesReserve + pool.noReserve);
  }

  /**
   * Calculate current price of NO outcome
   */
  static getNoPrice(pool: AMMPool): number {
    return pool.noReserve / (pool.yesReserve + pool.noReserve);
  }

  /**
   * Calculate how many shares you get for a bet
   * When betting on YES:
   * - Add betAmount to yesReserve
   * - Calculate new noReserve to maintain k
   * - Shares = old_noReserve - new_noReserve
   */
  static calculateSharesOut(
    pool: AMMPool,
    betAmount: number,
    outcome: 'YES' | 'NO'
  ): { shares: number; newPool: AMMPool; avgPrice: number } {
    const newPool = { ...pool };

    if (outcome === 'YES') {
      const newYesReserve = pool.yesReserve + betAmount;
      const newNoReserve = pool.k / newYesReserve;
      const shares = pool.noReserve - newNoReserve;

      newPool.yesReserve = newYesReserve;
      newPool.noReserve = newNoReserve;
      newPool.realYesBets += betAmount;

      return {
        shares,
        newPool,
        avgPrice: betAmount / shares,
      };
    } else {
      const newNoReserve = pool.noReserve + betAmount;
      const newYesReserve = pool.k / newNoReserve;
      const shares = pool.yesReserve - newYesReserve;

      newPool.noReserve = newNoReserve;
      newPool.yesReserve = newYesReserve;
      newPool.realNoBets += betAmount;

      return {
        shares,
        newPool,
        avgPrice: betAmount / shares,
      };
    }
  }

  /**
   * Calculate price impact (slippage) of a bet
   */
  static calculatePriceImpact(
    pool: AMMPool,
    betAmount: number,
    outcome: 'YES' | 'NO'
  ): {
    priceBeore: number;
    priceAfter: number;
    priceImpact: number;
  } {
    const priceBefore = outcome === 'YES'
      ? this.getYesPrice(pool)
      : this.getNoPrice(pool);

    const { newPool } = this.calculateSharesOut(pool, betAmount, outcome);

    const priceAfter = outcome === 'YES'
      ? this.getYesPrice(newPool)
      : this.getNoPrice(newPool);

    return {
      priceBeore: priceBefore,
      priceAfter,
      priceImpact: Math.abs(priceAfter - priceBefore) / priceBefore,
    };
  }

  /**
   * Calculate how much SOL you get for selling shares back
   * Reverse of buying - add shares back to reserve, get SOL out
   */
  static calculateSellReturn(
    pool: AMMPool,
    shares: number,
    outcome: 'YES' | 'NO'
  ): {
    return: number;
    avgPrice: number;
    priceImpact: number;
    newPool: AMMPool;
  } {
    const newPool = { ...pool };

    if (outcome === 'YES') {
      // Selling YES shares: add back to noReserve, remove from yesReserve
      const newNoReserve = pool.noReserve + shares;
      const newYesReserve = pool.k / newNoReserve;
      const solReceived = pool.yesReserve - newYesReserve;

      newPool.yesReserve = newYesReserve;
      newPool.noReserve = newNoReserve;
      newPool.realYesBets -= solReceived;

      const priceBefore = this.getYesPrice(pool);
      const priceAfter = this.getYesPrice(newPool);

      return {
        return: solReceived,
        avgPrice: solReceived / shares,
        priceImpact: Math.abs(priceAfter - priceBefore) / priceBefore,
        newPool,
      };
    } else {
      // Selling NO shares: add back to yesReserve, remove from noReserve
      const newYesReserve = pool.yesReserve + shares;
      const newNoReserve = pool.k / newYesReserve;
      const solReceived = pool.noReserve - newNoReserve;

      newPool.yesReserve = newYesReserve;
      newPool.noReserve = newNoReserve;
      newPool.realNoBets -= solReceived;

      const priceBefore = this.getNoPrice(pool);
      const priceAfter = this.getNoPrice(newPool);

      return {
        return: solReceived,
        avgPrice: solReceived / shares,
        priceImpact: Math.abs(priceAfter - priceBefore) / priceBefore,
        newPool,
      };
    }
  }

  /**
   * Calculate payout for winning shares
   * If YES wins: payout = shares * (totalRealBets / realYesBets)
   * If NO wins: payout = shares * (totalRealBets / realNoBets)
   */
  static calculatePayout(
    pool: AMMPool,
    shares: number,
    outcome: 'YES' | 'NO',
    winningOutcome: 'YES' | 'NO'
  ): number {
    if (outcome !== winningOutcome) return 0;

    const totalRealBets = pool.realYesBets + pool.realNoBets;

    if (outcome === 'YES') {
      // You get your share of the total pot
      return shares * (totalRealBets / pool.realYesBets);
    } else {
      return shares * (totalRealBets / pool.realNoBets);
    }
  }

  /**
   * Get pool statistics
   */
  static getPoolStats(pool: AMMPool) {
    const yesPrice = this.getYesPrice(pool);
    const noPrice = this.getNoPrice(pool);
    const totalLiquidity = pool.realYesBets + pool.realNoBets;

    return {
      yesPrice,
      noPrice,
      yesImpliedOdds: `${(yesPrice * 100).toFixed(1)}%`,
      noImpliedOdds: `${(noPrice * 100).toFixed(1)}%`,
      totalVolume: totalLiquidity,
      yesVolume: pool.realYesBets,
      noVolume: pool.realNoBets,
      virtualYesReserve: pool.yesReserve,
      virtualNoReserve: pool.noReserve,
    };
  }
}

/**
 * Example Usage:
 *
 * // Initialize pool
 * let pool = ConstantProductAMM.initializePool(1000);
 * console.log(ConstantProductAMM.getYesPrice(pool)); // 0.5 (50%)
 *
 * // User bets 100 SOL on YES
 * const result = ConstantProductAMM.calculateSharesOut(pool, 100, 'YES');
 * pool = result.newPool;
 * console.log(`Got ${result.shares} shares at avg price ${result.avgPrice}`);
 * console.log(ConstantProductAMM.getYesPrice(pool)); // ~0.52 (52%)
 *
 * // Check price impact
 * const impact = ConstantProductAMM.calculatePriceImpact(pool, 500, 'YES');
 * console.log(`Large bet would move price by ${(impact.priceImpact * 100).toFixed(1)}%`);
 *
 * // After market resolves to YES
 * const payout = ConstantProductAMM.calculatePayout(pool, result.shares, 'YES', 'YES');
 * console.log(`Payout: ${payout} SOL`);
 */
