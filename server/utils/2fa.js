const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const generate2FASecret = (email) => {
  const secret = speakeasy.generateSecret({
    name: `Coinbase Clone (${email})`,
    issuer: 'Coinbase Clone',
    length: 32
  });

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url
  };
};

const verify2FA = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps (60 seconds) of variance
  });
};

const generateQRCode = async (secret) => {
  try {
    const qrCodeUrl = await QRCode.toDataURL(secret);
    return qrCodeUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

module.exports = {
  generate2FASecret,
  verify2FA,
  generateQRCode
};