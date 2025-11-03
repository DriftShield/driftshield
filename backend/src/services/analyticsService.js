const { redis } = require('../config/redis');
const { leaderboardCache, db } = require('../db');
const logger = require('../utils/logger');

const CACHE_TTL = 300; // 5 minutes

class AnalyticsService {
  /**
   * Get portfolio analytics for user
   */
  async getPortfolioAnalytics(userId, dbInstance) {
    logger.info('Getting portfolio analytics', { userId });

    const cacheKey = `analytics:portfolio:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get user's models
    const models = await dbInstance.any(
      'SELECT * FROM models WHERE owner_id = $1',
      [userId],
    );

    // Get user's active positions
    const positions = await dbInstance.any(
      `SELECT p.*, m.question, m.resolution_date, m.status
       FROM positions p
       JOIN markets m ON p.market_id = m.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId],
    );

    // Get user's insurance policies
    const policies = await dbInstance.any(
      'SELECT * FROM insurance_policies WHERE owner_id = $1',
      [userId],
    );

    // Calculate total value
    const totalInMarkets = positions.reduce(
      (sum, p) => sum + parseInt(p.stake_no_drift || 0, 10) + parseInt(p.stake_drift || 0, 10),
      0,
    );

    const totalInInsurance = policies
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + parseInt(p.coverage_amount || 0, 10), 0);

    // Calculate P&L from resolved positions
    const resolvedPositions = positions.filter((p) => p.is_claimed);
    const totalInvested = resolvedPositions.reduce(
      (sum, p) => sum + parseInt(p.stake_no_drift || 0, 10) + parseInt(p.stake_drift || 0, 10),
      0,
    );
    const totalReturned = resolvedPositions.reduce(
      (sum, p) => sum + parseInt(p.payout_amount || 0, 10),
      0,
    );
    const profitLoss = totalReturned - totalInvested;
    const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    // Model health summary
    const modelHealth = {
      total: models.length,
      healthy: models.filter((m) => m.health_status === 'healthy').length,
      warning: models.filter((m) => m.health_status === 'warning').length,
      critical: models.filter((m) => m.health_status === 'critical').length,
    };

    // Market positions summary
    const marketsSummary = {
      total: positions.length,
      active: positions.filter((p) => p.market_id && !p.is_claimed).length,
      claimable: positions.filter((p) => p.payout_amount > 0 && !p.is_claimed).length,
      completed: positions.filter((p) => p.is_claimed).length,
    };

    const analytics = {
      userId,
      models: {
        count: models.length,
        health: modelHealth,
      },
      markets: marketsSummary,
      insurance: {
        activePolicies: policies.filter((p) => p.status === 'active').length,
        totalCoverage: totalInInsurance,
      },
      financials: {
        totalInMarkets,
        totalInInsurance,
        profitLoss,
        roi,
        totalInvested,
        totalReturned,
      },
      recentActivity: {
        models: models.slice(0, 5),
        positions: positions.slice(0, 5),
      },
      timestamp: new Date().toISOString(),
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(analytics));

    return analytics;
  }

  /**
   * Get model performance analytics
   */
  async getModelPerformance(modelId, period = '30d', dbInstance) {
    logger.info('Getting model performance', { modelId, period });

    const cacheKey = `analytics:model:${modelId}:${period}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate time range
    let days = 30;
    if (period === '7d') days = 7;
    if (period === '90d') days = 90;

    // Get monitoring receipts
    const receipts = await dbInstance.any(
      `SELECT * FROM monitoring_receipts
       WHERE model_id = $1
       AND timestamp > NOW() - INTERVAL '${days} days'
       ORDER BY timestamp DESC`,
      [modelId],
    );

    // Calculate metrics
    const driftEvents = receipts.filter((r) => r.drift_detected);
    const avgDrift = receipts.length > 0
      ? receipts.reduce((sum, r) => sum + parseFloat(r.drift_percentage), 0) / receipts.length
      : 0;

    // Drift trend
    const driftValues = receipts.map((r) => ({
      timestamp: r.timestamp,
      drift: parseFloat(r.drift_percentage),
    })).reverse();

    // Get related markets
    const markets = await dbInstance.any(
      'SELECT * FROM markets WHERE model_id = $1',
      [modelId],
    );

    // Calculate costs (monitoring + insurance)
    const activePolicies = await dbInstance.any(
      `SELECT * FROM insurance_policies
       WHERE model_id = $1
       AND created_at > NOW() - INTERVAL '${days} days'`,
      [modelId],
    );

    const insuranceCost = activePolicies.reduce(
      (sum, p) => sum + parseInt(p.premium_paid, 10),
      0,
    );

    const performance = {
      modelId,
      period,
      monitoring: {
        totalCycles: receipts.length,
        driftEvents: driftEvents.length,
        driftRate: receipts.length > 0 ? (driftEvents.length / receipts.length) * 100 : 0,
        avgDrift,
        maxDrift: receipts.length > 0
          ? Math.max(...receipts.map((r) => parseFloat(r.drift_percentage)))
          : 0,
        minDrift: receipts.length > 0
          ? Math.min(...receipts.map((r) => parseFloat(r.drift_percentage)))
          : 0,
      },
      driftTrend: driftValues,
      markets: {
        total: markets.length,
        active: markets.filter((m) => m.status === 'active').length,
        resolved: markets.filter((m) => m.status === 'resolved').length,
      },
      costs: {
        insurance: insuranceCost,
        total: insuranceCost,
      },
      timestamp: new Date().toISOString(),
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(performance));

    return performance;
  }

  /**
   * Get user's market performance
   */
  async getUserMarketPerformance(userId, dbInstance) {
    logger.info('Getting user market performance', { userId });

    const cacheKey = `analytics:user_markets:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get all resolved positions
    const resolvedPositions = await dbInstance.any(
      `SELECT p.*, m.outcome, m.question, m.resolved_at
       FROM positions p
       JOIN markets m ON p.market_id = m.id
       WHERE p.user_id = $1 AND m.status = 'resolved'
       ORDER BY m.resolved_at DESC`,
      [userId],
    );

    // Calculate statistics
    const totalBets = resolvedPositions.length;
    const wonBets = resolvedPositions.filter((p) => p.payout_amount > 0).length;
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

    const totalStaked = resolvedPositions.reduce(
      (sum, p) => sum + parseInt(p.stake_no_drift || 0, 10) + parseInt(p.stake_drift || 0, 10),
      0,
    );

    const totalPayout = resolvedPositions.reduce(
      (sum, p) => sum + parseInt(p.payout_amount || 0, 10),
      0,
    );

    const totalProfit = totalPayout - totalStaked;
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

    // Betting patterns
    const noDriftBets = resolvedPositions.filter((p) => p.stake_no_drift > 0).length;
    const driftBets = resolvedPositions.filter((p) => p.stake_drift > 0).length;

    // Get platform average for comparison
    const platformStats = await dbInstance.one(`
      SELECT
        COUNT(DISTINCT p.user_id) as total_users,
        COUNT(*) as total_positions,
        AVG(CASE WHEN p.payout_amount > 0 THEN 1.0 ELSE 0.0 END) * 100 as avg_win_rate
      FROM positions p
      JOIN markets m ON p.market_id = m.id
      WHERE m.status = 'resolved'
    `);

    const performance = {
      userId,
      overall: {
        totalBets,
        wonBets,
        lostBets: totalBets - wonBets,
        winRate,
        totalStaked,
        totalPayout,
        totalProfit,
        roi,
      },
      patterns: {
        noDriftBets,
        driftBets,
        noDriftPreference: totalBets > 0 ? (noDriftBets / totalBets) * 100 : 0,
      },
      comparison: {
        platformAverageWinRate: parseFloat(platformStats.avg_win_rate || 0),
        vsAverage: winRate - parseFloat(platformStats.avg_win_rate || 0),
      },
      recentBets: resolvedPositions.slice(0, 10),
      timestamp: new Date().toISOString(),
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(performance));

    return performance;
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(dbInstance) {
    const cacheKey = 'analytics:platform_stats';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get counts
    const stats = await dbInstance.one(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM models WHERE is_active = true) as total_models,
        (SELECT COUNT(*) FROM markets WHERE status = 'active') as active_markets,
        (SELECT COUNT(*) FROM markets) as total_markets,
        (SELECT COALESCE(SUM(total_stake_no_drift + total_stake_drift), 0) FROM markets WHERE status = 'active') as total_volume,
        (SELECT COALESCE(SUM(available_balance + locked_in_markets + locked_in_insurance), 0) FROM user_balances) as total_tvl
    `);

    // Get recent activity
    const recentModels = await dbInstance.any(
      'SELECT id, name, created_at, health_status FROM models ORDER BY created_at DESC LIMIT 5',
    );

    const recentMarkets = await dbInstance.any(
      'SELECT id, question, created_at, status, resolution_date FROM markets ORDER BY created_at DESC LIMIT 5',
    );

    // Get drift statistics
    const driftStats = await dbInstance.one(`
      SELECT
        COUNT(*) as total_monitoring_cycles,
        SUM(CASE WHEN drift_detected = true THEN 1 ELSE 0 END) as drift_events,
        AVG(drift_percentage) as avg_drift
      FROM monitoring_receipts
      WHERE timestamp > NOW() - INTERVAL '30 days'
    `);

    const platformStats = {
      users: {
        total: parseInt(stats.total_users, 10),
      },
      models: {
        total: parseInt(stats.total_models, 10),
        recentlyAdded: recentModels.length,
      },
      markets: {
        total: parseInt(stats.total_markets, 10),
        active: parseInt(stats.active_markets, 10),
        recentlyCreated: recentMarkets.length,
      },
      volume: {
        total: parseInt(stats.total_volume, 10),
        tvl: parseInt(stats.total_tvl, 10),
      },
      monitoring: {
        totalCycles: parseInt(driftStats.total_monitoring_cycles, 10),
        driftEvents: parseInt(driftStats.drift_events, 10),
        avgDrift: parseFloat(driftStats.avg_drift || 0),
      },
      recent: {
        models: recentModels,
        markets: recentMarkets,
      },
      timestamp: new Date().toISOString(),
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(platformStats));

    return platformStats;
  }

  /**
   * Generate leaderboard
   */
  async generateLeaderboard(type, period, dbInstance) {
    logger.info('Generating leaderboard', { type, period });

    // Check cache first
    const cached = await leaderboardCache.find(period, type);

    if (cached) {
      return JSON.parse(cached.data);
    }

    let data = [];

    // Calculate time range
    let intervalQuery = '';
    if (period === 'weekly') intervalQuery = "AND m.resolved_at > NOW() - INTERVAL '7 days'";
    if (period === 'monthly') intervalQuery = "AND m.resolved_at > NOW() - INTERVAL '30 days'";

    if (type === 'top_predictors') {
      // Top predictors by win rate
      data = await dbInstance.any(`
        SELECT
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          COUNT(DISTINCT p.id) as total_bets,
          SUM(CASE WHEN p.payout_amount > 0 THEN 1 ELSE 0 END) as won_bets,
          ROUND(AVG(CASE WHEN p.payout_amount > 0 THEN 100.0 ELSE 0.0 END), 2) as win_rate,
          SUM(p.stake_no_drift + p.stake_drift) as total_staked,
          COALESCE(SUM(p.payout_amount), 0) as total_winnings
        FROM users u
        JOIN positions p ON u.id = p.user_id
        JOIN markets m ON p.market_id = m.id
        WHERE m.status = 'resolved' ${intervalQuery}
        GROUP BY u.id
        HAVING COUNT(DISTINCT p.id) >= 5
        ORDER BY win_rate DESC, total_bets DESC
        LIMIT 100
      `);
    } else if (type === 'top_models') {
      // Top models by stability (lowest drift rate)
      data = await dbInstance.any(`
        SELECT
          m.id,
          m.name,
          u.username as owner_username,
          m.health_status,
          COUNT(r.id) as monitoring_cycles,
          SUM(CASE WHEN r.drift_detected THEN 1 ELSE 0 END) as drift_events,
          ROUND((1 - (SUM(CASE WHEN r.drift_detected THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(r.id), 0))) * 100, 2) as stability_score,
          ROUND(AVG(r.drift_percentage), 2) as avg_drift
        FROM models m
        JOIN users u ON m.owner_id = u.id
        JOIN monitoring_receipts r ON m.id = r.model_id
        WHERE r.timestamp > NOW() - INTERVAL '30 days'
        GROUP BY m.id, u.username
        HAVING COUNT(r.id) >= 10
        ORDER BY stability_score DESC, avg_drift ASC
        LIMIT 100
      `);
    } else if (type === 'biggest_wins') {
      // Biggest single wins
      data = await dbInstance.any(`
        SELECT
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          p.payout_amount,
          (p.stake_no_drift + p.stake_drift) as stake,
          ROUND((p.payout_amount::decimal / NULLIF(p.stake_no_drift + p.stake_drift, 0) - 1) * 100, 2) as profit_pct,
          m.question as market_question,
          m.resolved_at
        FROM positions p
        JOIN users u ON p.user_id = u.id
        JOIN markets m ON p.market_id = m.id
        WHERE m.status = 'resolved' AND p.payout_amount > 0 ${intervalQuery}
        ORDER BY p.payout_amount DESC
        LIMIT 100
      `);
    }

    // Add ranks
    const rankedData = data.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    // Cache for 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await leaderboardCache.upsert(period, type, rankedData, expiresAt);

    return rankedData;
  }

  /**
   * Track event
   */
  async trackEvent(eventData, dbInstance) {
    try {
      const { analyticsEvents } = require('../db');
      await analyticsEvents.create(eventData);
    } catch (error) {
      logger.error('Failed to track event', { error: error.message });
    }
  }

  /**
   * Get daily stats
   */
  async getDailyStats(date, dbInstance) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const stats = await dbInstance.one(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at BETWEEN $1 AND $2) as new_users,
        (SELECT COUNT(*) FROM models WHERE created_at BETWEEN $1 AND $2) as new_models,
        (SELECT COUNT(*) FROM markets WHERE created_at BETWEEN $1 AND $2) as new_markets,
        (SELECT COUNT(*) FROM markets WHERE resolved_at BETWEEN $1 AND $2) as resolved_markets,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'bet' AND created_at BETWEEN $1 AND $2) as trading_volume,
        (SELECT COUNT(*) FROM monitoring_receipts WHERE timestamp BETWEEN $1 AND $2) as monitoring_cycles
    `, [startDate, endDate]);

    return {
      date,
      newUsers: parseInt(stats.new_users, 10),
      newModels: parseInt(stats.new_models, 10),
      newMarkets: parseInt(stats.new_markets, 10),
      resolvedMarkets: parseInt(stats.resolved_markets, 10),
      tradingVolume: parseInt(stats.trading_volume, 10),
      monitoringCycles: parseInt(stats.monitoring_cycles, 10),
    };
  }
}

module.exports = new AnalyticsService();

