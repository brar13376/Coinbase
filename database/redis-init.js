// Redis Initialization Script for Coinbase Clone
// This script sets up Redis with initial configuration and data

const redis = require('redis');

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

// Create Redis client
const client = redis.createClient({
    url: REDIS_URL,
    password: REDIS_PASSWORD
});

// Handle Redis events
client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

client.on('connect', () => {
    console.log('🔌 Connected to Redis');
});

client.on('ready', () => {
    console.log('✅ Redis client ready');
});

// Initial configuration data
const initialConfig = {
    // Rate limiting configuration
    'rate_limit:global': '1000',
    'rate_limit:auth': '10',
    'rate_limit:trading': '100',
    'rate_limit:api': '1000',
    
    // Session configuration
    'session:ttl': '86400', // 24 hours
    'session:cleanup_interval': '3600', // 1 hour
    
    // Cache configuration
    'cache:market_data:ttl': '30', // 30 seconds
    'cache:order_book:ttl': '1', // 1 second
    'cache:user_data:ttl': '300', // 5 minutes
    'cache:system_settings:ttl': '3600', // 1 hour
    
    // Trading configuration
    'trading:maintenance_mode': 'false',
    'trading:min_order_size': '0.001',
    'trading:max_order_size': '1000000',
    'trading:price_precision': '8',
    'trading:quantity_precision': '8',
    
    // Security configuration
    'security:max_login_attempts': '5',
    'security:lockout_duration': '900', // 15 minutes
    'security:password_min_length': '8',
    'security:password_require_special': 'true',
    
    // Notification configuration
    'notifications:email_enabled': 'true',
    'notifications:sms_enabled': 'false',
    'notifications:push_enabled': 'true',
    
    // Market data configuration
    'market_data:update_interval': '1000', // 1 second
    'market_data:history_retention': '2592000', // 30 days
    'market_data:price_alerts_enabled': 'true',
    
    // System status
    'system:status': 'online',
    'system:version': '1.0.0',
    'system:last_restart': new Date().toISOString(),
    'system:uptime': '0'
};

// Initialize Redis
async function initializeRedis() {
    try {
        console.log('🔌 Connecting to Redis...');
        await client.connect();
        console.log('✅ Connected to Redis successfully');
        
        // Set initial configuration
        console.log('⚙️  Setting initial configuration...');
        for (const [key, value] of Object.entries(initialConfig)) {
            await client.set(key, value);
            console.log(`✅ Set ${key}: ${value}`);
        }
        
        // Create initial data structures
        console.log('📊 Creating initial data structures...');
        
        // Create sets for tracking
        await client.sAdd('active_users', []);
        await client.sAdd('online_users', []);
        await client.sAdd('maintenance_mode', []);
        
        // Create sorted sets for leaderboards
        await client.zAdd('trading_volume_24h', []);
        await client.zAdd('user_rankings', []);
        
        // Create hash for system metrics
        await client.hSet('system_metrics', {
            total_users: '0',
            active_trades: '0',
            total_volume_24h: '0',
            system_load: '0.0',
            memory_usage: '0',
            disk_usage: '0'
        });
        
        // Create hash for market status
        await client.hSet('market_status', {
            btc_usd: 'active',
            eth_usd: 'active',
            bnb_usd: 'active',
            ada_usd: 'active',
            sol_usd: 'active'
        });
        
        // Set up expiration for temporary data
        await client.expire('rate_limit:global', 900); // 15 minutes
        await client.expire('rate_limit:auth', 900); // 15 minutes
        await client.expire('rate_limit:trading', 900); // 15 minutes
        await client.expire('rate_limit:api', 900); // 15 minutes
        
        // Create channels for pub/sub
        console.log('📡 Setting up pub/sub channels...');
        const channels = [
            'market_data',
            'trades',
            'orders',
            'notifications',
            'system_alerts',
            'user_updates'
        ];
        
        for (const channel of channels) {
            await client.publish(channel, JSON.stringify({
                type: 'channel_initialized',
                timestamp: new Date().toISOString(),
                message: `Channel ${channel} initialized`
            }));
            console.log(`✅ Initialized channel: ${channel}`);
        }
        
        // Set up monitoring keys
        console.log('📈 Setting up monitoring keys...');
        await client.set('monitoring:last_health_check', new Date().toISOString());
        await client.set('monitoring:last_cleanup', new Date().toISOString());
        await client.set('monitoring:error_count', '0');
        await client.set('monitoring:warning_count', '0');
        
        // Create backup of current configuration
        console.log('💾 Creating configuration backup...');
        const configBackup = {};
        for (const key of Object.keys(initialConfig)) {
            const value = await client.get(key);
            configBackup[key] = value;
        }
        await client.set('backup:initial_config', JSON.stringify(configBackup));
        
        console.log('🎉 Redis initialization completed successfully!');
        console.log('📋 Configuration summary:');
        console.log(`   - Rate limiting: Global ${await client.get('rate_limit:global')}/15min`);
        console.log(`   - Session TTL: ${await client.get('session:ttl')} seconds`);
        console.log(`   - Market data TTL: ${await client.get('cache:market_data:ttl')} seconds`);
        console.log(`   - System status: ${await client.get('system:status')}`);
        console.log(`   - Maintenance mode: ${await client.get('trading:maintenance_mode')}`);
        
    } catch (error) {
        console.error('❌ Redis initialization failed:', error.message);
        process.exit(1);
    } finally {
        await client.quit();
    }
}

// Health check function
async function healthCheck() {
    try {
        await client.connect();
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            redis_version: await client.info('server'),
            memory_usage: await client.memory('usage'),
            connected_clients: await client.info('clients'),
            uptime: await client.info('server')
        };
        
        console.log('🏥 Redis Health Check:', JSON.stringify(health, null, 2));
        return health;
    } catch (error) {
        console.error('❌ Redis health check failed:', error.message);
        return { status: 'unhealthy', error: error.message };
    } finally {
        await client.quit();
    }
}

// Cleanup function
async function cleanup() {
    try {
        await client.connect();
        
        console.log('🧹 Starting Redis cleanup...');
        
        // Clean expired keys
        const expiredKeys = await client.keys('*:expired:*');
        if (expiredKeys.length > 0) {
            await client.del(expiredKeys);
            console.log(`✅ Cleaned ${expiredKeys.length} expired keys`);
        }
        
        // Clean old rate limit data
        const rateLimitKeys = await client.keys('rate_limit:*');
        for (const key of rateLimitKeys) {
            const ttl = await client.ttl(key);
            if (ttl === -1) { // No expiration set
                await client.expire(key, 900); // Set 15 minute expiration
            }
        }
        
        // Clean old session data
        const sessionKeys = await client.keys('session:*');
        for (const key of sessionKeys) {
            const ttl = await client.ttl(key);
            if (ttl === -1) { // No expiration set
                await client.expire(key, 86400); // Set 24 hour expiration
            }
        }
        
        // Update system metrics
        await client.hSet('system_metrics', {
            last_cleanup: new Date().toISOString(),
            cleanup_count: (await client.hGet('system_metrics', 'cleanup_count') || '0') + 1
        });
        
        console.log('✅ Redis cleanup completed');
        
    } catch (error) {
        console.error('❌ Redis cleanup failed:', error.message);
    } finally {
        await client.quit();
    }
}

// Run initialization if this file is executed directly
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'init':
            initializeRedis();
            break;
        case 'health':
            healthCheck();
            break;
        case 'cleanup':
            cleanup();
            break;
        default:
            console.log('Usage: node redis-init.js [init|health|cleanup]');
            process.exit(1);
    }
}

module.exports = {
    initializeRedis,
    healthCheck,
    cleanup
};