const express = require('express');
const { users } = require('../db');
const { generateAuthChallenge, verifySolanaSignature } = require('../utils/crypto');
const { generateToken, generateRefreshToken, authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validator');
const { strictLimiter } = require('../middleware/rateLimiter');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /auth/challenge
 * Request authentication challenge for wallet
 */
router.post(
  '/challenge',
  strictLimiter,
  validators.authChallenge,
  asyncHandler(async (req, res) => {
    const { walletAddress } = req.body;

    // Generate challenge
    const challenge = generateAuthChallenge(walletAddress);

    // Store challenge in Redis (expires in 5 minutes)
    const challengeKey = `auth:challenge:${walletAddress}`;
    await redis.setex(challengeKey, 300, JSON.stringify(challenge));

    logger.info(`Challenge generated for wallet: ${walletAddress}`);

    res.json({
      message: challenge.message,
      nonce: challenge.nonce,
      timestamp: challenge.timestamp,
    });
  }),
);

/**
 * POST /auth/verify
 * Verify signed challenge and get JWT token
 */
router.post(
  '/verify',
  strictLimiter,
  validators.authVerify,
  asyncHandler(async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    // Get challenge from Redis
    const challengeKey = `auth:challenge:${walletAddress}`;
    const storedChallengeStr = await redis.get(challengeKey);

    if (!storedChallengeStr) {
      return res.status(400).json({ error: 'Challenge expired or not found. Please request a new challenge.' });
    }

    const storedChallenge = JSON.parse(storedChallengeStr);

    // Verify the message matches
    if (message !== storedChallenge.message) {
      return res.status(400).json({ error: 'Message mismatch' });
    }

    // Verify signature
    const isValid = verifySolanaSignature(message, signature, walletAddress);

    if (!isValid) {
      logger.warn(`Failed signature verification for wallet: ${walletAddress}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Delete used challenge
    await redis.del(challengeKey);

    // Find or create user
    let user = await users.findByWallet(walletAddress);

    if (!user) {
      // Create new user
      user = await users.create({
        wallet_address: walletAddress,
        username: `user_${walletAddress.substring(0, 8)}`,
        display_name: `User ${walletAddress.substring(0, 8)}`,
      });

      // Create user settings
      await req.app.locals.db.none(
        'INSERT INTO user_settings (user_id) VALUES ($1)',
        [user.id],
      );

      // Create user balance
      await req.app.locals.db.none(
        'INSERT INTO user_balances (user_id) VALUES ($1)',
        [user.id],
      );

      logger.info(`New user created: ${user.id}`);
    }

    // Update last login
    await users.updateLastLogin(user.id);

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in Redis
    const refreshKey = `auth:refresh:${user.id}`;
    await redis.setex(refreshKey, 7 * 24 * 60 * 60, refreshToken); // 7 days

    logger.info(`User authenticated: ${user.id}`);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
    });
  }),
);

/**
 * POST /auth/refresh
 * Refresh JWT token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const jwt = require('jsonwebtoken');
    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if refresh token exists in Redis
    const refreshKey = `auth:refresh:${decoded.userId}`;
    const storedToken = await redis.get(refreshKey);

    if (storedToken !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found or revoked' });
    }

    // Get user
    const user = await users.findById(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new access token
    const newToken = generateToken(user);

    res.json({ token: newToken });
  }),
);

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = req.user;

    // Get balance
    const balance = await req.app.locals.db.oneOrNone(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [user.id],
    );

    res.json({
      id: user.id,
      walletAddress: user.wallet_address,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      twitterHandle: user.twitter_handle,
      emailVerified: user.email_verified,
      role: user.role,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      balance: balance ? {
        available: balance.available_balance,
        lockedInMarkets: balance.locked_in_markets,
        lockedInInsurance: balance.locked_in_insurance,
        claimableWinnings: balance.claimable_winnings,
        total: balance.available_balance + balance.locked_in_markets +
               balance.locked_in_insurance + balance.claimable_winnings,
      } : null,
    });
  }),
);

/**
 * POST /auth/logout
 * Invalidate session
 */
router.post(
  '/logout',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = req.userId;

    // Delete refresh token
    const refreshKey = `auth:refresh:${userId}`;
    await redis.del(refreshKey);

    logger.info(`User logged out: ${userId}`);

    res.json({ message: 'Logged out successfully' });
  }),
);

module.exports = router;
