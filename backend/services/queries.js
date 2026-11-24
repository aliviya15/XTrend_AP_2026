/**
 * Registry of all 12 analytical queries from dbms/04_queries.sql
 * Preserves exact SQL logic, table joins, window functions, and subqueries.
 */

const QUERIES = [
  {
    id: 1,
    title: 'Display All Registered Users',
    category: 'User Intelligence',
    description: 'Retrieves all platform accounts sorted by registration date in descending order.',
    sql: `SELECT user_id, user_name, email, created_at
FROM users
ORDER BY created_at DESC;`
  },
  {
    id: 2,
    title: 'Display All Active Cryptocurrencies',
    category: 'Market Assets',
    description: 'Lists all trading pairs flagged active for institutional tracking.',
    sql: `SELECT crypto_id, symbol, crypto_name
FROM cryptocurrencies
WHERE is_active = TRUE
ORDER BY symbol;`
  },
  {
    id: 3,
    title: 'Display Each User Watchlists',
    category: 'Portfolio Management',
    description: 'Relational join mapping registered traders to their custom watchlist portfolios.',
    sql: `SELECT
    u.user_name,
    w.watchlist_id,
    w.watchlist_name
FROM users u
JOIN watchlists w
    ON u.user_id = w.user_id
ORDER BY u.user_name;`
  },
  {
    id: 4,
    title: 'Display Cryptocurrencies in Each Watchlist',
    category: 'Portfolio Management',
    description: 'Multi-table join displaying individual tracked assets within user watchlists.',
    sql: `SELECT
    w.watchlist_name,
    c.symbol,
    c.crypto_name,
    wi.added_at
FROM watchlist_items wi
JOIN watchlists w
    ON wi.watchlist_id = w.watchlist_id
JOIN cryptocurrencies c
    ON wi.crypto_id = c.crypto_id
ORDER BY w.watchlist_name, c.symbol;`
  },
  {
    id: 5,
    title: 'Count Cryptocurrencies in Each Watchlist',
    category: 'Aggregates',
    description: 'Grouped aggregation counting total distinct asset entries per watchlist.',
    sql: `SELECT
    w.watchlist_id,
    w.watchlist_name,
    COUNT(wi.crypto_id) AS total_cryptocurrencies
FROM watchlists w
LEFT JOIN watchlist_items wi
    ON w.watchlist_id = wi.watchlist_id
GROUP BY w.watchlist_id, w.watchlist_name
ORDER BY total_cryptocurrencies DESC;`
  },
  {
    id: 6,
    title: 'Find Bullish and Bearish Signal Counts',
    category: 'Market Sentiment',
    description: 'Aggregates entire platform signals by polarity (BULLISH vs BEARISH).',
    sql: `SELECT
    signal_type,
    COUNT(*) AS total_signals
FROM signals
GROUP BY signal_type;`
  },
  {
    id: 7,
    title: 'Display High-Confidence Trading Signals',
    category: 'Alpha Signals',
    description: 'Filters institutional grade signals meeting or exceeding 80% confidence threshold.',
    sql: `SELECT
    c.symbol,
    s.interval,
    s.signal_type,
    s.confidence_score,
    s.signal_strength,
    s.risk_level
FROM signals s
JOIN cryptocurrencies c
    ON s.crypto_id = c.crypto_id
WHERE s.confidence_score >= 80
ORDER BY s.confidence_score DESC;`
  },
  {
    id: 8,
    title: 'Highest Average Closing Price by Asset',
    category: 'Valuation Analytics',
    description: 'Aggregates candlestick history to calculate mean institutional valuation per asset.',
    sql: `SELECT
    c.symbol,
    AVG(mc.close_price) AS average_closing_price
FROM market_candles mc
JOIN cryptocurrencies c
    ON mc.crypto_id = c.crypto_id
GROUP BY c.crypto_id, c.symbol
ORDER BY average_closing_price DESC;`
  },
  {
    id: 9,
    title: 'Display Signals with History & JSON Details',
    category: 'Audit & Telemetry',
    description: 'Audit trace joining execution signals with status history and JSONB telemetry.',
    sql: `SELECT
    c.symbol,
    s.signal_type,
    sh.signal_status,
    sh.recorded_at,
    sh.details
FROM signal_history sh
JOIN signals s
    ON sh.signal_id = s.signal_id
JOIN cryptocurrencies c
    ON s.crypto_id = c.crypto_id
ORDER BY sh.recorded_at DESC;`
  },
  {
    id: 10,
    title: 'Rank Signals by Confidence per Crypto',
    category: 'Window Functions',
    description: 'Advanced SQL window function PARTITION BY crypto_id ranking signals by confidence.',
    sql: `SELECT
    c.symbol,
    s.signal_type,
    s.confidence_score,
    RANK() OVER (
        PARTITION BY c.crypto_id
        ORDER BY s.confidence_score DESC
    ) AS signal_rank
FROM signals s
JOIN cryptocurrencies c
    ON s.crypto_id = c.crypto_id
WHERE s.confidence_score IS NOT NULL
ORDER BY c.symbol, signal_rank;`
  },
  {
    id: 11,
    title: 'Users with Browser Notifications Enabled',
    category: 'Alert Infrastructure',
    description: 'Selects active subscribers opted in to high-priority browser notifications.',
    sql: `SELECT
    u.user_name,
    u.email,
    ap.browser_notifications_enabled
FROM users u
JOIN alert_preferences ap
    ON u.user_id = ap.user_id
WHERE ap.browser_notifications_enabled = TRUE;`
  },
  {
    id: 12,
    title: 'Cryptocurrencies with More Signals Than Average',
    category: 'Market Anomalies',
    description: 'Complex HAVING subquery identifying assets generating higher-than-average signal frequency.',
    sql: `SELECT
    c.symbol,
    COUNT(s.signal_id) AS total_signals
FROM cryptocurrencies c
JOIN signals s
    ON c.crypto_id = s.crypto_id
GROUP BY c.crypto_id, c.symbol
HAVING COUNT(s.signal_id) > (
    SELECT AVG(signal_count)
    FROM (
        SELECT COUNT(*) AS signal_count
        FROM signals
        GROUP BY crypto_id
    ) AS signal_summary
)
ORDER BY total_signals DESC;`
  }
];

module.exports = {
  QUERIES,
  getQueryById: (id) => QUERIES.find(q => q.id === parseInt(id, 10))
};
