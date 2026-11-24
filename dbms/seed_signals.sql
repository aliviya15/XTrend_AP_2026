-- Supplementary Seed Data for XTrend Intelligence Platform
-- Compliant with dbms/03_schema.sql and dbms/04_queries.sql
-- Clearly labeled: Academic / Institutional Simulation Dataset

-- 1. Alert Preferences
INSERT INTO alert_preferences (user_id, alerts_enabled, bullish_alert_enabled, bearish_alert_enabled, browser_notifications_enabled)
VALUES
(1, TRUE, TRUE, TRUE, TRUE),
(2, TRUE, TRUE, FALSE, TRUE),
(3, TRUE, FALSE, TRUE, FALSE),
(4, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (user_id) DO UPDATE SET
    alerts_enabled = EXCLUDED.alerts_enabled,
    bullish_alert_enabled = EXCLUDED.bullish_alert_enabled,
    bearish_alert_enabled = EXCLUDED.bearish_alert_enabled,
    browser_notifications_enabled = EXCLUDED.browser_notifications_enabled;

-- 2. Market Candles (60 hourly candles for BTC, ETH, SOL, BNB to support EMA 20 & EMA 50 crossover visualization)
-- Base times starting 60 hours ago up to current time
DO $$
DECLARE
    curr_t TIMESTAMP := DATE_TRUNC('hour', NOW());
    i INTEGER;
    btc_p NUMERIC := 94200.00;
    eth_p NUMERIC := 3150.00;
    sol_p NUMERIC := 178.00;
    bnb_p NUMERIC := 640.00;
    step_t TIMESTAMP;
    v_open NUMERIC;
    v_high NUMERIC;
    v_low NUMERIC;
    v_close NUMERIC;
    v_vol NUMERIC;
BEGIN
    FOR i IN REVERSE 60..1 LOOP
        step_t := curr_t - (i || ' hours')::INTERVAL;
        
        -- BTCUSDT (id: 1)
        btc_p := btc_p + ((SIN(i * 0.4) * 350.00) + (COS(i * 0.7) * 200.00))::numeric;
        v_open := ROUND(btc_p::numeric, 2);
        v_high := ROUND((btc_p + 280.00 + (ABS(SIN(i)) * 120))::numeric, 2);
        v_low := ROUND((btc_p - 240.00 - (ABS(COS(i)) * 90))::numeric, 2);
        v_close := ROUND((btc_p + ((SIN(i * 0.6)) * 180.00))::numeric, 2);
        v_vol := ROUND((110.0 + (ABS(SIN(i * 0.5)) * 95.0))::numeric, 4);
        
        INSERT INTO market_candles (crypto_id, interval, open_time, open_price, high_price, low_price, close_price, volume)
        VALUES (1, '1h', step_t, v_open, v_high, v_low, v_close, v_vol)
        ON CONFLICT (crypto_id, interval, open_time) DO NOTHING;

        -- ETHUSDT (id: 2)
        eth_p := eth_p + ((SIN(i * 0.5) * 25.00) + (COS(i * 0.8) * 18.00))::numeric;
        v_open := ROUND(eth_p::numeric, 2);
        v_high := ROUND((eth_p + 22.00 + (ABS(SIN(i)) * 14))::numeric, 2);
        v_low := ROUND((eth_p - 19.00 - (ABS(COS(i)) * 11))::numeric, 2);
        v_close := ROUND((eth_p + ((COS(i * 0.4)) * 15.00))::numeric, 2);
        v_vol := ROUND((650.0 + (ABS(COS(i * 0.7)) * 420.0))::numeric, 4);
        
        INSERT INTO market_candles (crypto_id, interval, open_time, open_price, high_price, low_price, close_price, volume)
        VALUES (2, '1h', step_t, v_open, v_high, v_low, v_close, v_vol)
        ON CONFLICT (crypto_id, interval, open_time) DO NOTHING;

        -- SOLUSDT (id: 3)
        sol_p := sol_p + ((SIN(i * 0.6) * 2.80) + (COS(i * 0.3) * 1.90))::numeric;
        v_open := ROUND(sol_p::numeric, 2);
        v_high := ROUND((sol_p + 2.50 + (ABS(SIN(i)) * 1.2))::numeric, 2);
        v_low := ROUND((sol_p - 2.10 - (ABS(COS(i)) * 0.9))::numeric, 2);
        v_close := ROUND((sol_p + ((SIN(i * 0.3)) * 1.60))::numeric, 2);
        v_vol := ROUND((1800.0 + (ABS(SIN(i * 0.4)) * 1200.0))::numeric, 4);
        
        INSERT INTO market_candles (crypto_id, interval, open_time, open_price, high_price, low_price, close_price, volume)
        VALUES (3, '1h', step_t, v_open, v_high, v_low, v_close, v_vol)
        ON CONFLICT (crypto_id, interval, open_time) DO NOTHING;

        -- BNBUSDT (id: 4)
        bnb_p := bnb_p + ((COS(i * 0.5) * 4.50) + (SIN(i * 0.9) * 3.20))::numeric;
        v_open := ROUND(bnb_p::numeric, 2);
        v_high := ROUND((bnb_p + 5.00 + (ABS(SIN(i)) * 2.5))::numeric, 2);
        v_low := ROUND((bnb_p - 4.50 - (ABS(COS(i)) * 2.0))::numeric, 2);
        v_close := ROUND((bnb_p + ((COS(i * 0.7)) * 3.80))::numeric, 2);
        v_vol := ROUND((800.0 + (ABS(COS(i * 0.3)) * 550.0))::numeric, 4);
        
        INSERT INTO market_candles (crypto_id, interval, open_time, open_price, high_price, low_price, close_price, volume)
        VALUES (4, '1h', step_t, v_open, v_high, v_low, v_close, v_vol)
        ON CONFLICT (crypto_id, interval, open_time) DO NOTHING;
    END LOOP;
END $$;

-- 3. Signals (Populating signals for Queries 6, 7, 9, 10, 12)
-- Distribution: BTC=6, ETH=5, SOL=3, BNB=2 (Total 16, avg 4.0; BTC & ETH > avg for Query 12)
INSERT INTO signals (crypto_id, interval, signal_type, signal_strength, confidence_score, risk_level, signal_time)
VALUES
-- BTCUSDT Signals (6)
(1, '1h', 'BULLISH', 92.50, 94.20, 'LOW', NOW() - INTERVAL '2 hours'),
(1, '1h', 'BULLISH', 88.00, 89.50, 'LOW', NOW() - INTERVAL '8 hours'),
(1, '4h', 'BEARISH', 74.00, 78.50, 'MODERATE', NOW() - INTERVAL '18 hours'),
(1, '1h', 'BULLISH', 81.50, 84.00, 'LOW', NOW() - INTERVAL '26 hours'),
(1, '1h', 'BEARISH', 68.00, 71.00, 'HIGH', NOW() - INTERVAL '36 hours'),
(1, '4h', 'BULLISH', 95.00, 96.50, 'LOW', NOW() - INTERVAL '48 hours'),

-- ETHUSDT Signals (5)
(2, '1h', 'BULLISH', 86.40, 88.00, 'LOW', NOW() - INTERVAL '3 hours'),
(2, '1h', 'BEARISH', 79.20, 82.50, 'MODERATE', NOW() - INTERVAL '11 hours'),
(2, '4h', 'BULLISH', 84.00, 85.00, 'LOW', NOW() - INTERVAL '22 hours'),
(2, '1h', 'BEARISH', 71.50, 73.00, 'HIGH', NOW() - INTERVAL '31 hours'),
(2, '1h', 'BULLISH', 90.00, 91.50, 'LOW', NOW() - INTERVAL '44 hours'),

-- SOLUSDT Signals (3)
(3, '1h', 'BULLISH', 89.00, 90.50, 'LOW', NOW() - INTERVAL '5 hours'),
(3, '4h', 'BEARISH', 65.00, 68.00, 'HIGH', NOW() - INTERVAL '19 hours'),
(3, '1h', 'BULLISH', 76.50, 79.00, 'MODERATE', NOW() - INTERVAL '38 hours'),

-- BNBUSDT Signals (2)
(4, '1h', 'BEARISH', 77.00, 80.50, 'MODERATE', NOW() - INTERVAL '6 hours'),
(4, '4h', 'BULLISH', 82.00, 83.50, 'LOW', NOW() - INTERVAL '29 hours');

-- 4. Signal History (Audit logs with JSONB details for Query 9)
INSERT INTO signal_history (signal_id, recorded_at, signal_status, details)
SELECT 
    s.signal_id,
    s.signal_time + INTERVAL '10 minutes',
    CASE 
        WHEN s.confidence_score >= 90 THEN 'CONFIRMED_EXECUTION'
        WHEN s.confidence_score >= 80 THEN 'ACTIVE_MONITORING'
        ELSE 'PENDING_CONFIRMATION'
    END,
    jsonb_build_object(
        'ema_fast', 20,
        'ema_slow', 50,
        'indicator', 'EMA_CROSSOVER',
        'crossover_status', CASE WHEN s.signal_type = 'BULLISH' THEN 'GOLDEN_CROSS' ELSE 'DEATH_CROSS' END,
        'confidence_score', s.confidence_score,
        'risk_profile', s.risk_level,
        'audit_engine', 'XTrend Intelligence Core v2.0',
        'verification', 'Verified by relational schema audit'
    )
FROM signals s;
