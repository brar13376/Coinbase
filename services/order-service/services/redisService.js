const redis = require('redis');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

let redisClient = null;

const initializeRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully for order service');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Redis initialization failed:', error);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

// Order book caching
const cacheOrderBook = async (pair, orderBook, ttl = 60) => {
  try {
    const client = getRedisClient();
    await client.setEx(`orderbook:${pair}`, ttl, JSON.stringify(orderBook));
    logger.debug(`Cached order book for pair: ${pair}`);
  } catch (error) {
    logger.error(`Failed to cache order book for pair ${pair}:`, error);
  }
};

const getCachedOrderBook = async (pair) => {
  try {
    const client = getRedisClient();
    const value = await client.get(`orderbook:${pair}`);
    if (value) {
      logger.debug(`Cache hit for order book: ${pair}`);
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get cached order book for pair ${pair}:`, error);
    return null;
  }
};

// Trade history caching
const cacheTradeHistory = async (pair, trades, ttl = 300) => {
  try {
    const client = getRedisClient();
    await client.setEx(`trades:${pair}`, ttl, JSON.stringify(trades));
    logger.debug(`Cached trade history for pair: ${pair}`);
  } catch (error) {
    logger.error(`Failed to cache trade history for pair ${pair}:`, error);
  }
};

const getCachedTradeHistory = async (pair) => {
  try {
    const client = getRedisClient();
    const value = await client.get(`trades:${pair}`);
    if (value) {
      logger.debug(`Cache hit for trade history: ${pair}`);
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get cached trade history for pair ${pair}:`, error);
    return null;
  }
};

// User order caching
const cacheUserOrders = async (userId, orders, ttl = 60) => {
  try {
    const client = getRedisClient();
    await client.setEx(`user_orders:${userId}`, ttl, JSON.stringify(orders));
    logger.debug(`Cached user orders for user: ${userId}`);
  } catch (error) {
    logger.error(`Failed to cache user orders for user ${userId}:`, error);
  }
};

const getCachedUserOrders = async (userId) => {
  try {
    const client = getRedisClient();
    const value = await client.get(`user_orders:${userId}`);
    if (value) {
      logger.debug(`Cache hit for user orders: ${userId}`);
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get cached user orders for user ${userId}:`, error);
    return null;
  }
};

// Market data caching
const cacheMarketData = async (pair, data, ttl = 30) => {
  try {
    const client = getRedisClient();
    await client.setEx(`market_data:${pair}`, ttl, JSON.stringify(data));
    logger.debug(`Cached market data for pair: ${pair}`);
  } catch (error) {
    logger.error(`Failed to cache market data for pair ${pair}:`, error);
  }
};

const getCachedMarketData = async (pair) => {
  try {
    const client = getRedisClient();
    const value = await client.get(`market_data:${pair}`);
    if (value) {
      logger.debug(`Cache hit for market data: ${pair}`);
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get cached market data for pair ${pair}:`, error);
    return null;
  }
};

// Rate limiting for order placement
const checkOrderRateLimit = async (userId, limit = 100, window = 60) => {
  try {
    const client = getRedisClient();
    const key = `order_rate_limit:${userId}`;
    const current = await client.incr(key);
    
    if (current === 1) {
      await client.expire(key, window);
    }
    
    return current <= limit;
  } catch (error) {
    logger.error(`Failed to check order rate limit for user ${userId}:`, error);
    return true; // Allow request if rate limiting fails
  }
};

// Lock management for order processing
const acquireOrderLock = async (orderId, ttl = 30) => {
  try {
    const client = getRedisClient();
    const key = `order_lock:${orderId}`;
    const result = await client.set(key, '1', {
      EX: ttl,
      NX: true
    });
    return result === 'OK';
  } catch (error) {
    logger.error(`Failed to acquire order lock for ${orderId}:`, error);
    return false;
  }
};

const releaseOrderLock = async (orderId) => {
  try {
    const client = getRedisClient();
    await client.del(`order_lock:${orderId}`);
    logger.debug(`Released order lock: ${orderId}`);
  } catch (error) {
    logger.error(`Failed to release order lock for ${orderId}:`, error);
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  cacheOrderBook,
  getCachedOrderBook,
  cacheTradeHistory,
  getCachedTradeHistory,
  cacheUserOrders,
  getCachedUserOrders,
  cacheMarketData,
  getCachedMarketData,
  checkOrderRateLimit,
  acquireOrderLock,
  releaseOrderLock
};