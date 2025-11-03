const express = require('express');
const modelService = require('../services/modelService');
const { authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /models
 * List all models with filters and pagination
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      owner,
      status = 'active',
      type,
      sort = 'created_at',
      limit = 50,
      offset = 0,
    } = req.query;

    let query = 'SELECT * FROM models WHERE 1=1';
    const params = [];

    if (owner) {
      params.push(owner);
      query += ` AND owner_id = $${params.length}`;
    }

    if (status === 'active') {
      query += ' AND is_active = true';
    }

    if (type) {
      params.push(type);
      query += ` AND model_type = $${params.length}`;
    }

    query += ` ORDER BY ${sort} DESC`;

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const models = await req.app.locals.db.any(query, params);

    res.json({
      models,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        total: models.length,
      },
    });
  }),
);

/**
 * POST /models
 * Register new model
 */
router.post(
  '/',
  authRequired,
  validators.createModel,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const modelData = {
      ...req.body,
      owner_id: userId,
    };

    const model = await modelService.createModel(modelData);

    logger.info('Model created', { modelId: model.id, userId });

    res.status(201).json({
      message: 'Model registered successfully',
      model,
    });
  }),
);

/**
 * GET /models/:modelId
 * Get model details
 */
router.get(
  '/:modelId',
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;

    const model = await modelService.getModel(modelId);

    res.json({ model });
  }),
);

/**
 * PATCH /models/:modelId
 * Update model configuration
 */
router.patch(
  '/:modelId',
  authRequired,
  validators.updateModel,
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    const userId = req.user.id;

    // Check ownership
    const model = await modelService.getModel(modelId);

    if (model.owner_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await modelService.updateModel(modelId, req.body);

    res.json({
      message: 'Model updated successfully',
      model: updated,
    });
  }),
);

/**
 * DELETE /models/:modelId
 * Deactivate model
 */
router.delete(
  '/:modelId',
  authRequired,
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    const userId = req.user.id;

    // Check ownership
    const model = await modelService.getModel(modelId);

    if (model.owner_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check for active markets or insurance
    const activeMarkets = await req.app.locals.db.any(
      'SELECT COUNT(*) as count FROM markets WHERE model_id = $1 AND status = $2',
      [modelId, 'active'],
    );

    if (activeMarkets[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot deactivate model with active markets',
      });
    }

    await req.app.locals.db.none(
      'UPDATE models SET is_active = false, updated_at = NOW() WHERE id = $1',
      [modelId],
    );

    res.json({ message: 'Model deactivated successfully' });
  }),
);

/**
 * GET /models/:modelId/receipts
 * Get monitoring receipts for model
 */
router.get(
  '/:modelId/receipts',
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    const { from, to, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM monitoring_receipts WHERE model_id = $1';
    const params = [modelId];

    if (from) {
      params.push(from);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += ' ORDER BY timestamp DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const receipts = await req.app.locals.db.any(query, params);

    res.json({
      receipts,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  }),
);

/**
 * GET /models/:modelId/receipts/:receiptId
 * Get specific receipt details
 */
router.get(
  '/:modelId/receipts/:receiptId',
  asyncHandler(async (req, res) => {
    const { receiptId } = req.params;

    const receipt = await req.app.locals.db.oneOrNone(
      'SELECT * FROM monitoring_receipts WHERE id = $1',
      [receiptId],
    );

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ receipt });
  }),
);

/**
 * GET /models/:modelId/metrics
 * Get aggregated metrics for model
 */
router.get(
  '/:modelId/metrics',
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    const { period = '24h' } = req.query;

    const metrics = await modelService.getModelMetrics(modelId, period);

    res.json({ metrics });
  }),
);

/**
 * GET /models/:modelId/drift-analysis
 * Get drift analysis for model
 */
router.get(
  '/:modelId/drift-analysis',
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    const { timeRange = 7 } = req.query;

    const analysis = await modelService.getDriftAnalysis(modelId, parseInt(timeRange, 10));

    res.json({ analysis });
  }),
);

/**
 * GET /models/:modelId/markets
 * Get markets related to model
 */
router.get(
  '/:modelId/markets',
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;

    const markets = await req.app.locals.db.any(
      'SELECT * FROM markets WHERE model_id = $1 ORDER BY created_at DESC',
      [modelId],
    );

    res.json({ markets });
  }),
);

/**
 * POST /models/:modelId/monitoring-agent/config
 * Generate monitoring agent configuration file
 */
router.post(
  '/:modelId/monitoring-agent/config',
  authRequired,
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    const userId = req.user.id;

    // Check ownership
    const model = await modelService.getModel(modelId);

    if (model.owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const config = await modelService.generateAgentConfig(modelId);

    res.json({
      message: 'Configuration generated successfully',
      config,
    });
  }),
);

module.exports = router;

