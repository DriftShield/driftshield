const express = require('express');
const analyticsService = require('../services/analyticsService');
const { authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /analytics/portfolio
 * Get user's portfolio analytics
 */
router.get(
  '/portfolio',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const analytics = await analyticsService.getPortfolioAnalytics(userId, req.app.locals.db);

    res.json({ analytics });
  }),
);

/**
 * GET /analytics/models/:modelId
 * Get model performance analytics
 */
router.get(
  '/models/:modelId',
  asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    const { period = '30d' } = req.query;

    const performance = await analyticsService.getModelPerformance(
      modelId,
      period,
      req.app.locals.db,
    );

    res.json({ performance });
  }),
);

/**
 * GET /analytics/markets/performance
 * Get user's market performance analytics
 */
router.get(
  '/markets/performance',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const performance = await analyticsService.getUserMarketPerformance(
      userId,
      req.app.locals.db,
    );

    res.json({ performance });
  }),
);

/**
 * GET /analytics/platform/stats
 * Get platform-wide statistics
 */
router.get(
  '/platform/stats',
  asyncHandler(async (req, res) => {
    const stats = await analyticsService.getPlatformStats(req.app.locals.db);

    res.json({ stats });
  }),
);

/**
 * GET /analytics/leaderboard/:type
 * Get leaderboard data
 */
router.get(
  '/leaderboard/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { period = 'all_time' } = req.query;

    // Validate type
    if (!['top_predictors', 'top_models', 'biggest_wins'].includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    // Validate period
    if (!['weekly', 'monthly', 'all_time'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const leaderboard = await analyticsService.generateLeaderboard(
      type,
      period,
      req.app.locals.db,
    );

    res.json({ leaderboard, type, period });
  }),
);

module.exports = router;

