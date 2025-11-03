const pgp = require('pg-promise')({
  capSQL: true,
});

const config = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const db = pgp(config);

module.exports = { db, pgp };
