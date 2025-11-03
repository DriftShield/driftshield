const { insurancePolicies, models, userBalances, transactions } = require('../db');
const { redis } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class InsuranceService {
  /**
   * Calculate insurance quote
   */
  async calculateQuote(modelId, coverageAmount, durationDays) {
    logger.info('Calculating insurance quote', { modelId, coverageAmount, durationDays });

    // Get model
    const model = await models.findById(modelId);

    if (!model) {
      throw new NotFoundError('Model');
    }

    // Assess risk level based on model health
    const riskAssessment = await this.assessModelRisk(modelId);

    // Base premium calculation
    // Formula: (coverage * risk_multiplier * duration_multiplier) / 100
    const baseRate = 0.05; // 5% base
    const riskMultiplier = riskAssessment.riskMultiplier;
    const durationMultiplier = Math.sqrt(durationDays / 30); // Square root of months

    const premium = Math.floor(
      coverageAmount * baseRate * riskMultiplier * durationMultiplier,
    );

    return {
      coverageAmount,
      premium,
      durationDays,
      riskLevel: riskAssessment.riskLevel,
      riskScore: riskAssessment.riskScore,
      factors: riskAssessment.factors,
      driftThreshold: model.drift_threshold_percent,
    };
  }

  /**
   * Purchase insurance policy
   */
  async purchasePolicy(userId, policyData, db) {
    logger.info('Purchasing insurance policy', { userId, modelId: policyData.modelId });

    // Validate model ownership
    const model = await models.findById(policyData.modelId);

    if (!model) {
      throw new NotFoundError('Model');
    }

    if (model.owner_id !== userId) {
      throw new ValidationError('You can only insure your own models');
    }

    // Calculate quote
    const quote = await this.calculateQuote(
      policyData.modelId,
      policyData.coverageAmount,
      policyData.durationDays,
    );

    // Check user balance
    const balance = await userBalances.findByUser(userId);

    if (!balance || balance.available_balance < quote.premium) {
      throw new ValidationError('Insufficient balance');
    }

    // Calculate end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + policyData.durationDays);

    // Create policy
    const policy = await insurancePolicies.create({
      model_id: policyData.modelId,
      owner_id: userId,
      coverage_amount: policyData.coverageAmount,
      premium_paid: quote.premium,
      drift_threshold_percent: policyData.driftThreshold || model.drift_threshold_percent,
      end_date: endDate,
      auto_renew: policyData.autoRenew || false,
      solana_signature: policyData.signature || `sig_${Date.now()}`,
      metadata: { quote },
    });

    // Update user balance
    await db.none(
      `UPDATE user_balances SET
        available_balance = available_balance - $1,
        locked_in_insurance = locked_in_insurance + $2
       WHERE user_id = $3`,
      [quote.premium, policyData.coverageAmount, userId],
    );

    // Create transaction record
    await transactions.create({
      user_id: userId,
      type: 'insurance_purchase',
      amount: quote.premium,
      model_id: policyData.modelId,
      policy_id: policy.id,
      solana_signature: policy.solana_signature,
      status: 'confirmed',
    });

    logger.info('Insurance policy purchased', { policyId: policy.id });

    return policy;
  }

  /**
   * Submit insurance claim
   */
  async submitClaim(userId, policyId, proof, db) {
    logger.info('Submitting insurance claim', { userId, policyId });

    const policy = await insurancePolicies.findById(policyId);

    if (!policy) {
      throw new NotFoundError('Policy');
    }

    if (policy.owner_id !== userId) {
      throw new ValidationError('Not authorized');
    }

    if (policy.status !== 'active') {
      throw new ValidationError('Policy is not active');
    }

    // Verify drift threshold was breached
    const driftBreached = await this.verifyDriftBreach(
      policy.model_id,
      policy.drift_threshold_percent,
      proof,
      db,
    );

    if (!driftBreached) {
      throw new ValidationError('Drift threshold not breached');
    }

    // Submit claim
    const updated = await insurancePolicies.submitClaim(policyId, proof.marketId);

    // Auto-approve for now (in production, this would be reviewed)
    await this.processClaim(policyId, db);

    logger.info('Insurance claim submitted and approved', { policyId });

    return updated;
  }

  /**
   * Process insurance claim payout
   */
  async processClaim(policyId, db) {
    const policy = await insurancePolicies.findById(policyId);

    if (!policy) {
      throw new NotFoundError('Policy');
    }

    // Calculate payout (coverage amount)
    const payout = policy.coverage_amount;

    // Approve claim
    await insurancePolicies.approveClaim(policyId, payout);

    // Update user balance
    await db.none(
      `UPDATE user_balances SET
        available_balance = available_balance + $1,
        locked_in_insurance = locked_in_insurance - $2
       WHERE user_id = $3`,
      [payout, policy.coverage_amount, policy.owner_id],
    );

    // Create transaction record
    await transactions.create({
      user_id: policy.owner_id,
      type: 'insurance_claim',
      amount: payout,
      model_id: policy.model_id,
      policy_id: policy.id,
      status: 'confirmed',
    });

    logger.info('Insurance claim processed', { policyId, payout });

    return { payout, policy };
  }

  /**
   * Verify drift breach
   */
  async verifyDriftBreach(modelId, threshold, proof, db) {
    // If proof includes market ID, verify market resolution
    if (proof.marketId) {
      const market = await db.oneOrNone(
        'SELECT * FROM markets WHERE id = $1 AND model_id = $2',
        [proof.marketId, modelId],
      );

      if (market && market.status === 'resolved' && market.outcome === 'drift') {
        return market.final_drift_percentage >= threshold;
      }
    }

    // Otherwise, check latest monitoring receipt
    const latestReceipt = await db.oneOrNone(
      `SELECT * FROM monitoring_receipts
       WHERE model_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [modelId],
    );

    if (latestReceipt) {
      return latestReceipt.drift_percentage >= threshold;
    }

    return false;
  }

  /**
   * Assess model risk
   */
  async assessModelRisk(modelId, db) {
    // Get historical drift data
    const receipts = await db.any(
      `SELECT * FROM monitoring_receipts
       WHERE model_id = $1
       AND timestamp > NOW() - INTERVAL '30 days'
       ORDER BY timestamp DESC`,
      [modelId],
    );

    if (receipts.length === 0) {
      // No data, high risk
      return {
        riskLevel: 'high',
        riskScore: 0.8,
        riskMultiplier: 2.0,
        factors: ['No monitoring history'],
      };
    }

    const factors = [];
    let riskScore = 0;

    // Calculate drift frequency
    const driftEvents = receipts.filter((r) => r.drift_detected).length;
    const driftRate = driftEvents / receipts.length;

    if (driftRate > 0.3) {
      riskScore += 0.4;
      factors.push('High drift frequency');
    } else if (driftRate > 0.1) {
      riskScore += 0.2;
      factors.push('Moderate drift frequency');
    }

    // Calculate average drift
    const avgDrift = receipts.reduce(
      (sum, r) => sum + parseFloat(r.drift_percentage), 0,
    ) / receipts.length;

    if (avgDrift > 10) {
      riskScore += 0.3;
      factors.push('High average drift');
    } else if (avgDrift > 5) {
      riskScore += 0.15;
      factors.push('Moderate average drift');
    }

    // Check drift trend
    const recentDrifts = receipts.slice(0, 7).map((r) => parseFloat(r.drift_percentage));
    const olderDrifts = receipts.slice(7, 14).map((r) => parseFloat(r.drift_percentage));

    if (recentDrifts.length > 0 && olderDrifts.length > 0) {
      const recentAvg = recentDrifts.reduce((a, b) => a + b, 0) / recentDrifts.length;
      const olderAvg = olderDrifts.reduce((a, b) => a + b, 0) / olderDrifts.length;

      if (recentAvg > olderAvg * 1.5) {
        riskScore += 0.2;
        factors.push('Increasing drift trend');
      }
    }

    // Monitoring frequency
    if (receipts.length < 10) {
      riskScore += 0.1;
      factors.push('Limited monitoring history');
    }

    // Determine risk level
    let riskLevel = 'low';
    let riskMultiplier = 1.0;

    if (riskScore > 0.6) {
      riskLevel = 'high';
      riskMultiplier = 2.0;
    } else if (riskScore > 0.3) {
      riskLevel = 'medium';
      riskMultiplier = 1.5;
    }

    if (factors.length === 0) {
      factors.push('Stable monitoring history');
    }

    return {
      riskLevel,
      riskScore: Math.min(riskScore, 1.0),
      riskMultiplier,
      factors,
      driftRate,
      avgDrift,
      monitoringCycles: receipts.length,
    };
  }

  /**
   * Get policies for user
   */
  async getUserPolicies(userId, limit = 50, offset = 0) {
    return insurancePolicies.findByOwner(userId, limit, offset);
  }

  /**
   * Get active policies for user
   */
  async getActivePolicies(userId) {
    return insurancePolicies.findActive(userId);
  }

  /**
   * Check expiring policies
   */
  async checkExpiringPolicies(db) {
    const expiring = await insurancePolicies.findExpiring(7);

    logger.info(`Found ${expiring.length} expiring policies`);

    for (const policy of expiring) {
      // Send renewal reminder
      const notificationService = require('./notificationService');
      await notificationService.createNotification({
        user_id: policy.owner_id,
        type: 'insurance_expiring',
        title: 'Insurance Policy Expiring Soon',
        message: `Your insurance policy expires in ${Math.ceil(
          (new Date(policy.end_date) - new Date()) / (1000 * 60 * 60 * 24),
        )} days`,
        priority: 'normal',
        related_entity_type: 'policy',
        related_entity_id: policy.id,
      });

      // Auto-renew if enabled
      if (policy.auto_renew) {
        await this.renewPolicy(policy.id, db);
      }
    }

    return expiring;
  }

  /**
   * Renew policy
   */
  async renewPolicy(policyId, db) {
    const policy = await insurancePolicies.findById(policyId);

    if (!policy) {
      throw new NotFoundError('Policy');
    }

    // Calculate new quote
    const durationDays = Math.ceil(
      (new Date(policy.end_date) - new Date(policy.start_date)) / (1000 * 60 * 60 * 24),
    );

    const quote = await this.calculateQuote(
      policy.model_id,
      policy.coverage_amount,
      durationDays,
    );

    // Check balance
    const balance = await userBalances.findByUser(policy.owner_id);

    if (!balance || balance.available_balance < quote.premium) {
      logger.warn('Insufficient balance for auto-renewal', { policyId });
      return null;
    }

    // Create new policy
    const newEndDate = new Date(policy.end_date);
    newEndDate.setDate(newEndDate.getDate() + durationDays);

    const newPolicy = await insurancePolicies.create({
      model_id: policy.model_id,
      owner_id: policy.owner_id,
      coverage_amount: policy.coverage_amount,
      premium_paid: quote.premium,
      drift_threshold_percent: policy.drift_threshold_percent,
      end_date: newEndDate,
      auto_renew: policy.auto_renew,
      solana_signature: `sig_renewal_${Date.now()}`,
      metadata: { previousPolicyId: policyId, quote },
    });

    // Update balance
    await db.none(
      `UPDATE user_balances SET
        available_balance = available_balance - $1,
        locked_in_insurance = locked_in_insurance + $2
       WHERE user_id = $3`,
      [quote.premium, policy.coverage_amount, policy.owner_id],
    );

    // Mark old policy as expired
    await insurancePolicies.updateStatus(policyId, 'expired');

    logger.info('Policy renewed', { oldPolicyId: policyId, newPolicyId: newPolicy.id });

    return newPolicy;
  }

  /**
   * Cancel policy
   */
  async cancelPolicy(userId, policyId, db) {
    const policy = await insurancePolicies.findById(policyId);

    if (!policy) {
      throw new NotFoundError('Policy');
    }

    if (policy.owner_id !== userId) {
      throw new ValidationError('Not authorized');
    }

    if (policy.status !== 'active') {
      throw new ValidationError('Policy is not active');
    }

    // Calculate refund (prorated based on remaining time)
    const now = new Date();
    const endDate = new Date(policy.end_date);
    const startDate = new Date(policy.start_date);

    const totalDuration = endDate - startDate;
    const remainingDuration = endDate - now;
    const refundRatio = Math.max(0, remainingDuration / totalDuration);
    const refund = Math.floor(policy.premium_paid * refundRatio * 0.9); // 90% refund

    // Update policy
    await insurancePolicies.updateStatus(policyId, 'cancelled');

    // Refund to user
    await db.none(
      `UPDATE user_balances SET
        available_balance = available_balance + $1,
        locked_in_insurance = locked_in_insurance - $2
       WHERE user_id = $3`,
      [refund, policy.coverage_amount, userId],
    );

    // Create transaction
    await transactions.create({
      user_id: userId,
      type: 'insurance_refund',
      amount: refund,
      model_id: policy.model_id,
      policy_id: policy.id,
      status: 'confirmed',
    });

    logger.info('Policy cancelled', { policyId, refund });

    return { policy, refund };
  }
}

module.exports = new InsuranceService();

