/**
 * Recommended AMM Parameters for DriftShield
 *
 * Based on Polymarket, Gnosis, and other successful prediction markets
 */

export const AMMPresets = {
  /**
   * Small/New Markets
   * - Low liquidity = High price sensitivity
   * - Good for markets under $1K volume
   * - Prices move 5-15% on typical bets
   */
  SMALL: {
    constantProduct: 20,
    lmsr: 50,
    description: 'High sensitivity - Prices move quickly',
  },

  /**
   * Medium Markets (RECOMMENDED DEFAULT)
   * - Balanced liquidity
   * - Good for markets $1K-$10K volume
   * - Prices move 2-8% on typical bets
   */
  MEDIUM: {
    constantProduct: 50,
    lmsr: 100,
    description: 'Balanced - Good price discovery',
  },

  /**
   * Large Markets
   * - Higher liquidity = Lower price sensitivity
   * - Good for markets $10K-$100K volume
   * - Prices move 1-5% on typical bets
   */
  LARGE: {
    constantProduct: 200,
    lmsr: 500,
    description: 'Stable - Less volatile pricing',
  },

  /**
   * Mega Markets
   * - Very high liquidity = Very stable prices
   * - Good for markets $100K+ volume
   * - Prices move <1% on typical bets
   */
  MEGA: {
    constantProduct: 1000,
    lmsr: 2000,
    description: 'Very stable - Institutional grade',
  },
};

/**
 * Calculate recommended virtual liquidity based on expected volume
 * @param expectedVolume - Expected total market volume in SOL
 * @param marketType - Type of AMM to use
 */
export function calculateRecommendedLiquidity(
  expectedVolume: number,
  marketType: 'constant-product' | 'lmsr' = 'constant-product'
): number {
  // Rule: Virtual liquidity = 10-20% of expected volume
  const ratio = 0.15;
  const calculated = expectedVolume * ratio;

  // Clamp to reasonable bounds
  const min = marketType === 'constant-product' ? 20 : 50;
  const max = marketType === 'constant-product' ? 1000 : 2000;

  return Math.max(min, Math.min(max, Math.round(calculated)));
}

/**
 * Get recommended liquidity for market category
 */
export function getLiquidityForCategory(
  category: string,
  marketType: 'constant-product' | 'lmsr' = 'constant-product'
): number {
  const categoryExpectedVolumes: Record<string, number> = {
    'Politics': 500,      // High interest
    'Sports': 300,        // Medium-high
    'Crypto': 400,        // High
    'Entertainment': 200, // Medium
    'Science': 100,       // Lower
    'Other': 50,          // Lowest
  };

  const expectedVolume = categoryExpectedVolumes[category] || 100;
  return calculateRecommendedLiquidity(expectedVolume, marketType);
}

/**
 * Liquidity tier selector for UI
 */
export const LiquidityTiers = [
  {
    name: 'High Sensitivity',
    value: 20,
    description: 'Prices move quickly (5-15% per bet)',
    icon: '⚡',
    recommended: 'New markets',
  },
  {
    name: 'Balanced',
    value: 50,
    description: 'Good price discovery (2-8% per bet)',
    icon: '⚖️',
    recommended: 'Most markets',
    isDefault: true,
  },
  {
    name: 'Stable',
    value: 200,
    description: 'Less volatile (1-5% per bet)',
    icon: '🛡️',
    recommended: 'Large markets',
  },
  {
    name: 'Very Stable',
    value: 1000,
    description: 'Minimal movement (<1% per bet)',
    icon: '🏦',
    recommended: 'Institutional',
  },
];

/**
 * Price impact thresholds for warnings
 */
export const PriceImpactThresholds = {
  LOW: 0.01,      // 1% - No warning
  MEDIUM: 0.05,   // 5% - Yellow warning
  HIGH: 0.10,     // 10% - Orange warning
  EXTREME: 0.20,  // 20% - Red warning, suggest smaller bet
};

/**
 * Example usage:
 *
 * // Get default for new market
 * const liquidity = AMMPresets.MEDIUM.constantProduct; // 50
 *
 * // Calculate based on expected volume
 * const liquidity = calculateRecommendedLiquidity(1000); // ~150
 *
 * // Get for category
 * const liquidity = getLiquidityForCategory('Politics'); // ~75
 */
