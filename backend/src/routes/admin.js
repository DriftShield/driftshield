const express = require('express');
const { authRequired, roleRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const modelService = require('../services/modelService');
const oracleService = require('../services/oracleService');
const analyticsService = require('../services/analyticsService');
const jobQueue = require('../jobs/queue');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require admin role
router.use(authRequired);
router.use(roleRequired('admin'));

/**
 * GET /admin/users
 * List all users with filters
 */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const {
      status = 'all',
      role,
      sort = 'created_at',
      limit = 50,
      offset = 0,
    } = req.query;

    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (status === 'active') {
      query += ' AND is_active = true';
    } else if (status === 'inactive') {
      query += ' AND is_active = false';
    }

    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    query += ` ORDER BY ${sort} DESC`;

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const users = await req.app.locals.db.any(query, params);

    // Get total count
    const totalCount = await req.app.locals.db.one(
      'SELECT COUNT(*) as count FROM users WHERE is_active = true',
    );

    res.json({
      users,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        total: parseInt(totalCount.count, 10),
      },
    });
  }),
);

/**
 * GET /admin/users/:userId
 * Get detailed user information
 */
router.get(
  '/users/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await req.app.locals.db.oneOrNone(
      'SELECT * FROM users WHERE id = $1',
      [userId],
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's models
    const models = await req.app.locals.db.any(
      'SELECT * FROM models WHERE owner_id = $1',
      [userId],
    );

    // Get user's balance
    const balance = await req.app.locals.db.oneOrNone(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId],
    );

    // Get user's recent transactions
    const transactions = await req.app.locals.db.any(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId],
    );

    res.json({
      user,
      models,
      balance,
      recentTransactions: transactions,
    });
  }),
);

/**
 * PATCH /admin/users/:userId
 * Update user (ban, change role, etc.)
 */
router.patch(
  '/users/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { is_active, role } = req.body;

    const updates = [];
    const params = [userId];

    if (typeof is_active === 'boolean') {
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }

    if (role && ['user', 'admin', 'oracle', 'moderator'].includes(role)) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    updates.push('updated_at = NOW()');

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const user = await req.app.locals.db.one(query, params);

    logger.info('Admin updated user', {
      adminId: req.user.id,
      userId,
      updates: { is_active, role },
    });

    res.json({
      message: 'User updated successfully',
      user,
    });
  }),
);

/**
 * GET /admin/system/health
 * Get comprehensive system health
 */
router.get(
  '/system/health',
  asyncHandler(async (req, res) => {
    const { db, redis } = req.app.locals;

    // Check database
    const dbHealth = await db.one(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM models WHERE is_active = true) as active_models,
        (SELECT COUNT(*) FROM markets WHERE status = 'active') as active_markets,
        (SELECT pg_database_size(current_database())) as db_size
    `);

    // Check Redis
    const redisInfo = await redis.info();

    // Check job queues
    const queueStats = await jobQueue.getStats();

    // Get recent errors
    const recentErrors = await db.any(
      `SELECT * FROM system_logs 
       WHERE level = 'error' 
       AND timestamp > NOW() - INTERVAL '1 hour'
       ORDER BY timestamp DESC 
       LIMIT 20`,
    );

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: 'ok',
        activeUsers: parseInt(dbHealth.active_users, 10),
        activeModels: parseInt(dbHealth.active_models, 10),
        activeMarkets: parseInt(dbHealth.active_markets, 10),
        size: parseInt(dbHealth.db_size, 10),
      },
      cache: {
        status: 'ok',
        info: redisInfo,
      },
      queues: queueStats,
      recentErrors,
    });
  }),
);

/**
 * GET /admin/system/metrics
 * Get system performance metrics
 */
router.get(
  '/system/metrics',
  asyncHandler(async (req, res) => {
    const { period = '24h' } = req.query;

    let interval = '24 hours';
    if (period === '7d') interval = '7 days';
    if (period === '30d') interval = '30 days';

    // Get metrics
    const metrics = await req.app.locals.db.one(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '${interval}') as new_users,
        (SELECT COUNT(*) FROM models WHERE created_at > NOW() - INTERVAL '${interval}') as new_models,
        (SELECT COUNT(*) FROM markets WHERE created_at > NOW() - INTERVAL '${interval}') as new_markets,
        (SELECT COUNT(*) FROM markets WHERE resolved_at > NOW() - INTERVAL '${interval}') as resolved_markets,
        (SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '${interval}') as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'bet' AND created_at > NOW() - INTERVAL '${interval}') as trading_volume,
        (SELECT COUNT(*) FROM monitoring_receipts WHERE timestamp > NOW() - INTERVAL '${interval}') as monitoring_cycles,
        (SELECT COUNT(*) FROM monitoring_receipts WHERE drift_detected = true AND timestamp > NOW() - INTERVAL '${interval}') as drift_events
    `);

    // Get error rate
    const errorRate = await req.app.locals.db.one(`
      SELECT
        COUNT(*) FILTER (WHERE level = 'error') as errors,
        COUNT(*) as total_logs
      FROM system_logs
      WHERE timestamp > NOW() - INTERVAL '${interval}'
    `);

    res.json({
      period,
      metrics: {
        newUsers: parseInt(metrics.new_users, 10),
        newModels: parseInt(metrics.new_models, 10),
        newMarkets: parseInt(metrics.new_markets, 10),
        resolvedMarkets: parseInt(metrics.resolved_markets, 10),
        totalTransactions: parseInt(metrics.total_transactions, 10),
        tradingVolume: parseInt(metrics.trading_volume, 10),
        monitoringCycles: parseInt(metrics.monitoring_cycles, 10),
        driftEvents: parseInt(metrics.drift_events, 10),
        errorRate: errorRate.total_logs > 0
          ? (parseInt(errorRate.errors, 10) / parseInt(errorRate.total_logs, 10) * 100).toFixed(2)
          : 0,
      },
    });
  }),
);

/**
 * GET /admin/models
 * List all models with health status
 */
router.get(
  '/models',
  asyncHandler(async (req, res) => {
    const {
      health_status,
      owner,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT m.*, u.username as owner_username, u.email as owner_email
      FROM models m
      JOIN users u ON m.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (health_status) {
      params.push(health_status);
      query += ` AND m.health_status = $${params.length}`;
    }

    if (owner) {
      params.push(owner);
      query += ` AND m.owner_id = $${params.length}`;
    }

    query += ' ORDER BY m.created_at DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const models = await req.app.locals.db.any(query, params);

    res.json({ models });
  }),
);

/**
 * POST /admin/models/:modelId/force-monitor
 * Force a monitoring cycle for a model
 */
router.post(
  '/models/:modelId/force-monitor',
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;

    const model = await modelService.getModel(modelId);

    // Add to monitoring queue with high priority
    await jobQueue.addMonitoringJob(
      'process-monitoring-receipt',
      { modelId },
      { priority: 1 },
    );

    // Or directly process
    try {
      const result = await oracleService.processMonitoringCycle(modelId, req.app.locals.db);

      logger.info('Admin forced monitoring cycle', {
        adminId: req.user.id,
        modelId,
        result,
      });

      res.json({
        message: 'Monitoring cycle triggered successfully',
        result,
      });
    } catch (error) {
      logger.error('Admin forced monitoring failed', {
        adminId: req.user.id,
        modelId,
        error: error.message,
      });

      res.status(500).json({
        error: 'Monitoring cycle failed',
        details: error.message,
      });
    }
  }),
);

/**
 * GET /admin/markets
 * List all markets with status
 */
router.get(
  '/markets',
  asyncHandler(async (req, res) => {
    const {
      status,
      model,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT m.*, mo.name as model_name, u.username as creator_username
      FROM markets m
      JOIN models mo ON m.model_id = mo.id
      JOIN users u ON m.creator_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND m.status = $${params.length}`;
    }

    if (model) {
      params.push(model);
      query += ` AND m.model_id = $${params.length}`;
    }

    query += ' ORDER BY m.created_at DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const markets = await req.app.locals.db.any(query, params);

    res.json({ markets });
  }),
);

/**
 * POST /admin/markets/:marketId/force-resolve
 * Force resolution of a market
 */
router.post(
  '/markets/:marketId/force-resolve',
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;
    const { outcome, finalDrift } = req.body;

    // Validate outcome
    if (!['no_drift', 'drift', 'invalid'].includes(outcome)) {
      return res.status(400).json({ error: 'Invalid outcome' });
    }

    try {
      const result = await oracleService.resolveMarket(marketId, req.app.locals.db);

      logger.info('Admin forced market resolution', {
        adminId: req.user.id,
        marketId,
        outcome: result.outcome,
      });

      res.json({
        message: 'Market resolved successfully',
        result,
      });
    } catch (error) {
      logger.error('Admin forced resolution failed', {
        adminId: req.user.id,
        marketId,
        error: error.message,
      });

      res.status(500).json({
        error: 'Market resolution failed',
        details: error.message,
      });
    }
  }),
);

/**
 * GET /admin/transactions
 * List all transactions
 */
router.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const {
      type,
      status,
      user,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT t.*, u.username
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      params.push(type);
      query += ` AND t.type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    if (user) {
      params.push(user);
      query += ` AND t.user_id = $${params.length}`;
    }

    query += ' ORDER BY t.created_at DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const transactions = await req.app.locals.db.any(query, params);

    res.json({ transactions });
  }),
);

/**
 * GET /admin/logs
 * Get system logs
 */
router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const {
      level,
      service,
      limit = 100,
      offset = 0,
    } = req.query;

    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params = [];

    if (level) {
      params.push(level);
      query += ` AND level = $${params.length}`;
    }

    if (service) {
      params.push(service);
      query += ` AND service = $${params.length}`;
    }

    query += ' ORDER BY timestamp DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const logs = await req.app.locals.db.any(query, params);

    res.json({ logs });
  }),
);

/**
 * POST /admin/system/cleanup
 * Trigger system cleanup tasks
 */
router.post(
  '/system/cleanup',
  asyncHandler(async (req, res) => {
    const { task } = req.body;

    const tasks = {
      old_receipts: async () => {
        const result = await req.app.locals.db.result(
          `DELETE FROM monitoring_receipts
           WHERE timestamp < NOW() - INTERVAL '90 days'
           AND drift_detected = false`,
        );
        return { deleted: result.rowCount };
      },
      old_notifications: async () => {
        const result = await req.app.locals.db.result(
          `DELETE FROM notifications
           WHERE is_read = true
           AND created_at < NOW() - INTERVAL '30 days'`,
        );
        return { deleted: result.rowCount };
      },
      old_jobs: async () => {
        await jobQueue.cleanOldJobs();
        return { message: 'Old jobs cleaned' };
      },
      expired_sessions: async () => {
        // Redis automatically handles TTL, but we can log stats
        return { message: 'Sessions cleaned (handled by Redis TTL)' };
      },
    };

    if (!task || !tasks[task]) {
      return res.status(400).json({
        error: 'Invalid task',
        availableTasks: Object.keys(tasks),
      });
    }

    try {
      const result = await tasks[task]();

      logger.info('Admin triggered cleanup', {
        adminId: req.user.id,
        task,
        result,
      });

      res.json({
        message: 'Cleanup task completed',
        task,
        result,
      });
    } catch (error) {
      logger.error('Cleanup task failed', {
        adminId: req.user.id,
        task,
        error: error.message,
      });

      res.status(500).json({
        error: 'Cleanup task failed',
        details: error.message,
      });
    }
  }),
);

/**
 * GET /admin/analytics/platform
 * Get platform-wide analytics
 */
router.get(
  '/analytics/platform',
  asyncHandler(async (req, res) => {
    const stats = await analyticsService.getPlatformStats(req.app.locals.db);

    // Add admin-specific metrics
    const adminMetrics = await req.app.locals.db.one(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
        (SELECT COUNT(*) FROM users WHERE last_login_at < NOW() - INTERVAL '30 days') as inactive_users,
        (SELECT COUNT(*) FROM models WHERE health_status = 'critical') as critical_models,
        (SELECT AVG(payout_amount) FROM positions WHERE is_claimed = true) as avg_payout
    `);

    res.json({
      ...stats,
      adminMetrics: {
        admins: parseInt(adminMetrics.admin_count, 10),
        inactiveUsers: parseInt(adminMetrics.inactive_users, 10),
        criticalModels: parseInt(adminMetrics.critical_models, 10),
        avgPayout: parseFloat(adminMetrics.avg_payout || 0),
      },
    });
  }),
);

/**
 * POST /admin/broadcast
 * Send broadcast notification to all users or specific group
 */
router.post(
  '/broadcast',
  asyncHandler(async (req, res) => {
    const { title, message, priority = 'normal', targetGroup = 'all' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message required' });
    }

    let userQuery = 'SELECT id FROM users WHERE is_active = true';

    if (targetGroup === 'model_owners') {
      userQuery = `
        SELECT DISTINCT owner_id as id FROM models WHERE is_active = true
      `;
    } else if (targetGroup === 'market_participants') {
      userQuery = `
        SELECT DISTINCT user_id as id FROM positions
      `;
    }

    const users = await req.app.locals.db.any(userQuery);

    // Create notifications for all users
    let createdCount = 0;
    for (const user of users) {
      try {
        await req.app.locals.db.none(
          `INSERT INTO notifications (user_id, type, title, message, priority)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, 'broadcast', title, message, priority],
        );
        createdCount++;
      } catch (error) {
        logger.error('Failed to create broadcast notification', {
          userId: user.id,
          error: error.message,
        });
      }
    }

    logger.info('Admin sent broadcast', {
      adminId: req.user.id,
      targetGroup,
      recipientCount: createdCount,
    });

    res.json({
      message: 'Broadcast sent successfully',
      recipientCount: createdCount,
    });
  }),
);

module.exports = router;

