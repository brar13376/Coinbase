const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Deposit fiat
router.post('/deposit', [
  body('amount').isFloat({ min: 1 }),
  body('currency').isIn(['USD', 'EUR']),
  body('method').isIn(['bank_transfer', 'credit_card', 'debit_card']),
  body('accountId').optional().isString()
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency, method, accountId } = req.body;
    const userId = req.user.userId;

    // Check if user has completed KYC
    const user = await User.findById(userId);
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({ error: 'KYC verification required for fiat deposits' });
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId, currency });
    if (!wallet) {
      wallet = new Wallet({ userId, currency });
      await wallet.save();
    }

    // In production, integrate with payment processors like Stripe, Plaid, etc.
    const depositId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock successful deposit
    wallet.addBalance(amount);
    await wallet.save();

    logger.info(`Fiat deposit: ${amount} ${currency} for user ${userId} via ${method}`);

    res.json({
      message: 'Deposit initiated successfully',
      depositId,
      amount,
      currency,
      status: 'completed',
      walletBalance: wallet.balance
    });
  } catch (error) {
    logger.error('Fiat deposit error:', error);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

// Withdraw fiat
router.post('/withdraw', [
  body('amount').isFloat({ min: 1 }),
  body('currency').isIn(['USD', 'EUR']),
  body('method').isIn(['bank_transfer', 'wire_transfer']),
  body('accountDetails').isObject()
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency, method, accountDetails } = req.body;
    const userId = req.user.userId;

    // Check if user has completed KYC
    const user = await User.findById(userId);
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({ error: 'KYC verification required for fiat withdrawals' });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ userId, currency });
    if (!wallet) {
      return res.status(404).json({ error: `${currency} wallet not found` });
    }

    // Check sufficient balance
    if (wallet.availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check daily withdrawal limit
    const dailyLimit = user.tradingLimits.daily;
    if (amount > dailyLimit) {
      return res.status(400).json({ error: `Amount exceeds daily withdrawal limit of ${dailyLimit} ${currency}` });
    }

    // In production, integrate with payment processors
    const withdrawalId = `wth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock withdrawal processing
    wallet.subtractBalance(amount);
    await wallet.save();

    logger.info(`Fiat withdrawal: ${amount} ${currency} for user ${userId} via ${method}`);

    res.json({
      message: 'Withdrawal initiated successfully',
      withdrawalId,
      amount,
      currency,
      status: 'processing',
      estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      walletBalance: wallet.balance
    });
  } catch (error) {
    logger.error('Fiat withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get deposit methods
router.get('/deposit-methods', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (user.kycStatus !== 'approved') {
      return res.status(403).json({ error: 'KYC verification required' });
    }

    // Mock available deposit methods
    const methods = [
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        currency: ['USD', 'EUR'],
        minAmount: 10,
        maxAmount: 100000,
        fee: 0,
        processingTime: '1-3 business days'
      },
      {
        id: 'credit_card',
        name: 'Credit Card',
        currency: ['USD', 'EUR'],
        minAmount: 10,
        maxAmount: 5000,
        fee: 0.035, // 3.5%
        processingTime: 'Instant'
      },
      {
        id: 'debit_card',
        name: 'Debit Card',
        currency: ['USD', 'EUR'],
        minAmount: 10,
        maxAmount: 10000,
        fee: 0.025, // 2.5%
        processingTime: 'Instant'
      }
    ];

    res.json({ methods });
  } catch (error) {
    logger.error('Get deposit methods error:', error);
    res.status(500).json({ error: 'Failed to get deposit methods' });
  }
});

// Get withdrawal methods
router.get('/withdrawal-methods', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (user.kycStatus !== 'approved') {
      return res.status(403).json({ error: 'KYC verification required' });
    }

    // Mock available withdrawal methods
    const methods = [
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        currency: ['USD', 'EUR'],
        minAmount: 25,
        maxAmount: 100000,
        fee: 0,
        processingTime: '1-3 business days'
      },
      {
        id: 'wire_transfer',
        name: 'Wire Transfer',
        currency: ['USD', 'EUR'],
        minAmount: 100,
        maxAmount: 500000,
        fee: 25,
        processingTime: '1-2 business days'
      }
    ];

    res.json({ methods });
  } catch (error) {
    logger.error('Get withdrawal methods error:', error);
    res.status(500).json({ error: 'Failed to get withdrawal methods' });
  }
});

// Get transaction history
router.get('/transactions', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { type, currency, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    // In production, this would fetch from a transactions collection
    // For now, return mock data
    const mockTransactions = generateMockTransactions(parseInt(limit), type, currency);

    res.json({
      transactions: mockTransactions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: mockTransactions.length
      }
    });
  } catch (error) {
    logger.error('Get transaction history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// Generate mock transaction history
function generateMockTransactions(limit, type, currency) {
  const transactions = [];
  const types = ['deposit', 'withdrawal'];
  const currencies = ['USD', 'EUR'];
  
  for (let i = 0; i < limit; i++) {
    const txType = type || types[Math.floor(Math.random() * types.length)];
    const txCurrency = currency || currencies[Math.floor(Math.random() * currencies.length)];
    const amount = Math.random() * 10000 + 10;
    const statuses = ['completed', 'pending', 'failed'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    transactions.push({
      id: `tx_${Date.now()}_${i}`,
      type: txType,
      currency: txCurrency,
      amount: parseFloat(amount.toFixed(2)),
      status,
      method: txType === 'deposit' ? 'bank_transfer' : 'wire_transfer',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      completedAt: status === 'completed' ? new Date() : null
    });
  }
  
  return transactions.sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = router;