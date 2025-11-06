/**
 * Portfolio Calculations and Analytics
 */

import {
  Position,
  ClosedPosition,
  Trade,
  PortfolioSummary,
  RiskMetrics,
  PositionSizingRecommendation,
  PerformanceMetrics,
} from './types';

/**
 * Calculate portfolio summary from positions and trades
 */
export function calculatePortfolioSummary(
  openPositions: Position[],
  closedPositions: ClosedPosition[]
): PortfolioSummary {
  const totalInvested = openPositions.reduce((sum, p) => sum + p.totalInvested, 0);
  const currentValue = openPositions.reduce((sum, p) => sum + p.currentValue, 0);
  const unrealizedPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const realizedPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);

  const totalPnL = realizedPnL + unrealizedPnL;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const winningTrades = closedPositions.filter(p => p.realizedPnL > 0);
  const losingTrades = closedPositions.filter(p => p.realizedPnL <= 0);

  const winRate = closedPositions.length > 0
    ? (winningTrades.length / closedPositions.length) * 100
    : 0;

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, p) => sum + p.realizedPnL, 0) / winningTrades.length
    : 0;

  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, p) => sum + p.realizedPnL, 0) / losingTrades.length
    : 0;

  const largestWin = winningTrades.length > 0
    ? Math.max(...winningTrades.map(p => p.realizedPnL))
    : 0;

  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(p => p.realizedPnL))
    : 0;

  return {
    totalInvested,
    currentValue,
    totalPnL,
    totalPnLPercent,
    realizedPnL,
    unrealizedPnL,
    openPositions: openPositions.length,
    closedPositions: closedPositions.length,
    winRate,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    totalTrades: closedPositions.length,
  };
}

/**
 * Calculate risk metrics
 */
export function calculateRiskMetrics(
  positions: Position[],
  totalBalance: number
): RiskMetrics {
  if (positions.length === 0) {
    return {
      portfolioConcentration: {
        topPosition: 0,
        top3Positions: 0,
        herfindahlIndex: 0,
      },
      exposure: {
        totalExposure: 0,
        availableBalance: totalBalance,
        exposurePercent: 0,
      },
      diversification: {
        numberOfMarkets: 0,
        categoryBreakdown: {},
        outcomeBalance: {
          yesExposure: 0,
          noExposure: 0,
        },
      },
      riskScore: 0,
    };
  }

  const totalExposure = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const exposurePercent = totalBalance > 0 ? (totalExposure / totalBalance) * 100 : 0;

  // Sort by position size
  const sortedPositions = [...positions].sort((a, b) => b.currentValue - a.currentValue);

  const topPosition = totalExposure > 0
    ? (sortedPositions[0].currentValue / totalExposure) * 100
    : 0;

  const top3Positions = totalExposure > 0
    ? (sortedPositions.slice(0, 3).reduce((sum, p) => sum + p.currentValue, 0) / totalExposure) * 100
    : 0;

  // Herfindahl Index (sum of squared market shares)
  const herfindahlIndex = positions.reduce((sum, p) => {
    const share = totalExposure > 0 ? p.currentValue / totalExposure : 0;
    return sum + (share * share);
  }, 0);

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  positions.forEach(p => {
    const category = p.category || 'Other';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + p.currentValue;
  });

  // Convert to percentages
  Object.keys(categoryBreakdown).forEach(cat => {
    categoryBreakdown[cat] = (categoryBreakdown[cat] / totalExposure) * 100;
  });

  // Outcome balance
  const yesExposure = positions
    .filter(p => p.outcome.toLowerCase() === 'yes')
    .reduce((sum, p) => sum + p.currentValue, 0);

  const noExposure = positions
    .filter(p => p.outcome.toLowerCase() === 'no')
    .reduce((sum, p) => sum + p.currentValue, 0);

  // Risk score (0-100)
  // Higher concentration = higher risk
  // Higher exposure % = higher risk
  const concentrationRisk = herfindahlIndex * 50; // 0-50
  const exposureRisk = Math.min(exposurePercent / 2, 50); // 0-50
  const riskScore = Math.min(concentrationRisk + exposureRisk, 100);

  return {
    portfolioConcentration: {
      topPosition,
      top3Positions,
      herfindahlIndex,
    },
    exposure: {
      totalExposure,
      availableBalance: totalBalance - totalExposure,
      exposurePercent,
    },
    diversification: {
      numberOfMarkets: new Set(positions.map(p => p.marketId)).size,
      categoryBreakdown,
      outcomeBalance: {
        yesExposure,
        noExposure,
      },
    },
    riskScore,
  };
}

/**
 * Kelly Criterion for position sizing
 * Returns fraction of bankroll to bet (0-1)
 */
export function kellyFraction(
  winProbability: number,
  oddsDecimal: number
): number {
  // Kelly = (bp - q) / b
  // where b = odds - 1, p = win probability, q = loss probability (1-p)
  const b = oddsDecimal - 1;
  const p = winProbability;
  const q = 1 - p;

  const kelly = (b * p - q) / b;

  // Return max of 0 (don't bet if negative expectation)
  return Math.max(0, kelly);
}

/**
 * Calculate position sizing recommendation
 */
export function calculatePositionSizing(
  marketTitle: string,
  marketId: string,
  currentOdds: number,
  estimatedWinProbability: number,
  totalBankroll: number,
  existingPositions: Position[],
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): PositionSizingRecommendation {
  const reasoning: string[] = [];

  // Kelly Criterion
  const kellyFrac = kellyFraction(estimatedWinProbability, 1 / currentOdds);

  // Apply fractional Kelly based on risk tolerance
  let fraction: number;
  switch (riskTolerance) {
    case 'conservative':
      fraction = kellyFrac * 0.25; // Quarter Kelly
      reasoning.push('Using conservative 1/4 Kelly sizing');
      break;
    case 'moderate':
      fraction = kellyFrac * 0.5; // Half Kelly
      reasoning.push('Using moderate 1/2 Kelly sizing');
      break;
    case 'aggressive':
      fraction = kellyFrac * 1; // Full Kelly
      reasoning.push('Using full Kelly sizing');
      break;
  }

  let suggestedPosition = totalBankroll * fraction;

  // Cap at 10% of bankroll for single position
  const maxPositionSize = totalBankroll * 0.10;
  if (suggestedPosition > maxPositionSize) {
    suggestedPosition = maxPositionSize;
    reasoning.push('Capped at 10% of total bankroll for risk management');
  }

  // Check concentration
  const totalExposure = existingPositions.reduce((sum, p) => sum + p.currentValue, 0);
  const remainingCapacity = totalBankroll * 0.8 - totalExposure; // Max 80% deployed

  if (suggestedPosition > remainingCapacity) {
    suggestedPosition = Math.max(0, remainingCapacity);
    reasoning.push('Adjusted to maintain portfolio diversification (max 80% deployed)');
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  const positionPercent = (suggestedPosition / totalBankroll) * 100;

  if (positionPercent < 3) {
    riskLevel = 'low';
  } else if (positionPercent < 7) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  // Add edge analysis
  const impliedProb = currentOdds;
  const edge = estimatedWinProbability - impliedProb;

  if (edge > 0.1) {
    reasoning.push(`Strong edge detected: ${(edge * 100).toFixed(1)}% above market odds`);
  } else if (edge > 0) {
    reasoning.push(`Positive edge: ${(edge * 100).toFixed(1)}% above market odds`);
  } else {
    reasoning.push(`Warning: No positive edge detected`);
    suggestedPosition = 0;
  }

  // Minimum position size
  if (suggestedPosition > 0 && suggestedPosition < 1) {
    suggestedPosition = 0;
    reasoning.push('Position size too small (< $1 USDC)');
  }

  return {
    marketId,
    marketTitle,
    currentOdds,
    suggestedPosition: Math.round(suggestedPosition * 100) / 100, // Round to 2 decimals
    reasoning,
    maxRecommendedSize: maxPositionSize,
    riskLevel,
    kellyFraction: kellyFrac,
  };
}

/**
 * Convert positions and trades to CSV
 */
export function exportToCSV(
  positions: Position[],
  closedPositions: ClosedPosition[],
  trades: Trade[]
): string {
  const lines: string[] = [];

  // Positions CSV
  lines.push('=== OPEN POSITIONS ===');
  lines.push('Market,Outcome,Shares,Avg Entry,Current Price,Invested,Current Value,P&L,P&L %,Open Date');

  positions.forEach(p => {
    lines.push([
      `"${p.marketTitle}"`,
      p.outcome,
      p.sharesOwned.toFixed(2),
      p.avgEntryPrice.toFixed(4),
      p.currentPrice.toFixed(4),
      p.totalInvested.toFixed(2),
      p.currentValue.toFixed(2),
      p.unrealizedPnL.toFixed(2),
      p.unrealizedPnLPercent.toFixed(2) + '%',
      p.openDate.toISOString(),
    ].join(','));
  });

  lines.push('');
  lines.push('=== CLOSED POSITIONS ===');
  lines.push('Market,Outcome,Shares,Avg Entry,Close Price,Invested,Final Value,P&L,P&L %,Open Date,Close Date,Holding Period (days)');

  closedPositions.forEach(p => {
    lines.push([
      `"${p.marketTitle}"`,
      p.outcome,
      p.sharesOwned.toFixed(2),
      p.avgEntryPrice.toFixed(4),
      p.closePrice.toFixed(4),
      p.totalInvested.toFixed(2),
      p.currentValue.toFixed(2),
      p.realizedPnL.toFixed(2),
      p.realizedPnLPercent.toFixed(2) + '%',
      p.openDate.toISOString(),
      p.closeDate.toISOString(),
      p.holdingPeriod.toString(),
    ].join(','));
  });

  lines.push('');
  lines.push('=== TRADE HISTORY ===');
  lines.push('Market,Type,Outcome,Shares,Price,Total Cost,Fee,Timestamp,Tx Signature');

  trades.forEach(t => {
    lines.push([
      `"${t.marketTitle}"`,
      t.type,
      t.outcome,
      t.shares.toFixed(2),
      t.price.toFixed(4),
      t.totalCost.toFixed(2),
      t.fee.toFixed(2),
      t.timestamp.toISOString(),
      t.txSignature || '',
    ].join(','));
  });

  return lines.join('\n');
}
