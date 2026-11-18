
-- XTrend Database Schema
-- PostgreSQL

-- 1. USERS
CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CRYPTOCURRENCIES
CREATE TABLE cryptocurrencies (
    crypto_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    crypto_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. USER SETTINGS
CREATE TABLE user_settings (
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
    beginner_mode BOOLEAN DEFAULT FALSE,
    ema_fast INTEGER DEFAULT 20,
    ema_slow INTEGER DEFAULT 50,
    selected_interval VARCHAR(10) DEFAULT '1h',
    notifications_enabled BOOLEAN DEFAULT TRUE
);

-- 4. WATCHLISTS
CREATE TABLE watchlists (
    watchlist_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    watchlist_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. WATCHLIST ITEMS
CREATE TABLE watchlist_items (
    watchlist_id BIGINT REFERENCES watchlists(watchlist_id),
    crypto_id BIGINT REFERENCES cryptocurrencies(crypto_id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (watchlist_id, crypto_id)
);

-- 6. MARKET CANDLES
CREATE TABLE market_candles (
    candle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    crypto_id BIGINT NOT NULL REFERENCES cryptocurrencies(crypto_id),
    interval VARCHAR(10) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    open_price NUMERIC(20,8) NOT NULL,
    high_price NUMERIC(20,8) NOT NULL,
    low_price NUMERIC(20,8) NOT NULL,
    close_price NUMERIC(20,8) NOT NULL,
    volume NUMERIC(30,8) NOT NULL,
    UNIQUE (crypto_id, interval, open_time)
);

-- 7. SIGNALS
CREATE TABLE signals (
    signal_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    crypto_id BIGINT NOT NULL REFERENCES cryptocurrencies(crypto_id),
    interval VARCHAR(10) NOT NULL,
    signal_type VARCHAR(10) NOT NULL
        CHECK (signal_type IN ('BULLISH', 'BEARISH')),
    signal_strength NUMERIC(5,2),
    confidence_score NUMERIC(5,2),
    risk_level VARCHAR(20),
    signal_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. SIGNAL HISTORY
CREATE TABLE signal_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signal_id BIGINT NOT NULL REFERENCES signals(signal_id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signal_status VARCHAR(30) NOT NULL,
    details JSONB
);

-- 9. ALERT PREFERENCES
CREATE TABLE alert_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
    alerts_enabled BOOLEAN DEFAULT TRUE,
    bullish_alert_enabled BOOLEAN DEFAULT TRUE,
    bearish_alert_enabled BOOLEAN DEFAULT TRUE,
    browser_notifications_enabled BOOLEAN DEFAULT TRUE
);
