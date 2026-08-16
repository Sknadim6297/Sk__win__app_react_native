const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { deliverOtp } = require('./otpDelivery');

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function hashValue(value) {
  return bcrypt.hash(String(value), 10);
}

async function compareHash(value, hash) {
  return bcrypt.compare(String(value), hash);
}

function shouldExposeDebugOtp() {
  if (String(process.env.ADMIN_OTP_DEBUG || process.env.OTP_DEBUG || '').toLowerCase() === 'true') {
    return true;
  }
  return process.env.NODE_ENV !== 'production';
}

/** @deprecated use deliverOtp from otpDelivery — kept for older admin-only callers */
async function deliverAdminOtp(email, otp) {
  return deliverOtp({ email, otp, channel: 'email' });
}

module.exports = {
  OTP_TTL_MS,
  RESET_TOKEN_TTL_MS,
  MAX_ATTEMPTS,
  generateOtp,
  generateResetToken,
  hashValue,
  compareHash,
  deliverAdminOtp,
  shouldExposeDebugOtp,
};
