const jwt = require('jsonwebtoken');
const { users } = require('../db');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    walletAddress: user.wallet_address,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '24h',
  });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware: Require authentication
 */
async function authRequired(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from database
    const user = await users.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware: Require specific role
 */
function roleRequired(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Middleware: Require resource ownership
 */
function ownerRequired(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const ownerId = await getOwnerId(req);

      if (ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You do not own this resource' });
      }

      next();
    } catch (error) {
      logger.error('Owner check error:', error);
      return res.status(500).json({ error: 'Failed to verify ownership' });
    }
  };
}

/**
 * Middleware: Optional authentication (attach user if token present)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        const user = await users.findById(decoded.userId);
        if (user && user.is_active) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }

    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
}

/**
 * Middleware: API Key authentication
 */
async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Hash the API key to compare with stored hash
    const crypto = require('../utils/crypto');
    const keyHash = await crypto.hashApiKey(apiKey);

    // Find API key in database
    const apiKeyRecord = await req.app.locals.db.oneOrNone(
      'SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true',
      [keyHash],
    );

    if (!apiKeyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check if expired
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      return res.status(401).json({ error: 'API key expired' });
    }

    // Get user
    const user = await users.findById(apiKeyRecord.user_id);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Update last used
    await req.app.locals.db.none(
      'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = $1',
      [apiKeyRecord.id],
    );

    // Attach user and API key info
    req.user = user;
    req.userId = user.id;
    req.apiKey = apiKeyRecord;

    next();
  } catch (error) {
    logger.error('API key auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authRequired,
  roleRequired,
  ownerRequired,
  optionalAuth,
  apiKeyAuth,
};
