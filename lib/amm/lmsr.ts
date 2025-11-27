/**
 * LMSR (Logarithmic Market Scoring Rule) AMM
 *
 * More sophisticated than constant product.
 * Used by Gnosis, Augur for prediction markets.
 *
 * Benefits over constant product:
 * - Better price stability
 * - Bounded loss for market maker
 * - Works well with multiple outcomes
 * - Adjustable liquidity sensitivity
 */

export interface LMSRPool {
  outcomes: string[];           // e.g., ['YES', 'NO'] or ['Alice', 'Bob', 'Charlie']
  outstandingShares: number[];  // Shares sold for each outcome
  liquidityParameter: number;   // 'b' - controls price sensitivity
  realBets: number[];          // Actual money bet on each outcome
}

export class LMSRAMM {
  /**
   * Initialize LMSR pool
   * @param outcomes - Array of outcome labels
   * @param liquidityParameter - Higher = slower price movement (try 100-1000)
   */
  static initializePool(
    outcomes: string[],
    liquidityParameter: number = 500
  ): LMSRPool {
    return {
      outcomes,
      outstandingShares: new Array(outcomes.length).fill(0),
      liquidityParameter,
      realBets: new Array(outcomes.length).fill(0),
    };
  }

  /**
   * Calculate cost function C(q)
   * C(q) = b * ln(sum(e^(q_i / b)))
   */
  private static costFunction(
    shares: number[],
    liquidityParameter: number
  ): number {
    const b = liquidityParameter;
    const sumExp = shares.reduce((sum, q) => sum + Math.exp(q / b), 0);
    return b * Math.log(sumExp);
  }

  /**
   * Calculate price of an outcome
   * P(i) = e^(q_i / b) / sum(e^(q_j / b))
   */
  static getPrice(pool: LMSRPool, outcomeIndex: number): number {
    const b = pool.liquidityParameter;
    const shares = pool.outstandingShares;

    const expI = Math.exp(shares[outcomeIndex] / b);
    const sumExp = shares.reduce((sum, q) => sum + Math.exp(q / b), 0);

    return expI / sumExp;
  }

  /**
   * Get prices for all outcomes
   */
  static getAllPrices(pool: LMSRPool): number[] {
    return pool.outcomes.map((_, i) => this.getPrice(pool, i));
  }

  /**
   * Calculate cost to buy shares
   * Cost = C(q_new) - C(q_old)
   */
  static calculateCostToBuy(
    pool: LMSRPool,
    outcomeIndex: number,
    sharesToBuy: number
  ): { cost: number; newPool: LMSRPool; avgPrice: number } {
    const oldShares = [...pool.outstandingShares];
    const newShares = [...pool.outstandingShares];
    newShares[outcomeIndex] += sharesToBuy;

    const costBefore = this.costFunction(oldShares, pool.liquidityParameter);
    const costAfter = this.costFunction(newShares, pool.liquidityParameter);
    const cost = costAfter - costBefore;

    const newPool = { ...pool };
    newPool.outstandingShares = newShares;
    newPool.realBets[outcomeIndex] += cost;

    return {
      cost,
      newPool,
      avgPrice: cost / sharesToBuy,
    };
  }

  /**
   * Calculate shares you get for a given bet amount
   * Solve: betAmount = C(q + shares) - C(q)
   *
   * This uses binary search to find the right number of shares
   */
  static calculateSharesForBet(
    pool: LMSRPool,
    outcomeIndex: number,
    betAmount: number
  ): { shares: number; newPool: LMSRPool; avgPrice: number } {
    // Binary search for the right number of shares
    let low = 0;
    let high = betAmount * 10; // Upper bound estimate
    let shares = 0;
    const tolerance = 0.000001;

    while (high - low > tolerance) {
      const mid = (low + high) / 2;
      const { cost } = this.calculateCostToBuy(pool, outcomeIndex, mid);

      if (cost < betAmount) {
        low = mid;
        shares = mid;
      } else {
        high = mid;
      }
    }

    const result = this.calculateCostToBuy(pool, outcomeIndex, shares);
    return {
      shares,
      newPool: result.newPool,
      avgPrice: result.cost / shares,
    };
  }

  /**
   * Calculate payout for winning shares
   */
  static calculatePayout(
    pool: LMSRPool,
    shares: number,
    outcomeIndex: number,
    winningOutcomeIndex: number
  ): number {
    if (outcomeIndex !== winningOutcomeIndex) return 0;

    const totalRealBets = pool.realBets.reduce((sum, b) => sum + b, 0);
    const winningOutcomeRealBets = pool.realBets[winningOutcomeIndex];

    if (winningOutcomeRealBets === 0) return 0;

    // Your share of the total pot
    return shares * (totalRealBets / pool.outstandingShares[winningOutcomeIndex]);
  }

  /**
   * Calculate price impact
   */
  static calculatePriceImpact(
    pool: LMSRPool,
    outcomeIndex: number,
    betAmount: number
  ): {
    priceBefore: number;
    priceAfter: number;
    priceImpact: number;
    shares: number;
  } {
    const priceBefore = this.getPrice(pool, outcomeIndex);
    const { shares, newPool } = this.calculateSharesForBet(pool, outcomeIndex, betAmount);
    const priceAfter = this.getPrice(newPool, outcomeIndex);

    return {
      priceBefore,
      priceAfter,
      priceImpact: Math.abs(priceAfter - priceBefore) / priceBefore,
      shares,
    };
  }

  /**
   * Get pool statistics
   */
  static getPoolStats(pool: LMSRPool) {
    const prices = this.getAllPrices(pool);
    const totalVolume = pool.realBets.reduce((sum, b) => sum + b, 0);

    return {
      outcomes: pool.outcomes.map((name, i) => ({
        name,
        price: prices[i],
        impliedOdds: `${(prices[i] * 100).toFixed(1)}%`,
        volume: pool.realBets[i],
        outstandingShares: pool.outstandingShares[i],
      })),
      totalVolume,
      liquidityParameter: pool.liquidityParameter,
    };
  }

  /**
   * Adjust liquidity parameter (sensitivity)
   * Higher b = slower price movement (deeper liquidity)
   * Lower b = faster price movement (shallower liquidity)
   */
  static adjustLiquidity(pool: LMSRPool, newLiquidityParameter: number): LMSRPool {
    return {
      ...pool,
      liquidityParameter: newLiquidityParameter,
    };
  }
}

/**
 * Example Usage:
 *
 * // Binary market
 * let pool = LMSRAMM.initializePool(['YES', 'NO'], 500);
 * console.log(LMSRAMM.getAllPrices(pool)); // [0.5, 0.5]
 *
 * // Bet 100 SOL on YES
 * const result = LMSRAMM.calculateSharesForBet(pool, 0, 100);
 * pool = result.newPool;
 * console.log(`Got ${result.shares.toFixed(2)} shares`);
 * console.log(LMSRAMM.getAllPrices(pool)); // [0.55, 0.45]
 *
 * // Multi-outcome market
 * let election = LMSRAMM.initializePool(['Alice', 'Bob', 'Charlie'], 1000);
 * const bet = LMSRAMM.calculateSharesForBet(election, 0, 500); // Bet on Alice
 * election = bet.newPool;
 * console.log(LMSRAMM.getPoolStats(election));
 *
 * // Check price impact of large bet
 * const impact = LMSRAMM.calculatePriceImpact(pool, 0, 1000);
 * console.log(`Large bet moves price by ${(impact.priceImpact * 100).toFixed(1)}%`);
 */
