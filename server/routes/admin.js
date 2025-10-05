const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const MarketData = require('../models/MarketData');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to check admin access
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.email !== 'admin@coinbase-clone.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({ error: 'Admin verification failed' });
  }
};

// Get dashboard statistics
router.get('/dashboard', passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ accountStatus: 'active' });
    const pendingKYC = await User.countDocuments({ kycStatus: 'pending' });
    const totalWallets = await Wallet.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalTrades = await Trade.countDocuments();

    // Calculate total volume (mock data)
    const totalVolume = 1000000; // In production, calculate from actual trades

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email createdAt accountStatus');

    const recentTrades = await Trade.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email');

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        pendingKYC,
        totalWallets,
        totalOrders,
        totalTrades,
        totalVolume
      },
      recentUsers,
      recentTrades
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
});

// Get all users
router.get('/users', passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const { status, kycStatus, limit = 50, offset = 0 } = req.query;
    
    const filter = {};
    if (status) filter.accountStatus = status;
    if (kycStatus) filter.kycStatus = kycStatus;

    const users = await User.find(filter)
      .select('-password -twoFactorSecret -securityQuestions -apiKeys')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json({ users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user details
router.get('/users/:userId', passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -twoFactorSecret -securityQuestions -apiKeys');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wallets = await Wallet.find({ userId });
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(20);
    const trades = await Trade.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    }).sort({ timestamp: -1 }).limit(20);

    res.json({
      user,
      wallets: wallets.map(w => w.getSummary()),
      orders: orders.map(o => o.getSummary()),
      trades: trades.map(t => t.getSummary())
    });
  } catch (error) {
    logger.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Update user status
router.put('/users/:userId/status', [
  body('status').isIn(['active', 'suspended', 'banned', 'pending_verification'])
], passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { status } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.accountStatus = status;
    await user.save();

    logger.info(`User status updated: ${user.email} -> ${status}`);

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get all orders
router.get('/orders', passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const { status, pair, limit = 50, offset = 0 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (pair) filter.pair = pair;

    const orders = await Order.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json({ orders: orders.map(o => o.getSummary()) });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get all trades
router.get('/trades', passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const { pair, limit = 50, offset = 0 } = req.query;
    
    const filter = {};
    if (pair) filter.pair = pair;

    const trades = await Trade.find(filter)
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json({ trades: trades.map(t => t.getSummary()) });
  } catch (error) {
    logger.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// Get market data
router.get('/market-data', passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const marketData = await MarketData.find({ isActive: true });
    res.json({ marketData: marketData.map(m => m.getSummary()) });
  } catch (error) {
    logger.error('Get market data error:', error);
    res.status(500).json({ error: 'Failed to get market data' });
  }
});

// Update market data
router.put('/market-data/:pair', [
  body('price').isFloat({ min: 0 }),
  body('volume24h').optional().isFloat({ min: 0 }),
  body('high24h').optional().isFloat({ min: 0 }),
  body('low24h').optional().isFloat({ min: 0 })
], passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pair } = req.params;
    const { price, volume24h, high24h, low24h } = req.body;
    
    const marketData = await MarketData.findOne({ pair: pair.toUpperCase() });
    if (!marketData) {
      return res.status(404).json({ error: 'Trading pair not found' });
    }

    marketData.updatePrice(price);
    if (volume24h !== undefined) marketData.volume24h = volume24h;
    if (high24h !== undefined) marketData.high24h = high24h;
    if (low24h !== undefined) marketData.low24h = low24h;
    
    await marketData.save();

    logger.info(`Market data updated for ${pair}: ${price}`);

    res.json({ message: 'Market data updated successfully' });
  } catch (error) {
    logger.error('Update market data error:', error);
    res.status(500).json({ error: 'Failed to update market data' });
  }
});

// Get system logs
router.get('/logs', passport.authenticate('jwt', { session: false }), requireAdmin, async (req, res) => {
  try {
    const { level, limit = 100 } = req.query;
    
    // In production, this would fetch from a logging service
    const mockLogs = generateMockLogs(parseInt(limit), level);
    
    res.json({ logs: mockLogs });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Generate mock logs
function generateMockLogs(limit, level) {
  const logs = [];
  const levels = ['info', 'warn', 'error'];
  const messages = [
    'User login successful',
    'Order created',
    'Trade executed',
    'KYC document uploaded',
    'Wallet created',
    'Password reset requested',
    '2FA enabled',
    'Deposit processed',
    'Withdrawal initiated',
    'Market data updated'
  ];
  
  for (let i = 0; i < limit; i++) {
    const logLevel = level || levels[Math.floor(Math.random() * levels.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    logs.push({
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      level: logLevel,
      message,
      userId: Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 1000)}` : null,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`
    });
  }
  
  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

module.exports = router;