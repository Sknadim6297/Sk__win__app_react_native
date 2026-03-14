const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const WalletTransaction = require('../models/WalletTransaction');
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
      title: 'Welcome to SK Win',
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
    res.status(500).json({ error: 'Registration failed', message: error.message });
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

    // Find user
    const user = await User.findOne({ email });
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
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

module.exports = router;
