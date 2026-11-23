INSERT INTO cryptocurrencies (symbol, crypto_name, is_active)
VALUES
('BTCUSDT', 'Bitcoin', TRUE),
('ETHUSDT', 'Ethereum', TRUE),
('SOLUSDT', 'Solana', TRUE),
('BNBUSDT', 'BNB', TRUE);
-- Sample Users
INSERT INTO users (user_name, email, password_hash)
VALUES
('Alex', 'alex@example.com', 'hash_alex_123'),
('Riya', 'riya@example.com', 'hash_riya_123'),
('Sam', 'sam@example.com', 'hash_sam_123'),
('Jordan', 'jordan@example.com', 'hash_jordan_123');