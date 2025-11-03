const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function createMigrationsTable() {
  await db.none(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  try {
    const migrations = await db.any('SELECT version FROM schema_migrations ORDER BY version');
    return migrations.map((m) => m.version);
  } catch (error) {
    return [];
  }
}

async function applyMigration(file) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  const version = parseInt(file.split('_')[0], 10);
  const name = file.replace('.sql', '');

  logger.info(`Applying migration: ${name}`);

  try {
    await db.tx(async (t) => {
      // Execute migration SQL
      await t.none(sql);

      // Record migration (only if not already recorded)
      await t.none(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
        [version, name],
      );
    });

    logger.info(`✓ Migration applied: ${name}`);
  } catch (error) {
    logger.error(`✗ Migration failed: ${name}`, error);
    throw error;
  }
}

async function rollbackMigration(version) {
  logger.info(`Rolling back migration version: ${version}`);

  try {
    await db.none('DELETE FROM schema_migrations WHERE version = $1', [version]);
    logger.info(`✓ Migration ${version} rolled back`);
  } catch (error) {
    logger.error(`✗ Rollback failed for version ${version}`, error);
    throw error;
  }
}

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Create migrations table if it doesn't exist
    await createMigrationsTable();

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    logger.info(`Applied migrations: ${appliedMigrations.join(', ') || 'none'}`);

    // Get migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration files`);

    // Apply pending migrations
    let appliedCount = 0;
    for (const file of files) {
      const version = parseInt(file.split('_')[0], 10);

      if (!appliedMigrations.includes(version)) {
        await applyMigration(file);
        appliedCount += 1;
      }
    }

    if (appliedCount === 0) {
      logger.info('No pending migrations');
    } else {
      logger.info(`✓ Applied ${appliedCount} migration(s)`);
    }

    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

async function rollback() {
  try {
    logger.info('Rolling back last migration...');

    const appliedMigrations = await getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      logger.info('No migrations to rollback');
      process.exit(0);
    }

    const lastVersion = Math.max(...appliedMigrations);
    await rollbackMigration(lastVersion);

    logger.info('Rollback completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'rollback') {
  rollback();
} else {
  runMigrations();
}
