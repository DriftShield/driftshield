const express = require('express');
const insuranceService = require('../services/insuranceService');
const { authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /insurance/policies
 * List user's insurance policies
 */
router.get(
  '/policies',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { status, model, sort = 'created_at', limit = 50 } = req.query;

    let query = 'SELECT * FROM insurance_policies WHERE owner_id = $1';
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (model) {
      params.push(model);
      query += ` AND model_id = $${params.length}`;
    }

    query += ` ORDER BY ${sort} DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit, 10));

    const policies = await req.app.locals.db.any(query, params);

    res.json({ policies });
  }),
);

/**
 * POST /insurance/quote
 * Get insurance quote
 */
router.post(
  '/quote',
  authRequired,
  validators.insuranceQuote,
  asyncHandler(async (req, res) => {
    const { modelId, coverageAmount, duration } = req.body;

    const quote = await insuranceService.calculateQuote(
      modelId,
      parseInt(coverageAmount, 10),
      parseInt(duration, 10),
    );

    res.json({ quote });
  }),
);

/**
 * POST /insurance/policies
 * Purchase insurance policy
 */
router.post(
  '/policies',
  authRequired,
  validators.purchaseInsurance,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const policyData = req.body;

    const policy = await insuranceService.purchasePolicy(
      userId,
      policyData,
      req.app.locals.db,
    );

    logger.info('Insurance policy purchased', {
      userId,
      policyId: policy.id,
      modelId: policyData.modelId,
    });

    res.status(201).json({
      message: 'Insurance policy purchased successfully',
      policy,
    });
  }),
);

/**
 * GET /insurance/policies/:policyId
 * Get policy details
 */
router.get(
  '/policies/:policyId',
  authRequired,
  asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const userId = req.user.id;

    const policy = await req.app.locals.db.oneOrNone(
      'SELECT * FROM insurance_policies WHERE id = $1',
      [policyId],
    );

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    if (policy.owner_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ policy });
  }),
);

/**
 * POST /insurance/policies/:policyId/claim
 * Submit insurance claim
 */
router.post(
  '/policies/:policyId/claim',
  authRequired,
  asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const userId = req.user.id;
    const { proof } = req.body;

    const result = await insuranceService.submitClaim(
      userId,
      policyId,
      proof,
      req.app.locals.db,
    );

    logger.info('Insurance claim submitted', { userId, policyId });

    res.json({
      message: 'Claim submitted and processed successfully',
      policy: result,
    });
  }),
);

/**
 * POST /insurance/policies/:policyId/renew
 * Renew policy
 */
router.post(
  '/policies/:policyId/renew',
  authRequired,
  asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const userId = req.user.id;

    // Check ownership
    const policy = await req.app.locals.db.oneOrNone(
      'SELECT * FROM insurance_policies WHERE id = $1',
      [policyId],
    );

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    if (policy.owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const newPolicy = await insuranceService.renewPolicy(policyId, req.app.locals.db);

    if (!newPolicy) {
      return res.status(400).json({ error: 'Failed to renew policy. Check balance.' });
    }

    res.json({
      message: 'Policy renewed successfully',
      policy: newPolicy,
    });
  }),
);

/**
 * DELETE /insurance/policies/:policyId
 * Cancel policy
 */
router.delete(
  '/policies/:policyId',
  authRequired,
  asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const userId = req.user.id;

    const result = await insuranceService.cancelPolicy(userId, policyId, req.app.locals.db);

    logger.info('Policy cancelled', { userId, policyId, refund: result.refund });

    res.json({
      message: 'Policy cancelled successfully',
      refund: result.refund,
    });
  }),
);

module.exports = router;

