const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const { publishEvent } = require('../services/kafkaService');
const { setCache, getCache, deleteCache } = require('../services/redisService');

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

const router = express.Router();

// JWT verification middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin role verification
const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Credential models (in production, these would be in a database)
const credentials = new Map();

// Get all provider credentials
router.get('/providers', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const allCredentials = Array.from(credentials.values()).map(cred => ({
      id: cred.id,
      provider: cred.provider,
      name: cred.name,
      isActive: cred.isActive,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    }));

    res.json({ credentials: allCredentials });
  } catch (error) {
    logger.error('Get credentials error:', error);
    res.status(500).json({ error: 'Failed to get credentials' });
  }
});

// Get specific provider credentials
router.get('/providers/:provider', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { provider } = req.params;
    const providerCredentials = Array.from(credentials.values())
      .filter(cred => cred.provider === provider)
      .map(cred => ({
        id: cred.id,
        provider: cred.provider,
        name: cred.name,
        isActive: cred.isActive,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt
      }));

    res.json({ credentials: providerCredentials });
  } catch (error) {
    logger.error('Get provider credentials error:', error);
    res.status(500).json({ error: 'Failed to get provider credentials' });
  }
});

// Add new provider credentials
router.post('/providers', [
  body('provider').isIn(['binance', 'coinbase', 'fireblocks', 'bitgo']).withMessage('Invalid provider'),
  body('name').notEmpty().withMessage('Name is required'),
  body('apiKey').notEmpty().withMessage('API key is required'),
  body('apiSecret').notEmpty().withMessage('API secret is required'),
  body('isTestnet').optional().isBoolean(),
  body('additionalConfig').optional().isObject()
], verifyToken, verifyAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { provider, name, apiKey, apiSecret, isTestnet = false, additionalConfig = {} } = req.body;

    // Check if credentials already exist for this provider
    const existingCreds = Array.from(credentials.values())
      .find(cred => cred.provider === provider && cred.name === name);

    if (existingCreds) {
      return res.status(400).json({ error: 'Credentials with this name already exist for this provider' });
    }

    // Encrypt sensitive data
    const encryptedApiKey = await bcrypt.hash(apiKey, 12);
    const encryptedApiSecret = await bcrypt.hash(apiSecret, 12);

    const credential = {
      id: uuidv4(),
      provider,
      name,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      isTestnet,
      additionalConfig,
      isActive: true,
      createdBy: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    credentials.set(credential.id, credential);

    // Cache the credentials
    await setCache(`credentials:${credential.id}`, credential, 3600);

    // Publish event
    await publishEvent('credentials.created', {
      credentialId: credential.id,
      provider: credential.provider,
      name: credential.name,
      createdBy: req.user.userId
    });

    logger.info(`Credentials created for ${provider}: ${name}`);

    res.status(201).json({
      message: 'Credentials created successfully',
      credential: {
        id: credential.id,
        provider: credential.provider,
        name: credential.name,
        isActive: credential.isActive,
        isTestnet: credential.isTestnet,
        createdAt: credential.createdAt
      }
    });
  } catch (error) {
    logger.error('Create credentials error:', error);
    res.status(500).json({ error: 'Failed to create credentials' });
  }
});

// Update provider credentials
router.put('/providers/:id', [
  body('name').optional().notEmpty(),
  body('apiKey').optional().notEmpty(),
  body('apiSecret').optional().notEmpty(),
  body('isTestnet').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  body('additionalConfig').optional().isObject()
], verifyToken, verifyAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, apiKey, apiSecret, isTestnet, isActive, additionalConfig } = req.body;

    const credential = credentials.get(id);
    if (!credential) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    // Update fields
    if (name) credential.name = name;
    if (apiKey) credential.apiKey = await bcrypt.hash(apiKey, 12);
    if (apiSecret) credential.apiSecret = await bcrypt.hash(apiSecret, 12);
    if (isTestnet !== undefined) credential.isTestnet = isTestnet;
    if (isActive !== undefined) credential.isActive = isActive;
    if (additionalConfig) credential.additionalConfig = { ...credential.additionalConfig, ...additionalConfig };

    credential.updatedAt = new Date();
    credential.updatedBy = req.user.userId;

    credentials.set(id, credential);

    // Update cache
    await setCache(`credentials:${id}`, credential, 3600);

    // Publish event
    await publishEvent('credentials.updated', {
      credentialId: id,
      provider: credential.provider,
      name: credential.name,
      updatedBy: req.user.userId
    });

    logger.info(`Credentials updated: ${id}`);

    res.json({
      message: 'Credentials updated successfully',
      credential: {
        id: credential.id,
        provider: credential.provider,
        name: credential.name,
        isActive: credential.isActive,
        isTestnet: credential.isTestnet,
        updatedAt: credential.updatedAt
      }
    });
  } catch (error) {
    logger.error('Update credentials error:', error);
    res.status(500).json({ error: 'Failed to update credentials' });
  }
});

// Delete provider credentials
router.delete('/providers/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const credential = credentials.get(id);
    if (!credential) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    credentials.delete(id);

    // Remove from cache
    await deleteCache(`credentials:${id}`);

    // Publish event
    await publishEvent('credentials.deleted', {
      credentialId: id,
      provider: credential.provider,
      name: credential.name,
      deletedBy: req.user.userId
    });

    logger.info(`Credentials deleted: ${id}`);

    res.json({ message: 'Credentials deleted successfully' });
  } catch (error) {
    logger.error('Delete credentials error:', error);
    res.status(500).json({ error: 'Failed to delete credentials' });
  }
});

// Test provider credentials
router.post('/providers/:id/test', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const credential = credentials.get(id);
    if (!credential) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    // Test the credentials based on provider
    let testResult;
    switch (credential.provider) {
      case 'binance':
        testResult = await testBinanceCredentials(credential);
        break;
      case 'coinbase':
        testResult = await testCoinbaseCredentials(credential);
        break;
      case 'fireblocks':
        testResult = await testFireblocksCredentials(credential);
        break;
      case 'bitgo':
        testResult = await testBitgoCredentials(credential);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported provider' });
    }

    res.json({
      message: 'Credentials test completed',
      result: testResult
    });
  } catch (error) {
    logger.error('Test credentials error:', error);
    res.status(500).json({ error: 'Failed to test credentials' });
  }
});

// Test Binance credentials
async function testBinanceCredentials(credential) {
  try {
    const axios = require('axios');
    const crypto = require('crypto');

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac('sha256', credential.apiSecret)
      .update(queryString)
      .digest('hex');

    const response = await axios.get(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': credential.apiKey
        }
      }
    );

    return {
      success: true,
      message: 'Binance credentials are valid',
      data: {
        accountType: response.data.accountType,
        canTrade: response.data.canTrade,
        canWithdraw: response.data.canWithdraw
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Binance credentials test failed',
      error: error.response?.data?.msg || error.message
    };
  }
}

// Test Coinbase credentials
async function testCoinbaseCredentials(credential) {
  try {
    const axios = require('axios');

    const response = await axios.get('https://api.exchange.coinbase.com/accounts', {
      headers: {
        'CB-ACCESS-KEY': credential.apiKey,
        'CB-ACCESS-SIGN': credential.apiSecret,
        'CB-ACCESS-TIMESTAMP': Date.now().toString(),
        'CB-ACCESS-PASSPHRASE': credential.additionalConfig.passphrase || ''
      }
    });

    return {
      success: true,
      message: 'Coinbase credentials are valid',
      data: {
        accountsCount: response.data.length
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Coinbase credentials test failed',
      error: error.response?.data?.message || error.message
    };
  }
}

// Test Fireblocks credentials
async function testFireblocksCredentials(credential) {
  try {
    const axios = require('axios');

    const response = await axios.get('https://api.fireblocks.io/v1/vault/accounts', {
      headers: {
        'Authorization': `Bearer ${credential.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      message: 'Fireblocks credentials are valid',
      data: {
        vaultAccountsCount: response.data.length
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Fireblocks credentials test failed',
      error: error.response?.data?.message || error.message
    };
  }
}

// Test BitGo credentials
async function testBitgoCredentials(credential) {
  try {
    const axios = require('axios');

    const response = await axios.get('https://app.bitgo.com/api/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${credential.apiKey}`
      }
    });

    return {
      success: true,
      message: 'BitGo credentials are valid',
      data: {
        username: response.data.username,
        email: response.data.email
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'BitGo credentials test failed',
      error: error.response?.data?.error || error.message
    };
  }
}

// Get credential usage statistics
router.get('/providers/:id/usage', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '24h' } = req.query;

    const credential = credentials.get(id);
    if (!credential) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    // Get usage statistics from cache or database
    const usageStats = await getCache(`credential_usage:${id}:${period}`) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastUsed: null,
      averageResponseTime: 0
    };

    res.json({
      credentialId: id,
      provider: credential.provider,
      period,
      usage: usageStats
    });
  } catch (error) {
    logger.error('Get credential usage error:', error);
    res.status(500).json({ error: 'Failed to get credential usage' });
  }
});

// Rotate credentials
router.post('/providers/:id/rotate', [
  body('newApiKey').notEmpty().withMessage('New API key is required'),
  body('newApiSecret').notEmpty().withMessage('New API secret is required')
], verifyToken, verifyAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { newApiKey, newApiSecret } = req.body;

    const credential = credentials.get(id);
    if (!credential) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    // Test new credentials first
    const testResult = await testBinanceCredentials({
      ...credential,
      apiKey: newApiKey,
      apiSecret: newApiSecret
    });

    if (!testResult.success) {
      return res.status(400).json({ error: 'New credentials are invalid' });
    }

    // Update credentials
    credential.apiKey = await bcrypt.hash(newApiKey, 12);
    credential.apiSecret = await bcrypt.hash(newApiSecret, 12);
    credential.updatedAt = new Date();
    credential.updatedBy = req.user.userId;

    credentials.set(id, credential);

    // Update cache
    await setCache(`credentials:${id}`, credential, 3600);

    // Publish event
    await publishEvent('credentials.rotated', {
      credentialId: id,
      provider: credential.provider,
      name: credential.name,
      rotatedBy: req.user.userId
    });

    logger.info(`Credentials rotated: ${id}`);

    res.json({
      message: 'Credentials rotated successfully',
      credential: {
        id: credential.id,
        provider: credential.provider,
        name: credential.name,
        updatedAt: credential.updatedAt
      }
    });
  } catch (error) {
    logger.error('Rotate credentials error:', error);
    res.status(500).json({ error: 'Failed to rotate credentials' });
  }
});

module.exports = router;