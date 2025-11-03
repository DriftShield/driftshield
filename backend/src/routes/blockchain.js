const express = require('express');
const router = express.Router();
const solanaService = require('../services/solanaService');
const { authRequired } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/blockchain/test
 * Test blockchain connectivity
 */
router.get('/test', async (req, res) => {
  try {
    const tests = {
      connection: false,
      programs: {
        modelRegistry: false,
        insurance: false,
        predictionMarket: false,
      },
      timestamp: new Date().toISOString(),
    };

    // Test 1: Check connection
    try {
      const balance = await solanaService.getBalance('11111111111111111111111111111111'); // System program
      tests.connection = true;
    } catch (error) {
      tests.connectionError = error.message;
    }

    // Test 2: Verify programs exist
    try {
      const modelRegistry = await solanaService.connection.getAccountInfo(
        solanaService.programIds.modelRegistry
      );
      tests.programs.modelRegistry = modelRegistry !== null;

      const insurance = await solanaService.connection.getAccountInfo(
        solanaService.programIds.insurance
      );
      tests.programs.insurance = insurance !== null;

      const predictionMarket = await solanaService.connection.getAccountInfo(
        solanaService.programIds.predictionMarket
      );
      tests.programs.predictionMarket = predictionMarket !== null;
    } catch (error) {
      tests.programsError = error.message;
    }

    res.json({
      success: true,
      network: solanaService.network,
      tests,
    });
  } catch (error) {
    console.error('Blockchain test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/blockchain/transaction/:signature
 * Get transaction details
 */
router.get('/transaction/:signature', async (req, res) => {
  try {
    const { signature } = req.params;
    const result = await solanaService.verifyTransaction(signature);

    res.json({
      success: true,
      transaction: result,
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/blockchain/balance/:address
 * Get wallet balance
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await solanaService.getBalance(address);

    res.json({
      success: true,
      address,
      balance,
      network: solanaService.network,
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/blockchain/transactions/:address
 * Get recent transactions for address
 */
router.get(
  '/transactions/:address',
  authRequired,
  async (req, res) => {
    try {
      const { address } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const transactions = await solanaService.getWalletTransactions(address, limit);

      res.json({
        success: true,
        address,
        transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error('Transactions fetch error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/blockchain/monitor-transaction
 * Monitor transaction until confirmed
 */
router.post(
  '/monitor-transaction',
  authRequired,
  asyncHandler(async (req, res) => {
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Signature is required',
      });
    }

    const result = await solanaService.monitorTransaction(signature);

    res.json({
      success: result.success,
      signature,
      status: result.status,
      error: result.error,
    });
  })
);

/**
 * GET /api/blockchain/program-info
 * Get deployed program information
 */
router.get('/program-info', async (req, res) => {
  try {
    res.json({
      success: true,
      network: solanaService.network,
      programs: {
        modelRegistry: {
          programId: solanaService.programIds.modelRegistry.toString(),
          name: 'Model Registry',
        },
        insurance: {
          programId: solanaService.programIds.insurance.toString(),
          name: 'Insurance',
        },
        predictionMarket: {
          programId: solanaService.programIds.predictionMarket.toString(),
          name: 'Prediction Market',
        },
      },
    });
  } catch (error) {
    console.error('Program info error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
