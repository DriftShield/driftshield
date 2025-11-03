const express = require('express');
const { users } = require('../db');
const { authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validator');

const router = express.Router();

/**
 * GET /users/:userId
 * Get user profile
 */
router.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive fields
    const { id, wallet_address, username, display_name, avatar_url, bio, twitter_handle, created_at } = user;

    res.json({
      user: {
        id,
        walletAddress: wallet_address,
        username,
        displayName: display_name,
        avatarUrl: avatar_url,
        bio,
        twitterHandle: twitter_handle,
        createdAt: created_at,
      },
    });
  }),
);

/**
 * PATCH /users/:userId
 * Update user profile
 */
router.patch(
  '/:userId',
  authRequired,
  validators.updateUser,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await users.update(userId, req.body);

    res.json({
      message: 'Profile updated successfully',
      user: updated,
    });
  }),
);

/**
 * GET /users/:userId/models
 * Get user's models
 */
router.get(
  '/:userId/models',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const models = await req.app.locals.db.any(
      'SELECT * FROM models WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, parseInt(limit, 10), parseInt(offset, 10)],
    );

    res.json({ models });
  }),
);

/**
 * GET /users/:userId/positions
 * Get user's market positions
 */
router.get(
  '/:userId/positions',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const positions = await req.app.locals.db.any(
      `SELECT p.*, m.question, m.status, m.resolution_date
       FROM positions p
       JOIN markets m ON p.market_id = m.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId],
    );

    res.json({ positions });
  }),
);

/**
 * GET /users/:userId/balance
 * Get user's balance
 */
router.get(
  '/:userId/balance',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const balance = await req.app.locals.db.oneOrNone(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId],
    );

    res.json({ balance });
  }),
);

/**
 * GET /users/:userId/transactions
 * Get user's transaction history
 */
router.get(
  '/:userId/transactions',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { limit = 50, offset = 0 } = req.query;

    const transactions = await req.app.locals.db.any(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, parseInt(limit, 10), parseInt(offset, 10)],
    );

    res.json({ transactions });
  }),
);

/**
 * GET /users/:userId/notifications
 * Get user's notifications
 */
router.get(
  '/:userId/notifications',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { unread, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [userId];

    if (unread === 'true') {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const notifications = await req.app.locals.db.any(query, params);

    res.json({ notifications });
  }),
);

/**
 * PATCH /users/:userId/notifications/:notificationId
 * Mark notification as read
 */
router.patch(
  '/:userId/notifications/:notificationId',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId, notificationId } = req.params;

    // Check authorization
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await req.app.locals.db.none(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [notificationId, userId],
    );

    res.json({ message: 'Notification marked as read' });
  }),
);

/**
 * POST /users/:userId/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post(
  '/:userId/notifications/mark-all-read',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await req.app.locals.db.none(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [userId],
    );

    res.json({ message: 'All notifications marked as read' });
  }),
);

/**
 * GET /users/:userId/settings
 * Get user settings
 */
router.get(
  '/:userId/settings',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const settings = await req.app.locals.db.oneOrNone(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId],
    );

    res.json({ settings });
  }),
);

/**
 * PATCH /users/:userId/settings
 * Update user settings
 */
router.patch(
  '/:userId/settings',
  authRequired,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check authorization
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { notifications, theme, language, currencyDisplay, timezone, publicProfile, showOnLeaderboard } = req.body;

    const updates = [];
    const params = [userId];

    if (notifications) {
      params.push(notifications);
      updates.push(`notifications = $${params.length}`);
    }

    if (theme) {
      params.push(theme);
      updates.push(`theme = $${params.length}`);
    }

    if (language) {
      params.push(language);
      updates.push(`language = $${params.length}`);
    }

    if (currencyDisplay) {
      params.push(currencyDisplay);
      updates.push(`currency_display = $${params.length}`);
    }

    if (timezone) {
      params.push(timezone);
      updates.push(`timezone = $${params.length}`);
    }

    if (typeof publicProfile === 'boolean') {
      params.push(publicProfile);
      updates.push(`public_profile = $${params.length}`);
    }

    if (typeof showOnLeaderboard === 'boolean') {
      params.push(showOnLeaderboard);
      updates.push(`show_on_leaderboard = $${params.length}`);
    }

    updates.push('updated_at = NOW()');

    const query = `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $1 RETURNING *`;

    const settings = await req.app.locals.db.one(query, params);

    res.json({
      message: 'Settings updated successfully',
      settings,
    });
  }),
);

module.exports = router;

