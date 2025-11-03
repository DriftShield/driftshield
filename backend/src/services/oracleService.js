const { models, markets } = require('../db');
const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class OracleService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );
  }

  /**
   * Fetch monitoring data from endpoint
   */
  async fetchMonitoringData(modelId, db) {
    logger.info('Fetching monitoring data', { modelId });

    const model = await models.findById(modelId);

    if (!model) {
      throw new Error('Model not found');
    }

    try {
      // Fetch data from monitoring endpoint
      const response = await axios.get(model.monitoring_endpoint, {
        headers: this.getAuthHeaders(model.api_auth_method, model.metadata),
        timeout: 30000,
      });

      const data = response.data;

      // Validate data structure
      if (!data.metrics) {
        throw new Error('Invalid monitoring data: missing metrics');
      }

      // Calculate drift percentage
      const driftPercentage = this.calculateDriftPercentage(
        model.baseline_metrics,
        data.metrics,
      );

      return {
        metrics: data.metrics,
        driftPercentage,
        dataQuality: data.dataQuality || null,
        featureDrift: data.featureDrift || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to fetch monitoring data', {
        modelId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate drift percentage between baseline and current metrics
   */
  calculateDriftPercentage(baselineMetrics, currentMetrics) {
    // Simple drift calculation: average percentage change of all metrics
    const metricNames = Object.keys(baselineMetrics);
    let totalDrift = 0;
    let count = 0;

    for (const metricName of metricNames) {
      const baseline = baselineMetrics[metricName];
      const current = currentMetrics[metricName];

      if (typeof baseline === 'number' && typeof current === 'number' && baseline !== 0) {
        const drift = Math.abs((current - baseline) / baseline) * 100;
        totalDrift += drift;
        count++;
      }
    }

    return count > 0 ? totalDrift / count : 0;
  }

  /**
   * Submit monitoring receipt to Shadow Drive
   */
  async submitReceiptToShadowDrive(modelId, receiptData) {
    logger.info('Submitting receipt to Shadow Drive', { modelId });

    try {
      const shadowDriveService = require('./shadowDriveService');

      // Ensure Shadow Drive is initialized
      await shadowDriveService.initialize();

      // Calculate receipt hash
      const receiptJson = JSON.stringify(receiptData);
      const receiptHash = crypto.createHash('sha256').update(receiptJson).digest('hex');

      // Add hash to receipt data
      const receiptWithHash = {
        ...receiptData,
        receipt_hash: receiptHash,
      };

      // Upload to Shadow Drive (real implementation)
      if (shadowDriveService.isAvailable()) {
        const uploadResult = await shadowDriveService.uploadReceipt(receiptWithHash, modelId);

        if (uploadResult.uploaded) {
          logger.info('Receipt uploaded to Shadow Drive successfully', {
            modelId,
            url: uploadResult.url,
            signature: uploadResult.signature,
          });

          return {
            url: uploadResult.url,
            hash: receiptHash,
            signature: uploadResult.signature,
            uploaded: true,
          };
        } else {
          logger.warn('Shadow Drive upload failed, using fallback URL', {
            modelId,
            reason: uploadResult.reason || uploadResult.error,
          });

          return {
            url: uploadResult.url,
            hash: receiptHash,
            uploaded: false,
          };
        }
      } else {
        // Fallback: Generate mock URL if Shadow Drive not configured
        logger.warn('Shadow Drive not available, using mock URL', { modelId });
        const mockUrl = `https://shdw-drive.genesysgo.net/receipts/${receiptHash}.json`;

        return {
          url: mockUrl,
          hash: receiptHash,
          uploaded: false,
        };
      }
    } catch (error) {
      logger.error('Failed to submit receipt to Shadow Drive', {
        modelId,
        error: error.message,
      });

      // Return fallback URL on error
      const receiptJson = JSON.stringify(receiptData);
      const receiptHash = crypto.createHash('sha256').update(receiptJson).digest('hex');
      const mockUrl = `https://shdw-drive.genesysgo.net/receipts/${receiptHash}.json`;

      return {
        url: mockUrl,
        hash: receiptHash,
        uploaded: false,
        error: error.message,
      };
    }
  }

  /**
   * Submit receipt on-chain
   */
  async submitReceiptOnChain(modelId, receiptData) {
    logger.info('Submitting receipt on-chain', { modelId });

    try {
      // In production, this would create a Solana transaction
      // For now, we'll generate a mock signature
      const signature = `sig_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // In production:
      // const program = await getProgram();
      // const tx = await program.methods
      //   .submitReceipt(receiptData)
      //   .accounts({ model: modelPubkey })
      //   .rpc();

      return signature;
    } catch (error) {
      logger.error('Failed to submit receipt on-chain', {
        modelId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process monitoring cycle for a model
   */
  async processMonitoringCycle(modelId, db) {
    logger.info('Processing monitoring cycle', { modelId });

    try {
      // Fetch monitoring data
      const monitoringData = await this.fetchMonitoringData(modelId, db);

      // Upload to Shadow Drive
      const { url, hash } = await this.submitReceiptToShadowDrive(modelId, monitoringData);

      // Submit on-chain
      const signature = await this.submitReceiptOnChain(modelId, {
        ...monitoringData,
        shadowDriveUrl: url,
        receiptHash: hash,
      });

      // Determine if drift detected
      const model = await models.findById(modelId);
      const driftDetected = monitoringData.driftPercentage > model.drift_threshold_percent;

      // Store receipt in database
      const receipt = await db.one(
        `INSERT INTO monitoring_receipts
         (model_id, timestamp, metrics, drift_percentage, drift_detected,
          data_quality_metrics, feature_drift, shadow_drive_url, receipt_hash, solana_signature)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          modelId,
          monitoringData.metrics,
          monitoringData.driftPercentage,
          driftDetected,
          monitoringData.dataQuality,
          monitoringData.featureDrift,
          url,
          hash,
          signature,
        ],
      );

      // Update model status
      let healthStatus = 'healthy';
      if (monitoringData.driftPercentage > model.drift_threshold_percent * 2) {
        healthStatus = 'critical';
      } else if (monitoringData.driftPercentage > model.drift_threshold_percent) {
        healthStatus = 'warning';
      }

      await db.none(
        `UPDATE models SET
          current_metrics = $2,
          last_monitored_at = NOW(),
          total_monitoring_cycles = total_monitoring_cycles + 1,
          health_status = $3,
          updated_at = NOW()
         WHERE id = $1`,
        [modelId, monitoringData.metrics, healthStatus],
      );

      // Send notifications if drift detected
      if (driftDetected) {
        const notificationService = require('./notificationService');
        await notificationService.sendDriftWarning(modelId, {
          drift_percentage: monitoringData.driftPercentage,
          threshold: model.drift_threshold_percent,
          severity: healthStatus,
        });
      }

      // Update related markets
      await this.updateRelatedMarkets(modelId, monitoringData.driftPercentage, db);

      logger.info('Monitoring cycle completed', {
        modelId,
        driftDetected,
        healthStatus,
        receiptId: receipt.id,
      });

      return {
        receipt,
        driftDetected,
        healthStatus,
      };
    } catch (error) {
      logger.error('Monitoring cycle failed', {
        modelId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update related markets with new monitoring data
   */
  async updateRelatedMarkets(modelId, latestDrift, db) {
    // Get active markets for this model
    const activeMarkets = await db.any(
      'SELECT * FROM markets WHERE model_id = $1 AND status = $2',
      [modelId, 'active'],
    );

    for (const market of activeMarkets) {
      // Check if market should be auto-resolved
      if (new Date(market.resolution_date) <= new Date()) {
        await this.resolveMarket(market.id, db);
      }
    }
  }

  /**
   * Resolve market
   */
  async resolveMarket(marketId, db) {
    logger.info('Resolving market', { marketId });

    const market = await markets.findById(marketId);

    if (!market || market.status !== 'active') {
      logger.warn('Market not found or not active', { marketId });
      return null;
    }

    try {
      // Get latest monitoring receipt for the model
      const latestReceipt = await db.oneOrNone(
        `SELECT * FROM monitoring_receipts
         WHERE model_id = $1
         AND timestamp <= $2
         ORDER BY timestamp DESC
         LIMIT 1`,
        [market.model_id, market.resolution_date],
      );

      if (!latestReceipt) {
        logger.error('No monitoring receipt found for market resolution', { marketId });
        // Resolve as invalid
        await markets.resolve(marketId, 'invalid', null, null, null);
        return { outcome: 'invalid' };
      }

      // Determine outcome
      const outcome = latestReceipt.drift_percentage >= market.drift_threshold_percent
        ? 'drift'
        : 'no_drift';

      // Submit resolution on-chain
      const signature = await this.submitMarketResolution(marketId, outcome, latestReceipt);

      // Resolve market in database
      await markets.resolve(
        marketId,
        outcome,
        latestReceipt.drift_percentage,
        latestReceipt.shadow_drive_url,
        signature,
      );

      // Calculate and distribute payouts
      await this.distributePayouts(marketId, outcome, db);

      logger.info('Market resolved', { marketId, outcome });

      // Notify participants
      await this.notifyMarketResolution(marketId, outcome, db);

      return { outcome, finalDrift: latestReceipt.drift_percentage };
    } catch (error) {
      logger.error('Market resolution failed', {
        marketId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Submit market resolution on-chain
   */
  async submitMarketResolution(marketId, outcome, receipt) {
    // In production, this would create a Solana transaction
    const signature = `resolution_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // In production:
    // const program = await getProgram();
    // const tx = await program.methods
    //   .resolveMarket(outcome)
    //   .accounts({ market: marketPubkey })
    //   .rpc();

    return signature;
  }

  /**
   * Distribute payouts after market resolution
   */
  async distributePayouts(marketId, outcome, db) {
    logger.info('Distributing payouts', { marketId, outcome });

    const market = await markets.findById(marketId);
    const positions = await db.any(
      'SELECT * FROM positions WHERE market_id = $1',
      [marketId],
    );

    const totalPool = parseInt(market.total_stake_no_drift, 10) +
                     parseInt(market.total_stake_drift, 10);
    const platformFee = Math.floor(totalPool * 0.05);
    const payoutPool = totalPool - platformFee;

    let winningStake = 0;

    if (outcome === 'no_drift') {
      winningStake = parseInt(market.total_stake_no_drift, 10);
    } else if (outcome === 'drift') {
      winningStake = parseInt(market.total_stake_drift, 10);
    } else {
      // Invalid - refund everyone
      winningStake = totalPool;
    }

    if (winningStake === 0) {
      logger.warn('No winning stake, no payouts to distribute', { marketId });
      return;
    }

    // Calculate and update payouts for each position
    for (const position of positions) {
      let payout = 0;

      if (outcome === 'no_drift' && position.stake_no_drift > 0) {
        payout = Math.floor((position.stake_no_drift / winningStake) * payoutPool);
      } else if (outcome === 'drift' && position.stake_drift > 0) {
        payout = Math.floor((position.stake_drift / winningStake) * payoutPool);
      } else if (outcome === 'invalid') {
        payout = position.stake_no_drift + position.stake_drift;
      }

      if (payout > 0) {
        // Update position
        await db.none(
          'UPDATE positions SET payout_amount = $1 WHERE id = $2',
          [payout, position.id],
        );

        // Update user balance
        await db.none(
          `UPDATE user_balances SET
            claimable_winnings = claimable_winnings + $1,
            locked_in_markets = locked_in_markets - $2
           WHERE user_id = $3`,
          [payout, position.stake_no_drift + position.stake_drift, position.user_id],
        );

        logger.info('Payout calculated', {
          positionId: position.id,
          userId: position.user_id,
          payout,
        });
      } else {
        // User lost, just unlock from markets
        await db.none(
          'UPDATE user_balances SET locked_in_markets = locked_in_markets - $1 WHERE user_id = $2',
          [position.stake_no_drift + position.stake_drift, position.user_id],
        );
      }
    }

    logger.info('Payouts distributed', { marketId, totalPayout: payoutPool });
  }

  /**
   * Notify market resolution
   */
  async notifyMarketResolution(marketId, outcome, db) {
    const positions = await db.any(
      'SELECT DISTINCT user_id FROM positions WHERE market_id = $1 AND payout_amount > 0',
      [marketId],
    );

    const notificationService = require('./notificationService');

    for (const pos of positions) {
      const position = await db.oneOrNone(
        'SELECT * FROM positions WHERE market_id = $1 AND user_id = $2',
        [marketId, pos.user_id],
      );

      if (position && position.payout_amount > 0) {
        await notificationService.sendWinningsAvailable(
          pos.user_id,
          marketId,
          position.payout_amount,
        );
      }
    }
  }

  /**
   * Get auth headers for monitoring endpoint
   */
  getAuthHeaders(authMethod, metadata) {
    const headers = {};

    if (authMethod === 'bearer' && metadata.bearerToken) {
      headers.Authorization = `Bearer ${metadata.bearerToken}`;
    } else if (authMethod === 'api_key' && metadata.apiKey) {
      headers['X-API-Key'] = metadata.apiKey;
    }

    return headers;
  }

  /**
   * Verify receipt integrity
   */
  async verifyReceipt(receiptUrl, receiptHash) {
    try {
      const response = await axios.get(receiptUrl);
      const receiptJson = JSON.stringify(response.data);
      const calculatedHash = crypto.createHash('sha256').update(receiptJson).digest('hex');

      return calculatedHash === receiptHash;
    } catch (error) {
      logger.error('Receipt verification failed', {
        receiptUrl,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Schedule market resolution jobs
   */
  async scheduleMarketResolutions(db) {
    // Get markets that need resolution
    const markets = await db.any(
      'SELECT * FROM markets WHERE status = $1 AND resolution_date <= NOW()',
      ['active'],
    );

    logger.info(`Found ${markets.length} markets to resolve`);

    for (const market of markets) {
      try {
        await this.resolveMarket(market.id, db);
      } catch (error) {
        logger.error('Failed to resolve market', {
          marketId: market.id,
          error: error.message,
        });
      }
    }

    return markets.length;
  }
}

module.exports = new OracleService();

