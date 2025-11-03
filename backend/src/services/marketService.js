const { markets, positions } = require('../db');
const { redis } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const ODDS_CACHE_TTL = 30; // 30 seconds

class MarketService {
  /**
   * Get market by ID
   */
  async getMarket(marketId) {
    const cacheKey = `market:${marketId}:details`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const market = await markets.findById(marketId);

    if (!market) {
      throw new NotFoundError('Market');
    }

    await redis.setex(cacheKey, 30, JSON.stringify(market));

    return market;
  }

  /**
   * Get active markets
   */
  async getActiveMarkets(limit = 50, offset = 0) {
    return markets.findActive(limit, offset);
  }

  /**
   * Get markets for a model
   */
  async getMarketsByModel(modelId) {
    return markets.findByModel(modelId);
  }

  /**
   * Create new market
   */
  async createMarket(data) {
    logger.info('Creating new market', { modelId: data.model_id, creator: data.creator_id });

    // Validate resolution date is in the future
    const resolutionDate = new Date(data.resolution_date);
    if (resolutionDate <= new Date()) {
      throw new ValidationError('Resolution date must be in the future');
    }

    const market = await markets.create(data);

    logger.info('Market created', { marketId: market.id });

    // Invalidate cache
    await this.invalidateMarketCache(market.id);

    return market;
  }

  /**
   * Place bet in market
   */
  async placeBet(marketId, userId, side, amount) {
    logger.info('Placing bet', { marketId, userId, side, amount });

    // Get market
    const market = await this.getMarket(marketId);

    if (market.status !== 'active') {
      throw new ValidationError('Market is not active');
    }

    if (new Date(market.resolution_date) <= new Date()) {
      throw new ValidationError('Market has expired');
    }

    // Calculate current odds before bet
    const currentOdds = await this.calculateOdds(marketId);

    // Update stakes
    const noDriftStake = side === 'no_drift' ? amount : 0;
    const driftStake = side === 'drift' ? amount : 0;

    await markets.updateStakes(marketId, noDriftStake, driftStake);

    // Get or create position
    let position = await positions.findByMarketAndUser(marketId, userId);

    if (position) {
      // Update existing position
      const newNoDriftStake = position.stake_no_drift + noDriftStake;
      const newDriftStake = position.stake_drift + driftStake;

      // Calculate new average odds
      const newAvgOddsNoDrift = side === 'no_drift'
        ? (position.stake_no_drift * position.avg_odds_no_drift + amount * currentOdds.no_drift) /
          newNoDriftStake
        : position.avg_odds_no_drift;

      const newAvgOddsDrift = side === 'drift'
        ? (position.stake_drift * position.avg_odds_drift + amount * currentOdds.drift) / newDriftStake
        : position.avg_odds_drift;

      position = await positions.update(
        marketId,
        userId,
        newNoDriftStake,
        newDriftStake,
        newAvgOddsNoDrift,
        newAvgOddsDrift,
      );
    } else {
      // Create new position
      position = await positions.create({
        solana_pubkey: `pos_${marketId}_${userId}`, // This should come from Solana program
        market_id: marketId,
        user_id: userId,
        stake_no_drift: noDriftStake,
        stake_drift: driftStake,
        avg_odds_no_drift: side === 'no_drift' ? currentOdds.no_drift : null,
        avg_odds_drift: side === 'drift' ? currentOdds.drift : null,
      });

      // Increment participant count
      await req.app.locals.db.none(
        'UPDATE markets SET total_participants = total_participants + 1 WHERE id = $1',
        [marketId],
      );
    }

    // Record bet in position history
    await req.app.locals.db.none(
      `INSERT INTO position_history (position_id, bet_side, amount, odds, solana_signature)
       VALUES ($1, $2, $3, $4, $5)`,
      [position.id, side, amount, currentOdds[side === 'no_drift' ? 'no_drift' : 'drift'],
       `sig_${Date.now()}`], // Should be actual Solana signature
    );

    // Invalidate caches
    await this.invalidateMarketCache(marketId);

    logger.info('Bet placed successfully', { marketId, userId, positionId: position.id });

    return {
      position,
      newOdds: await this.calculateOdds(marketId),
    };
  }

  /**
   * Calculate odds for a market
   */
  async calculateOdds(marketId) {
    const cacheKey = `market:${marketId}:odds`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const market = await this.getMarket(marketId);

    const totalPool = parseInt(market.total_stake_no_drift, 10) + parseInt(market.total_stake_drift, 10);

    if (totalPool === 0) {
      // No bets placed yet, return even odds
      return {
        no_drift: 2.0,
        drift: 2.0,
        totalPool: 0,
      };
    }

    // Calculate implied probabilities
    const noDriftProb = parseInt(market.total_stake_no_drift, 10) / totalPool;
    const driftProb = parseInt(market.total_stake_drift, 10) / totalPool;

    // Calculate odds (payout multiplier)
    const odds = {
      no_drift: noDriftProb > 0 ? 1 / noDriftProb : 1.01,
      drift: driftProb > 0 ? 1 / driftProb : 1.01,
      totalPool,
      noDriftStake: parseInt(market.total_stake_no_drift, 10),
      driftStake: parseInt(market.total_stake_drift, 10),
    };

    // Apply platform fee (5%)
    odds.no_drift *= 0.95;
    odds.drift *= 0.95;

    // Cache odds
    await redis.setex(cacheKey, ODDS_CACHE_TTL, JSON.stringify(odds));

    return odds;
  }

  /**
   * Resolve market
   */
  async resolveMarket(marketId, outcome, finalDrift, receiptUrl, signature) {
    logger.info('Resolving market', { marketId, outcome, finalDrift });

    const market = await this.getMarket(marketId);

    if (market.status !== 'active') {
      throw new ValidationError('Market is not active');
    }

    // Resolve market
    const resolved = await markets.resolve(marketId, outcome, finalDrift, receiptUrl, signature);

    // Get all positions
    const allPositions = await req.app.locals.db.any(
      'SELECT * FROM positions WHERE market_id = $1',
      [marketId],
    );

    // Calculate payouts
    const totalPool = parseInt(market.total_stake_no_drift, 10) + parseInt(market.total_stake_drift, 10);
    const platformFee = totalPool * 0.05; // 5% fee
    const payoutPool = totalPool - platformFee;

    let winningStake;
    if (outcome === 'no_drift') {
      winningStake = parseInt(market.total_stake_no_drift, 10);
    } else if (outcome === 'drift') {
      winningStake = parseInt(market.total_stake_drift, 10);
    } else {
      // Invalid outcome, refund all
      winningStake = totalPool;
    }

    // Update positions with payout amounts
    for (const position of allPositions) {
      let payout = 0;

      if (outcome === 'no_drift' && position.stake_no_drift > 0) {
        payout = (position.stake_no_drift / winningStake) * payoutPool;
      } else if (outcome === 'drift' && position.stake_drift > 0) {
        payout = (position.stake_drift / winningStake) * payoutPool;
      } else if (outcome === 'invalid') {
        payout = position.stake_no_drift + position.stake_drift;
      }

      if (payout > 0) {
        await req.app.locals.db.none(
          'UPDATE positions SET payout_amount = $1 WHERE id = $2',
          [Math.floor(payout), position.id],
        );

        // Update user balance
        await req.app.locals.db.none(
          `UPDATE user_balances SET
           claimable_winnings = claimable_winnings + $1,
           locked_in_markets = locked_in_markets - $2
           WHERE user_id = $3`,
          [Math.floor(payout), position.stake_no_drift + position.stake_drift, position.user_id],
        );
      } else {
        // User lost, just unlock from markets
        await req.app.locals.db.none(
          'UPDATE user_balances SET locked_in_markets = locked_in_markets - $1 WHERE user_id = $2',
          [position.stake_no_drift + position.stake_drift, position.user_id],
        );
      }
    }

    // Invalidate caches
    await this.invalidateMarketCache(marketId);

    logger.info('Market resolved successfully', { marketId, outcome });

    return resolved;
  }

  /**
   * Claim winnings
   */
  async claimWinnings(userId, marketId) {
    logger.info('Claiming winnings', { userId, marketId });

    const position = await positions.findByMarketAndUser(marketId, userId);

    if (!position) {
      throw new NotFoundError('Position');
    }

    if (position.is_claimed) {
      throw new ValidationError('Winnings already claimed');
    }

    if (!position.payout_amount || position.payout_amount <= 0) {
      throw new ValidationError('No winnings to claim');
    }

    // Claim position
    await positions.claim(position.id, position.payout_amount);

    // Update user balance
    await req.app.locals.db.none(
      `UPDATE user_balances SET
       available_balance = available_balance + $1,
       claimable_winnings = claimable_winnings - $1,
       total_earned = total_earned + $1
       WHERE user_id = $2`,
      [position.payout_amount, userId],
    );

    logger.info('Winnings claimed', { userId, amount: position.payout_amount });

    return {
      amount: position.payout_amount,
      position,
    };
  }

  /**
   * Get user's positions
   */
  async getUserPositions(userId) {
    return positions.findByUser(userId);
  }

  /**
   * Get unclaimed winnings
   */
  async getUnclaimedWinnings(userId) {
    return positions.findUnclaimed(userId);
  }

  /**
   * Invalidate market cache
   */
  async invalidateMarketCache(marketId) {
    const keys = [
      `market:${marketId}:details`,
      `market:${marketId}:odds`,
    ];

    await Promise.all(keys.map((key) => redis.del(key)));
  }
}

module.exports = new MarketService();
