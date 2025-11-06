/**
 * Social Trading Calculations
 */

import { TraderStats } from './types';
import { getTrades, getClosedPositions, getOpenPositions } from '../portfolio/service';

/**
 * Calculate comprehensive trader statistics
 */
export function calculateTraderStats(walletAddress: string): TraderStats {
  const trades = getTrades(walletAddress);
  const closedPositions = getClosedPositions(walletAddress);
  const openPositions = getOpenPositions(walletAddress);

  const totalTrades = closedPositions.length;
  const winningTrades = closedPositions.filter(p => p.realizedPnL > 0).length;
  const losingTrades = closedPositions.filter(p => p.realizedPnL <= 0).length;

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);
  const totalInvested = closedPositions.reduce((sum, p) => sum + p.totalInvested, 0);
  const roi = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const wins = closedPositions.filter(p => p.realizedPnL > 0);
  const losses = closedPositions.filter(p => p.realizedPnL < 0);

  const avgWin = wins.length > 0
    ? wins.reduce((sum, p) => sum + p.realizedPnL, 0) / wins.length
    : 0;

  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, p) => sum + p.realizedPnL, 0) / losses.length)
    : 0;

  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  const avgHoldTime = closedPositions.length > 0
    ? closedPositions.reduce((sum, p) => sum + p.holdingPeriod, 0) / closedPositions.length * 24
    : 0;

  // Calculate current streak
  let currentStreak = 0;
  const sortedPositions = [...closedPositions].sort((a, b) =>
    b.closeDate.getTime() - a.closeDate.getTime()
  );

  if (sortedPositions.length > 0) {
    const isWinning = sortedPositions[0].realizedPnL > 0;
    currentStreak = isWinning ? 1 : -1;

    for (let i = 1; i < sortedPositions.length; i++) {
      const thisWin = sortedPositions[i].realizedPnL > 0;
      if (thisWin === isWinning) {
        currentStreak += isWinning ? 1 : -1;
      } else {
        break;
      }
    }
  }

  // Calculate best streak
  let bestStreak = 0;
  let streak = 0;

  sortedPositions.reverse().forEach(pos => {
    if (pos.realizedPnL > 0) {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  });

  const volumeTraded = trades.reduce((sum, t) => sum + t.totalCost, 0);

  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnL = 0;

  closedPositions
    .sort((a, b) => a.closeDate.getTime() - b.closeDate.getTime())
    .forEach(pos => {
      runningPnL += pos.realizedPnL;
      peak = Math.max(peak, runningPnL);
      maxDrawdown = Math.max(maxDrawdown, peak - runningPnL);
    });

  const lastTrade = sortedPositions.length > 0
    ? sortedPositions[0].closeDate
    : undefined;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Math.round(winRate * 10) / 10,
    totalPnL: Math.round(totalPnL * 100) / 100,
    roi: Math.round(roi * 10) / 10,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgHoldTime: Math.round(avgHoldTime * 10) / 10,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    currentStreak,
    bestStreak,
    volumeTraded: Math.round(volumeTraded * 100) / 100,
    activePositions: openPositions.length,
    lastTradeAt: lastTrade,
  };
}

/**
 * Calculate Sharpe Ratio (risk-adjusted returns)
 */
export function calculateSharpeRatio(
  closedPositions: any[],
  riskFreeRate: number = 0.05 // 5% annual risk-free rate
): number {
  if (closedPositions.length < 2) return 0;

  // Calculate returns for each trade
  const returns = closedPositions.map(p => p.realizedPnLPercent / 100);

  // Average return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Standard deviation of returns
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Sharpe Ratio = (Average Return - Risk Free Rate) / Standard Deviation
  const sharpe = (avgReturn - riskFreeRate) / stdDev;

  return Math.round(sharpe * 100) / 100;
}

/**
 * Calculate win streak statistics
 */
export function calculateStreakStats(closedPositions: any[]): {
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
} {
  const sorted = [...closedPositions].sort((a, b) =>
    a.closeDate.getTime() - b.closeDate.getTime()
  );

  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let winStreak = 0;
  let lossStreak = 0;

  sorted.forEach((pos, i) => {
    const isWin = pos.realizedPnL > 0;

    if (isWin) {
      winStreak++;
      lossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, winStreak);
    } else {
      lossStreak++;
      winStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, lossStreak);
    }

    // Calculate current streak (from most recent)
    if (i === sorted.length - 1) {
      currentStreak = isWin ? winStreak : -lossStreak;
    }
  });

  return {
    currentStreak,
    longestWinStreak,
    longestLossStreak,
  };
}

/**
 * Compare two traders
 */
export function compareTraders(stats1: TraderStats, stats2: TraderStats): {
  better: 'trader1' | 'trader2' | 'tie';
  score1: number;
  score2: number;
  breakdown: Record<string, number>;
} {
  // Weighted scoring system
  const weights = {
    winRate: 0.25,
    roi: 0.30,
    profitFactor: 0.20,
    totalTrades: 0.10,
    sharpeRatio: 0.15,
  };

  const score1 =
    (stats1.winRate / 100) * weights.winRate +
    Math.min(stats1.roi / 100, 2) * weights.roi +
    Math.min(stats1.profitFactor / 5, 1) * weights.profitFactor +
    Math.min(stats1.totalTrades / 100, 1) * weights.totalTrades +
    Math.min((stats1.sharpeRatio || 0) / 3, 1) * weights.sharpeRatio;

  const score2 =
    (stats2.winRate / 100) * weights.winRate +
    Math.min(stats2.roi / 100, 2) * weights.roi +
    Math.min(stats2.profitFactor / 5, 1) * weights.profitFactor +
    Math.min(stats2.totalTrades / 100, 1) * weights.totalTrades +
    Math.min((stats2.sharpeRatio || 0) / 3, 1) * weights.sharpeRatio;

  const diff = Math.abs(score1 - score2);
  const better = diff < 0.05 ? 'tie' : score1 > score2 ? 'trader1' : 'trader2';

  return {
    better,
    score1: Math.round(score1 * 1000) / 10,
    score2: Math.round(score2 * 1000) / 10,
    breakdown: {
      winRate: stats1.winRate - stats2.winRate,
      roi: stats1.roi - stats2.roi,
      profitFactor: stats1.profitFactor - stats2.profitFactor,
      totalTrades: stats1.totalTrades - stats2.totalTrades,
    },
  };
}
