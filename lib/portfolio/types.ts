/**
 * Portfolio Management Types
 */

export interface Position {
  id: string;
  marketId: string;
  marketTitle: string;
  outcome: string;
  sharesOwned: number;
  avgEntryPrice: number; // Average price paid per share
  currentPrice: number; // Current market price
  totalInvested: number; // Total USDC invested
  currentValue: number; // Current position value
  unrealizedPnL: number; // Profit/Loss if sold now
  unrealizedPnLPercent: number;
  openDate: Date;
  status: 'open' | 'closed';
  category?: string;
}

export interface ClosedPosition extends Position {
  status: 'closed';
  closeDate: Date;
  closePrice: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  holdingPeriod: number; // in days
}

export interface Trade {
  id: string;
  marketId: string;
  marketTitle: string;
  outcome: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  totalCost: number; // includes fees
  fee: number;
  timestamp: Date;
  txSignature?: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  realizedPnL: number;
  unrealizedPnL: number;
  openPositions: number;
  closedPositions: number;
  winRate: number; // percentage of winning trades
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  totalTrades: number;
}

export interface RiskMetrics {
  portfolioConcentration: {
    topPosition: number; // % of portfolio in largest position
    top3Positions: number; // % of portfolio in top 3 positions
    herfindahlIndex: number; // 0-1, closer to 1 = more concentrated
  };
  exposure: {
    totalExposure: number; // Total USDC at risk
    availableBalance: number;
    exposurePercent: number; // % of total capital deployed
  };
  diversification: {
    numberOfMarkets: number;
    categoryBreakdown: Record<string, number>; // category -> % of portfolio
    outcomeBalance: {
      yesExposure: number;
      noExposure: number;
    };
  };
  riskScore: number; // 0-100, higher = riskier
}

export interface PositionSizingRecommendation {
  marketId: string;
  marketTitle: string;
  currentOdds: number;
  suggestedPosition: number; // in USDC
  reasoning: string[];
  maxRecommendedSize: number;
  riskLevel: 'low' | 'medium' | 'high';
  kellyFraction?: number; // Kelly Criterion calculation
}

export interface PerformanceMetrics {
  daily: {
    date: string;
    portfolioValue: number;
    pnl: number;
    pnlPercent: number;
  }[];
  weekly: {
    week: string;
    portfolioValue: number;
    pnl: number;
    pnlPercent: number;
  }[];
  monthly: {
    month: string;
    portfolioValue: number;
    pnl: number;
    pnlPercent: number;
  }[];
  sharpeRatio?: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeClosedPositions: boolean;
  includeOpenPositions: boolean;
  includeTrades: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
