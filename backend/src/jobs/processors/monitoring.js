const modelService = require('../../services/modelService');
const oracleService = require('../../services/oracleService');
const { db } = require('../../db');
const logger = require('../../utils/logger');

module.exports = {
  /**
   * Process monitoring receipt
   */
  async processReceipt(job) {
    const { modelId, receiptData } = job.data;

    logger.info('Processing monitoring receipt job', { modelId });

    try {
      const result = await modelService.processMonitoringReceipt(modelId, receiptData);

      return { success: true, receipt: result.receipt };
    } catch (error) {
      logger.error('Failed to process monitoring receipt', {
        modelId,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Update model metrics
   */
  async updateMetrics(job) {
    const { modelId } = job.data;

    logger.info('Updating model metrics job', { modelId });

    try {
      const metrics = await modelService.getModelMetrics(modelId, '24h');

      return { success: true, metrics };
    } catch (error) {
      logger.error('Failed to update model metrics', {
        modelId,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Check drift threshold
   */
  async checkDriftThreshold(job) {
    const { modelId, metrics } = job.data;

    logger.info('Checking drift threshold job', { modelId });

    try {
      const model = await modelService.getModel(modelId);

      if (metrics.drift_percentage > model.drift_threshold_percent) {
        // Send drift warning
        const notificationService = require('../../services/notificationService');
        await notificationService.sendDriftWarning(modelId, metrics);
      }

      return { success: true, driftDetected: metrics.drift_percentage > model.drift_threshold_percent };
    } catch (error) {
      logger.error('Failed to check drift threshold', {
        modelId,
        error: error.message,
      });
      throw error;
    }
  },
};

