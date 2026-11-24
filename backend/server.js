const express = require('express');
const cors = require('cors');
require('dotenv').config();

const path = require('path');
const apiRoutes = require('./routes/api');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging for institutional telemetry
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[XTrend Gateway] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Static frontend serving if built
const frontendDist = path.join(__dirname, '../frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  // Root greeting fallback
  app.get('/', (req, res) => {
    res.json({
      brand: 'XTrend',
      tagline: 'The Intelligence Behind Every Market Move',
      status: 'OPERATIONAL',
      apiDocs: '/api/health',
      mode: 'Institutional Academic Core'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[XTrend Backend Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start listening
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n======================================================`);
  console.log(`  XTrend Financial Intelligence Engine Online`);
  console.log(`  Port: http://0.0.0.0:${PORT}`);
  console.log(`  Database Target: ${process.env.PGDATABASE || 'xtrend_db'}`);
  console.log(`  Security: Isolated backend credentials`);
  console.log(`======================================================\n`);

  try {
    const check = await db.query('SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log(`[Database Verified] Connected to ${process.env.PGDATABASE || 'xtrend_db'} (${check.rows[0].total_tables} tables active)`);
  } catch (err) {
    console.error('[Database Connection Warning]', err.message);
  }
});

module.exports = { app, server };
