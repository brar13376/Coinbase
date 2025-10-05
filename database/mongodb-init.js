// MongoDB Initialization Script for Coinbase Clone
// This script creates all necessary collections and initial data

const { MongoClient } = require('mongodb');

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/coinbase-clone?authSource=admin';
const DB_NAME = 'coinbase-clone';

// Collections to create
const collections = [
    'users',
    'wallets',
    'orders',
    'trades',
    'market_data',
    'transactions',
    'kyc_documents',
    'kyc_selfies',
    'fiat_transactions',
    'admin_actions',
    'system_settings',
    'notifications',
    'api_keys',
    'audit_logs',
    'sessions',
    'rate_limits',
    'failed_logins',
    'email_verifications',
    'password_resets',
    'two_fa_codes'
];

// Indexes to create
const indexes = {
    users: [
        { key: { email: 1 }, unique: true },
        { key: { phone: 1 }, sparse: true },
        { key: { kyc_status: 1 } },
        { key: { account_status: 1 } },
        { key: { role: 1 } },
        { key: { created_at: -1 } },
        { key: { last_login: -1 } }
    ],
    wallets: [
        { key: { user_id: 1, currency: 1 }, unique: true },
        { key: { address: 1 }, sparse: true },
        { key: { currency: 1 } },
        { key: { is_active: 1 } }
    ],
    orders: [
        { key: { user_id: 1, created_at: -1 } },
        { key: { pair: 1, created_at: -1 } },
        { key: { status: 1 } },
        { key: { side: 1 } },
        { key: { type: 1 } },
        { key: { created_at: -1 } }
    ],
    trades: [
        { key: { buyer_id: 1, created_at: -1 } },
        { key: { seller_id: 1, created_at: -1 } },
        { key: { pair: 1, created_at: -1 } },
        { key: { created_at: -1 } }
    ],
    market_data: [
        { key: { pair: 1 }, unique: true },
        { key: { base_currency: 1 } },
        { key: { quote_currency: 1 } },
        { key: { is_active: 1 } }
    ],
    transactions: [
        { key: { user_id: 1, created_at: -1 } },
        { key: { type: 1 } },
        { key: { currency: 1 } },
        { key: { status: 1 } },
        { key: { created_at: -1 } }
    ],
    kyc_documents: [
        { key: { user_id: 1 } },
        { key: { document_type: 1 } },
        { key: { status: 1 } }
    ],
    kyc_selfies: [
        { key: { user_id: 1 } },
        { key: { status: 1 } }
    ],
    fiat_transactions: [
        { key: { user_id: 1, created_at: -1 } },
        { key: { type: 1 } },
        { key: { status: 1 } },
        { key: { method: 1 } }
    ],
    admin_actions: [
        { key: { admin_id: 1, created_at: -1 } },
        { key: { action: 1 } },
        { key: { target_type: 1 } },
        { key: { created_at: -1 } }
    ],
    system_settings: [
        { key: { key: 1 }, unique: true },
        { key: { is_public: 1 } }
    ],
    notifications: [
        { key: { user_id: 1, created_at: -1 } },
        { key: { is_read: 1 } },
        { key: { type: 1 } },
        { key: { created_at: -1 } }
    ],
    api_keys: [
        { key: { user_id: 1 } },
        { key: { key_hash: 1 }, unique: true },
        { key: { is_active: 1 } }
    ],
    audit_logs: [
        { key: { user_id: 1, created_at: -1 } },
        { key: { action: 1 } },
        { key: { resource: 1 } },
        { key: { created_at: -1 } }
    ],
    sessions: [
        { key: { user_id: 1 } },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 }
    ],
    rate_limits: [
        { key: { ip: 1, endpoint: 1 } },
        { key: { user_id: 1, endpoint: 1 } },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 }
    ],
    failed_logins: [
        { key: { email: 1, created_at: -1 } },
        { key: { ip: 1, created_at: -1 } },
        { key: { created_at: 1 }, expireAfterSeconds: 3600 }
    ],
    email_verifications: [
        { key: { token: 1 }, unique: true },
        { key: { user_id: 1 } },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 }
    ],
    password_resets: [
        { key: { token: 1 }, unique: true },
        { key: { user_id: 1 } },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 }
    ],
    two_fa_codes: [
        { key: { user_id: 1 } },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 }
    ]
};

// Initial data to insert
const initialData = {
    system_settings: [
        {
            key: 'trading_fees',
            value: { maker: 0.001, taker: 0.001 },
            description: 'Trading fees for maker and taker orders',
            is_public: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            key: 'withdrawal_limits',
            value: { daily: 10000, monthly: 100000 },
            description: 'Daily and monthly withdrawal limits',
            is_public: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            key: 'kyc_required',
            value: true,
            description: 'Whether KYC is required for trading',
            is_public: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            key: 'maintenance_mode',
            value: false,
            description: 'Whether the system is in maintenance mode',
            is_public: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            key: 'supported_currencies',
            value: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'MATIC', 'AVAX', 'USD', 'EUR'],
            description: 'List of supported currencies',
            is_public: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            key: 'trading_pairs',
            value: ['BTC/USD', 'ETH/USD', 'BNB/USD', 'ADA/USD', 'SOL/USD', 'DOT/USD', 'MATIC/USD', 'AVAX/USD'],
            description: 'List of supported trading pairs',
            is_public: true,
            created_at: new Date(),
            updated_at: new Date()
        }
    ],
    market_data: [
        {
            pair: 'BTC/USD',
            base_currency: 'BTC',
            quote_currency: 'USD',
            price: 45000.00,
            price_change_24h: 1500.00,
            price_change_percent_24h: 3.45,
            volume_24h: 2500000000.00,
            high_24h: 46000.00,
            low_24h: 43500.00,
            market_cap: 850000000000.00,
            circulating_supply: 19000000.00,
            total_supply: 19000000.00,
            max_supply: 21000000.00,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            pair: 'ETH/USD',
            base_currency: 'ETH',
            quote_currency: 'USD',
            price: 3200.00,
            price_change_24h: 120.00,
            price_change_percent_24h: 3.90,
            volume_24h: 1800000000.00,
            high_24h: 3250.00,
            low_24h: 3080.00,
            market_cap: 385000000000.00,
            circulating_supply: 120000000.00,
            total_supply: 120000000.00,
            max_supply: 120000000.00,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            pair: 'BNB/USD',
            base_currency: 'BNB',
            quote_currency: 'USD',
            price: 350.00,
            price_change_24h: 15.00,
            price_change_percent_24h: 4.48,
            volume_24h: 500000000.00,
            high_24h: 360.00,
            low_24h: 335.00,
            market_cap: 55000000000.00,
            circulating_supply: 157000000.00,
            total_supply: 157000000.00,
            max_supply: 200000000.00,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            pair: 'ADA/USD',
            base_currency: 'ADA',
            quote_currency: 'USD',
            price: 0.45,
            price_change_24h: 0.02,
            price_change_percent_24h: 4.65,
            volume_24h: 300000000.00,
            high_24h: 0.47,
            low_24h: 0.43,
            market_cap: 15000000000.00,
            circulating_supply: 33000000000.00,
            total_supply: 45000000000.00,
            max_supply: 45000000000.00,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            pair: 'SOL/USD',
            base_currency: 'SOL',
            quote_currency: 'USD',
            price: 95.00,
            price_change_24h: 4.50,
            price_change_percent_24h: 4.97,
            volume_24h: 400000000.00,
            high_24h: 98.00,
            low_24h: 90.50,
            market_cap: 40000000000.00,
            circulating_supply: 420000000.00,
            total_supply: 500000000.00,
            max_supply: 500000000.00,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        }
    ],
    users: [
        {
            email: 'admin@coinbase-clone.com',
            password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9KzKz2K', // admin123
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_email_verified: true,
            kyc_status: 'approved',
            account_status: 'active',
            trading_limits: {
                daily_deposit: 100000,
                daily_withdrawal: 100000,
                daily_trade: 1000000
            },
            preferences: {
                currency: 'USD',
                language: 'en',
                theme: 'dark',
                notifications: {
                    email: true,
                    sms: false,
                    push: true
                }
            },
            created_at: new Date(),
            updated_at: new Date()
        }
    ]
};

// Initialize MongoDB
async function initializeMongoDB() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected to MongoDB successfully');
        
        const db = client.db(DB_NAME);
        
        // Create collections
        console.log('📁 Creating collections...');
        for (const collectionName of collections) {
            try {
                await db.createCollection(collectionName);
                console.log(`✅ Created collection: ${collectionName}`);
            } catch (error) {
                if (error.code === 48) { // Collection already exists
                    console.log(`⚠️  Collection already exists: ${collectionName}`);
                } else {
                    console.log(`❌ Error creating collection ${collectionName}:`, error.message);
                }
            }
        }
        
        // Create indexes
        console.log('🔍 Creating indexes...');
        for (const [collectionName, collectionIndexes] of Object.entries(indexes)) {
            try {
                const collection = db.collection(collectionName);
                for (const index of collectionIndexes) {
                    try {
                        await collection.createIndex(index.key, {
                            unique: index.unique || false,
                            sparse: index.sparse || false,
                            expireAfterSeconds: index.expireAfterSeconds || null
                        });
                        console.log(`✅ Created index on ${collectionName}: ${JSON.stringify(index.key)}`);
                    } catch (error) {
                        if (error.code === 85) { // Index already exists
                            console.log(`⚠️  Index already exists on ${collectionName}: ${JSON.stringify(index.key)}`);
                        } else {
                            console.log(`❌ Error creating index on ${collectionName}:`, error.message);
                        }
                    }
                }
            } catch (error) {
                console.log(`❌ Error processing collection ${collectionName}:`, error.message);
            }
        }
        
        // Insert initial data
        console.log('📊 Inserting initial data...');
        for (const [collectionName, data] of Object.entries(initialData)) {
            try {
                const collection = db.collection(collectionName);
                const result = await collection.insertMany(data, { ordered: false });
                console.log(`✅ Inserted ${result.insertedCount} documents into ${collectionName}`);
            } catch (error) {
                if (error.code === 11000) { // Duplicate key error
                    console.log(`⚠️  Some documents already exist in ${collectionName}`);
                } else {
                    console.log(`❌ Error inserting data into ${collectionName}:`, error.message);
                }
            }
        }
        
        console.log('🎉 MongoDB initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ MongoDB initialization failed:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run initialization if this file is executed directly
if (require.main === module) {
    initializeMongoDB();
}

module.exports = {
    initializeMongoDB,
    collections,
    indexes,
    initialData
};