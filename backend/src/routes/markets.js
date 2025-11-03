const express = require('express');
const marketService = require('../services/marketService');
const { authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /markets
 * List all markets with filters and pagination
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      status,
      model,
      creator,
      sort = 'created_at',
      limit = 50,
      offset = 0,
    } = req.query;

    let query = 'SELECT * FROM markets WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (model) {
      params.push(model);
      query += ` AND model_id = $${params.length}`;
    }

    if (creator) {
      params.push(creator);
      query += ` AND creator_id = $${params.length}`;
    }

    query += ` ORDER BY ${sort} DESC`;

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const markets = await req.app.locals.db.any(query, params);

    res.json({
      markets,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  }),
);

/**
 * POST /markets
 * Create new market
 */
router.post(
  '/',
  authRequired,
  validators.createMarket,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const marketData = {
      ...req.body,
      creator_id: userId,
    };

    const market = await marketService.createMarket(marketData);

    logger.info('Market created', { marketId: market.id, userId });

    res.status(201).json({
      message: 'Market created successfully',
      market,
    });
  }),
);

/**
 * GET /markets/:marketId
 * Get market details
 */
router.get(
  '/:marketId',
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;

    const market = await marketService.getMarket(marketId);

    res.json({ market });
  }),
);

/**
 * GET /markets/:marketId/odds
 * Get current odds for market
 */
router.get(
  '/:marketId/odds',
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;

    const odds = await marketService.calculateOdds(marketId);

    res.json({ odds });
  }),
);

/**
 * GET /markets/:marketId/positions
 * Get all positions in market
 */
router.get(
  '/:marketId/positions',
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;

    const positions = await req.app.locals.db.any(
      `SELECT p.*, u.username, u.display_name
       FROM positions p
       JOIN users u ON p.user_id = u.id
       WHERE p.market_id = $1
       ORDER BY (p.stake_no_drift + p.stake_drift) DESC`,
      [marketId],
    );

    res.json({ positions });
  }),
);

/**
 * POST /markets/:marketId/bet
 * Place bet in market
 */
router.post(
  '/:marketId/bet',
  authRequired,
  validators.placeBet,
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;
    const userId = req.user.id;
    const { side, amount } = req.body;

    // Validate side
    if (!['no_drift', 'drift'].includes(side)) {
      return res.status(400).json({ error: 'Invalid bet side' });
    }

    // Validate amount
    const amountInt = parseInt(amount, 10);
    if (amountInt <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Check balance
    const balance = await req.app.locals.db.oneOrNone(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId],
    );

    if (!balance || balance.available_balance < amountInt) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Place bet
    const result = await marketService.placeBet(marketId, userId, side, amountInt);

    // Update user balance
    await req.app.locals.db.none(
      `UPDATE user_balances SET
        available_balance = available_balance - $1,
        locked_in_markets = locked_in_markets + $1
       WHERE user_id = $2`,
      [amountInt, userId],
    );

    logger.info('Bet placed', { marketId, userId, side, amount: amountInt });

    res.json({
      message: 'Bet placed successfully',
      position: result.position,
      newOdds: result.newOdds,
    });
  }),
);

/**
 * GET /markets/:marketId/history
 * Get bet history for market
 */
router.get(
  '/:marketId/history',
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const history = await req.app.locals.db.any(
      `SELECT ph.*, u.username, u.display_name
       FROM position_history ph
       JOIN positions p ON ph.position_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE p.market_id = $1
       ORDER BY ph.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [marketId, parseInt(limit, 10), parseInt(offset, 10)],
    );

    res.json({
      history,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  }),
);

/**
 * POST /markets/:marketId/resolve
 * Resolve market (oracle only)
 */
router.post(
  '/:marketId/resolve',
  authRequired,
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;

    // Check if user is oracle or admin
    if (req.user.role !== 'oracle' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only oracle can resolve markets' });
    }

    const { outcome, finalDrift, receiptUrl, signature } = req.body;

    const result = await marketService.resolveMarket(
      marketId,
      outcome,
      finalDrift,
      receiptUrl,
      signature,
    );

    logger.info('Market resolved', { marketId, outcome });

    res.json({
      message: 'Market resolved successfully',
      market: result,
    });
  }),
);

/**
 * POST /markets/:marketId/claim
 * Claim winnings from resolved market
 */
router.post(
  '/:marketId/claim',
  authRequired,
  asyncHandler(async (req, res) => {
    const { marketId } = req.params;
    const userId = req.user.id;

    const result = await marketService.claimWinnings(userId, marketId);

    logger.info('Winnings claimed', {
      marketId,
      userId,
      amount: result.amount,
    });

    res.json({
      message: 'Winnings claimed successfully',
      amount: result.amount,
      position: result.position,
    });
  }),
);

module.exports = router;

