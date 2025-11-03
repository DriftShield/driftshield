const marketService = require('../../services/marketService');
const logger = require('../../utils/logger');

module.exports = {
  /**
   * Update market odds
   */
  async updateOdds(job) {
    const { marketId } = job.data;

    logger.info('Updating market odds job', { marketId });

    try {
      const odds = await marketService.calculateOdds(marketId);

      return { success: true, odds };
    } catch (error) {
      logger.error('Failed to update market odds', {
        marketId,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Resolve market
   */
  async resolveMarket(job) {
    const { marketId } = job.data;

    logger.info('Resolving market job', { marketId });

    try {
      const oracleService = require('../../services/oracleService');
      const { db } = require('../../db');

      const result = await oracleService.resolveMarket(marketId, db);

      return { success: true, outcome: result.outcome };
    } catch (error) {
      logger.error('Failed to resolve market', {
        marketId,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Distribute payouts
   */
  async distributePayouts(job) {
    const { marketId, outcome } = job.data;

    logger.info('Distributing payouts job', { marketId, outcome });

    try {
      const oracleService = require('../../services/oracleService');
      const { db } = require('../../db');

      await oracleService.distributePayouts(marketId, outcome, db);

      return { success: true };
    } catch (error) {
      logger.error('Failed to distribute payouts', {
        marketId,
        error: error.message,
      });
      throw error;
    }
  },
};

