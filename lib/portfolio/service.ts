/**
 * Portfolio Service - Track positions and trades
 *
 * In production, this should use a real database
 * For now, using localStorage for persistence
 */

import { Position, ClosedPosition, Trade } from './types';

const STORAGE_KEYS = {
  POSITIONS: 'driftshield_positions',
  CLOSED_POSITIONS: 'driftshield_closed_positions',
  TRADES: 'driftshield_trades',
};

/**
 * Load data from localStorage
 */
function loadFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(key);
    if (!data) return [];

    const parsed = JSON.parse(data);
    // Convert date strings back to Date objects
    return parsed.map((item: any) => ({
      ...item,
      openDate: item.openDate ? new Date(item.openDate) : undefined,
      closeDate: item.closeDate ? new Date(item.closeDate) : undefined,
      timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
    }));
  } catch (error) {
    console.error(`Error loading from ${key}:`, error);
    return [];
  }
}

/**
 * Save data to localStorage
 */
function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to ${key}:`, error);
  }
}

/**
 * Get all open positions
 */
export function getOpenPositions(userWallet: string): Position[] {
  const positions = loadFromStorage<Position>(STORAGE_KEYS.POSITIONS);
  return positions.filter(p => p.id.startsWith(userWallet));
}

/**
 * Get all closed positions
 */
export function getClosedPositions(userWallet: string): ClosedPosition[] {
  const positions = loadFromStorage<ClosedPosition>(STORAGE_KEYS.CLOSED_POSITIONS);
  return positions.filter(p => p.id.startsWith(userWallet));
}

/**
 * Get all trades
 */
export function getTrades(userWallet: string): Trade[] {
  const trades = loadFromStorage<Trade>(STORAGE_KEYS.TRADES);
  return trades.filter(t => t.id.startsWith(userWallet));
}

/**
 * Record a new trade (BUY or SELL)
 */
export function recordTrade(
  userWallet: string,
  marketId: string,
  marketTitle: string,
  outcome: string,
  type: 'BUY' | 'SELL',
  shares: number,
  price: number,
  fee: number = 0,
  txSignature?: string
): Trade {
  const trade: Trade = {
    id: `${userWallet}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    marketId,
    marketTitle,
    outcome,
    type,
    shares,
    price,
    totalCost: shares * price + fee,
    fee,
    timestamp: new Date(),
    txSignature,
  };

  const trades = loadFromStorage<Trade>(STORAGE_KEYS.TRADES);
  trades.push(trade);
  saveToStorage(STORAGE_KEYS.TRADES, trades);

  // Update position
  updatePosition(userWallet, marketId, marketTitle, outcome, type, shares, price, fee);

  return trade;
}

/**
 * Update position after trade
 */
function updatePosition(
  userWallet: string,
  marketId: string,
  marketTitle: string,
  outcome: string,
  type: 'BUY' | 'SELL',
  shares: number,
  price: number,
  fee: number
): void {
  const positions = loadFromStorage<Position>(STORAGE_KEYS.POSITIONS);
  const positionId = `${userWallet}-${marketId}-${outcome}`;

  let position = positions.find(p => p.id === positionId);

  if (type === 'BUY') {
    if (!position) {
      // Create new position
      position = {
        id: positionId,
        marketId,
        marketTitle,
        outcome,
        sharesOwned: shares,
        avgEntryPrice: price,
        currentPrice: price,
        totalInvested: shares * price + fee,
        currentValue: shares * price,
        unrealizedPnL: -fee, // Initial P&L is just the fee
        unrealizedPnLPercent: fee > 0 ? (-fee / (shares * price + fee)) * 100 : 0,
        openDate: new Date(),
        status: 'open',
      };
      positions.push(position);
    } else {
      // Add to existing position (average up/down)
      const totalShares = position.sharesOwned + shares;
      const totalCost = position.totalInvested + (shares * price + fee);

      position.avgEntryPrice = totalCost / totalShares;
      position.sharesOwned = totalShares;
      position.totalInvested = totalCost;
      position.currentValue = totalShares * position.currentPrice;
      position.unrealizedPnL = position.currentValue - position.totalInvested;
      position.unrealizedPnLPercent = (position.unrealizedPnL / position.totalInvested) * 100;
    }
  } else {
    // SELL
    if (!position || position.sharesOwned < shares) {
      console.error('Cannot sell more shares than owned');
      return;
    }

    const soldValue = shares * price - fee;
    const costBasis = (shares / position.sharesOwned) * position.totalInvested;
    const realizedPnL = soldValue - costBasis;

    if (position.sharesOwned === shares) {
      // Closing entire position
      const closedPosition: ClosedPosition = {
        ...position,
        status: 'closed',
        closeDate: new Date(),
        closePrice: price,
        realizedPnL,
        realizedPnLPercent: (realizedPnL / costBasis) * 100,
        holdingPeriod: Math.floor((Date.now() - position.openDate.getTime()) / (1000 * 60 * 60 * 24)),
      };

      // Remove from open positions
      const index = positions.findIndex(p => p.id === positionId);
      if (index > -1) positions.splice(index, 1);

      // Add to closed positions
      const closedPositions = loadFromStorage<ClosedPosition>(STORAGE_KEYS.CLOSED_POSITIONS);
      closedPositions.push(closedPosition);
      saveToStorage(STORAGE_KEYS.CLOSED_POSITIONS, closedPositions);
    } else {
      // Partial sell
      position.sharesOwned -= shares;
      position.totalInvested -= costBasis;
      position.currentValue = position.sharesOwned * position.currentPrice;
      position.unrealizedPnL = position.currentValue - position.totalInvested;
      position.unrealizedPnLPercent = (position.unrealizedPnL / position.totalInvested) * 100;
    }
  }

  saveToStorage(STORAGE_KEYS.POSITIONS, positions);
}

/**
 * Update current prices for all positions
 */
export function updatePositionPrices(
  userWallet: string,
  priceUpdates: Record<string, number> // marketId-outcome -> current price
): void {
  const positions = loadFromStorage<Position>(STORAGE_KEYS.POSITIONS);

  positions.forEach(position => {
    if (!position.id.startsWith(userWallet)) return;

    const priceKey = `${position.marketId}-${position.outcome}`;
    const newPrice = priceUpdates[priceKey];

    if (newPrice !== undefined) {
      position.currentPrice = newPrice;
      position.currentValue = position.sharesOwned * newPrice;
      position.unrealizedPnL = position.currentValue - position.totalInvested;
      position.unrealizedPnLPercent = (position.unrealizedPnL / position.totalInvested) * 100;
    }
  });

  saveToStorage(STORAGE_KEYS.POSITIONS, positions);
}

/**
 * Clear all portfolio data (for testing)
 */
export function clearPortfolioData(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEYS.POSITIONS);
  localStorage.removeItem(STORAGE_KEYS.CLOSED_POSITIONS);
  localStorage.removeItem(STORAGE_KEYS.TRADES);
}

/**
 * Import portfolio data
 */
export function importPortfolioData(data: {
  positions?: Position[];
  closedPositions?: ClosedPosition[];
  trades?: Trade[];
}): void {
  if (data.positions) {
    saveToStorage(STORAGE_KEYS.POSITIONS, data.positions);
  }
  if (data.closedPositions) {
    saveToStorage(STORAGE_KEYS.CLOSED_POSITIONS, data.closedPositions);
  }
  if (data.trades) {
    saveToStorage(STORAGE_KEYS.TRADES, data.trades);
  }
}

/**
 * Export all portfolio data
 */
export function exportPortfolioData(userWallet: string) {
  return {
    positions: getOpenPositions(userWallet),
    closedPositions: getClosedPositions(userWallet),
    trades: getTrades(userWallet),
  };
}
