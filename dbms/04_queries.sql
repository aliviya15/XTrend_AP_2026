-- XTrend DBMS Project
-- CP3: SQL Queries
-- Database: PostgreSQL

-- QUERY 1: Display all registered users
SELECT user_id, user_name, email, created_at
FROM users
ORDER BY created_at DESC;


-- QUERY 2: Display all active cryptocurrencies
SELECT crypto_id, symbol, crypto_name
FROM cryptocurrencies
WHERE is_active = TRUE
ORDER BY symbol;


-- QUERY 3: Display each user's watchlists
SELECT
    u.user_name,
    w.watchlist_id,
    w.watchlist_name
FROM users u
JOIN watchlists w
    ON u.user_id = w.user_id
ORDER BY u.user_name;


-- QUERY 4: Display cryptocurrencies in each watchlist
SELECT
    w.watchlist_name,
    c.symbol,
    c.crypto_name,
    wi.added_at
FROM watchlist_items wi
JOIN watchlists w
    ON wi.watchlist_id = w.watchlist_id
JOIN cryptocurrencies c
    ON wi.crypto_id = c.crypto_id
ORDER BY w.watchlist_name, c.symbol;


-- QUERY 5: Count cryptocurrencies in each watchlist
SELECT
    w.watchlist_id,
    w.watchlist_name,
    COUNT(wi.crypto_id) AS total_cryptocurrencies
FROM watchlists w
LEFT JOIN watchlist_items wi
    ON w.watchlist_id = wi.watchlist_id
GROUP BY w.watchlist_id, w.watchlist_name
ORDER BY total_cryptocurrencies DESC;


-- QUERY 6: Find bullish and bearish signal counts
SELECT
    signal_type,
    COUNT(*) AS total_signals
FROM signals
GROUP BY signal_type;


-- QUERY 7: Display high-confidence trading signals
SELECT
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
ORDER BY s.confidence_score DESC;


-- QUERY 8: Find cryptocurrencies with the highest average closing price
SELECT
    c.symbol,
    AVG(mc.close_price) AS average_closing_price
FROM market_candles mc
JOIN cryptocurrencies c
    ON mc.crypto_id = c.crypto_id
GROUP BY c.crypto_id, c.symbol
ORDER BY average_closing_price DESC;


-- QUERY 9: Display signals with their history
SELECT
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
ORDER BY sh.recorded_at DESC;


-- QUERY 10: Rank signals by confidence for each cryptocurrency
SELECT
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
ORDER BY c.symbol, signal_rank;


-- QUERY 11: Display users with browser notifications enabled
SELECT
    u.user_name,
    u.email,
    ap.browser_notifications_enabled
FROM users u
JOIN alert_preferences ap
    ON u.user_id = ap.user_id
WHERE ap.browser_notifications_enabled = TRUE;


-- QUERY 12: Find cryptocurrencies with more signals than the average
SELECT
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
ORDER BY total_signals DESC;




const mymiddleware = (req, res, next ) =>{
    consdole.log("middlkewere is "):
    next();
}