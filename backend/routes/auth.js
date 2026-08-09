const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const WalletTransaction = require('../models/WalletTransaction');
const AdminPasswordReset = require('../models/AdminPasswordReset');
const adminReset = require('../services/adminPasswordReset');
const { getUniqueReferralCode, ensureUserReferralCode } = require('../utils/referral');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFERRAL_BONUS = 25;

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, referralCode } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedReferralCode = referralCode ? referralCode.trim().toUpperCase() : '';
    let referredBy = null;

    if (normalizedReferralCode) {
      referredBy = await User.findOne({ referralCode: normalizedReferralCode }).select('_id referralCode');
      if (!referredBy) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
    }

    const ownReferralCode = await getUniqueReferralCode(username);

    // Create user
    user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      referralCode: ownReferralCode,
      referredBy: referredBy?._id || null,
      wallet: {
        balance: 0,
        bonusBalance: 0,
        bonusUsed: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalWinnings: 0,
      },
    });

    await user.save();

    if (referredBy) {
      const referrer = await User.findById(referredBy._id);
      if (referrer) {
        referrer.wallet.bonusBalance = (referrer.wallet.bonusBalance || 0) + REFERRAL_BONUS;
        referrer.updatedAt = new Date();
        await referrer.save();

        await WalletTransaction.create({
          userId: referrer._id,
          type: 'referral_bonus',
          amount: REFERRAL_BONUS,
          description: `Referral bonus: ${username} joined using your code`,
          status: 'completed',
        });

        await Notification.create({
          userId: referrer._id,
          type: 'wallet',
          title: 'Referral Bonus Credited',
          message: `You earned ₹${REFERRAL_BONUS} referral bonus because ${username} joined using your referral code.`,
        });
      }
    }

    await Notification.create({
      userId: user._id,
      type: 'system',
      title: 'Welcome to WarZone Free Fire Tournament',
      message: 'Registration successful. Login to start playing tournaments.',
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        wallet: user.wallet,
      },
      referralApplied: Boolean(referredBy),
    });
  } catch (error) {
    console.error('Register error:', error);
    const isDbError =
      error.name === 'MongooseError' ||
      error.message?.includes('buffering timed out') ||
      error.message?.includes('ECONNREFUSED');
    res.status(isDbError ? 503 : 500).json({
      error: isDbError
        ? 'Database unavailable. Start MongoDB and restart the backend server.'
        : 'Registration failed',
      message: error.message,
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user (case-insensitive email)
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Backfill missing referral code for old users.
    await ensureUserReferralCode(user);

    // Check user status
    if (user.status === 'banned') {
      return res.status(403).json({ error: `Account banned: ${user.banReason}` });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified,
        wallet: user.wallet,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    const isDbError =
      error.name === 'MongooseError' ||
      error.message?.includes('buffering timed out') ||
      error.message?.includes('ECONNREFUSED');
    res.status(isDbError ? 503 : 500).json({
      error: isDbError
        ? 'Database unavailable. Start MongoDB and restart the backend server.'
        : 'Login failed',
      message: error.message,
    });
  }
});

// Forgot password — users: contact support; admins: email OTP → reset
router.post('/forgot-password', async (req, res) => {
  try {
    const emailRaw = String(req.body?.email || '').trim().toLowerCase();
    if (!emailRaw || !emailRaw.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email' });
    }

    const support = {
      email: process.env.SUPPORT_EMAIL || 'support@warzoneff.com',
      phone: process.env.SUPPORT_PHONE || '+91 6297616918',
      teamLabel: 'WAREZONE Support Team',
    };

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${emailRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    // Non-admin (or unknown): contact team — no self-serve reset
    if (!user || user.role !== 'admin') {
      return res.json({
        type: 'user',
        message: 'Password reset for players is handled by our team. Please contact support.',
        support,
      });
    }

    const otp = adminReset.generateOtp();
    const otpHash = await adminReset.hashValue(otp);
    const otpExpiresAt = new Date(Date.now() + adminReset.OTP_TTL_MS);

    await AdminPasswordReset.deleteMany({ email: emailRaw, used: false });
    await AdminPasswordReset.create({
      email: emailRaw,
      userId: user._id,
      otpHash,
      otpExpiresAt,
    });

    const delivery = await adminReset.deliverAdminOtp(emailRaw, otp);
    const payload = {
      type: 'admin',
      message: delivery.sent
        ? 'OTP sent to your admin email. Enter it to reset your password.'
        : 'OTP generated. Check your email (or server logs if SMTP is not configured).',
      email: emailRaw,
      expiresInSeconds: Math.floor(adminReset.OTP_TTL_MS / 1000),
    };
    if (adminReset.shouldExposeDebugOtp()) {
      payload.debugOtp = otp;
    }
    return res.json(payload);
  } catch (error) {
    console.error('forgot-password:', error);
    res.status(500).json({ error: 'Failed to start password reset' });
  }
});

router.post('/admin/verify-otp', async (req, res) => {
  try {
    const emailRaw = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();
    if (!emailRaw || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const record = await AdminPasswordReset.findOne({
      email: emailRaw,
      used: false,
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ error: 'No active reset request. Request a new OTP.' });
    }
    if (record.attempts >= adminReset.MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
    }
    if (new Date(record.otpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }

    const ok = await adminReset.compareHash(otp, record.otpHash);
    record.attempts += 1;
    if (!ok) {
      await record.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const resetToken = adminReset.generateResetToken();
    record.verified = true;
    record.resetTokenHash = await adminReset.hashValue(resetToken);
    record.resetTokenExpiresAt = new Date(Date.now() + adminReset.RESET_TOKEN_TTL_MS);
    await record.save();

    res.json({
      message: 'OTP verified. Set your new password.',
      resetToken,
      email: emailRaw,
      expiresInSeconds: Math.floor(adminReset.RESET_TOKEN_TTL_MS / 1000),
    });
  } catch (error) {
    console.error('verify-otp:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

router.post('/admin/reset-password', async (req, res) => {
  try {
    const emailRaw = String(req.body?.email || '').trim().toLowerCase();
    const resetToken = String(req.body?.resetToken || '').trim();
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!emailRaw || !resetToken || !password) {
      return res.status(400).json({ error: 'Email, reset token, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const record = await AdminPasswordReset.findOne({
      email: emailRaw,
      used: false,
      verified: true,
    }).sort({ createdAt: -1 });

    if (!record?.resetTokenHash || !record.resetTokenExpiresAt) {
      return res.status(400).json({ error: 'Reset session invalid. Verify OTP again.' });
    }
    if (new Date(record.resetTokenExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset session expired. Start again.' });
    }

    const tokenOk = await adminReset.compareHash(resetToken, record.resetTokenHash);
    if (!tokenOk) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const user = await User.findById(record.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin account not found' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.updatedAt = new Date();
    await user.save();

    record.used = true;
    await record.save();
    await AdminPasswordReset.updateMany(
      { email: emailRaw, used: false },
      { $set: { used: true } }
    );

    res.json({ message: 'Admin password updated. You can login now.' });
  } catch (error) {
    console.error('reset-password:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
