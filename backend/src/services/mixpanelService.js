const Mixpanel = require('mixpanel');
const logger = require('../utils/logger');

class MixpanelService {
  constructor() {
    if (process.env.MIXPANEL_TOKEN) {
      this.mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);
    }
  }

  /**
   * Track event
   */
  track(userId, eventName, properties = {}) {
    if (!this.mixpanel) {
      return;
    }

    try {
      this.mixpanel.track(eventName, {
        distinct_id: userId,
        ...properties,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Mixpanel event tracked', { eventName, userId });
    } catch (error) {
      logger.error('Mixpanel tracking failed', {
        eventName,
        error: error.message,
      });
    }
  }

  /**
   * Identify user
   */
  identify(userId, properties = {}) {
    if (!this.mixpanel) {
      return;
    }

    try {
      this.mixpanel.people.set(userId, properties);

      logger.debug('Mixpanel user identified', { userId });
    } catch (error) {
      logger.error('Mixpanel identify failed', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Increment property
   */
  increment(userId, property, value = 1) {
    if (!this.mixpanel) {
      return;
    }

    try {
      this.mixpanel.people.increment(userId, property, value);
    } catch (error) {
      logger.error('Mixpanel increment failed', {
        userId,
        property,
        error: error.message,
      });
    }
  }

  // Event tracking helpers
  trackUserSignup(userId, walletAddress) {
    this.track(userId, 'user_signup', { walletAddress });
    this.identify(userId, { $created: new Date().toISOString() });
  }

  trackWalletConnected(userId, walletAddress) {
    this.track(userId, 'wallet_connected', { walletAddress });
  }

  trackModelRegistered(userId, modelId, modelType) {
    this.track(userId, 'model_registered', { modelId, modelType });
    this.increment(userId, 'models_count');
  }

  trackMarketCreated(userId, marketId, modelId) {
    this.track(userId, 'market_created', { marketId, modelId });
    this.increment(userId, 'markets_created');
  }

  trackBetPlaced(userId, marketId, side, amount) {
    this.track(userId, 'bet_placed', { marketId, side, amount });
    this.increment(userId, 'bets_placed');
  }

  trackInsurancePurchased(userId, policyId, modelId, premium) {
    this.track(userId, 'insurance_purchased', { policyId, modelId, premium });
    this.increment(userId, 'policies_purchased');
  }

  trackWinningsClaimed(userId, marketId, amount) {
    this.track(userId, 'winnings_claimed', { marketId, amount });
    this.increment(userId, 'total_winnings', amount);
  }

  trackModelDriftDetected(userId, modelId, driftPercentage) {
    this.track(userId, 'model_drift_detected', { modelId, driftPercentage });
  }
}

module.exports = new MixpanelService();

