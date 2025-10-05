// Mock email service - in production, integrate with SendGrid, AWS SES, etc.
const logger = require('../utils/logger');

const sendVerificationEmail = async (email, token) => {
  try {
    // In production, send actual email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    
    logger.info(`Verification email would be sent to ${email}: ${verificationUrl}`);
    
    // Mock success
    return { success: true };
  } catch (error) {
    logger.error('Email verification error:', error);
    throw error;
  }
};

const sendPasswordResetEmail = async (email, token) => {
  try {
    // In production, send actual email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
    
    logger.info(`Password reset email would be sent to ${email}: ${resetUrl}`);
    
    // Mock success
    return { success: true };
  } catch (error) {
    logger.error('Password reset email error:', error);
    throw error;
  }
};

const sendWelcomeEmail = async (email, firstName) => {
  try {
    logger.info(`Welcome email would be sent to ${email} for ${firstName}`);
    return { success: true };
  } catch (error) {
    logger.error('Welcome email error:', error);
    throw error;
  }
};

const sendKYCApprovalEmail = async (email, firstName) => {
  try {
    logger.info(`KYC approval email would be sent to ${email} for ${firstName}`);
    return { success: true };
  } catch (error) {
    logger.error('KYC approval email error:', error);
    throw error;
  }
};

const sendKYCRejectionEmail = async (email, firstName, reason) => {
  try {
    logger.info(`KYC rejection email would be sent to ${email} for ${firstName}. Reason: ${reason}`);
    return { success: true };
  } catch (error) {
    logger.error('KYC rejection email error:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendKYCApprovalEmail,
  sendKYCRejectionEmail
};