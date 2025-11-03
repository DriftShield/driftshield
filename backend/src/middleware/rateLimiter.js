const rateLimit = require('express-rate-limit');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Redis store for rate limiting
 */
class RedisStore {
  constructor(options = {}) {
    this.client = options.client || redis;
    this.prefix = options.prefix || 'ratelimit:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  async increment(key) {
    const fullKey = this.prefix + key;
    const current = await this.client.incr(fullKey);

    if (current === 1) {
      await this.client.expire(fullKey, 60); // 1 minute window
    }

    const ttl = await this.client.ttl(fullKey);

    return {
      totalHits: current,
      resetTime: new Date(Date.now() + ttl * 1000),
    };
  }

  async decrement(key) {
    const fullKey = this.prefix + key;
    await this.client.decr(fullKey);
  }

  async resetKey(key) {
    const fullKey = this.prefix + key;
    await this.client.del(fullKey);
  }
}

/**
 * Rate limiter for public endpoints
 */
const publicLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'ratelimit:public:' }),
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limiter for authenticated endpoints
 */
const authLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 300, // 300 requests per minute for authenticated users
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'ratelimit:auth:' }),
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.userId || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for user: ${req.userId || req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limiter for API keys
 */
const apiKeyLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: async (req) => {
    // Use custom rate limit from API key
    return req.apiKey?.rate_limit_per_minute || 60;
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'ratelimit:apikey:' }),
  keyGenerator: (req) => {
    return req.apiKey?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`API key rate limit exceeded: ${req.apiKey?.id}`);
    res.status(429).json({
      error: 'API rate limit exceeded',
      message: 'You have exceeded your API rate limit.',
      retryAfter: 60,
    });
  },
});

/**
 * Strict rate limiter for sensitive endpoints (login, registration)
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'ratelimit:strict:' }),
  keyGenerator: (req) => {
    return req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many attempts',
      message: 'Too many attempts. Please try again later.',
      retryAfter: 900, // 15 minutes
    });
  },
});

/**
 * Custom rate limiter with Redis
 */
async function customRateLimit(key, maxRequests, windowSeconds) {
  const fullKey = `ratelimit:custom:${key}`;

  const current = await redis.incr(fullKey);

  if (current === 1) {
    await redis.expire(fullKey, windowSeconds);
  }

  if (current > maxRequests) {
    const ttl = await redis.ttl(fullKey);
    return {
      allowed: false,
      current,
      limit: maxRequests,
      resetTime: Date.now() + ttl * 1000,
    };
  }

  return {
    allowed: true,
    current,
    limit: maxRequests,
  };
}

module.exports = {
  publicLimiter,
  authLimiter,
  apiKeyLimiter,
  strictLimiter,
  customRateLimit,
  RedisStore,
};
