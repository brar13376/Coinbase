const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');

const router = express.Router();

// Get user profile
router.get('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.getPublicProfile() });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().isMobilePhone(),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('address.country').optional().trim()
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowedUpdates = ['firstName', 'lastName', 'phone', 'address'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    logger.info(`Profile updated for user: ${user.email}`);

    res.json({ 
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user wallets
router.get('/wallets', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const wallets = await Wallet.find({ userId: req.user.userId, isActive: true });
    const walletSummaries = wallets.map(wallet => wallet.getSummary());

    res.json({ wallets: walletSummaries });
  } catch (error) {
    logger.error('Get wallets error:', error);
    res.status(500).json({ error: 'Failed to get wallets' });
  }
});

// Create wallet
router.post('/wallets', [
  body('currency').isLength({ min: 3, max: 10 }).withMessage('Currency must be 3-10 characters')
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currency } = req.body;
    const userId = req.user.userId;

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({ userId, currency: currency.toUpperCase() });
    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet already exists for this currency' });
    }

    // Create new wallet
    const wallet = new Wallet({
      userId,
      currency: currency.toUpperCase()
    });

    // Generate wallet address and keys for crypto currencies
    if (currency.toUpperCase() !== 'USD' && currency.toUpperCase() !== 'EUR') {
      wallet.generateWallet();
    }

    await wallet.save();

    logger.info(`Wallet created for user ${userId}: ${currency.toUpperCase()}`);

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet: wallet.getSummary()
    });
  } catch (error) {
    logger.error('Create wallet error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// Get user trading limits
router.get('/trading-limits', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ tradingLimits: user.tradingLimits });
  } catch (error) {
    logger.error('Get trading limits error:', error);
    res.status(500).json({ error: 'Failed to get trading limits' });
  }
});

// Update user preferences
router.put('/preferences', [
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('language').optional().isLength({ min: 2, max: 5 }),
  body('notifications.email').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean(),
  body('notifications.push').optional().isBoolean()
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowedUpdates = ['currency', 'language', 'notifications'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user.preferences[field] = { ...user.preferences[field], ...req.body[field] };
      }
    });

    await user.save();

    logger.info(`Preferences updated for user: ${user.email}`);

    res.json({ 
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user activity
router.get('/activity', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    // This would typically fetch from an activity log collection
    // For now, we'll return a placeholder
    const activities = [];

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0
      }
    });
  } catch (error) {
    logger.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// Delete account
router.delete('/account', [
  body('password').notEmpty(),
  body('confirmation').equals('DELETE')
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password, confirmation } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Soft delete - mark account as banned
    user.accountStatus = 'banned';
    await user.save();

    logger.info(`Account deleted for user: ${user.email}`);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;