-- Coinbase Clone Database Initialization Script
-- This script creates all necessary tables and initial data for the platform

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS coinbase_clone;
USE coinbase_clone;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(20),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret VARCHAR(255),
    kyc_status VARCHAR(20) DEFAULT 'pending',
    account_status VARCHAR(20) DEFAULT 'active',
    role VARCHAR(20) DEFAULT 'user',
    trading_limits JSONB,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    balance DECIMAL(28,18) DEFAULT 0,
    locked_balance DECIMAL(28,18) DEFAULT 0,
    address VARCHAR(255),
    private_key_encrypted TEXT,
    public_key VARCHAR(255),
    mnemonic_encrypted TEXT,
    wallet_type VARCHAR(20) DEFAULT 'hot',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('market', 'limit', 'stop', 'stop_limit', 'iceberg', 'oco')),
    quantity DECIMAL(28,18) NOT NULL,
    price DECIMAL(28,18),
    stop_price DECIMAL(28,18),
    filled_quantity DECIMAL(28,18) DEFAULT 0,
    remaining_quantity DECIMAL(28,18) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partially_filled', 'filled', 'cancelled', 'rejected')),
    time_in_force VARCHAR(10) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
    fees DECIMAL(28,18) DEFAULT 0,
    average_price DECIMAL(28,18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    filled_at TIMESTAMP
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buy_order_id UUID NOT NULL REFERENCES orders(id),
    sell_order_id UUID NOT NULL REFERENCES orders(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    pair VARCHAR(20) NOT NULL,
    quantity DECIMAL(28,18) NOT NULL,
    price DECIMAL(28,18) NOT NULL,
    total_value DECIMAL(28,18) NOT NULL,
    fees JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create market_data table
CREATE TABLE IF NOT EXISTS market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(20) UNIQUE NOT NULL,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    price DECIMAL(28,18) NOT NULL,
    price_change_24h DECIMAL(28,18) DEFAULT 0,
    price_change_percent_24h DECIMAL(10,4) DEFAULT 0,
    volume_24h DECIMAL(28,18) DEFAULT 0,
    high_24h DECIMAL(28,18) DEFAULT 0,
    low_24h DECIMAL(28,18) DEFAULT 0,
    market_cap DECIMAL(28,18) DEFAULT 0,
    circulating_supply DECIMAL(28,18) DEFAULT 0,
    total_supply DECIMAL(28,18) DEFAULT 0,
    max_supply DECIMAL(28,18) DEFAULT 0,
    order_book JSONB,
    trades JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'trade', 'fee', 'transfer', 'refund', 'staking', 'reward')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(28,18) NOT NULL,
    balance DECIMAL(28,18) NOT NULL,
    reference VARCHAR(255),
    description TEXT,
    metadata JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create kyc_documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    file_path VARCHAR(500),
    file_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create kyc_selfies table
CREATE TABLE IF NOT EXISTS kyc_selfies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fiat_transactions table
CREATE TABLE IF NOT EXISTS fiat_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    method VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(28,18) NOT NULL,
    fee DECIMAL(28,18) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    reference VARCHAR(255),
    external_reference VARCHAR(255),
    metadata JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_pair ON orders(pair);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);

CREATE INDEX IF NOT EXISTS idx_fiat_transactions_user_id ON fiat_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_transactions_type ON fiat_transactions(type);
CREATE INDEX IF NOT EXISTS idx_fiat_transactions_status ON fiat_transactions(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert initial system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('trading_fees', '{"maker": 0.001, "taker": 0.001}', 'Trading fees for maker and taker orders', true),
('withdrawal_limits', '{"daily": 10000, "monthly": 100000}', 'Daily and monthly withdrawal limits', true),
('kyc_required', 'true', 'Whether KYC is required for trading', true),
('maintenance_mode', 'false', 'Whether the system is in maintenance mode', true),
('supported_currencies', '["BTC", "ETH", "BNB", "ADA", "SOL", "DOT", "MATIC", "AVAX", "USD", "EUR"]', 'List of supported currencies', true),
('trading_pairs', '["BTC/USD", "ETH/USD", "BNB/USD", "ADA/USD", "SOL/USD", "DOT/USD", "MATIC/USD", "AVAX/USD"]', 'List of supported trading pairs', true)
ON CONFLICT (key) DO NOTHING;

-- Insert initial market data
INSERT INTO market_data (pair, base_currency, quote_currency, price, price_change_24h, price_change_percent_24h, volume_24h, high_24h, low_24h, market_cap, circulating_supply, total_supply, max_supply) VALUES
('BTC/USD', 'BTC', 'USD', 45000.00, 1500.00, 3.45, 2500000000.00, 46000.00, 43500.00, 850000000000.00, 19000000.00, 19000000.00, 21000000.00),
('ETH/USD', 'ETH', 'USD', 3200.00, 120.00, 3.90, 1800000000.00, 3250.00, 3080.00, 385000000000.00, 120000000.00, 120000000.00, 120000000.00),
('BNB/USD', 'BNB', 'USD', 350.00, 15.00, 4.48, 500000000.00, 360.00, 335.00, 55000000000.00, 157000000.00, 157000000.00, 200000000.00),
('ADA/USD', 'ADA', 'USD', 0.45, 0.02, 4.65, 300000000.00, 0.47, 0.43, 15000000000.00, 33000000000.00, 45000000000.00, 45000000000.00),
('SOL/USD', 'SOL', 'USD', 95.00, 4.50, 4.97, 400000000.00, 98.00, 90.50, 40000000000.00, 420000000.00, 500000000.00, 500000000.00),
('DOT/USD', 'DOT', 'USD', 7.50, 0.35, 4.88, 200000000.00, 7.80, 7.15, 8000000000.00, 1000000000.00, 1000000000.00, 1000000000.00),
('MATIC/USD', 'MATIC', 'USD', 0.85, 0.04, 4.94, 150000000.00, 0.88, 0.81, 8000000000.00, 9000000000.00, 10000000000.00, 10000000000.00),
('AVAX/USD', 'AVAX', 'USD', 25.00, 1.20, 5.04, 180000000.00, 26.00, 23.80, 6000000000.00, 240000000.00, 720000000.00, 720000000.00)
ON CONFLICT (pair) DO NOTHING;

-- Create admin user
INSERT INTO users (email, password_hash, first_name, last_name, role, is_email_verified, kyc_status, account_status) VALUES
('admin@coinbase-clone.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9KzKz2K', 'Admin', 'User', 'admin', true, 'approved', 'active')
ON CONFLICT (email) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_market_data_updated_at BEFORE UPDATE ON market_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for user portfolio
CREATE OR REPLACE VIEW user_portfolio AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    w.currency,
    w.balance,
    w.locked_balance,
    w.balance + w.locked_balance as total_balance,
    md.price,
    (w.balance + w.locked_balance) * COALESCE(md.price, 0) as usd_value
FROM users u
JOIN wallets w ON u.id = w.user_id
LEFT JOIN market_data md ON w.currency = md.base_currency AND md.quote_currency = 'USD'
WHERE w.is_active = true;

-- Create view for trading statistics
CREATE OR REPLACE VIEW trading_stats AS
SELECT 
    pair,
    COUNT(*) as total_trades,
    SUM(quantity) as total_volume,
    AVG(price) as average_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    SUM(total_value) as total_value,
    DATE_TRUNC('day', created_at) as trade_date
FROM trades
GROUP BY pair, DATE_TRUNC('day', created_at)
ORDER BY trade_date DESC;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE coinbase_clone TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Create read-only user for reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'coinbase_readonly') THEN
        CREATE ROLE coinbase_readonly;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE coinbase_clone TO coinbase_readonly;
GRANT USAGE ON SCHEMA public TO coinbase_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO coinbase_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO coinbase_readonly;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO coinbase_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO coinbase_readonly;

COMMIT;