/**
 * Social Trading Service
 *
 * Manages trader profiles, following, and social interactions
 * In production, this should use a database + API
 */

import {
  TraderProfile,
  SocialTrade,
  FollowRelationship,
  CopySettings,
  TradingStrategy,
  LeaderboardEntry,
  CopiedTrade,
  TraderNotification,
} from './types';
import { calculateTraderStats } from './calculator';
import { getTrades, getClosedPositions } from '../portfolio/service';

const STORAGE_KEYS = {
  PROFILES: 'driftshield_trader_profiles',
  FOLLOWS: 'driftshield_follows',
  SOCIAL_TRADES: 'driftshield_social_trades',
  COPY_SETTINGS: 'driftshield_copy_settings',
  STRATEGIES: 'driftshield_strategies',
  COPIED_TRADES: 'driftshield_copied_trades',
  NOTIFICATIONS: 'driftshield_notifications',
};

// Helper functions for localStorage
function loadFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(key);
    if (!data) return [];

    const parsed = JSON.parse(data);
    return parsed.map((item: any) => ({
      ...item,
      timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
      followedAt: item.followedAt ? new Date(item.followedAt) : undefined,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      joinedAt: item.joinedAt ? new Date(item.joinedAt) : undefined,
    }));
  } catch (error) {
    console.error(`Error loading from ${key}:`, error);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to ${key}:`, error);
  }
}

/**
 * Get or create trader profile
 */
export function getTraderProfile(walletAddress: string): TraderProfile {
  const profiles = loadFromStorage<TraderProfile>(STORAGE_KEYS.PROFILES);
  let profile = profiles.find(p => p.walletAddress === walletAddress);

  if (!profile) {
    // Create new profile
    profile = {
      walletAddress,
      username: `trader_${walletAddress.slice(0, 8)}`,
      displayName: `Trader ${walletAddress.slice(0, 8)}`,
      bio: '',
      verified: false,
      isPublic: true,
      joinedAt: new Date(),
      stats: calculateTraderStats(walletAddress),
      social: {
        followers: 0,
        following: 0,
        totalCopiers: 0,
      },
      badges: [],
      settings: {
        allowCopying: true,
        allowFollowing: true,
        shareStrategies: true,
        sharePerformance: true,
      },
    };

    profiles.push(profile);
    saveToStorage(STORAGE_KEYS.PROFILES, profiles);
  }

  return profile;
}

/**
 * Update trader profile
 */
export function updateTraderProfile(
  walletAddress: string,
  updates: Partial<TraderProfile>
): TraderProfile {
  const profiles = loadFromStorage<TraderProfile>(STORAGE_KEYS.PROFILES);
  const index = profiles.findIndex(p => p.walletAddress === walletAddress);

  if (index === -1) {
    throw new Error('Profile not found');
  }

  profiles[index] = { ...profiles[index], ...updates };
  saveToStorage(STORAGE_KEYS.PROFILES, profiles);

  return profiles[index];
}

/**
 * Refresh trader stats from portfolio data
 */
export function refreshTraderStats(walletAddress: string): void {
  const stats = calculateTraderStats(walletAddress);
  const badges = calculateBadges(stats);

  updateTraderProfile(walletAddress, { stats, badges });
}

/**
 * Calculate badges based on stats
 */
function calculateBadges(stats: any): any[] {
  const badges: any[] = [];

  if (stats.roi > 100) badges.push('high_roi');
  if (stats.volumeTraded > 10000) badges.push('whale');
  if (stats.currentStreak >= 10) badges.push('consistent');
  if (stats.winRate > 70 && stats.totalTrades > 50) badges.push('specialist');

  return badges;
}

/**
 * Follow a trader
 */
export function followTrader(
  followerId: string,
  traderId: string,
  enableNotifications: boolean = true
): FollowRelationship {
  if (followerId === traderId) {
    throw new Error('Cannot follow yourself');
  }

  const follows = loadFromStorage<FollowRelationship>(STORAGE_KEYS.FOLLOWS);

  // Check if already following
  const existing = follows.find(
    f => f.followerId === followerId && f.traderId === traderId
  );

  if (existing) {
    return existing;
  }

  const follow: FollowRelationship = {
    id: `${followerId}-${traderId}`,
    followerId,
    traderId,
    followedAt: new Date(),
    notificationsEnabled: enableNotifications,
  };

  follows.push(follow);
  saveToStorage(STORAGE_KEYS.FOLLOWS, follows);

  // Update social counts
  updateSocialCounts(traderId, 'followers', 1);
  updateSocialCounts(followerId, 'following', 1);

  // Create notification for trader
  createNotification(traderId, {
    type: 'new_follower',
    title: 'New Follower',
    message: `${followerId.slice(0, 8)} started following you`,
  });

  return follow;
}

/**
 * Unfollow a trader
 */
export function unfollowTrader(followerId: string, traderId: string): void {
  const follows = loadFromStorage<FollowRelationship>(STORAGE_KEYS.FOLLOWS);
  const index = follows.findIndex(
    f => f.followerId === followerId && f.traderId === traderId
  );

  if (index > -1) {
    follows.splice(index, 1);
    saveToStorage(STORAGE_KEYS.FOLLOWS, follows);

    // Update social counts
    updateSocialCounts(traderId, 'followers', -1);
    updateSocialCounts(followerId, 'following', -1);

    // Remove copy settings if exists
    const copySettings = loadFromStorage<CopySettings>(STORAGE_KEYS.COPY_SETTINGS);
    const copyIndex = copySettings.findIndex(
      c => c.followerId === followerId && c.traderId === traderId
    );
    if (copyIndex > -1) {
      copySettings.splice(copyIndex, 1);
      saveToStorage(STORAGE_KEYS.COPY_SETTINGS, copySettings);
      updateSocialCounts(traderId, 'totalCopiers', -1);
    }
  }
}

/**
 * Get followers of a trader
 */
export function getFollowers(traderId: string): string[] {
  const follows = loadFromStorage<FollowRelationship>(STORAGE_KEYS.FOLLOWS);
  return follows
    .filter(f => f.traderId === traderId)
    .map(f => f.followerId);
}

/**
 * Get traders that a user follows
 */
export function getFollowing(followerId: string): string[] {
  const follows = loadFromStorage<FollowRelationship>(STORAGE_KEYS.FOLLOWS);
  return follows
    .filter(f => f.followerId === followerId)
    .map(f => f.traderId);
}

/**
 * Check if user is following a trader
 */
export function isFollowing(followerId: string, traderId: string): boolean {
  const follows = loadFromStorage<FollowRelationship>(STORAGE_KEYS.FOLLOWS);
  return follows.some(
    f => f.followerId === followerId && f.traderId === traderId
  );
}

/**
 * Set copy trading settings
 */
export function setCopySettings(settings: Omit<CopySettings, 'id' | 'createdAt' | 'updatedAt'>): CopySettings {
  const allSettings = loadFromStorage<CopySettings>(STORAGE_KEYS.COPY_SETTINGS);

  // Check if settings already exist
  let existing = allSettings.find(
    s => s.followerId === settings.followerId && s.traderId === settings.traderId
  );

  if (existing) {
    // Update existing
    const index = allSettings.indexOf(existing);
    allSettings[index] = {
      ...existing,
      ...settings,
      updatedAt: new Date(),
    };
    existing = allSettings[index];
  } else {
    // Create new
    const newSettings: CopySettings = {
      ...settings,
      id: `${settings.followerId}-${settings.traderId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    allSettings.push(newSettings);
    existing = newSettings;

    // Update copier count
    updateSocialCounts(settings.traderId, 'totalCopiers', 1);
  }

  saveToStorage(STORAGE_KEYS.COPY_SETTINGS, allSettings);
  return existing;
}

/**
 * Get copy settings for a follower-trader pair
 */
export function getCopySettings(followerId: string, traderId: string): CopySettings | null {
  const allSettings = loadFromStorage<CopySettings>(STORAGE_KEYS.COPY_SETTINGS);
  return allSettings.find(
    s => s.followerId === followerId && s.traderId === traderId
  ) || null;
}

/**
 * Record a social trade (when trader places bet)
 */
export function recordSocialTrade(
  traderId: string,
  marketId: string,
  marketTitle: string,
  outcome: string,
  amount: number,
  shares: number,
  price: number,
  type: 'BUY' | 'SELL',
  txSignature: string,
  thesis?: string,
  strategyId?: string
): SocialTrade {
  const profile = getTraderProfile(traderId);

  const trade: SocialTrade = {
    id: `${traderId}-${Date.now()}`,
    traderId,
    traderUsername: profile.username,
    marketId,
    marketTitle,
    outcome,
    amount,
    shares,
    price,
    timestamp: new Date(),
    txSignature,
    type,
    thesis,
    strategyId,
    isPublic: profile.settings.sharePerformance,
    copiedBy: 0,
    likes: 0,
    comments: 0,
  };

  const trades = loadFromStorage<SocialTrade>(STORAGE_KEYS.SOCIAL_TRADES);
  trades.push(trade);
  saveToStorage(STORAGE_KEYS.SOCIAL_TRADES, trades);

  // Notify followers
  notifyFollowers(traderId, trade);

  // Trigger copy trades
  if (type === 'BUY') {
    executeCopyTrades(trade);
  }

  return trade;
}

/**
 * Get social trades from traders user follows
 */
export function getSocialFeed(userId: string, limit: number = 50): SocialTrade[] {
  const following = getFollowing(userId);
  const allTrades = loadFromStorage<SocialTrade>(STORAGE_KEYS.SOCIAL_TRADES);

  return allTrades
    .filter(t => following.includes(t.traderId) && t.isPublic)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get leaderboard
 */
export function getLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time',
  metric: 'pnl' | 'roi' | 'win_rate' | 'volume' = 'pnl',
  limit: number = 100
): LeaderboardEntry[] {
  const profiles = loadFromStorage<TraderProfile>(STORAGE_KEYS.PROFILES);

  // Filter public profiles with minimum trades
  const eligible = profiles.filter(
    p => p.isPublic && p.stats.totalTrades >= 10
  );

  // Sort by metric
  const sorted = eligible.sort((a, b) => {
    switch (metric) {
      case 'pnl':
        return b.stats.totalPnL - a.stats.totalPnL;
      case 'roi':
        return b.stats.roi - a.stats.roi;
      case 'win_rate':
        return b.stats.winRate - a.stats.winRate;
      case 'volume':
        return b.stats.volumeTraded - a.stats.volumeTraded;
      default:
        return 0;
    }
  });

  // Create leaderboard entries
  return sorted.slice(0, limit).map((profile, index) => ({
    rank: index + 1,
    traderId: profile.walletAddress,
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatar,
    verified: profile.verified,
    stats: profile.stats,
    badges: profile.badges,
    rankChange: 0, // TODO: Calculate from previous period
    followers: profile.social.followers,
  }));
}

// Helper functions

function updateSocialCounts(
  walletAddress: string,
  field: 'followers' | 'following' | 'totalCopiers',
  delta: number
): void {
  const profiles = loadFromStorage<TraderProfile>(STORAGE_KEYS.PROFILES);
  const index = profiles.findIndex(p => p.walletAddress === walletAddress);

  if (index > -1) {
    profiles[index].social[field] = Math.max(0, profiles[index].social[field] + delta);
    saveToStorage(STORAGE_KEYS.PROFILES, profiles);
  }
}

function createNotification(
  userId: string,
  notification: Omit<TraderNotification, 'id' | 'userId' | 'timestamp' | 'read'>
): void {
  const notifications = loadFromStorage<TraderNotification>(STORAGE_KEYS.NOTIFICATIONS);

  notifications.push({
    ...notification,
    id: `${userId}-${Date.now()}`,
    userId,
    timestamp: new Date(),
    read: false,
  });

  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

function notifyFollowers(traderId: string, trade: SocialTrade): void {
  const followers = getFollowers(traderId);
  const profile = getTraderProfile(traderId);

  followers.forEach(followerId => {
    const follow = loadFromStorage<FollowRelationship>(STORAGE_KEYS.FOLLOWS)
      .find(f => f.followerId === followerId && f.traderId === traderId);

    if (follow?.notificationsEnabled) {
      createNotification(followerId, {
        type: 'trader_trade',
        title: 'New Trade',
        message: `${profile.username} placed a ${trade.type} on ${trade.marketTitle}`,
        traderId,
        tradeId: trade.id,
        actionUrl: `/dashboard/markets/${trade.marketId}`,
      });
    }
  });
}

function executeCopyTrades(originalTrade: SocialTrade): void {
  const copiers = loadFromStorage<CopySettings>(STORAGE_KEYS.COPY_SETTINGS)
    .filter(s => s.traderId === originalTrade.traderId && s.autoCopyEnabled);

  copiers.forEach(settings => {
    try {
      // Calculate copy amount based on settings
      let copyAmount = 0;

      switch (settings.copyMode) {
        case 'fixed':
          copyAmount = settings.copyAmount;
          break;
        case 'proportional':
          // Copy same % of follower's bankroll as trader used
          copyAmount = settings.copyAmount; // TODO: Calculate proportionally
          break;
        case 'percentage':
          copyAmount = originalTrade.amount * (settings.copyAmount / 100);
          break;
      }

      // Apply limits
      copyAmount = Math.min(copyAmount, settings.maxBetSize);
      copyAmount = Math.max(copyAmount, settings.minBetSize);

      // Check exclusions
      if (settings.excludeMarkets.includes(originalTrade.marketId)) {
        return;
      }

      // Record copied trade
      const copiedTrade: CopiedTrade = {
        id: `${settings.followerId}-${originalTrade.id}`,
        originalTradeId: originalTrade.id,
        traderId: originalTrade.traderId,
        followerId: settings.followerId,
        marketId: originalTrade.marketId,
        outcome: originalTrade.outcome,
        amount: copyAmount,
        originalAmount: originalTrade.amount,
        copyRatio: copyAmount / originalTrade.amount,
        timestamp: new Date(),
        txSignature: '', // Will be filled when actual trade executes
        status: 'pending',
      };

      const copiedTrades = loadFromStorage<CopiedTrade>(STORAGE_KEYS.COPIED_TRADES);
      copiedTrades.push(copiedTrade);
      saveToStorage(STORAGE_KEYS.COPIED_TRADES, copiedTrades);

      // Increment copy counter on original trade
      const socialTrades = loadFromStorage<SocialTrade>(STORAGE_KEYS.SOCIAL_TRADES);
      const tradeIndex = socialTrades.findIndex(t => t.id === originalTrade.id);
      if (tradeIndex > -1) {
        socialTrades[tradeIndex].copiedBy++;
        saveToStorage(STORAGE_KEYS.SOCIAL_TRADES, socialTrades);
      }

      // TODO: In production, this would trigger actual bet placement via API
      console.log(`Copy trade queued for ${settings.followerId}:`, copiedTrade);

    } catch (error) {
      console.error('Error executing copy trade:', error);
    }
  });
}

/**
 * Get pending copy trades for a user
 */
export function getPendingCopyTrades(userId: string): CopiedTrade[] {
  const copiedTrades = loadFromStorage<CopiedTrade>(STORAGE_KEYS.COPIED_TRADES);
  return copiedTrades.filter(
    t => t.followerId === userId && t.status === 'pending'
  );
}

/**
 * Clear all social data
 */
export function clearSocialData(): void {
  if (typeof window === 'undefined') return;

  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
