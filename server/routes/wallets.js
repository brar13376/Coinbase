const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get user's wallets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const wallets = await Wallet.find({ userId: req.user.id }).select('-privateKey');
    res.json({ success: true, wallets });
  } catch (error) {
    logger.error('Get wallets error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Get specific wallet
router.get('/:walletId', authenticateToken, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ 
      _id: req.params.walletId, 
      userId: req.user.id 
    }).select('-privateKey');
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json({ success: true, wallet });
  } catch (error) {
    logger.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Create new wallet
router.post('/', [
  authenticateToken,
  body('currency').isLength({ min: 3, max: 10 }).withMessage('Invalid currency'),
  body('type').isIn(['hot', 'cold']).withMessage('Invalid wallet type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currency, type = 'hot' } = req.body;

    // Check if wallet already exists for this currency
    const existingWallet = await Wallet.findOne({ 
      userId: req.user.id, 
      currency: currency.toUpperCase() 
    });

    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet already exists for this currency' });
    }

    // Generate wallet address (simplified - in production, use proper key generation)
    const address = generateWalletAddress(currency);
    const privateKey = generatePrivateKey(); // In production, use secure key generation

    const wallet = new Wallet({
      userId: req.user.id,
      currency: currency.toUpperCase(),
      address,
      privateKey, // In production, encrypt this
      type,
      balance: 0
    });

    await wallet.save();

    // Remove private key from response
    const walletResponse = wallet.toObject();
    delete walletResponse.privateKey;

    res.status(201).json({ 
      success: true, 
      wallet: walletResponse,
      message: 'Wallet created successfully' 
    });
  } catch (error) {
    logger.error('Create wallet error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// Update wallet balance
router.put('/:walletId/balance', [
  authenticateToken,
  body('balance').isFloat({ min: 0 }).withMessage('Invalid balance')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { balance } = req.body;
    const wallet = await Wallet.findOneAndUpdate(
      { _id: req.params.walletId, userId: req.user.id },
      { balance },
      { new: true }
    ).select('-privateKey');

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ 
      success: true, 
      wallet,
      message: 'Balance updated successfully' 
    });
  } catch (error) {
    logger.error('Update wallet balance error:', error);
    res.status(500).json({ error: 'Failed to update wallet balance' });
  }
});

// Get wallet transactions
router.get('/:walletId/transactions', authenticateToken, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ 
      _id: req.params.walletId, 
      userId: req.user.id 
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // In a real implementation, you would fetch from a transactions collection
    // For now, return empty array
    const transactions = [];

    res.json({ success: true, transactions });
  } catch (error) {
    logger.error('Get wallet transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Delete wallet (only if balance is 0)
router.delete('/:walletId', authenticateToken, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ 
      _id: req.params.walletId, 
      userId: req.user.id 
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance > 0) {
      return res.status(400).json({ error: 'Cannot delete wallet with balance' });
    }

    await Wallet.findByIdAndDelete(req.params.walletId);

    res.json({ 
      success: true, 
      message: 'Wallet deleted successfully' 
    });
  } catch (error) {
    logger.error('Delete wallet error:', error);
    res.status(500).json({ error: 'Failed to delete wallet' });
  }
});

// Helper functions (simplified - in production, use proper cryptographic libraries)
function generateWalletAddress(currency) {
  const prefix = currency.toUpperCase() === 'BTC' ? '1' : '0x';
  const randomString = Math.random().toString(36).substring(2, 15);
  return prefix + randomString + Math.random().toString(36).substring(2, 15);
}

function generatePrivateKey() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

module.exports = router;