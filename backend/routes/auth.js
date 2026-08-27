const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const WalletTransaction = require('../models/WalletTransaction');
const AdminPasswordReset = require('../models/AdminPasswordReset');
const adminReset = require('../services/adminPasswordReset');
const otpDelivery = require('../services/otpDelivery');
const { verifyGoogleIdToken, isGoogleAuthConfigured } = require('../services/googleAuth');
const { getUniqueReferralCode, ensureUserReferralCode } = require('../utils/referral');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFERRAL_BONUS = 25;

// Register
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      confirmPassword,
      referralCode,
      firstName,
      lastName,
      phone,
      phoneNumber,
    } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide username, email and password' });
    }

    if (confirmPassword != null && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanedUsername = String(username).trim();
    const cleanedEmail = String(email).trim().toLowerCase();
    const cleanedFirst = String(firstName || '').trim();
    const cleanedLast = String(lastName || '').trim();
    const rawPhone = String(phone || phoneNumber || '').replace(/\D/g, '');
    const cleanedPhone =
      rawPhone.length === 12 && rawPhone.startsWith('91')
        ? rawPhone.slice(2)
        : rawPhone.length === 11 && rawPhone.startsWith('0')
          ? rawPhone.slice(1)
          : rawPhone;

    if (cleanedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (!cleanedEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email' });
    }
    if (cleanedPhone && cleanedPhone.length !== 10) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }

    // Check if user already exists
    const orChecks = [{ email: cleanedEmail }, { username: cleanedUsername }];
    if (cleanedPhone) {
      orChecks.push({ phone: cleanedPhone }, { phoneNumber: cleanedPhone });
    }
    let user = await User.findOne({ $or: orChecks });
    if (user) {
      if (String(user.email).toLowerCase() === cleanedEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (String(user.username).toLowerCase() === cleanedUsername.toLowerCase()) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      return res.status(400).json({ error: 'Mobile number already registered' });
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

    const ownReferralCode = await getUniqueReferralCode(cleanedUsername);
    const displayName = [cleanedFirst, cleanedLast].filter(Boolean).join(' ').trim();

    // Create user
    user = new User({
      username: cleanedUsername,
      email: cleanedEmail,
      firstName: cleanedFirst,
      lastName: cleanedLast,
      name: displayName || cleanedUsername,
      phone: cleanedPhone,
      phoneNumber: cleanedPhone,
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
          description: `Referral bonus: ${cleanedUsername} joined using your code`,
          status: 'completed',
        });

        await Notification.create({
          userId: referrer._id,
          type: 'wallet',
          title: 'Referral Bonus Credited',
          message: `You earned ₹${REFERRAL_BONUS} referral bonus because ${cleanedUsername} joined using your referral code.`,
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
      { userId: user._id, role: user.role, v: user.authVersion },
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
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        phone: user.phone,
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

// Login — email, username, or phone
router.post('/login', async (req, res) => {
  try {
    const { email, password, identifier } = req.body;
    const loginId = String(identifier || email || '').trim();

    // Validation
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please provide email/username/phone and password' });
    }

    const escaped = loginId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const digitsOnly = loginId.replace(/\D/g, '');
    const phoneDigits =
      digitsOnly.length === 12 && digitsOnly.startsWith('91')
        ? digitsOnly.slice(2)
        : digitsOnly.length === 11 && digitsOnly.startsWith('0')
          ? digitsOnly.slice(1)
          : digitsOnly;

    const orQuery = [
      { email: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
    ];
    if (phoneDigits.length >= 10) {
      orQuery.push({ phone: phoneDigits }, { phoneNumber: phoneDigits });
    }

    const user = await User.findOne({ $or: orQuery });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password (Google-only accounts must use Google sign-in)
    if (user.authProvider === 'google' || !user.password) {
      return res.status(400).json({
        error: 'This account uses Google sign-in. Tap Continue with Google.',
        code: 'GOOGLE_AUTH_REQUIRED',
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
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
      { userId: user._id, role: user.role, v: user.authVersion },
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
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        phone: user.phone,
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

// Admin panel login — same credentials, admin role required
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (user.authProvider === 'google' || !user.password) {
      return res.status(400).json({ error: 'This account uses Google sign-in.' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role, v: user.authVersion }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name || user.username,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

async function buildUniqueUsername(baseRaw) {
  const base =
    String(baseRaw || 'player')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 14) || 'player';
  let candidate = base.length >= 3 ? base : `${base}user`;
  for (let i = 0; i < 20; i += 1) {
    const exists = await User.findOne({ username: candidate }).select('_id');
    if (!exists) return candidate;
    candidate = `${base}${i + 1}`.slice(0, 20);
  }
  return `user${Date.now().toString(36).slice(-6)}`;
}

function formatAuthUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    verified: user.verified,
    wallet: user.wallet,
    referralCode: user.referralCode,
    authProvider: user.authProvider,
    profilePhoto: user.profilePhoto,
  };
}

// Google Sign-In — verify ID token, login or register user
router.post('/google', async (req, res) => {
  try {
    const idToken = String(req.body?.idToken || '').trim();
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }
    if (!isGoogleAuthConfigured()) {
      return res.status(503).json({
        error: 'Google Sign-In is not configured on the server',
        code: 'GOOGLE_NOT_CONFIGURED',
      });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (verifyErr) {
      console.error('Google token verify failed:', verifyErr.message);
      return res.status(verifyErr.status || 401).json({
        error: verifyErr.message || 'Google sign-in failed',
        code: verifyErr.code || 'GOOGLE_TOKEN_INVALID',
      });
    }

    const googleId = payload.sub;
    const email = String(payload.email).trim().toLowerCase();
    const displayName = String(payload.name || payload.given_name || '').trim();
    const picture = payload.picture ? String(payload.picture) : '';

    let isNewUser = false;
    let user =
      (await User.findOne({ googleId })) ||
      (await User.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      }));

    if (user) {
      if (user.role === 'admin') {
        return res.status(403).json({ error: 'Admins must use email/password login' });
      }
      if (user.status === 'banned') {
        return res.status(403).json({ error: `Account banned: ${user.banReason}` });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Account suspended' });
      }

      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = user.password ? user.authProvider : 'google';
      }
      if (displayName && !user.name) user.name = displayName;
      if (picture && !user.profilePhoto) user.profilePhoto = picture;
      user.verified = true;
      user.updatedAt = new Date();
      await user.save();
    } else {
      isNewUser = true;
      const username = await buildUniqueUsername(
        payload.given_name || email.split('@')[0] || 'player'
      );
      const referralCode = await getUniqueReferralCode(username);

      user = new User({
        username,
        email,
        password: '',
        googleId,
        authProvider: 'google',
        name: displayName || username,
        profilePhoto: picture,
        role: 'user',
        verified: true,
        referralCode,
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

      await Notification.create({
        userId: user._id,
        type: 'system',
        title: 'Welcome to WarZone Free Fire Tournament',
        message: 'Google sign-in successful. Join tournaments from the home screen.',
      });
    }

    await ensureUserReferralCode(user);

    const token = jwt.sign(
      { userId: user._id, role: user.role, v: user.authVersion },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Google sign-in successful',
      token,
      user: formatAuthUser(user),
      isNewUser,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Account already exists with this email' });
    }
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

// Forgot password — all users: OTP via WhatsApp / SMS / email
router.post('/forgot-password', async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || req.body?.email || req.body?.phone || '')
      .trim()
      .toLowerCase();
    const channel = String(req.body?.channel || 'auto').trim().toLowerCase();
    if (!identifier) {
      return res.status(400).json({ error: 'Enter your email or mobile number' });
    }

    const isEmail = identifier.includes('@');
    const phoneDigits = isEmail ? '' : otpDelivery.normalizePhone(identifier);

    let user = null;
    if (isEmail) {
      user = await User.findOne({ email: identifier });
    } else if (phoneDigits.length >= 10) {
      const last10 = phoneDigits.slice(-10);
      user = await User.findOne({
        $or: [
          { phone: phoneDigits },
          { phone: `+${phoneDigits}` },
          { phone: last10 },
          { phoneNumber: phoneDigits },
          { phoneNumber: last10 },
          { phone: { $regex: `${last10}$` } },
          { phoneNumber: { $regex: `${last10}$` } },
        ],
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email or mobile number' });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        error: 'This account uses Google sign-in. Tap Continue with Google on the login screen.',
        code: 'GOOGLE_AUTH_REQUIRED',
      });
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'This account cannot reset password right now' });
    }

    const phone = user.phone || user.phoneNumber || (!isEmail ? phoneDigits : '');
    const emailRaw = String(user.email || '').toLowerCase();

    if (channel === 'whatsapp' && !otpDelivery.whatsappConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp OTP is coming soon. Please use Email.',
        code: 'CHANNEL_COMING_SOON',
      });
    }
    if (channel === 'sms' && !otpDelivery.smsConfigured()) {
      return res.status(503).json({
        error: 'SMS OTP is coming soon. Please use Email.',
        code: 'CHANNEL_COMING_SOON',
      });
    }
    if ((channel === 'sms' || channel === 'whatsapp') && !phone) {
      return res.status(400).json({
        error: 'No mobile number on this account. Use email, or add a phone in Edit Profile.',
      });
    }
    if (channel === 'email' && !otpDelivery.emailConfigured()) {
      // Still create OTP for local/dev (debugOtp / server logs), but warn clearly
      console.warn('[forgot-password] SMTP not configured — OTP will only appear in logs/debugOtp');
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
      channel,
      phone: phone ? otpDelivery.normalizePhone(phone) : '',
    });

    const delivery = await otpDelivery.deliverOtp({
      email: emailRaw,
      phone,
      otp,
      channel,
    });

    const labels = {
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      email: 'email',
    };
    const sentLabels = (delivery.channels.length ? delivery.channels : [channel === 'auto' ? 'email' : channel])
      .map((c) => labels[c] || c)
      .join(' and ');

    const payload = {
      type: user.role === 'admin' ? 'admin' : 'user',
      message: delivery.sent
        ? `OTP sent on ${sentLabels}. Enter the 6-digit code to reset your password.`
        : `OTP created. Check ${sentLabels} (or server logs if SMS/WhatsApp is not configured yet).`,
      email: emailRaw,
      channel,
      sentVia: delivery.channels,
      destinations: delivery.destinations,
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

async function verifyResetOtp(req, res) {
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
}

async function completePasswordReset(req, res) {
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
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.authProvider = user.authProvider === 'google' ? 'google' : 'local';
    user.updatedAt = new Date();
    await user.save();

    record.used = true;
    await record.save();
    await AdminPasswordReset.updateMany(
      { email: emailRaw, used: false },
      { $set: { used: true } }
    );

    res.json({ message: 'Password updated. You can login now.' });
  } catch (error) {
    console.error('reset-password:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
}

router.post('/verify-otp', verifyResetOtp);
router.post('/admin/verify-otp', verifyResetOtp);
router.post('/reset-password', completePasswordReset);
router.post('/admin/reset-password', completePasswordReset);

module.exports = router;
