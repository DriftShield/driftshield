const { models } = require('../db');
const { redis } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const MODEL_CACHE_TTL = 300; // 5 minutes

class ModelService {
  /**
   * Get model by ID with caching
   */
  async getModel(modelId) {
    // Check cache first
    const cacheKey = `model:${modelId}:details`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database
    const model = await models.findById(modelId);

    if (!model) {
      throw new NotFoundError('Model');
    }

    // Cache it
    await redis.setex(cacheKey, MODEL_CACHE_TTL, JSON.stringify(model));

    return model;
  }

  /**
   * Get models by owner
   */
  async getModelsByOwner(ownerId, limit = 50, offset = 0) {
    return models.findByOwner(ownerId, limit, offset);
  }

  /**
   * Get active models
   */
  async getActiveModels(limit = 50, offset = 0) {
    return models.findActive(limit, offset);
  }

  /**
   * Create new model
   */
  async createModel(data) {
    logger.info('Creating new model', { ownerId: data.owner_id, name: data.name });

    // Validate baseline metrics
    if (!data.baseline_metrics || Object.keys(data.baseline_metrics).length === 0) {
      throw new ValidationError('Baseline metrics are required');
    }

    // Create model
    const model = await models.create(data);

    logger.info('Model created', { modelId: model.id });

    // Invalidate cache
    await this.invalidateModelCache(model.id);

    return model;
  }

  /**
   * Update model
   */
  async updateModel(modelId, data) {
    const model = await this.getModel(modelId);

    const updated = await models.update(modelId, data);

    logger.info('Model updated', { modelId });

    // Invalidate cache
    await this.invalidateModelCache(modelId);

    return updated;
  }

  /**
   * Process monitoring receipt
   */
  async processMonitoringReceipt(modelId, receiptData) {
    logger.info('Processing monitoring receipt', { modelId });

    const { metrics, drift_percentage, shadow_drive_url, receipt_hash } = receiptData;

    // Determine if drift detected
    const model = await this.getModel(modelId);
    const driftDetected = drift_percentage > model.drift_threshold_percent;

    // Store receipt
    const receipt = await req.app.locals.db.one(
      `INSERT INTO monitoring_receipts
       (model_id, timestamp, metrics, drift_percentage, drift_detected,
        shadow_drive_url, receipt_hash, solana_signature)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [modelId, metrics, drift_percentage, driftDetected, shadow_drive_url,
       receipt_hash, receiptData.solana_signature],
    );

    // Determine health status
    let healthStatus = 'healthy';
    if (drift_percentage > model.drift_threshold_percent * 2) {
      healthStatus = 'critical';
    } else if (drift_percentage > model.drift_threshold_percent) {
      healthStatus = 'warning';
    }

    // Update model
    await models.updateMonitoring(modelId, metrics, drift_percentage, healthStatus);

    // Cache latest receipt
    const receiptCacheKey = `model:${modelId}:latest_receipt`;
    await redis.setex(receiptCacheKey, 60, JSON.stringify(receipt));

    // Invalidate model cache
    await this.invalidateModelCache(modelId);

    logger.info('Monitoring receipt processed', {
      modelId,
      driftDetected,
      healthStatus,
    });

    return {
      receipt,
      driftDetected,
      healthStatus,
    };
  }

  /**
   * Get model metrics
   */
  async getModelMetrics(modelId, period = '24h') {
    const cacheKey = `model:${modelId}:metrics_${period}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate time range
    let hoursBack = 24;
    if (period === '7d') hoursBack = 168;
    if (period === '30d') hoursBack = 720;

    const receipts = await req.app.locals.db.any(
      `SELECT * FROM monitoring_receipts
       WHERE model_id = $1
       AND timestamp > NOW() - INTERVAL '${hoursBack} hours'
       ORDER BY timestamp DESC`,
      [modelId],
    );

    // Aggregate metrics
    const metrics = {
      period,
      totalReceipts: receipts.length,
      driftEvents: receipts.filter((r) => r.drift_detected).length,
      averageDrift: receipts.reduce((sum, r) => sum + parseFloat(r.drift_percentage), 0) / receipts.length || 0,
      maxDrift: Math.max(...receipts.map((r) => parseFloat(r.drift_percentage))) || 0,
      receipts: receipts.slice(0, 100), // Limit to 100 most recent
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(metrics));

    return metrics;
  }

  /**
   * Get drift analysis
   */
  async getDriftAnalysis(modelId, timeRange = 7) {
    const receipts = await req.app.locals.db.any(
      `SELECT * FROM monitoring_receipts
       WHERE model_id = $1
       AND timestamp > NOW() - INTERVAL '${timeRange} days'
       ORDER BY timestamp ASC`,
      [modelId],
    );

    if (receipts.length === 0) {
      return {
        message: 'No monitoring data available',
        receipts: 0,
      };
    }

    // Calculate drift trend
    const driftValues = receipts.map((r) => parseFloat(r.drift_percentage));
    const trend = this.calculateTrend(driftValues);

    // Identify drifted features
    const driftedFeatures = {};
    receipts.forEach((receipt) => {
      if (receipt.feature_drift) {
        Object.entries(receipt.feature_drift).forEach(([feature, drift]) => {
          if (!driftedFeatures[feature]) {
            driftedFeatures[feature] = [];
          }
          driftedFeatures[feature].push(drift);
        });
      }
    });

    // Calculate average drift per feature
    const featureAnalysis = Object.entries(driftedFeatures).map(([feature, values]) => ({
      feature,
      avgDrift: values.reduce((sum, v) => sum + v, 0) / values.length,
      maxDrift: Math.max(...values),
      occurrences: values.length,
    }));

    // Sort by average drift
    featureAnalysis.sort((a, b) => b.avgDrift - a.avgDrift);

    return {
      timeRange: `${timeRange} days`,
      totalReceipts: receipts.length,
      driftEvents: receipts.filter((r) => r.drift_detected).length,
      avgDrift: driftValues.reduce((sum, v) => sum + v, 0) / driftValues.length,
      maxDrift: Math.max(...driftValues),
      trend, // 'increasing', 'decreasing', 'stable'
      topDriftedFeatures: featureAnalysis.slice(0, 10),
    };
  }

  /**
   * Calculate trend from values
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + v * (i + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Invalidate model cache
   */
  async invalidateModelCache(modelId) {
    const keys = [
      `model:${modelId}:details`,
      `model:${modelId}:latest_receipt`,
      `model:${modelId}:metrics_24h`,
      `model:${modelId}:metrics_7d`,
      `model:${modelId}:metrics_30d`,
    ];

    await Promise.all(keys.map((key) => redis.del(key)));
  }

  /**
   * Generate monitoring agent configuration
   */
  async generateAgentConfig(modelId) {
    const model = await this.getModel(modelId);

    const config = {
      model_id: model.id,
      solana_pubkey: model.solana_pubkey,
      monitoring_endpoint: model.monitoring_endpoint,
      api_auth_method: model.api_auth_method,
      baseline_metrics: model.baseline_metrics,
      drift_threshold: model.drift_threshold_percent,
      monitoring_frequency_hours: model.monitoring_frequency_hours,
      webhook_url: model.webhook_url,
      backend_api_url: process.env.API_URL || 'http://localhost:3001',
    };

    return config;
  }
}

module.exports = new ModelService();
