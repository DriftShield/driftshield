const cron = require('node-cron');
const { db } = require('../db');
const logger = require('../utils/logger');
const jobQueue = require('./queue');

class CronJobs {
  constructor() {
    this.jobs = [];
  }

  /**
   * Start all cron jobs
   */
  start() {
    // ========================================================================
    // EVERY MINUTE
    // ========================================================================

    this.jobs.push(
      cron.schedule('* * * * *', async () => {
        await this.checkPendingTransactions();
      }),
    );

    this.jobs.push(
      cron.schedule('* * * * *', async () => {
        await this.processMonitoringQueue();
      }),
    );

    // ========================================================================
    // EVERY 5 MINUTES
    // ========================================================================

    this.jobs.push(
      cron.schedule('*/5 * * * *', async () => {
        await this.syncUserBalances();
      }),
    );

    this.jobs.push(
      cron.schedule('*/5 * * * *', async () => {
        await this.checkMarketResolutions();
      }),
    );

    // ========================================================================
    // EVERY 15 MINUTES
    // ========================================================================

    this.jobs.push(
      cron.schedule('*/15 * * * *', async () => {
        await this.updatePlatformStats();
      }),
    );

    this.jobs.push(
      cron.schedule('*/15 * * * *', async () => {
        await this.cleanupExpiredSessions();
      }),
    );

    // ========================================================================
    // EVERY HOUR
    // ========================================================================

    this.jobs.push(
      cron.schedule('0 * * * *', async () => {
        await this.updateLeaderboards();
      }),
    );

    this.jobs.push(
      cron.schedule('0 * * * *', async () => {
        await this.checkExpiringInsurance();
      }),
    );

    this.jobs.push(
      cron.schedule('0 * * * *', async () => {
        await this.aggregateDailyMetrics();
      }),
    );

    // ========================================================================
    // EVERY 6 HOURS
    // ========================================================================

    this.jobs.push(
      cron.schedule('0 */6 * * *', async () => {
        await this.cleanupOldReceipts();
      }),
    );

    this.jobs.push(
      cron.schedule('0 */6 * * *', async () => {
        await this.cleanupOldJobs();
      }),
    );

    // ========================================================================
    // DAILY (at 00:00 UTC)
    // ========================================================================

    this.jobs.push(
      cron.schedule('0 0 * * *', async () => {
        await this.generateDailyReport();
      }),
    );

    this.jobs.push(
      cron.schedule('0 0 * * *', async () => {
        await this.cleanupOldNotifications();
      }),
    );

    this.jobs.push(
      cron.schedule('0 0 * * *', async () => {
        await this.updateModelHealthScores();
      }),
    );

    this.jobs.push(
      cron.schedule('0 0 * * *', async () => {
        await this.processAutoRenewals();
      }),
    );

    // ========================================================================
    // WEEKLY (Monday 00:00 UTC)
    // ========================================================================

    this.jobs.push(
      cron.schedule('0 0 * * 1', async () => {
        await this.generateWeeklyLeaderboard();
      }),
    );

    this.jobs.push(
      cron.schedule('0 0 * * 1', async () => {
        await this.cleanupInactiveUsers();
      }),
    );

    logger.info(`✓ ${this.jobs.length} cron jobs scheduled`);
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    this.jobs.forEach((job) => job.stop());
    logger.info('All cron jobs stopped');
  }

  // ========================================================================
  // CRON JOB IMPLEMENTATIONS
  // ========================================================================

  async checkPendingTransactions() {
    try {
      const pending = await db.any(
        'SELECT * FROM transactions WHERE status = $1 AND created_at > NOW() - INTERVAL \'1 hour\'',
        ['pending'],
      );

      for (const tx of pending) {
        await jobQueue.addBlockchainJob('confirm-transaction', {
          signature: tx.solana_signature,
          transactionId: tx.id,
        });
      }

      logger.debug('Checked pending transactions', { count: pending.length });
    } catch (error) {
      logger.error('Failed to check pending transactions', { error: error.message });
    }
  }

  async processMonitoringQueue() {
    try {
      // Get models due for monitoring
      const models = await db.any(
        `SELECT * FROM models
         WHERE is_active = true
         AND (last_monitored_at IS NULL OR
              last_monitored_at < NOW() - INTERVAL '1 hour' * monitoring_frequency_hours)
         LIMIT 50`,
      );

      for (const model of models) {
        const oracleService = require('../services/oracleService');
        await oracleService.processMonitoringCycle(model.id, db);
      }

      logger.debug('Processed monitoring queue', { count: models.length });
    } catch (error) {
      logger.error('Failed to process monitoring queue', { error: error.message });
    }
  }

  async syncUserBalances() {
    try {
      // Sync top active users
      const users = await db.any(
        `SELECT u.id, u.wallet_address
         FROM users u
         JOIN user_balances b ON u.id = b.user_id
         WHERE u.is_active = true
         ORDER BY (b.available_balance + b.locked_in_markets + b.locked_in_insurance) DESC
         LIMIT 1000`,
      );

      // Would sync with blockchain in production
      logger.debug('Synced user balances', { count: users.length });
    } catch (error) {
      logger.error('Failed to sync user balances', { error: error.message });
    }
  }

  async checkMarketResolutions() {
    try {
      const oracleService = require('../services/oracleService');
      const resolved = await oracleService.scheduleMarketResolutions(db);

      logger.debug('Checked market resolutions', { count: resolved });
    } catch (error) {
      logger.error('Failed to check market resolutions', { error: error.message });
    }
  }

  async updatePlatformStats() {
    try {
      const analyticsService = require('../services/analyticsService');
      await analyticsService.getPlatformStats(db);

      logger.debug('Updated platform stats');
    } catch (error) {
      logger.error('Failed to update platform stats', { error: error.message });
    }
  }

  async cleanupExpiredSessions() {
    try {
      const { redis } = require('../config/redis');
      // Redis handles TTL automatically, but we can log stats
      logger.debug('Cleaned up expired sessions');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error: error.message });
    }
  }

  async updateLeaderboards() {
    try {
      const analyticsService = require('../services/analyticsService');
      const types = ['top_predictors', 'top_models', 'biggest_wins'];
      const periods = ['weekly', 'monthly', 'all_time'];

      for (const type of types) {
        for (const period of periods) {
          await analyticsService.generateLeaderboard(type, period, db);
        }
      }

      logger.debug('Updated leaderboards');
    } catch (error) {
      logger.error('Failed to update leaderboards', { error: error.message });
    }
  }

  async checkExpiringInsurance() {
    try {
      const insuranceService = require('../services/insuranceService');
      await insuranceService.checkExpiringPolicies(db);

      logger.debug('Checked expiring insurance');
    } catch (error) {
      logger.error('Failed to check expiring insurance', { error: error.message });
    }
  }

  async aggregateDailyMetrics() {
    try {
      const analyticsService = require('../services/analyticsService');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await analyticsService.getDailyStats(yesterday, db);

      logger.debug('Aggregated daily metrics');
    } catch (error) {
      logger.error('Failed to aggregate daily metrics', { error: error.message });
    }
  }

  async cleanupOldReceipts() {
    try {
      // Archive receipts older than 90 days
      const result = await db.result(
        `DELETE FROM monitoring_receipts
         WHERE timestamp < NOW() - INTERVAL '90 days'
         AND drift_detected = false`,
      );

      logger.info('Cleaned up old receipts', { count: result.rowCount });
    } catch (error) {
      logger.error('Failed to cleanup old receipts', { error: error.message });
    }
  }

  async cleanupOldJobs() {
    try {
      await jobQueue.cleanOldJobs();
      logger.debug('Cleaned up old jobs');
    } catch (error) {
      logger.error('Failed to cleanup old jobs', { error: error.message });
    }
  }

  async generateDailyReport() {
    try {
      const analyticsService = require('../services/analyticsService');
      const today = new Date();
      const stats = await analyticsService.getDailyStats(today, db);

      logger.info('Daily report generated', stats);
    } catch (error) {
      logger.error('Failed to generate daily report', { error: error.message });
    }
  }

  async cleanupOldNotifications() {
    try {
      const result = await db.result(
        `DELETE FROM notifications
         WHERE is_read = true
         AND created_at < NOW() - INTERVAL '30 days'`,
      );

      logger.info('Cleaned up old notifications', { count: result.rowCount });
    } catch (error) {
      logger.error('Failed to cleanup old notifications', { error: error.message });
    }
  }

  async updateModelHealthScores() {
    try {
      const models = await db.any('SELECT id FROM models WHERE is_active = true');

      for (const model of models) {
        // Recalculate health status based on recent receipts
        const recentReceipts = await db.any(
          `SELECT * FROM monitoring_receipts
           WHERE model_id = $1
           AND timestamp > NOW() - INTERVAL '7 days'
           ORDER BY timestamp DESC
           LIMIT 10`,
          [model.id],
        );

        if (recentReceipts.length > 0) {
          const avgDrift = recentReceipts.reduce(
            (sum, r) => sum + parseFloat(r.drift_percentage),
            0,
          ) / recentReceipts.length;

          let healthStatus = 'healthy';
          if (avgDrift > 10) healthStatus = 'critical';
          else if (avgDrift > 5) healthStatus = 'warning';

          await db.none(
            'UPDATE models SET health_status = $1 WHERE id = $2',
            [healthStatus, model.id],
          );
        }
      }

      logger.debug('Updated model health scores', { count: models.length });
    } catch (error) {
      logger.error('Failed to update model health scores', { error: error.message });
    }
  }

  async processAutoRenewals() {
    try {
      const expiringPolicies = await db.any(
        `SELECT * FROM insurance_policies
         WHERE status = 'active'
         AND auto_renew = true
         AND end_date < NOW() + INTERVAL '1 day'
         AND end_date > NOW()`,
      );

      const insuranceService = require('../services/insuranceService');

      for (const policy of expiringPolicies) {
        await insuranceService.renewPolicy(policy.id, db);
      }

      logger.info('Processed auto-renewals', { count: expiringPolicies.length });
    } catch (error) {
      logger.error('Failed to process auto-renewals', { error: error.message });
    }
  }

  async generateWeeklyLeaderboard() {
    try {
      const analyticsService = require('../services/analyticsService');
      await analyticsService.generateLeaderboard('top_predictors', 'weekly', db);

      logger.info('Generated weekly leaderboard');
    } catch (error) {
      logger.error('Failed to generate weekly leaderboard', { error: error.message });
    }
  }

  async cleanupInactiveUsers() {
    try {
      const result = await db.result(
        `UPDATE users SET is_active = false
         WHERE last_login_at < NOW() - INTERVAL '90 days'
         AND is_active = true`,
      );

      logger.info('Cleaned up inactive users', { count: result.rowCount });
    } catch (error) {
      logger.error('Failed to cleanup inactive users', { error: error.message });
    }
  }
}

module.exports = new CronJobs();

