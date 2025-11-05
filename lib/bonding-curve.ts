/**
 * Virtual Bonding Curve for Prediction Markets
 * Similar to pump.fun - no real liquidity needed until graduation
 */

export interface BondingCurveState {
  marketId: string
  outcomeSupplies: number[]  // Supply for each outcome (virtual tokens bought)
  totalVolume: number        // Total SOL traded
  status: 'BONDING' | 'GRADUATED'
  lpAddress?: string
  createdAt: number
  lastUpdated: number
}

export interface Quote {
  tokensOut: number
  averagePrice: number
  priceImpact: number
  newOdds: number[]
  slippage: number
}

export class PredictionBondingCurve {
  private state: BondingCurveState
  private readonly GRADUATION_THRESHOLD = 100 // SOL
  private readonly K = 10000 // Curve steepness constant

  constructor(marketId: string, numOutcomes: number = 2) {
    this.state = {
      marketId,
      outcomeSupplies: new Array(numOutcomes).fill(0),
      totalVolume: 0,
      status: 'BONDING',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }
  }

  /**
   * Get current market odds for all outcomes
   */
  getOdds(): number[] {
    const total = this.state.outcomeSupplies.reduce((sum, supply) => sum + supply, 0)

    if (total === 0) {
      // Equal odds initially
      return new Array(this.state.outcomeSupplies.length).fill(
        1 / this.state.outcomeSupplies.length
      )
    }

    return this.state.outcomeSupplies.map(supply => supply / total)
  }

  /**
   * Get price for a specific outcome
   */
  getPrice(outcomeIndex: number): number {
    const odds = this.getOdds()
    return odds[outcomeIndex]
  }

  /**
   * Calculate quote for buying an outcome with SOL
   * Uses constant product formula: x * y * z... = k
   */
  getQuote(solAmount: number, outcomeIndex: number): Quote {
    if (solAmount <= 0) {
      throw new Error('Amount must be positive')
    }

    if (outcomeIndex < 0 || outcomeIndex >= this.state.outcomeSupplies.length) {
      throw new Error('Invalid outcome index')
    }

    const currentOdds = this.getOdds()
    const currentPrice = currentOdds[outcomeIndex]

    // Calculate how many tokens can be bought
    // Using linear approximation for simplicity
    // In real AMM this would be integral of bonding curve
    const tokensOut = this.calculateTokensOut(solAmount, outcomeIndex)

    // Simulate the purchase to get new odds
    const tempSupplies = [...this.state.outcomeSupplies]
    tempSupplies[outcomeIndex] += tokensOut
    const tempTotal = tempSupplies.reduce((sum, s) => sum + s, 0)
    const newOdds = tempSupplies.map(s => s / tempTotal)

    const newPrice = newOdds[outcomeIndex]
    const averagePrice = (currentPrice + newPrice) / 2
    const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100
    const slippage = Math.abs(priceImpact)

    return {
      tokensOut,
      averagePrice,
      priceImpact,
      newOdds,
      slippage
    }
  }

  /**
   * Calculate tokens received for SOL amount using bonding curve
   */
  private calculateTokensOut(solAmount: number, outcomeIndex: number): number {
    // Constant product AMM formula
    // Before: product = outcome0 * outcome1 * outcome2 * ...
    // After: product must stay constant

    const currentSupplies = [...this.state.outcomeSupplies]
    const currentProduct = this.calculateProduct(currentSupplies)

    // If no supply yet, start with virtual initial supply
    if (currentProduct === 0) {
      // Initial price: equal for all outcomes
      const initialSupply = this.K
      const tokensPerSol = initialSupply / this.state.outcomeSupplies.length
      return solAmount * tokensPerSol
    }

    // Calculate new supply for this outcome that maintains constant product
    // This is a simplified version - real AMM would use more complex math
    const currentOdds = this.getOdds()
    const currentPrice = currentOdds[outcomeIndex] || (1 / this.state.outcomeSupplies.length)

    // Price increases as supply increases (bonding curve effect)
    // avgPrice = currentPrice + (tokensOut / K)
    // tokensOut = solAmount / avgPrice
    // Solving: tokensOut ≈ solAmount / (currentPrice + tokensOut / (2*K))

    // Quadratic approximation for smooth curve
    const a = 1 / (2 * this.K)
    const b = currentPrice
    const c = -solAmount

    const discriminant = b * b - 4 * a * c
    const tokensOut = (-b + Math.sqrt(discriminant)) / (2 * a)

    return Math.max(0, tokensOut)
  }

  /**
   * Calculate product of all outcome supplies (constant product formula)
   */
  private calculateProduct(supplies: number[]): number {
    if (supplies.some(s => s === 0)) return 0
    return supplies.reduce((product, supply) => product * supply, 1)
  }

  /**
   * Execute buy transaction
   */
  buy(solAmount: number, outcomeIndex: number): Quote {
    const quote = this.getQuote(solAmount, outcomeIndex)

    // Update state
    this.state.outcomeSupplies[outcomeIndex] += quote.tokensOut
    this.state.totalVolume += solAmount
    this.state.lastUpdated = Date.now()

    // Check for graduation
    this.checkGraduation()

    return quote
  }

  /**
   * Calculate payout for winning outcome
   */
  calculatePayout(tokensHeld: number, outcomeIndex: number, isWinner: boolean): number {
    if (!isWinner) return 0

    const totalSupply = this.state.outcomeSupplies.reduce((sum, s) => sum + s, 0)
    if (totalSupply === 0) return 0

    const winningSupply = this.state.outcomeSupplies[outcomeIndex]
    if (winningSupply === 0) return 0

    // Payout = (your tokens / winning supply) * total pool
    const shareOfWinners = tokensHeld / winningSupply
    const payout = shareOfWinners * this.state.totalVolume

    return payout
  }

  /**
   * Check if market should graduate to real LP
   */
  private checkGraduation(): void {
    if (this.state.status === 'BONDING' && this.state.totalVolume >= this.GRADUATION_THRESHOLD) {
      this.graduate()
    }
  }

  /**
   * Graduate to real liquidity pool
   */
  private graduate(): void {
    console.log(`🎓 Market ${this.state.marketId} graduated! Volume: ${this.state.totalVolume.toFixed(2)} SOL`)
    this.state.status = 'GRADUATED'

    // In a real implementation, this would:
    // 1. Create real LP on-chain
    // 2. Migrate virtual reserves to real reserves
    // 3. Issue LP tokens
    // 4. Lock liquidity
  }

  /**
   * Get graduation progress (0-100%)
   */
  getGraduationProgress(): number {
    return Math.min(100, (this.state.totalVolume / this.GRADUATION_THRESHOLD) * 100)
  }

  /**
   * Get current state
   */
  getState(): BondingCurveState {
    return { ...this.state }
  }

  /**
   * Load state
   */
  setState(state: BondingCurveState): void {
    this.state = state
  }

  /**
   * Save to localStorage
   */
  save(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(
        `bonding-curve-${this.state.marketId}`,
        JSON.stringify(this.state)
      )
    } catch (error) {
      console.error('Failed to save bonding curve state:', error)
    }
  }

  /**
   * Load from localStorage
   */
  static load(marketId: string): PredictionBondingCurve | null {
    if (typeof window === 'undefined') return null

    try {
      const saved = localStorage.getItem(`bonding-curve-${marketId}`)
      if (!saved) return null

      const state = JSON.parse(saved) as BondingCurveState
      const curve = new PredictionBondingCurve(marketId, state.outcomeSupplies.length)
      curve.setState(state)

      return curve
    } catch (error) {
      console.error('Failed to load bonding curve state:', error)
      return null
    }
  }

  /**
   * Clear saved state
   */
  static clear(marketId: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`bonding-curve-${marketId}`)
  }

  /**
   * Clone curve for simulation
   */
  clone(): PredictionBondingCurve {
    const cloned = new PredictionBondingCurve(
      this.state.marketId,
      this.state.outcomeSupplies.length
    )
    cloned.setState(JSON.parse(JSON.stringify(this.state)))
    return cloned
  }
}

/**
 * Helper function to format odds as percentages
 */
export function formatOdds(odds: number): string {
  return `${(odds * 100).toFixed(1)}%`
}

/**
 * Helper function to format price impact
 */
export function formatPriceImpact(impact: number): string {
  const sign = impact >= 0 ? '+' : ''
  return `${sign}${impact.toFixed(2)}%`
}

/**
 * Helper to determine if price impact is acceptable
 */
export function isAcceptablePriceImpact(impact: number, threshold: number = 5): boolean {
  return Math.abs(impact) <= threshold
}
