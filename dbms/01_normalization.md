# XTrend – Database Normalization

## 1. Project Overview

XTrend is a cryptocurrency market analysis platform based on the CrossOver application. It provides live cryptocurrency market information, EMA-based bullish and bearish trading signals, watchlists, user preferences, and browser notification settings.

The database is designed using PostgreSQL to store user information, cryptocurrency data, market candles, generated signals, signal history, and user preferences.

## 2. First Normal Form (1NF)

A database is in First Normal Form when:
- Each table has a primary key.
- Each column contains atomic (single) values.
- There are no repeating groups or multi-valued attributes.

In XTrend:
- Each user has a unique `user_id`.
- Each cryptocurrency has a unique `crypto_id`.
- Each market candle is stored as an individual record.
- Watchlist entries are stored separately in `watchlist_items`.
- Each signal and signal history entry is stored as an individual row.

Therefore, all tables satisfy 1NF.

## 3. Second Normal Form (2NF)

A database is in Second Normal Form when:
- It is already in 1NF.
- Every non-key attribute depends on the whole primary key.
- There are no partial dependencies.

In XTrend:
- Most tables use a single-column primary key, so their non-key attributes depend on the complete primary key.
- The `watchlist_items` table uses a composite primary key consisting of `watchlist_id` and `crypto_id`.
- The `added_at` attribute depends on the complete combination of `watchlist_id` and `crypto_id`.

Therefore, the tables satisfy 2NF.

## 4. Third Normal Form (3NF)

A database is in Third Normal Form when:
- It is already in 2NF.
- There are no transitive dependencies.
- Non-key attributes depend only on the primary key.

In XTrend:
- User details are stored separately in the `users` table.
- Cryptocurrency details are stored in the `cryptocurrencies` table.
- User preferences are stored in `user_settings`.
- Watchlists and their cryptocurrency entries are separated into `watchlists` and `watchlist_items`.
- Market candle information is stored in `market_candles`.
- Trading signals and their historical records are separated into `signals` and `signal_history`.
- Notification preferences are stored in `alert_preferences`.

This separation reduces data duplication and update anomalies.

Therefore, the database is designed to satisfy 3NF.

## 5. Functional Dependencies

| Table | Functional Dependency |
|---|---|
| users | user_id → user_name, email, password_hash, created_at |
| cryptocurrencies | crypto_id → symbol, crypto_name, is_active |
| user_settings | user_id → beginner_mode, ema_fast, ema_slow, selected_interval, notifications_enabled |
| watchlists | watchlist_id → user_id, watchlist_name, created_at |
| watchlist_items | (watchlist_id, crypto_id) → added_at |
| market_candles | candle_id → crypto_id, interval, open_time, prices, volume |
| signals | signal_id → crypto_id, interval, signal_type, signal_strength, confidence_score, risk_level, signal_time |
| signal_history | history_id → signal_id, recorded_at, signal_status, details |
| alert_preferences | user_id → alerts_enabled, bullish_alert_enabled, bearish_alert_enabled, browser_notifications_enabled |

## 6. Conclusion

The XTrend database is organized into nine related tables. The design follows 1NF, 2NF, and 3NF principles to reduce redundancy, maintain data consistency, and support efficient data retrieval.

The normalized database supports user preferences, cryptocurrency watchlists, market candle storage, EMA-based signal tracking, and notification management.