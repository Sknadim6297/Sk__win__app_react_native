const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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

/**
 * Send OTP email when SMTP is configured; otherwise log for fast admin testing.
 */
async function deliverAdminOtp(email, otp) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@warezone.app';

  if (host && user && pass) {
    try {
      // Optional dependency — only required when SMTP is configured
      // eslint-disable-next-line import/no-extraneous-dependencies, global-require
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: email,
        subject: 'WAREZONE Admin — Password reset OTP',
        text: `Your WAREZONE admin password reset OTP is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your WAREZONE admin password reset OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
      });
      return { sent: true, channel: 'email' };
    } catch (err) {
      console.error('[admin-otp] email send failed:', err.message);
      console.log(`[admin-otp] FALLBACK OTP for ${email}: ${otp}`);
      return { sent: false, channel: 'log', error: err.message };
    }
  }

  console.log(`[admin-otp] ${email} => ${otp} (SMTP not configured — console delivery)`);
  return { sent: false, channel: 'log' };
}

function shouldExposeDebugOtp() {
  if (String(process.env.ADMIN_OTP_DEBUG || '').toLowerCase() === 'true') return true;
  return process.env.NODE_ENV !== 'production';
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
