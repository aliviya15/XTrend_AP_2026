const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'xtrend_db',
  user: process.env.PGUSER || 'aliviya',
  password: process.env.PGPASSWORD || undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
