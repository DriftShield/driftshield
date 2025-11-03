const { db } = require('../config/database');
const logger = require('../utils/logger');

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create test user
    const user = await db.one(`
      INSERT INTO users (wallet_address, username, display_name, email, bio)
      VALUES ('DemoWallet1234567890123456789012345678', 'demo_user', 'Demo User', 'demo@driftshield.io', 'Demo account for testing')
      ON CONFLICT (wallet_address) DO UPDATE SET username = EXCLUDED.username
      RETURNING *
    `);

    logger.info(`Created user: ${user.id}`);

    // Create user settings
    await db.none(`
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id]);

    // Create user balance
    await db.none(`
      INSERT INTO user_balances (user_id, available_balance)
      VALUES ($1, 1000000000)
      ON CONFLICT (user_id) DO UPDATE SET available_balance = 1000000000
    `, [user.id]);

    // Create test model
    const model = await db.one(`
      INSERT INTO models (
        solana_pubkey, owner_id, name, description, model_type, tags,
        monitoring_endpoint, framework, baseline_metrics, drift_threshold_percent
      )
      VALUES (
        'ModelPubkey1234567890123456789012345678',
        $1,
        'Fraud Detection Model',
        'ML model for detecting fraudulent transactions',
        'classification',
        ARRAY['fraud', 'finance', 'classification'],
        'https://api.example.com/monitor',
        'scikit-learn',
        '{"accuracy": 0.95, "precision": 0.92, "recall": 0.89, "f1_score": 0.90}'::jsonb,
        5.00
      )
      ON CONFLICT (solana_pubkey) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `, [user.id]);

    logger.info(`Created model: ${model.id}`);

    // Create test market
    const resolutionDate = new Date();
    resolutionDate.setDate(resolutionDate.getDate() + 30); // 30 days from now

    const market = await db.one(`
      INSERT INTO markets (
        solana_pubkey, model_id, creator_id, question, description,
        drift_threshold_percent, metric_type, baseline_value, resolution_date
      )
      VALUES (
        'MarketPubkey1234567890123456789012345678',
        $1,
        $2,
        'Will the Fraud Detection Model maintain >90% accuracy?',
        'Prediction market for model performance over the next 30 days',
        5.00,
        'accuracy',
        0.95,
        $3
      )
      ON CONFLICT (solana_pubkey) DO UPDATE SET question = EXCLUDED.question
      RETURNING *
    `, [model.id, user.id, resolutionDate]);

    logger.info(`Created market: ${market.id}`);

    logger.info('✓ Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
