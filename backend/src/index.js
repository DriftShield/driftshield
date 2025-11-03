require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { db } = require('./config/database');
const { redis } = require('./config/redis');
const { verifyConnection } = require('./config/solana');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const modelsRoutes = require('./routes/models');
const marketsRoutes = require('./routes/markets');
const insuranceRoutes = require('./routes/insurance');
const walletRoutes = require('./routes/wallet');
const usersRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const adminRoutes = require('./routes/admin');
const blockchainRoutes = require('./routes/blockchain');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// Middleware
// ============================================================================

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Configure based on your needs
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: logger.stream }));

// Attach db to app locals for access in routes
app.locals.db = db;
app.locals.redis = redis;

// ============================================================================
// Routes
// ============================================================================

// Health check routes
app.use('/health', healthRoutes);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/models', modelsRoutes);
app.use('/api/v1/markets', marketsRoutes);
app.use('/api/v1/insurance', insuranceRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/blockchain', blockchainRoutes);

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'DriftShield API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/v1/auth/challenge': 'Request authentication challenge',
        'POST /api/v1/auth/verify': 'Verify signed challenge and get JWT',
        'POST /api/v1/auth/refresh': 'Refresh JWT token',
        'GET /api/v1/auth/me': 'Get current user',
        'POST /api/v1/auth/logout': 'Logout',
      },
      models: {
        'GET /api/v1/models': 'List all models',
        'POST /api/v1/models': 'Register new model',
        'GET /api/v1/models/:modelId': 'Get model details',
        'PATCH /api/v1/models/:modelId': 'Update model',
        'DELETE /api/v1/models/:modelId': 'Deactivate model',
      },
      markets: {
        'GET /api/v1/markets': 'List all markets',
        'POST /api/v1/markets': 'Create new market',
        'GET /api/v1/markets/:marketId': 'Get market details',
        'POST /api/v1/markets/:marketId/bet': 'Place bet',
        'POST /api/v1/markets/:marketId/claim': 'Claim winnings',
      },
      insurance: {
        'GET /api/v1/insurance/policies': 'List user policies',
        'POST /api/v1/insurance/quote': 'Get insurance quote',
        'POST /api/v1/insurance/policies': 'Purchase policy',
        'POST /api/v1/insurance/policies/:policyId/claim': 'Submit claim',
      },
      wallet: {
        'GET /api/v1/wallet/balance': 'Get balance',
        'POST /api/v1/wallet/deposit': 'Initiate deposit',
        'POST /api/v1/wallet/withdraw': 'Initiate withdrawal',
        'GET /api/v1/wallet/transactions': 'Get transaction history',
      },
      analytics: {
        'GET /api/v1/analytics/portfolio': 'Get portfolio analytics',
        'GET /api/v1/analytics/models/:modelId': 'Get model performance',
        'GET /api/v1/analytics/leaderboard/:type': 'Get leaderboard',
      },
      admin: {
        'GET /api/v1/admin/users': 'List all users (admin only)',
        'GET /api/v1/admin/system/health': 'System health status',
        'GET /api/v1/admin/system/metrics': 'System metrics',
        'POST /api/v1/admin/models/:modelId/force-monitor': 'Force monitoring cycle',
        'POST /api/v1/admin/markets/:marketId/force-resolve': 'Force market resolution',
        'GET /api/v1/admin/logs': 'Get system logs',
        'POST /api/v1/admin/broadcast': 'Send broadcast notification',
      },
    },
    documentation: 'https://docs.driftshield.io',
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'DriftShield API',
    version: '1.0.0',
    description: 'ML Model Drift Monitoring & Prediction Markets',
    documentation: '/api-docs',
  });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// Server Initialization
// ============================================================================

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await db.one('SELECT NOW()');
    logger.info('✓ Database connected');

    // Test Redis connection
    logger.info('Testing Redis connection...');
    await redis.ping();
    logger.info('✓ Redis connected');

    // Test Solana connection
    logger.info('Testing Solana connection...');
    const solanaConnected = await verifyConnection();
    if (solanaConnected) {
      logger.info('✓ Solana connected');
    } else {
      logger.warn('⚠ Solana connection failed (non-blocking)');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║              DriftShield Backend API                  ║
║                                                       ║
║  Server running on port ${PORT}                        ║
║  Environment: ${process.env.NODE_ENV || 'development'}                     ║
║  Documentation: http://localhost:${PORT}/api-docs      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // Initialize WebSocket server
    const wsServer = require('./websocket/server');
    wsServer.initialize(server);
    wsServer.startHeartbeat();
    logger.info('✓ WebSocket server initialized');

    // Initialize background jobs
    const jobQueue = require('./jobs/queue');
    await jobQueue.initialize();
    logger.info('✓ Background jobs initialized');

    // Start cron jobs
    const cronJobs = require('./jobs/cron');
    cronJobs.start();
    logger.info('✓ Cron jobs started');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
