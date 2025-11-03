const express = require('express');
const walletService = require('../services/walletService');
const { authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /wallet/balance
 * Get user's balance
 */
router.get(
  '/balance',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const balance = await walletService.getUserBalance(userId);

    res.json({ balance });
  }),
);

/**
 * POST /wallet/deposit
 * Initiate deposit
 */
router.post(
  '/deposit',
  authRequired,
  validators.initiateDeposit,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { amount } = req.body;

    const result = await walletService.initiateDeposit(userId, parseInt(amount, 10));

    res.json({
      message: 'Deposit initiated',
      ...result,
    });
  }),
);

/**
 * POST /wallet/withdraw
 * Initiate withdrawal
 */
router.post(
  '/withdraw',
  authRequired,
  validators.initiateWithdrawal,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { amount, destinationAddress } = req.body;

    const result = await walletService.initiateWithdrawal(
      userId,
      parseInt(amount, 10),
      destinationAddress,
      req.app.locals.db,
    );

    logger.info('Withdrawal initiated', { userId, amount, destinationAddress });

    res.json({
      message: 'Withdrawal initiated',
      ...result,
    });
  }),
);

/**
 * GET /wallet/transactions
 * Get transaction history
 */
router.get(
  '/transactions',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type, from, to, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [userId];

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (from) {
      params.push(from);
      query += ` AND created_at >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const transactions = await req.app.locals.db.any(query, params);

    res.json({
      transactions,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  }),
);

/**
 * POST /wallet/sync
 * Sync balance with blockchain
 */
router.post(
  '/sync',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const walletAddress = req.user.wallet_address;

    const result = await walletService.syncBalance(userId, walletAddress);

    res.json({
      message: 'Balance synced successfully',
      ...result,
    });
  }),
);

module.exports = router;

