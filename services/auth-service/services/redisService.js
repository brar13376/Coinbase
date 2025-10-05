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
      logger.info('Redis connected successfully');
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

// Cache operations
const setCache = async (key, value, ttl = 3600) => {
  try {
    const client = getRedisClient();
    await client.setEx(key, ttl, JSON.stringify(value));
    logger.debug(`Cached key: ${key}`);
  } catch (error) {
    logger.error(`Failed to set cache for key ${key}:`, error);
  }
};

const getCache = async (key) => {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    if (value) {
      logger.debug(`Cache hit for key: ${key}`);
      return JSON.parse(value);
    }
    logger.debug(`Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    logger.error(`Failed to get cache for key ${key}:`, error);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
    logger.debug(`Deleted cache key: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete cache for key ${key}:`, error);
  }
};

// Session management
const setSession = async (sessionId, sessionData, ttl = 86400) => {
  try {
    const client = getRedisClient();
    await client.setEx(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
    logger.debug(`Session created: ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to set session ${sessionId}:`, error);
  }
};

const getSession = async (sessionId) => {
  try {
    const client = getRedisClient();
    const sessionData = await client.get(`session:${sessionId}`);
    if (sessionData) {
      logger.debug(`Session retrieved: ${sessionId}`);
      return JSON.parse(sessionData);
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get session ${sessionId}:`, error);
    return null;
  }
};

const deleteSession = async (sessionId) => {
  try {
    const client = getRedisClient();
    await client.del(`session:${sessionId}`);
    logger.debug(`Session deleted: ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to delete session ${sessionId}:`, error);
  }
};

// Rate limiting
const checkRateLimit = async (key, limit, window) => {
  try {
    const client = getRedisClient();
    const current = await client.incr(`rate_limit:${key}`);
    
    if (current === 1) {
      await client.expire(`rate_limit:${key}`, window);
    }
    
    return current <= limit;
  } catch (error) {
    logger.error(`Failed to check rate limit for key ${key}:`, error);
    return true; // Allow request if rate limiting fails
  }
};

// Blacklist management
const addToBlacklist = async (token, ttl = 86400) => {
  try {
    const client = getRedisClient();
    await client.setEx(`blacklist:${token}`, ttl, '1');
    logger.debug(`Token blacklisted: ${token.substring(0, 10)}...`);
  } catch (error) {
    logger.error(`Failed to blacklist token:`, error);
  }
};

const isBlacklisted = async (token) => {
  try {
    const client = getRedisClient();
    const result = await client.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    logger.error(`Failed to check blacklist for token:`, error);
    return false;
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  setSession,
  getSession,
  deleteSession,
  checkRateLimit,
  addToBlacklist,
  isBlacklisted
};