const Bull = require('bull');
const logger = require('../utils/logger');
const { db } = require('../db');

// Import processors
const marketProcessor = require('./processors/market');
const notificationProcessor = require('./processors/notification');
const blockchainProcessor = require('./processors/blockchain');

class JobQueue {
  constructor() {
    this.queues = {};
  }

  /**
   * Initialize all job queues
   */
  async initialize() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    };

    // Market Jobs Queue
    this.queues.market = new Bull('market-jobs', { redis: redisConfig });
    this.queues.market.process('update-market-odds', 20, marketProcessor.updateOdds);
    this.queues.market.process('resolve-market', 5, marketProcessor.resolveMarket);
    this.queues.market.process('distribute-payouts', 3, marketProcessor.distributePayouts);

    // Notification Jobs Queue
    this.queues.notification = new Bull('notification-jobs', { redis: redisConfig });
    this.queues.notification.process('send-notification', 50, notificationProcessor.sendNotification);
    this.queues.notification.process('send-email', 30, notificationProcessor.sendEmail);
    this.queues.notification.process('send-sms', 20, notificationProcessor.sendSMS);

    // Blockchain Jobs Queue
    this.queues.blockchain = new Bull('blockchain-jobs', { redis: redisConfig });
    this.queues.blockchain.process('submit-transaction', 10, blockchainProcessor.submitTransaction);
    this.queues.blockchain.process('confirm-transaction', 10, blockchainProcessor.confirmTransaction);
    this.queues.blockchain.process('sync-blockchain-state', 5, blockchainProcessor.syncState);

    // Analytics Jobs Queue
    this.queues.analytics = new Bull('analytics-jobs', { redis: redisConfig });
    this.queues.analytics.process('update-leaderboard', async (job) => {
      const { type, period } = job.data;
      const analyticsService = require('../services/analyticsService');
      await analyticsService.generateLeaderboard(type, period, db);
    });
    this.queues.analytics.process('calculate-portfolio', async (job) => {
      const { userId } = job.data;
      const analyticsService = require('../services/analyticsService');
      await analyticsService.getPortfolioAnalytics(userId, db);
    });
    this.queues.analytics.process('aggregate-platform-stats', async (job) => {
      const analyticsService = require('../services/analyticsService');
      await analyticsService.getPlatformStats(db);
    });

    // Set up event listeners for all queues
    Object.entries(this.queues).forEach(([name, queue]) => {
      queue.on('completed', (job) => {
        logger.debug(`Job completed`, {
          queue: name,
          jobId: job.id,
          type: job.name,
        });
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job failed`, {
          queue: name,
          jobId: job.id,
          type: job.name,
          error: err.message,
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled`, {
          queue: name,
          jobId: job.id,
          type: job.name,
        });
      });
    });

    logger.info('All job queues initialized');
  }

  /**
   * Add job to market queue
   */
  async addMarketJob(type, data, options = {}) {
    return this.queues.market.add(type, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      ...options,
    });
  }

  /**
   * Add job to notification queue
   */
  async addNotificationJob(type, data, options = {}) {
    return this.queues.notification.add(type, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
    });
  }

  /**
   * Add job to blockchain queue
   */
  async addBlockchainJob(type, data, options = {}) {
    return this.queues.blockchain.add(type, data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      ...options,
    });
  }

  /**
   * Add job to analytics queue
   */
  async addAnalyticsJob(type, data, options = {}) {
    return this.queues.analytics.add(type, data, options);
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const stats = {};

    for (const [name, queue] of Object.entries(this.queues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats[name] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    }

    return stats;
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(grace = 86400000) {
    // grace = 24 hours in milliseconds
    for (const queue of Object.values(this.queues)) {
      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
    }

    logger.info('Old jobs cleaned');
  }

  /**
   * Close all queues
   */
  async close() {
    for (const queue of Object.values(this.queues)) {
      await queue.close();
    }

    logger.info('All job queues closed');
  }
}

module.exports = new JobQueue();

