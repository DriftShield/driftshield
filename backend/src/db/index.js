const { db } = require('../config/database');

/**
 * Database query helpers
 */

// Users
const users = {
  findById: (id) => db.oneOrNone('SELECT * FROM users WHERE id = $1', [id]),
  findByWallet: (walletAddress) => db.oneOrNone('SELECT * FROM users WHERE wallet_address = $1', [walletAddress]),
  findByEmail: (email) => db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]),
  create: (data) => db.one(
    `INSERT INTO users (wallet_address, email, username, display_name, avatar_url, bio, twitter_handle, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.wallet_address, data.email, data.username, data.display_name, data.avatar_url, data.bio, data.twitter_handle, data.metadata || {}],
  ),
  update: (id, data) => db.one(
    `UPDATE users SET
      email = COALESCE($2, email),
      username = COALESCE($3, username),
      display_name = COALESCE($4, display_name),
      avatar_url = COALESCE($5, avatar_url),
      bio = COALESCE($6, bio),
      twitter_handle = COALESCE($7, twitter_handle),
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, data.email, data.username, data.display_name, data.avatar_url, data.bio, data.twitter_handle],
  ),
  updateLastLogin: (id) => db.none('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]),
};

// Models
const models = {
  findById: (id) => db.oneOrNone('SELECT * FROM models WHERE id = $1', [id]),
  findByPubkey: (pubkey) => db.oneOrNone('SELECT * FROM models WHERE solana_pubkey = $1', [pubkey]),
  findByOwner: (ownerId, limit = 50, offset = 0) => db.any(
    'SELECT * FROM models WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [ownerId, limit, offset],
  ),
  findActive: (limit = 50, offset = 0) => db.any(
    'SELECT * FROM models WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset],
  ),
  create: (data) => db.one(
    `INSERT INTO models (solana_pubkey, owner_id, name, description, model_type, tags,
      monitoring_endpoint, api_auth_method, prediction_endpoint, framework, baseline_metrics,
      monitoring_frequency_hours, drift_threshold_percent, alert_emails, webhook_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [data.solana_pubkey, data.owner_id, data.name, data.description, data.model_type, data.tags,
      data.monitoring_endpoint, data.api_auth_method, data.prediction_endpoint, data.framework,
      data.baseline_metrics, data.monitoring_frequency_hours, data.drift_threshold_percent,
      data.alert_emails, data.webhook_url, data.metadata || {}],
  ),
  update: (id, data) => db.one(
    `UPDATE models SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      monitoring_endpoint = COALESCE($4, monitoring_endpoint),
      drift_threshold_percent = COALESCE($5, drift_threshold_percent),
      webhook_url = COALESCE($6, webhook_url),
      current_metrics = COALESCE($7, current_metrics),
      health_status = COALESCE($8, health_status),
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, data.name, data.description, data.monitoring_endpoint, data.drift_threshold_percent,
      data.webhook_url, data.current_metrics, data.health_status],
  ),
  updateMonitoring: (id, metrics, driftPercentage, healthStatus) => db.none(
    `UPDATE models SET
      current_metrics = $2,
      last_monitored_at = NOW(),
      total_monitoring_cycles = total_monitoring_cycles + 1,
      health_status = $4,
      updated_at = NOW()
     WHERE id = $1`,
    [id, metrics, driftPercentage, healthStatus],
  ),
};

// Markets
const markets = {
  findById: (id) => db.oneOrNone('SELECT * FROM markets WHERE id = $1', [id]),
  findByPubkey: (pubkey) => db.oneOrNone('SELECT * FROM markets WHERE solana_pubkey = $1', [pubkey]),
  findActive: (limit = 50, offset = 0) => db.any(
    'SELECT * FROM markets WHERE status = $1 ORDER BY resolution_date ASC LIMIT $2 OFFSET $3',
    ['active', limit, offset],
  ),
  findByModel: (modelId) => db.any('SELECT * FROM markets WHERE model_id = $1 ORDER BY created_at DESC', [modelId]),
  create: (data) => db.one(
    `INSERT INTO markets (solana_pubkey, model_id, creator_id, question, description,
      drift_threshold_percent, metric_type, baseline_value, resolution_date, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [data.solana_pubkey, data.model_id, data.creator_id, data.question, data.description,
      data.drift_threshold_percent, data.metric_type, data.baseline_value,
      data.resolution_date, data.metadata || {}],
  ),
  updateStakes: (id, noDriftStake, driftStake) => db.none(
    `UPDATE markets SET
      total_stake_no_drift = total_stake_no_drift + $2,
      total_stake_drift = total_stake_drift + $3,
      updated_at = NOW()
     WHERE id = $1`,
    [id, noDriftStake, driftStake],
  ),
  resolve: (id, outcome, finalDrift, receiptUrl, signature) => db.one(
    `UPDATE markets SET
      status = 'resolved',
      outcome = $2,
      final_drift_percentage = $3,
      shadow_drive_receipt_url = $4,
      resolution_signature = $5,
      resolved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, outcome, finalDrift, receiptUrl, signature],
  ),
};

// Positions
const positions = {
  findById: (id) => db.oneOrNone('SELECT * FROM positions WHERE id = $1', [id]),
  findByMarketAndUser: (marketId, userId) => db.oneOrNone(
    'SELECT * FROM positions WHERE market_id = $1 AND user_id = $2',
    [marketId, userId],
  ),
  findByUser: (userId) => db.any('SELECT * FROM positions WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
  findUnclaimed: (userId) => db.any(
    'SELECT p.*, m.* FROM positions p JOIN markets m ON p.market_id = m.id WHERE p.user_id = $1 AND p.is_claimed = false AND m.status = $2',
    [userId, 'resolved'],
  ),
  create: (data) => db.one(
    `INSERT INTO positions (solana_pubkey, market_id, user_id, stake_no_drift, stake_drift,
      avg_odds_no_drift, avg_odds_drift)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.solana_pubkey, data.market_id, data.user_id, data.stake_no_drift, data.stake_drift,
      data.avg_odds_no_drift, data.avg_odds_drift],
  ),
  update: (marketId, userId, noDriftStake, driftStake, avgOddsNoDrift, avgOddsDrift) => db.one(
    `UPDATE positions SET
      stake_no_drift = $3,
      stake_drift = $4,
      avg_odds_no_drift = $5,
      avg_odds_drift = $6,
      updated_at = NOW()
     WHERE market_id = $1 AND user_id = $2
     RETURNING *`,
    [marketId, userId, noDriftStake, driftStake, avgOddsNoDrift, avgOddsDrift],
  ),
  claim: (id, payoutAmount) => db.one(
    `UPDATE positions SET
      is_claimed = true,
      claimed_at = NOW(),
      payout_amount = $2
     WHERE id = $1
     RETURNING *`,
    [id, payoutAmount],
  ),
};

// Notifications
const notifications = {
  findByUser: (userId, limit = 50, offset = 0) => db.any(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset],
  ),
  findUnread: (userId) => db.any(
    'SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC',
    [userId],
  ),
  create: (data) => db.one(
    `INSERT INTO notifications (user_id, type, title, message, priority, related_entity_type,
      related_entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.user_id, data.type, data.title, data.message, data.priority || 'normal',
      data.related_entity_type, data.related_entity_id, data.metadata || {}],
  ),
  markAsRead: (id) => db.none('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1', [id]),
  markAllAsRead: (userId) => db.none('UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false', [userId]),
};

// Transactions
const transactions = {
  findByUser: (userId, limit = 50, offset = 0) => db.any(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset],
  ),
  findBySignature: (signature) => db.oneOrNone('SELECT * FROM transactions WHERE solana_signature = $1', [signature]),
  create: (data) => db.one(
    `INSERT INTO transactions (user_id, type, amount, currency, model_id, market_id,
      policy_id, solana_signature, status, balance_before, balance_after, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [data.user_id, data.type, data.amount, data.currency || 'USDC', data.model_id,
      data.market_id, data.policy_id, data.solana_signature, data.status || 'pending',
      data.balance_before, data.balance_after, data.metadata || {}],
  ),
  updateStatus: (id, status) => db.one(
    'UPDATE transactions SET status = $2, confirmed_at = NOW() WHERE id = $1 RETURNING *',
    [id, status],
  ),
};

// Insurance Policies
const insurancePolicies = {
  findById: (id) => db.oneOrNone('SELECT * FROM insurance_policies WHERE id = $1', [id]),
  findByModel: (modelId) => db.any(
    'SELECT * FROM insurance_policies WHERE model_id = $1 ORDER BY created_at DESC',
    [modelId],
  ),
  findByOwner: (ownerId, limit = 50, offset = 0) => db.any(
    'SELECT * FROM insurance_policies WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [ownerId, limit, offset],
  ),
  findActive: (ownerId) => db.any(
    'SELECT * FROM insurance_policies WHERE owner_id = $1 AND status = $2 AND end_date > NOW()',
    [ownerId, 'active'],
  ),
  findExpiring: (days = 7) => db.any(
    `SELECT * FROM insurance_policies 
     WHERE status = 'active' 
     AND end_date > NOW() 
     AND end_date < NOW() + INTERVAL '${days} days'`,
  ),
  create: (data) => db.one(
    `INSERT INTO insurance_policies (model_id, owner_id, coverage_amount, premium_paid,
      drift_threshold_percent, end_date, auto_renew, solana_signature, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [data.model_id, data.owner_id, data.coverage_amount, data.premium_paid,
      data.drift_threshold_percent, data.end_date, data.auto_renew || false,
      data.solana_signature, data.metadata || {}],
  ),
  updateStatus: (id, status) => db.one(
    'UPDATE insurance_policies SET status = $2 WHERE id = $1 RETURNING *',
    [id, status],
  ),
  submitClaim: (id, marketId) => db.one(
    `UPDATE insurance_policies SET
      claim_submitted_at = NOW(),
      claim_market_id = $2,
      status = 'claim_pending'
     WHERE id = $1
     RETURNING *`,
    [id, marketId],
  ),
  approveClaim: (id, payout) => db.one(
    `UPDATE insurance_policies SET
      claim_approved_at = NOW(),
      claim_payout = $2,
      status = 'claimed'
     WHERE id = $1
     RETURNING *`,
    [id, payout],
  ),
};

// API Keys
const apiKeys = {
  findByUser: (userId) => db.any(
    'SELECT id, user_id, name, prefix, permissions, rate_limit_per_minute, is_active, last_used_at, usage_count, expires_at, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  ),
  findByHash: (keyHash) => db.oneOrNone(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true',
    [keyHash],
  ),
  create: (data) => db.one(
    `INSERT INTO api_keys (user_id, name, key_hash, prefix, permissions, rate_limit_per_minute, expires_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.user_id, data.name, data.key_hash, data.prefix, data.permissions || ['read'],
      data.rate_limit_per_minute || 60, data.expires_at, data.metadata || {}],
  ),
  updateUsage: (id) => db.none(
    'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = $1',
    [id],
  ),
  revoke: (id) => db.none('UPDATE api_keys SET is_active = false WHERE id = $1', [id]),
};

// User Balances
const userBalances = {
  findByUser: (userId) => db.oneOrNone('SELECT * FROM user_balances WHERE user_id = $1', [userId]),
  updateAvailable: (userId, amount) => db.one(
    'UPDATE user_balances SET available_balance = available_balance + $2, updated_at = NOW() WHERE user_id = $1 RETURNING *',
    [userId, amount],
  ),
  updateLocked: (userId, marketAmount, insuranceAmount) => db.one(
    `UPDATE user_balances SET
      locked_in_markets = locked_in_markets + $2,
      locked_in_insurance = locked_in_insurance + $3,
      updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, marketAmount, insuranceAmount],
  ),
};

// Analytics Events
const analyticsEvents = {
  create: (data) => db.one(
    `INSERT INTO analytics_events (user_id, event_name, event_category, page_url, referrer,
      user_agent, ip_address, properties, session_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [data.user_id, data.event_name, data.event_category, data.page_url, data.referrer,
      data.user_agent, data.ip_address, data.properties || {}, data.session_id],
  ),
};

// System Logs
const systemLogs = {
  create: (data) => db.one(
    `INSERT INTO system_logs (level, service, message, user_id, model_id, market_id,
      stack_trace, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.level, data.service, data.message, data.user_id, data.model_id, data.market_id,
      data.stack_trace, data.metadata || {}],
  ),
};

// Leaderboard Cache
const leaderboardCache = {
  find: (period, rankType) => db.oneOrNone(
    'SELECT * FROM leaderboard_cache WHERE period = $1 AND rank_type = $2 AND expires_at > NOW()',
    [period, rankType],
  ),
  upsert: (period, rankType, data, expiresAt) => db.one(
    `INSERT INTO leaderboard_cache (period, rank_type, data, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (period, rank_type)
     DO UPDATE SET data = $3, generated_at = NOW(), expires_at = $4
     RETURNING *`,
    [period, rankType, data, expiresAt],
  ),
};

module.exports = {
  db,
  users,
  models,
  markets,
  positions,
  notifications,
  transactions,
  insurancePolicies,
  apiKeys,
  userBalances,
  analyticsEvents,
  systemLogs,
  leaderboardCache,
};
