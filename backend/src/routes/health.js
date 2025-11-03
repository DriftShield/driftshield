const express = require('express');
const { db } = require('../db');
const { redis } = require('../config/redis');
const { Connection } = require('@solana/web3.js');
const os = require('os');

const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
  try {
    await db.one('SELECT 1');
    await redis.ping();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with all services
 */
router.get('/detailed', async (req, res) => {
  const services = {
    database: { status: 'unknown', latency: 0 },
    redis: { status: 'unknown', latency: 0 },
    solana: { status: 'unknown', latency: 0 },
  };

  let overallStatus = 'ok';

  // Check Database
  try {
    const dbStart = Date.now();
    await db.one('SELECT 1');
    services.database.status = 'ok';
    services.database.latency = Date.now() - dbStart;
  } catch (error) {
    services.database.status = 'error';
    services.database.error = error.message;
    overallStatus = 'degraded';
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    await redis.ping();
    services.redis.status = 'ok';
    services.redis.latency = Date.now() - redisStart;
  } catch (error) {
    services.redis.status = 'error';
    services.redis.error = error.message;
    overallStatus = 'degraded';
  }

  // Check Solana
  try {
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );
    const solanaStart = Date.now();
    await connection.getSlot();
    services.solana.status = 'ok';
    services.solana.latency = Date.now() - solanaStart;
  } catch (error) {
    services.solana.status = 'error';
    services.solana.error = error.message;
    overallStatus = 'degraded';
  }

  // System metrics
  const metrics = {
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      rss: process.memoryUsage().rss,
      percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100).toFixed(2),
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      loadAverage: os.loadavg(),
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      memoryUsagePercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2),
    },
  };

  // Queue stats
  let queueStats = null;
  try {
    const jobQueue = require('../jobs/queue');
    queueStats = await jobQueue.getStats();
  } catch (error) {
    // Queue might not be initialized yet
  }

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    metrics,
    queues: queueStats,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  const statusCode = overallStatus === 'ok' ? 200 : 503;
  res.status(statusCode).json(response);
});

/**
 * GET /health/readiness
 * Readiness probe for Kubernetes
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check critical services
    await db.one('SELECT 1');
    await redis.ping();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
    });
  }
});

/**
 * GET /health/liveness
 * Liveness probe for Kubernetes
 */
router.get('/liveness', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;

