const { userBalances, transactions } = require('../db');
const { redis } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');
const logger = require('../utils/logger');

const USDC_MINT = new PublicKey(process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mainnet
const BALANCE_CACHE_TTL = 60; // 1 minute

class WalletService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );
  }

  /**
   * Get user balance with caching
   */
  async getUserBalance(userId) {
    const cacheKey = `balance:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database
    const balance = await userBalances.findByUser(userId);

    if (!balance) {
      // Create balance record
      const newBalance = await userBalances.create({ user_id: userId });
      await redis.setex(cacheKey, BALANCE_CACHE_TTL, JSON.stringify(newBalance));
      return newBalance;
    }

    await redis.setex(cacheKey, BALANCE_CACHE_TTL, JSON.stringify(balance));

    return balance;
  }

  /**
   * Sync balance with blockchain
   */
  async syncBalance(userId, walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Get USDC token account
      const tokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey,
      );

      // Get token balance
      const accountInfo = await getAccount(this.connection, tokenAccount);
      const onChainBalance = Number(accountInfo.amount);

      // Get database balance
      const dbBalance = await userBalances.findByUser(userId);

      if (!dbBalance) {
        logger.error('User balance not found', { userId });
        return null;
      }

      // Calculate expected on-chain balance
      const expectedBalance = dbBalance.available_balance +
        dbBalance.locked_in_markets +
        dbBalance.locked_in_insurance +
        dbBalance.pending_withdrawals;

      // Check for discrepancy
      if (Math.abs(onChainBalance - expectedBalance) > 1000) { // Allow 0.001 USDC difference
        logger.warn('Balance mismatch detected', {
          userId,
          onChainBalance,
          expectedBalance,
          difference: onChainBalance - expectedBalance,
        });

        // Reconcile (in production, this would trigger alerts)
        // For now, we trust the database
      }

      // Update last synced timestamp
      await redis.del(`balance:${userId}`);

      return {
        onChainBalance,
        dbBalance,
        synced: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Balance sync failed', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Initiate deposit
   */
  async initiateDeposit(userId, amount) {
    logger.info('Initiating deposit', { userId, amount });

    // Create pending transaction
    const transaction = await transactions.create({
      user_id: userId,
      type: 'deposit',
      amount,
      status: 'pending',
    });

    // Return deposit instructions
    return {
      transactionId: transaction.id,
      amount,
      depositAddress: process.env.PLATFORM_USDC_ADDRESS,
      instructions: 'Send USDC to the deposit address. Your balance will be updated automatically.',
      estimatedConfirmationTime: '30 seconds',
    };
  }

  /**
   * Process confirmed deposit
   */
  async processDeposit(signature, userId, amount, db) {
    logger.info('Processing deposit', { signature, userId, amount });

    try {
      // Verify transaction on Solana
      const confirmed = await this.verifyTransaction(signature);

      if (!confirmed) {
        throw new ValidationError('Transaction not confirmed');
      }

      // Get current balance
      const balance = await userBalances.findByUser(userId);
      const balanceBefore = balance ? balance.available_balance : 0;

      // Update user balance
      await db.none(
        `UPDATE user_balances SET
          available_balance = available_balance + $1,
          total_deposited = total_deposited + $1,
          last_synced_at = NOW(),
          updated_at = NOW()
         WHERE user_id = $2`,
        [amount, userId],
      );

      // Update transaction
      await transactions.create({
        user_id: userId,
        type: 'deposit',
        amount,
        solana_signature: signature,
        status: 'confirmed',
        balance_before: balanceBefore,
        balance_after: balanceBefore + amount,
      });

      // Invalidate cache
      await redis.del(`balance:${userId}`);

      logger.info('Deposit processed successfully', { userId, amount, signature });

      // Send notification
      const notificationService = require('./notificationService');
      await notificationService.createNotification({
        user_id: userId,
        type: 'deposit_confirmed',
        title: 'Deposit Confirmed',
        message: `Your deposit of ${amount / 1e6} USDC has been confirmed`,
        priority: 'normal',
      });

      return { success: true, newBalance: balanceBefore + amount };
    } catch (error) {
      logger.error('Deposit processing failed', { signature, error: error.message });
      throw error;
    }
  }

  /**
   * Initiate withdrawal
   */
  async initiateWithdrawal(userId, amount, destinationAddress, db) {
    logger.info('Initiating withdrawal', { userId, amount, destinationAddress });

    // Validate amount
    if (amount <= 0) {
      throw new ValidationError('Invalid amount');
    }

    // Validate destination address
    try {
      new PublicKey(destinationAddress);
    } catch (error) {
      throw new ValidationError('Invalid destination address');
    }

    // Get balance
    const balance = await userBalances.findByUser(userId);

    if (!balance || balance.available_balance < amount) {
      throw new ValidationError('Insufficient balance');
    }

    // Deduct from available, add to pending
    await db.none(
      `UPDATE user_balances SET
        available_balance = available_balance - $1,
        pending_withdrawals = pending_withdrawals + $1,
        updated_at = NOW()
       WHERE user_id = $2`,
      [amount, userId],
    );

    // Create transaction
    const transaction = await transactions.create({
      user_id: userId,
      type: 'withdrawal',
      amount,
      status: 'pending',
      metadata: { destinationAddress },
    });

    // Invalidate cache
    await redis.del(`balance:${userId}`);

    logger.info('Withdrawal initiated', { transactionId: transaction.id });

    return {
      transactionId: transaction.id,
      amount,
      destinationAddress,
      status: 'pending',
      estimatedTime: '5-10 minutes',
    };
  }

  /**
   * Process withdrawal
   */
  async processWithdrawal(transactionId, signature, db) {
    const transaction = await transactions.findById(transactionId);

    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    // Verify transaction
    const confirmed = await this.verifyTransaction(signature);

    if (!confirmed) {
      throw new ValidationError('Transaction not confirmed');
    }

    // Update transaction
    await db.none(
      'UPDATE transactions SET solana_signature = $1, status = $2, confirmed_at = NOW() WHERE id = $3',
      [signature, 'confirmed', transactionId],
    );

    // Update balance
    await db.none(
      `UPDATE user_balances SET
        pending_withdrawals = pending_withdrawals - $1,
        total_withdrawn = total_withdrawn + $1,
        updated_at = NOW()
       WHERE user_id = $2`,
      [transaction.amount, transaction.user_id],
    );

    // Invalidate cache
    await redis.del(`balance:${transaction.user_id}`);

    logger.info('Withdrawal processed', { transactionId, signature });

    // Send notification
    const notificationService = require('./notificationService');
    await notificationService.createNotification({
      user_id: transaction.user_id,
      type: 'withdrawal_confirmed',
      title: 'Withdrawal Confirmed',
      message: `Your withdrawal of ${transaction.amount / 1e6} USDC has been confirmed`,
      priority: 'normal',
    });

    return { success: true, signature };
  }

  /**
   * Verify Solana transaction
   */
  async verifyTransaction(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (status && status.value) {
        return status.value.confirmationStatus === 'confirmed' ||
               status.value.confirmationStatus === 'finalized';
      }

      return false;
    } catch (error) {
      logger.error('Transaction verification failed', { signature, error: error.message });
      return false;
    }
  }

  /**
   * Calculate locked funds
   */
  async calculateLockedFunds(userId, db) {
    // Calculate locked in markets
    const marketLocked = await db.oneOrNone(
      `SELECT COALESCE(SUM(stake_no_drift + stake_drift), 0) as total
       FROM positions p
       JOIN markets m ON p.market_id = m.id
       WHERE p.user_id = $1 AND m.status = 'active' AND p.is_claimed = false`,
      [userId],
    );

    // Calculate locked in insurance
    const insuranceLocked = await db.oneOrNone(
      `SELECT COALESCE(SUM(coverage_amount), 0) as total
       FROM insurance_policies
       WHERE owner_id = $1 AND status = 'active' AND end_date > NOW()`,
      [userId],
    );

    return {
      lockedInMarkets: parseInt(marketLocked?.total || 0, 10),
      lockedInInsurance: parseInt(insuranceLocked?.total || 0, 10),
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId, filters = {}) {
    const { type, limit = 50, offset = 0 } = filters;

    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [userId];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await redis.db.any(query, params);

    return result;
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(userId) {
    return transactions.findByUser(userId).filter((t) => t.status === 'pending');
  }

  /**
   * Invalidate balance cache
   */
  async invalidateBalanceCache(userId) {
    await redis.del(`balance:${userId}`);
  }

  /**
   * Get platform balance statistics
   */
  async getPlatformStats(db) {
    const stats = await db.one(`
      SELECT
        COALESCE(SUM(available_balance), 0) as total_available,
        COALESCE(SUM(locked_in_markets), 0) as total_locked_markets,
        COALESCE(SUM(locked_in_insurance), 0) as total_locked_insurance,
        COALESCE(SUM(available_balance + locked_in_markets + locked_in_insurance), 0) as total_tvl,
        COALESCE(SUM(total_deposited), 0) as total_deposits,
        COALESCE(SUM(total_withdrawn), 0) as total_withdrawals,
        COUNT(*) as total_users
      FROM user_balances
    `);

    return {
      totalAvailable: parseInt(stats.total_available, 10),
      totalLockedMarkets: parseInt(stats.total_locked_markets, 10),
      totalLockedInsurance: parseInt(stats.total_locked_insurance, 10),
      totalTVL: parseInt(stats.total_tvl, 10),
      totalDeposits: parseInt(stats.total_deposits, 10),
      totalWithdrawals: parseInt(stats.total_withdrawals, 10),
      totalUsers: parseInt(stats.total_users, 10),
    };
  }
}

module.exports = new WalletService();

