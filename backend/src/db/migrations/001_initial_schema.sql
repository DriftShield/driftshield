-- DriftShield Database Schema
-- Migration: 001_initial_schema
-- Description: Initial database schema for DriftShield platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    twitter_handle VARCHAR(50),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at DESC);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- MODELS
-- ============================================================================

CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solana_pubkey VARCHAR(44) UNIQUE NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    model_type VARCHAR(50) NOT NULL,
    tags TEXT[],

    monitoring_endpoint TEXT NOT NULL,
    api_auth_method VARCHAR(50),
    prediction_endpoint TEXT,
    framework VARCHAR(50),

    baseline_metrics JSONB NOT NULL,
    current_metrics JSONB,

    monitoring_frequency_hours INTEGER DEFAULT 1,
    drift_threshold_percent DECIMAL(5,2) DEFAULT 5.00,
    alert_emails TEXT[],
    webhook_url TEXT,

    is_active BOOLEAN DEFAULT TRUE,
    last_monitored_at TIMESTAMP,
    total_monitoring_cycles INTEGER DEFAULT 0,
    health_status VARCHAR(20) DEFAULT 'healthy',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_models_owner ON models(owner_id);
CREATE INDEX idx_models_solana_pubkey ON models(solana_pubkey);
CREATE INDEX idx_models_active ON models(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_models_health ON models(health_status);
CREATE INDEX idx_models_created ON models(created_at DESC);
CREATE INDEX idx_models_tags ON models USING gin(tags);

-- ============================================================================
-- MONITORING RECEIPTS
-- ============================================================================

CREATE TABLE monitoring_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,

    timestamp TIMESTAMP NOT NULL,
    metrics JSONB NOT NULL,
    drift_percentage DECIMAL(5,2) NOT NULL,
    drift_detected BOOLEAN NOT NULL,

    data_quality_metrics JSONB,
    feature_drift JSONB,

    shadow_drive_url TEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,

    solana_signature VARCHAR(88),

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_receipts_model ON monitoring_receipts(model_id, timestamp DESC);
CREATE INDEX idx_receipts_timestamp ON monitoring_receipts(timestamp DESC);
CREATE INDEX idx_receipts_drift ON monitoring_receipts(drift_detected) WHERE drift_detected = TRUE;
CREATE INDEX idx_receipts_model_drift ON monitoring_receipts(model_id) WHERE drift_detected = TRUE;

-- ============================================================================
-- PREDICTION MARKETS
-- ============================================================================

CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solana_pubkey VARCHAR(44) UNIQUE NOT NULL,

    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id),

    question TEXT NOT NULL,
    description TEXT,

    drift_threshold_percent DECIMAL(5,2) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    baseline_value DECIMAL(10,4) NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    resolution_date TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,

    total_stake_no_drift BIGINT DEFAULT 0,
    total_stake_drift BIGINT DEFAULT 0,

    status VARCHAR(20) DEFAULT 'active',
    outcome VARCHAR(20),
    final_drift_percentage DECIMAL(5,2),

    insurance_backed BOOLEAN DEFAULT FALSE,
    insurance_premium BIGINT DEFAULT 0,

    shadow_drive_receipt_url TEXT,
    resolution_signature VARCHAR(88),

    total_participants INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_markets_model ON markets(model_id);
CREATE INDEX idx_markets_creator ON markets(creator_id);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_resolution_date ON markets(resolution_date);
CREATE INDEX idx_markets_created ON markets(created_at DESC);
CREATE INDEX idx_markets_active ON markets(status) WHERE status = 'active';

-- ============================================================================
-- MARKET POSITIONS
-- ============================================================================

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solana_pubkey VARCHAR(44) UNIQUE NOT NULL,

    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    stake_no_drift BIGINT DEFAULT 0,
    stake_drift BIGINT DEFAULT 0,

    avg_odds_no_drift DECIMAL(5,4),
    avg_odds_drift DECIMAL(5,4),

    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    payout_amount BIGINT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(market_id, user_id)
);

CREATE INDEX idx_positions_market ON positions(market_id);
CREATE INDEX idx_positions_user ON positions(user_id);
CREATE INDEX idx_positions_unclaimed ON positions(is_claimed) WHERE is_claimed = FALSE;

-- ============================================================================
-- POSITION HISTORY
-- ============================================================================

CREATE TABLE position_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,

    bet_side VARCHAR(10) NOT NULL,
    amount BIGINT NOT NULL,
    odds DECIMAL(5,4) NOT NULL,

    solana_signature VARCHAR(88) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_position_history_position ON position_history(position_id);
CREATE INDEX idx_position_history_timestamp ON position_history(timestamp DESC);

-- ============================================================================
-- INSURANCE POLICIES
-- ============================================================================

CREATE TABLE insurance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,

    coverage_amount BIGINT NOT NULL,
    premium_paid BIGINT NOT NULL,
    drift_threshold_percent DECIMAL(5,2) NOT NULL,

    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT FALSE,

    status VARCHAR(20) DEFAULT 'active',

    claim_submitted_at TIMESTAMP,
    claim_approved_at TIMESTAMP,
    claim_payout BIGINT,
    claim_market_id UUID REFERENCES markets(id),

    solana_signature VARCHAR(88) NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_policies_model ON insurance_policies(model_id);
CREATE INDEX idx_policies_owner ON insurance_policies(owner_id);
CREATE INDEX idx_policies_status ON insurance_policies(status);
CREATE INDEX idx_policies_end_date ON insurance_policies(end_date);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id),

    type VARCHAR(30) NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',

    model_id UUID REFERENCES models(id),
    market_id UUID REFERENCES markets(id),
    policy_id UUID REFERENCES insurance_policies(id),

    solana_signature VARCHAR(88) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',

    balance_before BIGINT,
    balance_after BIGINT,

    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_signature ON transactions(solana_signature);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ============================================================================
-- USER BALANCES
-- ============================================================================

CREATE TABLE user_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    available_balance BIGINT DEFAULT 0,
    locked_in_markets BIGINT DEFAULT 0,
    locked_in_insurance BIGINT DEFAULT 0,
    pending_withdrawals BIGINT DEFAULT 0,
    claimable_winnings BIGINT DEFAULT 0,

    total_deposited BIGINT DEFAULT 0,
    total_withdrawn BIGINT DEFAULT 0,
    total_earned BIGINT DEFAULT 0,

    last_synced_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    priority VARCHAR(20) DEFAULT 'normal',

    related_entity_type VARCHAR(50),
    related_entity_id UUID,

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_sms BOOLEAN DEFAULT FALSE,
    sent_via_webhook BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================================================
-- USER SETTINGS
-- ============================================================================

CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    notifications JSONB DEFAULT '{"email": {"drift_warnings": true, "market_expiring": true, "wins_available": true, "insurance_claims": true, "new_markets": false}, "sms": {"critical_alerts": false}, "webhook": {"url": null, "all_events": false}}'::jsonb,

    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    currency_display VARCHAR(10) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',

    public_profile BOOLEAN DEFAULT TRUE,
    show_on_leaderboard BOOLEAN DEFAULT TRUE,

    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- API KEYS
-- ============================================================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    prefix VARCHAR(20) NOT NULL,

    permissions JSONB DEFAULT '["read"]'::jsonb,

    rate_limit_per_minute INTEGER DEFAULT 60,

    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,

    expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    service_name VARCHAR(50) NOT NULL,

    credentials JSONB NOT NULL,

    config JSONB DEFAULT '{}'::jsonb,

    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, service_name)
);

CREATE INDEX idx_integrations_user ON integrations(user_id);

-- ============================================================================
-- ANALYTICS EVENTS
-- ============================================================================

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id),

    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50),

    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,

    properties JSONB DEFAULT '{}'::jsonb,

    session_id UUID,

    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_user ON analytics_events(user_id, timestamp DESC);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp DESC);

-- ============================================================================
-- SYSTEM LOGS
-- ============================================================================

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    level VARCHAR(20) NOT NULL,
    service VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,

    user_id UUID REFERENCES users(id),
    model_id UUID REFERENCES models(id),
    market_id UUID REFERENCES markets(id),

    stack_trace TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_level ON system_logs(level, timestamp DESC);
CREATE INDEX idx_logs_service ON system_logs(service);
CREATE INDEX idx_logs_timestamp ON system_logs(timestamp DESC);

-- ============================================================================
-- LEADERBOARD CACHE
-- ============================================================================

CREATE TABLE leaderboard_cache (
    id SERIAL PRIMARY KEY,

    period VARCHAR(20) NOT NULL,

    rank_type VARCHAR(50) NOT NULL,

    data JSONB NOT NULL,

    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,

    UNIQUE(period, rank_type)
);

-- Migration tracking is handled by migrate.js
