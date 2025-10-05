const express = require('express');
const passport = require('passport');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendKYCApprovalEmail, sendKYCRejectionEmail } = require('../services/emailService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/kyc/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.userId}-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get KYC status
router.get('/status', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      kycStatus: user.kycStatus,
      documents: user.kycDocuments,
      selfieImage: user.selfieImage
    });
  } catch (error) {
    logger.error('Get KYC status error:', error);
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

// Upload KYC documents
router.post('/documents', [
  body('documentType').isIn(['passport', 'drivers_license', 'national_id']),
  body('frontImage').notEmpty(),
  body('backImage').optional()
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentType, frontImage, backImage } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if document type already exists
    const existingDoc = user.kycDocuments.find(doc => doc.type === documentType);
    if (existingDoc) {
      return res.status(400).json({ error: 'Document type already uploaded' });
    }

    // Add document
    user.kycDocuments.push({
      type: documentType,
      frontImage,
      backImage,
      status: 'pending'
    });

    // Update KYC status
    if (user.kycStatus === 'not_started') {
      user.kycStatus = 'pending';
    }

    await user.save();

    logger.info(`KYC document uploaded for user ${user.email}: ${documentType}`);

    res.json({
      message: 'Document uploaded successfully',
      kycStatus: user.kycStatus
    });
  } catch (error) {
    logger.error('Upload KYC document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Upload selfie
router.post('/selfie', upload.single('selfie'), passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No selfie image provided' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.selfieImage = req.file.path;
    await user.save();

    logger.info(`Selfie uploaded for user ${user.email}`);

    res.json({
      message: 'Selfie uploaded successfully',
      selfieImage: user.selfieImage
    });
  } catch (error) {
    logger.error('Upload selfie error:', error);
    res.status(500).json({ error: 'Failed to upload selfie' });
  }
});

// Submit KYC for review
router.post('/submit', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if all required documents are uploaded
    if (user.kycDocuments.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one identity document' });
    }

    if (!user.selfieImage) {
      return res.status(400).json({ error: 'Please upload a selfie' });
    }

    // Update status to pending review
    user.kycStatus = 'pending';
    await user.save();

    logger.info(`KYC submitted for review by user ${user.email}`);

    res.json({
      message: 'KYC submitted for review',
      kycStatus: user.kycStatus
    });
  } catch (error) {
    logger.error('Submit KYC error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

// Admin: Approve KYC
router.post('/approve/:userId', [
  body('reason').optional().trim()
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Check if user is admin (in production, implement proper admin role check)
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || adminUser.email !== 'admin@coinbase-clone.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.kycStatus = 'approved';
    user.accountStatus = 'active';
    await user.save();

    // Send approval email
    await sendKYCApprovalEmail(user.email, user.firstName);

    logger.info(`KYC approved for user ${user.email}`);

    res.json({
      message: 'KYC approved successfully',
      kycStatus: user.kycStatus
    });
  } catch (error) {
    logger.error('Approve KYC error:', error);
    res.status(500).json({ error: 'Failed to approve KYC' });
  }
});

// Admin: Reject KYC
router.post('/reject/:userId', [
  body('reason').notEmpty().trim()
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || adminUser.email !== 'admin@coinbase-clone.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { reason } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.kycStatus = 'rejected';
    await user.save();

    // Send rejection email
    await sendKYCRejectionEmail(user.email, user.firstName, reason);

    logger.info(`KYC rejected for user ${user.email}. Reason: ${reason}`);

    res.json({
      message: 'KYC rejected successfully',
      kycStatus: user.kycStatus
    });
  } catch (error) {
    logger.error('Reject KYC error:', error);
    res.status(500).json({ error: 'Failed to reject KYC' });
  }
});

// Get all pending KYC submissions (Admin)
router.get('/pending', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || adminUser.email !== 'admin@coinbase-clone.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingUsers = await User.find({ kycStatus: 'pending' })
      .select('firstName lastName email kycDocuments selfieImage createdAt');

    res.json({ pendingUsers });
  } catch (error) {
    logger.error('Get pending KYC error:', error);
    res.status(500).json({ error: 'Failed to get pending KYC submissions' });
  }
});

module.exports = router;