/**
 * Social Trading Types
 */

export interface TraderProfile {
  walletAddress: string;
  username: string;
  displayName: string;
  bio: string;
  avatar?: string;
  verified: boolean;
  isPublic: boolean; // Opt-in to leaderboard
  joinedAt: Date;
  stats: TraderStats;
  social: {
    followers: number;
    following: number;
    totalCopiers: number; // Users currently copying
  };
  badges: TraderBadge[];
  settings: TraderSettings;
}

export interface TraderStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage
  totalPnL: number; // in USDC
  roi: number; // percentage
  avgWin: number;
  avgLoss: number;
  profitFactor: number; // avgWin / avgLoss
  avgHoldTime: number; // in hours
  sharpeRatio?: number;
  maxDrawdown: number;
  currentStreak: number; // positive = winning streak, negative = losing
  bestStreak: number;
  volumeTraded: number; // total USDC traded
  activePositions: number;
  lastTradeAt?: Date;
}

export type TraderBadge =
  | 'top_10'           // Top 10 on leaderboard
  | 'top_50'           // Top 50 on leaderboard
  | 'verified'         // Verified trader
  | 'whale'            // High volume trader (>$10k)
  | 'consistent'       // 30+ day win streak
  | 'high_roi'         // >100% ROI
  | 'specialist'       // Specializes in specific category
  | 'early_adopter'    // Joined in first month
  | 'popular'          // 100+ followers
  | 'strategy_master'  // Shared 10+ strategies
  | 'generous'         // Shared free strategies
  | 'diamond_hands';   // Long avg hold time

export interface TraderSettings {
  allowCopying: boolean;
  allowFollowing: boolean;
  shareStrategies: boolean;
  sharePerformance: boolean;
  monetization?: {
    subscriptionEnabled: boolean;
    subscriptionPrice?: number; // per month in USDC
    performanceFeePercent?: number; // % of follower profits
    acceptTips: boolean;
  };
}

export interface SocialTrade {
  id: string;
  traderId: string;
  traderUsername: string;
  marketId: string;
  marketTitle: string;
  outcome: string;
  amount: number;
  shares: number;
  price: number;
  timestamp: Date;
  txSignature: string; // On-chain proof
  type: 'BUY' | 'SELL';
  thesis?: string; // Optional explanation
  strategyId?: string; // Linked to a strategy
  isPublic: boolean;
  copiedBy: number; // Count of followers who copied
  likes: number;
  comments: number;
}

export interface CopySettings {
  id: string;
  followerId: string;
  traderId: string;
  autoCopyEnabled: boolean;
  copyMode: 'proportional' | 'fixed' | 'percentage';
  copyAmount: number; // Depends on copyMode
  maxBetSize: number;
  minBetSize: number;
  excludeCategories: string[];
  excludeMarkets: string[];
  onlyIncludeCategories?: string[]; // If set, only copy these categories
  pausedUntil?: Date;
  stopLossPercent?: number; // Auto-disable if trader loses X%
  dailyLimit?: number; // Max USDC to copy per day
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowRelationship {
  id: string;
  followerId: string;
  traderId: string;
  followedAt: Date;
  notificationsEnabled: boolean;
  copySettings?: CopySettings;
}

export interface TradingStrategy {
  id: string;
  traderId: string;
  traderUsername: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  isPremium: boolean; // Requires subscription
  price?: number; // One-time purchase price
  rules: StrategyRule[];
  performance: {
    totalTrades: number;
    winRate: number;
    roi: number;
    totalPnL: number;
    subscriberCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyRule {
  type: 'market_category' | 'odds_range' | 'volume_threshold' | 'position_size' | 'time_limit';
  description: string;
  parameters: Record<string, any>;
}

export interface SocialFeedItem {
  id: string;
  type: 'trade' | 'strategy' | 'achievement' | 'follow';
  traderId: string;
  traderUsername: string;
  traderAvatar?: string;
  timestamp: Date;
  content: {
    trade?: SocialTrade;
    strategy?: TradingStrategy;
    achievement?: {
      badge: TraderBadge;
      description: string;
    };
    follow?: {
      followedUserId: string;
      followedUsername: string;
    };
  };
  engagement: {
    likes: number;
    comments: number;
    copies: number;
    isLikedByUser?: boolean;
  };
}

export interface LeaderboardEntry {
  rank: number;
  traderId: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  stats: TraderStats;
  badges: TraderBadge[];
  rankChange: number; // +/- from previous period
  followers: number;
}

export interface LeaderboardFilters {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  metric: 'pnl' | 'roi' | 'win_rate' | 'volume' | 'followers';
  category?: string;
  minTrades?: number;
}

export interface CopiedTrade {
  id: string;
  originalTradeId: string;
  traderId: string;
  followerId: string;
  marketId: string;
  outcome: string;
  amount: number; // Actual amount follower bet
  originalAmount: number; // What trader bet
  copyRatio: number; // follower amount / trader amount
  timestamp: Date;
  txSignature: string;
  status: 'pending' | 'executed' | 'failed';
  failureReason?: string;
}

export interface TraderNotification {
  id: string;
  userId: string;
  type: 'new_follower' | 'trade_copied' | 'new_strategy_subscriber' | 'achievement' | 'trader_trade';
  title: string;
  message: string;
  traderId?: string;
  tradeId?: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export interface SubscriptionTier {
  id: string;
  traderId: string;
  name: string;
  description: string;
  price: number; // per month in USDC
  benefits: string[];
  features: {
    priorityNotifications: boolean;
    detailedAnalysis: boolean;
    directMessages: boolean;
    exclusiveStrategies: boolean;
  };
  subscriberCount: number;
}
