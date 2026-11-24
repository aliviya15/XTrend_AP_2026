const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { QUERIES, getQueryById } = require('../services/queries');
const { calculateEMA, detectCrossovers } = require('../services/technicalAnalysis');

// 1. Health & Database Connectivity
router.get('/health', async (req, res) => {
  try {
    const startTime = process.hrtime.bigint();
    const result = await db.query('SELECT NOW() AS server_time, current_database() AS db_name, version() AS pg_version');
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    
    res.json({
      status: 'ONLINE',
      system: 'XTrend Institutional Backend Core',
      database: result.rows[0].db_name,
      pgVersion: result.rows[0].pg_version,
      pingMs: Number(elapsedMs.toFixed(3)),
      serverTime: result.rows[0].server_time,
      uptimeSeconds: Math.floor(process.uptime()),
      academicDataset: true
    });
  } catch (err) {
    res.status(500).json({ status: 'OFFLINE', error: err.message });
  }
});

// 2. High-Level Market Pulse & Platform Overview
router.get('/overview', async (req, res) => {
  try {
    const [cryptoCount, signalStats, userCount, candleCount, watchlistCount] = await Promise.all([
      db.query('SELECT COUNT(*) AS total FROM cryptocurrencies WHERE is_active = TRUE'),
      db.query(`
        SELECT 
          COUNT(*) AS total_signals,
          COUNT(*) FILTER (WHERE signal_type = 'BULLISH') AS bullish_count,
          COUNT(*) FILTER (WHERE signal_type = 'BEARISH') AS bearish_count,
          COALESCE(AVG(confidence_score), 0) AS avg_confidence,
          COALESCE(AVG(signal_strength), 0) AS avg_strength
        FROM signals
      `),
      db.query('SELECT COUNT(*) AS total FROM users'),
      db.query('SELECT COUNT(*) AS total FROM market_candles'),
      db.query('SELECT COUNT(*) AS total FROM watchlists')
    ]);

    const stats = signalStats.rows[0];
    const totalSignals = parseInt(stats.total_signals, 10) || 0;
    const bullish = parseInt(stats.bullish_count, 10) || 0;
    const bearish = parseInt(stats.bearish_count, 10) || 0;
    const bullishRatio = totalSignals > 0 ? (bullish / totalSignals) * 100 : 50;

    res.json({
      activeAssets: parseInt(cryptoCount.rows[0].total, 10),
      totalSignals,
      bullishCount: bullish,
      bearishCount: bearish,
      bullishRatio: Number(bullishRatio.toFixed(1)),
      bearishRatio: Number((100 - bullishRatio).toFixed(1)),
      avgConfidence: Number(parseFloat(stats.avg_confidence).toFixed(1)),
      avgStrength: Number(parseFloat(stats.avg_strength).toFixed(1)),
      marketPulse: bullishRatio >= 55 ? 'STRONG_BULLISH' : bullishRatio <= 45 ? 'BEARISH_PRESSURE' : 'NEUTRAL_BALANCED',
      totalCandles: parseInt(candleCount.rows[0].total, 10),
      registeredTraders: parseInt(userCount.rows[0].total, 10),
      activeWatchlists: parseInt(watchlistCount.rows[0].total, 10),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Cryptocurrencies List with Live Computed 24h Metrics
router.get('/cryptos', async (req, res) => {
  try {
    const cryptosRes = await db.query(`
      SELECT crypto_id, symbol, crypto_name, is_active
      FROM cryptocurrencies
      WHERE is_active = TRUE
      ORDER BY crypto_id ASC
    `);

    // Fetch latest 24 candles summary for each crypto
    const summaryPromises = cryptosRes.rows.map(async (coin) => {
      const candlesRes = await db.query(`
        SELECT open_time, open_price, high_price, low_price, close_price, volume
        FROM market_candles
        WHERE crypto_id = $1
        ORDER BY open_time DESC
        LIMIT 24
      `, [coin.crypto_id]);

      const candles = candlesRes.rows.reverse();
      const latest = candles[candles.length - 1] || null;
      const oldest = candles[0] || null;
      
      let priceChange24h = 0;
      let priceChangePercent = 0;
      let high24h = 0;
      let low24h = Infinity;
      let volume24h = 0;

      if (candles.length > 0) {
        const latestClose = parseFloat(latest.close_price);
        const oldestClose = parseFloat(oldest.close_price);
        priceChange24h = latestClose - oldestClose;
        priceChangePercent = oldestClose > 0 ? (priceChange24h / oldestClose) * 100 : 0;
        
        candles.forEach(c => {
          const h = parseFloat(c.high_price);
          const l = parseFloat(c.low_price);
          const v = parseFloat(c.volume);
          if (h > high24h) high24h = h;
          if (l < low24h) low24h = l;
          volume24h += v;
        });
      }

      // Latest signal for this coin
      const latestSignalRes = await db.query(`
        SELECT signal_type, confidence_score, signal_strength, risk_level, signal_time
        FROM signals
        WHERE crypto_id = $1
        ORDER BY signal_time DESC
        LIMIT 1
      `, [coin.crypto_id]);

      return {
        ...coin,
        lastPrice: latest ? parseFloat(latest.close_price) : 0,
        priceChange24h: Number(priceChange24h.toFixed(2)),
        priceChangePercent: Number(priceChangePercent.toFixed(2)),
        high24h: high24h > 0 ? Number(high24h.toFixed(2)) : 0,
        low24h: low24h !== Infinity ? Number(low24h.toFixed(2)) : 0,
        volume24h: Number(volume24h.toFixed(2)),
        candleCount: candles.length,
        latestSignal: latestSignalRes.rows[0] || null
      };
    });

    const results = await Promise.all(summaryPromises);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Detailed Candlestick Series & EMA Crossover Calculations for an Asset
router.get('/candles/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cryptoRes = await db.query('SELECT crypto_id, symbol, crypto_name FROM cryptocurrencies WHERE symbol = $1', [symbol]);
    if (cryptoRes.rows.length === 0) {
      return res.status(404).json({ error: `Cryptocurrency ${symbol} not found.` });
    }
    const crypto = cryptoRes.rows[0];

    const candlesRes = await db.query(`
      SELECT candle_id, open_time, open_price, high_price, low_price, close_price, volume
      FROM market_candles
      WHERE crypto_id = $1
      ORDER BY open_time ASC
    `, [crypto.crypto_id]);

    const candles = candlesRes.rows.map(c => ({
      candle_id: c.candle_id,
      open_time: c.open_time,
      open_price: parseFloat(c.open_price),
      high_price: parseFloat(c.high_price),
      low_price: parseFloat(c.low_price),
      close_price: parseFloat(c.close_price),
      volume: parseFloat(c.volume)
    }));

    const closePrices = candles.map(c => c.close_price);
    const emaFastPeriod = parseInt(req.query.emaFast || '20', 10);
    const emaSlowPeriod = parseInt(req.query.emaSlow || '50', 10);

    const emaFast = calculateEMA(closePrices, emaFastPeriod);
    const emaSlow = calculateEMA(closePrices, emaSlowPeriod);
    const crossovers = detectCrossovers(candles, emaFast, emaSlow);

    res.json({
      crypto,
      interval: '1h',
      candleCount: candles.length,
      emaFastPeriod,
      emaSlowPeriod,
      crossovers,
      candles: candles.map((c, idx) => ({
        ...c,
        emaFast: emaFast[idx],
        emaSlow: emaSlow[idx]
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Signals List with Advanced Filtering
router.get('/signals', async (req, res) => {
  try {
    const { symbol, type, minConfidence, limit } = req.query;
    let query = `
      SELECT 
        s.signal_id,
        c.symbol,
        c.crypto_name,
        s.interval,
        s.signal_type,
        s.confidence_score,
        s.signal_strength,
        s.risk_level,
        s.signal_time
      FROM signals s
      JOIN cryptocurrencies c ON s.crypto_id = c.crypto_id
      WHERE 1=1
    `;
    const params = [];

    if (symbol) {
      params.push(symbol.toUpperCase());
      query += ` AND c.symbol = $${params.length}`;
    }
    if (type) {
      params.push(type.toUpperCase());
      query += ` AND s.signal_type = $${params.length}`;
    }
    if (minConfidence) {
      params.push(parseFloat(minConfidence));
      query += ` AND s.confidence_score >= $${params.length}`;
    }

    query += ' ORDER BY s.signal_time DESC';

    if (limit) {
      params.push(parseInt(limit, 10));
      query += ` LIMIT $${params.length}`;
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Bullish vs Bearish Signal Distribution & Metrics (Query 6 Enhanced)
router.get('/signals/distribution', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        signal_type,
        COUNT(*) AS total_signals,
        AVG(confidence_score) AS avg_confidence,
        AVG(signal_strength) AS avg_strength,
        MIN(confidence_score) AS min_confidence,
        MAX(confidence_score) AS max_confidence
      FROM signals
      GROUP BY signal_type
    `);
    
    let total = 0;
    const distribution = {};
    result.rows.forEach(r => {
      const count = parseInt(r.total_signals, 10);
      total += count;
      distribution[r.signal_type] = {
        count,
        avgConfidence: Number(parseFloat(r.avg_confidence).toFixed(2)),
        avgStrength: Number(parseFloat(r.avg_strength).toFixed(2)),
        minConfidence: parseFloat(r.min_confidence),
        maxConfidence: parseFloat(r.max_confidence)
      };
    });

    res.json({
      total,
      bullish: distribution['BULLISH'] || { count: 0, avgConfidence: 0, avgStrength: 0 },
      bearish: distribution['BEARISH'] || { count: 0, avgConfidence: 0, avgStrength: 0 },
      bullishPercentage: total > 0 ? Number(((distribution['BULLISH']?.count || 0) / total * 100).toFixed(1)) : 50,
      bearishPercentage: total > 0 ? Number(((distribution['BEARISH']?.count || 0) / total * 100).toFixed(1)) : 50
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Signal History & JSONB Telemetry (Query 9)
router.get('/signal-history', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        sh.history_id,
        c.symbol,
        c.crypto_name,
        s.signal_type,
        s.confidence_score,
        s.risk_level,
        sh.signal_status,
        sh.recorded_at,
        sh.details
      FROM signal_history sh
      JOIN signals s ON sh.signal_id = s.signal_id
      JOIN cryptocurrencies c ON s.crypto_id = c.crypto_id
      ORDER BY sh.recorded_at DESC
      LIMIT 50;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Queries Catalog (Metadata for all 12 queries from 04_queries.sql)
router.get('/queries', (req, res) => {
  res.json(QUERIES);
});

// 9. Execute Query by ID (1 - 12) with High-Precision Telemetry
router.get('/queries/:id/execute', async (req, res) => {
  const queryMeta = getQueryById(req.params.id);
  if (!queryMeta) {
    return res.status(404).json({ error: `Query ${req.params.id} does not exist.` });
  }

  try {
    const startTime = process.hrtime.bigint();
    const result = await db.query(queryMeta.sql);
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    res.json({
      id: queryMeta.id,
      title: queryMeta.title,
      category: queryMeta.category,
      description: queryMeta.description,
      sql: queryMeta.sql,
      executionTimeMs: Number(elapsedMs.toFixed(3)),
      rowCount: result.rowCount,
      fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      rows: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message, sql: queryMeta.sql });
  }
});

// 10. PostgreSQL EXPLAIN (ANALYZE, BUFFERS) Plan Inspector
router.get('/queries/:id/explain', async (req, res) => {
  const queryMeta = getQueryById(req.params.id);
  if (!queryMeta) {
    return res.status(404).json({ error: `Query ${req.params.id} does not exist.` });
  }

  try {
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${queryMeta.sql}`;
    const startTime = process.hrtime.bigint();
    const result = await db.query(explainSql);
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    const planData = result.rows[0]['QUERY PLAN'][0];

    res.json({
      id: queryMeta.id,
      title: queryMeta.title,
      sql: queryMeta.sql,
      explainDurationMs: Number(elapsedMs.toFixed(3)),
      planningTimeMs: planData['Planning Time'],
      executionTimeMs: planData['Execution Time'],
      plan: planData['Plan'],
      buffers: {
        sharedHit: planData['Plan']['Shared Hit Blocks'] || 0,
        sharedRead: planData['Plan']['Shared Read Blocks'] || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Watchlists Management (Queries 3, 4, 5)
router.get('/watchlists', async (req, res) => {
  try {
    const watchlistsRes = await db.query(`
      SELECT w.watchlist_id, w.watchlist_name, w.created_at, u.user_id, u.user_name
      FROM watchlists w
      JOIN users u ON w.user_id = u.user_id
      ORDER BY w.watchlist_id ASC
    `);

    const itemsPromises = watchlistsRes.rows.map(async (wl) => {
      const itemsRes = await db.query(`
        SELECT wi.crypto_id, wi.added_at, c.symbol, c.crypto_name
        FROM watchlist_items wi
        JOIN cryptocurrencies c ON wi.crypto_id = c.crypto_id
        WHERE wi.watchlist_id = $1
        ORDER BY c.symbol ASC
      `, [wl.watchlist_id]);
      return {
        ...wl,
        totalItems: itemsRes.rows.length,
        items: itemsRes.rows
      };
    });

    const watchlists = await Promise.all(itemsPromises);
    res.json(watchlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Item to Watchlist
router.post('/watchlists/:id/items', async (req, res) => {
  try {
    const watchlistId = parseInt(req.params.id, 10);
    const { cryptoId } = req.body;
    await db.query(`
      INSERT INTO watchlist_items (watchlist_id, crypto_id, added_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (watchlist_id, crypto_id) DO NOTHING
    `, [watchlistId, cryptoId]);
    res.json({ success: true, message: 'Asset added to institutional watchlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove Item from Watchlist
router.delete('/watchlists/:id/items/:cryptoId', async (req, res) => {
  try {
    const watchlistId = parseInt(req.params.id, 10);
    const cryptoId = parseInt(req.params.cryptoId, 10);
    await db.query(`
      DELETE FROM watchlist_items
      WHERE watchlist_id = $1 AND crypto_id = $2
    `, [watchlistId, cryptoId]);
    res.json({ success: true, message: 'Asset removed from watchlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. User Settings & Alert Preferences
router.get('/user-settings', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId || '1', 10);
    const [settingsRes, alertRes, userRes] = await Promise.all([
      db.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]),
      db.query('SELECT * FROM alert_preferences WHERE user_id = $1', [userId]),
      db.query('SELECT user_id, user_name, email, created_at FROM users WHERE user_id = $1', [userId])
    ]);

    res.json({
      user: userRes.rows[0] || null,
      settings: settingsRes.rows[0] || { ema_fast: 20, ema_slow: 50, beginner_mode: false, selected_interval: '1h' },
      alerts: alertRes.rows[0] || { alerts_enabled: true, bullish_alert_enabled: true, bearish_alert_enabled: true, browser_notifications_enabled: true }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User Settings (EMA fast/slow, intervals)
router.put('/user-settings', async (req, res) => {
  try {
    const userId = parseInt(req.body.userId || '1', 10);
    const { ema_fast, ema_slow, beginner_mode, selected_interval, alerts_enabled, browser_notifications_enabled } = req.body;

    await db.query(`
      UPDATE user_settings
      SET 
        ema_fast = COALESCE($2, ema_fast),
        ema_slow = COALESCE($3, ema_slow),
        beginner_mode = COALESCE($4, beginner_mode),
        selected_interval = COALESCE($5, selected_interval)
      WHERE user_id = $1
    `, [userId, ema_fast, ema_slow, beginner_mode, selected_interval]);

    if (alerts_enabled !== undefined || browser_notifications_enabled !== undefined) {
      await db.query(`
        UPDATE alert_preferences
        SET 
          alerts_enabled = COALESCE($2, alerts_enabled),
          browser_notifications_enabled = COALESCE($3, browser_notifications_enabled)
        WHERE user_id = $1
      `, [userId, alerts_enabled, browser_notifications_enabled]);
    }

    res.json({ success: true, message: 'Settings committed to PostgreSQL' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
