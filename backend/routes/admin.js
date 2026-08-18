const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const TournamentParticipant = require('../models/TournamentParticipant');
const Tournament = require('../models/Tournament');
const CoinPack = require('../models/CoinPack');
const HomeConfig = require('../models/HomeConfig');
const { authMiddleware } = require('../middleware/auth');
const AdminPasswordReset = require('../models/AdminPasswordReset');
const router = express.Router();

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization failed' });
  }
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------
// Admin password reset (email reset-link flow)
// POST /api/admin/forgot-password
// POST /api/admin/reset-password
// ---------------------------

const TARGET_ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'sknadim6297@gmail.com').trim().toLowerCase();
const RESET_TTL_MS = Number(process.env.ADMIN_RESET_TOKEN_TTL_MS || 15 * 60 * 1000);
const RATE_WINDOW_MS = Number(process.env.ADMIN_FORGOT_RATE_WINDOW_MS || 15 * 60 * 1000);
const RATE_MAX = Number(process.env.ADMIN_FORGOT_RATE_MAX || 5);

const forgotRate = new Map(); // key => { count, firstAtMs }

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function generateResetToken() {
  // 256-bit token, hex-encoded.
  return crypto.randomBytes(32).toString('hex');
}

function rateLimitKey(email, ip) {
  return `${String(email).toLowerCase()}|${String(ip || 'unknown')}`;
}

function checkForgotRateLimit({ email, ip }) {
  const key = rateLimitKey(email, ip);
  const now = Date.now();
  const current = forgotRate.get(key);
  if (!current) {
    forgotRate.set(key, { count: 1, firstAtMs: now });
    return;
  }

  if (now - current.firstAtMs > RATE_WINDOW_MS) {
    forgotRate.set(key, { count: 1, firstAtMs: now });
    return;
  }

  if (current.count >= RATE_MAX) {
    const retryAfterSec = Math.ceil((current.firstAtMs + RATE_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfterSec: Math.max(0, retryAfterSec) };
  }

  forgotRate.set(key, { ...current, count: current.count + 1 });
}

function getMailConfig() {
  // Preferred: MAIL_* variables (as requested)
  const mailHost = process.env.MAIL_HOST || '';
  const mailPort = Number(process.env.MAIL_PORT || 587);
  const mailUser = process.env.MAIL_USER || '';
  const mailPass = process.env.MAIL_PASSWORD || '';
  const mailFrom = process.env.MAIL_FROM || 'WAREZONE <noreply@warezone.app>';

  // Backward-compatible fallback to existing SMTP_* variables used by OTP delivery.
  const smtpHost = process.env.SMTP_HOST || '';
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpFrom = process.env.SMTP_FROM || mailFrom;
  const smtpPort = Number(process.env.SMTP_PORT || mailPort);
  const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  const usingPreferred =
    Boolean(mailHost && mailUser && mailPass) || String(process.env.MAIL_HOST || '').trim();

  const host = usingPreferred ? mailHost : smtpHost;
  const user = usingPreferred ? mailUser : smtpUser;
  const pass = usingPreferred ? mailPass : smtpPass;
  const from = mailFrom || smtpFrom;
  const port = usingPreferred ? mailPort : smtpPort;
  const secure = usingPreferred ? String(process.env.MAIL_SECURE || '').toLowerCase() === 'true' : smtpSecure;

  return { host, port, secure, user, pass, from };
}

async function sendAdminResetEmail({ toEmail, resetToken, expiresAt }) {
  const nodemailer = require('nodemailer');

  const { host, port, secure, user, pass, from } = getMailConfig();
  if (!host || !user || !pass) {
    // If email isn't configured, we don't leak details to the client.
    const err = new Error('Mail transport not configured');
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }

  const resetDeepLinkBase = String(process.env.ADMIN_RESET_DEEPLINK_URL || 'warezone://admin-reset-password').trim();
  const resetWebBase =
    String(
      process.env.ADMIN_RESET_WEB_URL ||
        (process.env.PUBLIC_BASE_URL ? `${process.env.PUBLIC_BASE_URL}/admin/#/reset-password` : '')
    ).trim();

  const deepLink = `${resetDeepLinkBase}?token=${encodeURIComponent(resetToken)}`;
  const webLink = resetWebBase ? `${resetWebBase}?token=${encodeURIComponent(resetToken)}` : '';

  const expiresText = expiresAt ? `This reset link expires at ${expiresAt.toISOString()}.` : 'This reset link expires soon.';

  const subject = 'SK WIN — Reset Admin Password';
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0B0E1E; color:#fff; padding:24px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
        <div style="width:44px;height:44px;border-radius:14px;background:rgba(255,107,0,0.18);display:flex;align-items:center;justify-content:center;color:#FF6B00;font-weight:800;">SK</div>
        <div>
          <div style="font-size:18px;font-weight:800;">SK WIN</div>
          <div style="font-size:12px;opacity:0.8;">Compete. Conquer. Win Big.</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:18px;">
        <h2 style="margin:0 0 10px; font-size:18px; letter-spacing:0.2px;">Reset Admin Password</h2>
        <p style="margin:0 0 14px; color:rgba(184,197,217,1); line-height:1.5;">
          We received a request to reset the password for your admin account.
        </p>
        <p style="margin:0 0 14px; color:rgba(184,197,217,1); line-height:1.5;">
          Click the button below to set a new password:
        </p>
        <div style="margin:18px 0;">
          <a href="${deepLink}" style="display:inline-block; padding:12px 18px; background:#7B61FF; color:#fff; text-decoration:none; border-radius:12px; font-weight:800;">
            Reset Password
          </a>
        </div>
        ${
          webLink
            ? `<p style="margin:0 0 14px; color:rgba(184,197,217,1); line-height:1.5;">
                 If the app link doesn’t work, use this web link:<br/>
                 <a href="${webLink}" style="color:#4FD1C5; word-break:break-all;">${webLink}</a>
               </p>`
            : ''
        }
        <p style="margin:0 0 14px; color:rgba(184,197,217,1); line-height:1.5;">${expiresText}</p>
        <p style="margin:0; color:rgba(184,197,217,1); line-height:1.5;">
          Security warning: If you didn’t request this reset, you can safely ignore this email.
        </p>
      </div>
      <div style="margin-top:18px; font-size:12px; opacity:0.75;">
        SK WIN — Admin password reset
      </div>
    </div>
  `;

  await nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  }).sendMail({
    from,
    to: toEmail,
    subject,
    html,
    text:
      `SK WIN — Reset Admin Password\n\n` +
      `We received a request to reset your admin password.\n\n` +
      `Reset link (app): ${deepLink}\n` +
      (webLink ? `Reset link (web): ${webLink}\n` : '') +
      `\n${expiresText}\n\n` +
      `Security warning: If you didn't request this, ignore this email.`,
  });
}

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const ip = req.ip;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // We only support the admin reset flow for the target admin account (for now).
    const isTargetAdmin = email === TARGET_ADMIN_EMAIL;

    // Rate limiting applies even when admin account doesn't exist to reduce abuse.
    const rate = checkForgotRateLimit({ email, ip });
    if (rate?.limited) {
      return res
        .status(429)
        .json({ success: false, message: 'Too many requests. Try again later.', retryAfterSec: rate.retryAfterSec });
    }

    const generic = {
      success: true,
      message: 'If the admin account exists, a password reset email has been sent.',
    };

    if (!isTargetAdmin) return res.json(generic);

    const admin = await User.findOne({ email, role: 'admin' }).select('_id email authVersion');
    if (!admin) return res.json(generic);

    const resetToken = generateResetToken();
    const resetTokenSha256Hash = sha256(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    // Invalidate previous unused reset sessions for this admin.
    await AdminPasswordReset.deleteMany({ email, used: false });

    await AdminPasswordReset.create({
      email,
      userId: admin._id,
      otpHash: null,
      otpExpiresAt: new Date(Date.now() - 60 * 1000), // make OTP verification fail fast if someone tries OTP flow
      verified: true,
      resetTokenHash: null,
      resetTokenExpiresAt: expiresAt,
      resetTokenSha256Hash,
      used: false,
      channel: 'email',
      phone: '',
    });

    try {
      await sendAdminResetEmail({ toEmail: email, resetToken, expiresAt });
    } catch (mailErr) {
      // Do not leak whether email exists; client still gets generic success.
      // We also avoid logging the reset token.
      console.error('[admin-reset-email] failed:', mailErr.message);
    }

    return res.json(generic);
  } catch (error) {
    if (error?.limited) {
      return res.status(429).json({ success: false, message: 'Too many requests. Try again later.' });
    }
    console.error('[admin forgot-password] error:', error?.message);
    return res.status(500).json({ success: false, message: 'Password reset failed. Please try again later.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.passwordConfirmation || '');

    if (!token) return res.status(400).json({ success: false, message: 'Reset token is required.' });
    if (!password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const resetTokenSha256Hash = sha256(token);

    const record = await AdminPasswordReset.findOne({
      resetTokenSha256Hash,
      used: false,
      verified: true,
    });

    if (!record?.resetTokenExpiresAt) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
    }
    if (new Date(record.resetTokenExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
    }

    const user = await User.findById(record.userId).select('_id email role authVersion password authProvider');
    if (!user || user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
    }
    if (String(user.email).toLowerCase() !== TARGET_ADMIN_EMAIL) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
    }

    const newPasswordHash = await bcrypt.hash(password, 10);
    user.password = newPasswordHash;
    user.authProvider = user.authProvider === 'google' ? 'google' : 'local';
    user.updatedAt = new Date();
    user.authVersion = (user.authVersion || 0) + 1; // invalidate existing admin sessions (best-effort)
    await user.save();

    record.used = true;
    await record.save();
    // Invalidate any other unused sessions just in case.
    await AdminPasswordReset.deleteMany({ email: record.email, used: false });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    // Avoid leaking internals / token details.
    console.error('[admin reset-password] error:', error?.message);
    return res.status(500).json({ success: false, message: 'Password reset failed. Please try again later.' });
  }
});

// Get all users (admin only). Optional page/limit/search keeps mobile array response.
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const page = req.query.page != null && req.query.page !== ''
      ? Math.max(1, parseInt(req.query.page, 10) || 1)
      : null;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const role = String(req.query.role || '').trim();
    const query = {};

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ username: rx }, { email: rx }, { name: rx }, { phone: rx }, { phoneNumber: rx }];
    }
    if (status) query.status = status;
    if (role) query.role = role;

    if (!page) {
      const users = await User.find(query).select('-password').sort({ createdAt: -1 });
      return res.json(users);
    }

    const [items, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user statistics (admin only)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ verified: true });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const bannedUsers = await User.countDocuments({ status: 'banned' });

    const totalWalletBalance = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$wallet.balance' },
        },
      },
    ]);

    res.json({
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      bannedUsers,
      totalWalletBalance: totalWalletBalance[0]?.total || 0,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get wallet transactions across the platform (admin only)
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, status, search } = req.query;
    const page = req.query.page != null && req.query.page !== ''
      ? Math.max(1, Number(req.query.page) || 1)
      : null;
    const parsedLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || (page ? 20 : 100), 1), 500);
    const query = {};

    if (type) query.type = type;
    if (status) {
      if (status === 'success') query.status = { $in: ['completed', 'success'] };
      else if (status === 'refunded') query.status = { $in: ['reversed', 'refunded'] };
      else query.status = status;
    }

    const q = String(search || '').trim();
    if (q) {
      const User = require('../models/User');
      const users = await User.find({
        $or: [
          { username: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }).select('_id').limit(50).lean();
      query.$or = [
        { transactionId: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { cashfreePaymentId: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { zapupiTxnId: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { zapupiUtr: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { userId: { $in: users.map((u) => u._id) } },
      ];
    }

    let find = WalletTransaction.find(query)
      .populate('userId', 'username email name')
      .populate({ path: 'tournamentId', model: 'Tournament', select: 'name' })
      .sort({ createdAt: -1 });

    if (page) {
      const total = await WalletTransaction.countDocuments(query);
      const items = await find.skip((page - 1) * parsedLimit).limit(parsedLimit).lean();
      return res.json({
        transactions: items,
        items,
        count: items.length,
        total,
        page,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1,
      });
    }

    const transactions = await find.limit(parsedLimit).lean();
    res.json({
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get detailed user information (admin only)
router.get('/user/:userId/details', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's tournament participation
    const tournaments = await TournamentParticipant.find({ userId: req.params.userId })
      .populate({
        path: 'tournamentId',
        populate: [
          { path: 'game', select: 'name' },
          { path: 'gameMode', select: 'name' }
        ]
      })
      .sort({ joinedAt: -1 })
      .limit(20);

    // Get wallet transactions
    const transactions = await WalletTransaction.find({ userId: req.params.userId })
      .populate('tournamentId', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate tournament stats
    const tournamentStats = {
      total: tournaments.length,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      won: tournaments.filter(t => t.status === 'winner').length,
      participated: tournaments.filter(t => t.status === 'joined').length,
    };

    // Calculate status based on time
    const now = new Date();
    tournaments.forEach(t => {
      if (t.tournamentId) {
        const startDate = new Date(t.tournamentId.startDate);
        const endDate = t.tournamentId.endDate ? new Date(t.tournamentId.endDate) : null;
        
        if (endDate && now > endDate) {
          tournamentStats.completed++;
        } else if (now >= startDate && (!endDate || now <= endDate)) {
          tournamentStats.ongoing++;
        } else if (now < startDate) {
          tournamentStats.upcoming++;
        }
      }
    });

    res.json({
      user,
      tournaments: tournaments.map(t => ({
        _id: t._id,
        tournament: t.tournamentId,
        status: t.status,
        joinedAt: t.joinedAt,
        rank: t.rank,
        prizeAmount: t.prizeAmount,
      })),
      transactions,
      tournamentStats,
      walletStats: {
        balance: user.wallet.balance,
        totalDeposited: user.wallet.totalDeposited,
        totalWithdrawn: user.wallet.totalWithdrawn,
        totalWinnings: user.wallet.totalWinnings,
      },
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Suspend user (admin only)
router.post('/suspend/:userId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'suspended' },
      { new: true }
    );

    res.json({ message: 'User suspended', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Ban user (admin only)
router.post('/ban/:userId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const reason = req.body?.reason || 'Banned by admin';
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        status: 'banned',
        banReason: reason,
        bannedBy: admin._id,
        bannedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });

    try {
      const { logAdminAction } = require('../services/adminAudit');
      await logAdminAction({
        adminId: admin._id,
        action: 'USER_BANNED',
        userId: user._id,
        reason,
      });
    } catch (_) { /* ignore */ }

    res.json({ message: 'User banned', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Activate user (admin only)
router.post('/activate/:userId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'active', banReason: null },
      { new: true }
    );

    res.json({ message: 'User activated', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Verify user (admin only)
router.post('/verify/:userId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { verified: true },
      { new: true }
    );

    res.json({ message: 'User verified', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Set tournament winners (admin only)
router.post('/tournaments/:tournamentId/set-winners', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { winners } = req.body; // Array of { position: 1, userId, reward }
    
    if (!winners || !Array.isArray(winners)) {
      return res.status(400).json({ error: 'Winners array required' });
    }

    const tournament = await Tournament.findByIdAndUpdate(
      req.params.tournamentId,
      { winners },
      { new: true }
    );

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({ message: 'Winners set successfully', tournament });
  } catch (error) {
    console.error('Error setting winners:', error);
    res.status(500).json({ error: 'Failed to set winners' });
  }
});

// Complete tournament (admin only)
router.post('/tournaments/:tournamentId/complete', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const tournament = await Tournament.findById(req.params.tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if winners are declared
    if (!tournament.winners || tournament.winners.length === 0) {
      return res.status(400).json({ error: 'Winners must be declared before completing tournament' });
    }

    // Update tournament status
    tournament.status = 'completed';
    tournament.endDate = new Date();
    await tournament.save();

    // Update winner participants' status
    if (tournament.winners && tournament.winners.length > 0) {
      for (const winner of tournament.winners) {
        await TournamentParticipant.findOneAndUpdate(
          { tournamentId: tournament._id, userId: winner.userId },
          { status: 'winner', position: winner.position }
        );
      }
    }

    res.json({ message: 'Tournament completed successfully', tournament });
  } catch (error) {
    console.error('Error completing tournament:', error);
    res.status(500).json({ error: 'Failed to complete tournament' });
  }
});

// --- Home & wallet app content (admin) ---
router.get('/home-config', authMiddleware, requireAdmin, async (req, res) => {
  try {
    let config = await HomeConfig.findOne({ key: 'main' });
    if (!config) {
      config = await HomeConfig.create({
        key: 'main',
        latestNews: { text: '🏆 Tournaments Are Back! 🎮', isActive: true },
        banners: [{ title: 'HOW TO ADD COINS', subtitle: 'CLICK HERE', action: 'wallet', isActive: true }],
      });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load home config' });
  }
});

router.put('/home-config', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const config = await HomeConfig.findOneAndUpdate(
      { key: 'main' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json({ message: 'Home config updated', config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update home config' });
  }
});

router.get('/coin-packs', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const packs = await CoinPack.find().sort({ sortOrder: 1 });
    res.json(packs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load coin packs' });
  }
});

router.post('/coin-packs', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const pack = await CoinPack.create(req.body);
    res.status(201).json(pack);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coin pack' });
  }
});

router.put('/coin-packs/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const pack = await CoinPack.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pack) return res.status(404).json({ error: 'Coin pack not found' });
    res.json(pack);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update coin pack' });
  }
});

router.delete('/coin-packs/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await CoinPack.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coin pack deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coin pack' });
  }
});

// ——— Tournament payment ops ———
router.get('/payment-stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const WinnerPayout = require('../models/WinnerPayout');
    const TournamentRefund = require('../models/TournamentRefund');
    const Tournament = require('../models/Tournament');

    const [
      pendingPayouts,
      paidPayouts,
      blockedPayouts,
      cancelledPayouts,
      rejectedPayouts,
      pendingRefunds,
      completedRefunds,
      failedRefunds,
      totalTournaments,
      upcoming,
      live,
      completed,
      cancelled,
    ] = await Promise.all([
      WinnerPayout.countDocuments({ status: 'PENDING' }),
      WinnerPayout.countDocuments({ status: 'PAID' }),
      WinnerPayout.countDocuments({ status: 'BLOCKED' }),
      WinnerPayout.countDocuments({ status: 'CANCELLED' }),
      WinnerPayout.countDocuments({ status: 'REJECTED' }),
      TournamentRefund.countDocuments({ status: { $in: ['pending', 'processing'] } }),
      TournamentRefund.countDocuments({ status: 'completed' }),
      TournamentRefund.countDocuments({ status: 'failed' }),
      Tournament.countDocuments(),
      Tournament.countDocuments({ status: { $in: ['upcoming', 'incoming'] } }),
      Tournament.countDocuments({ status: { $in: ['ongoing', 'live'] } }),
      Tournament.countDocuments({ status: { $in: ['completed', 'result_published'] } }),
      Tournament.countDocuments({ status: 'cancelled' }),
    ]);

    const prizeAgg = await WinnerPayout.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      tournaments: { total: totalTournaments, upcoming, live, completed, cancelled },
      payouts: {
        pending: pendingPayouts,
        paid: paidPayouts,
        blocked: blockedPayouts,
        cancelled: cancelledPayouts,
        rejected: rejectedPayouts,
        totalPrizePaid: prizeAgg[0]?.total || 0,
      },
      refunds: {
        pending: pendingRefunds,
        completed: completedRefunds,
        failed: failedRefunds,
      },
    });
  } catch (error) {
    console.error('payment-stats:', error);
    res.status(500).json({ error: 'Failed to load payment stats' });
  }
});

router.get('/refunds', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const TournamentRefund = require('../models/TournamentRefund');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const q = {};
    if (req.query.status) q.status = req.query.status;
    const [items, total] = await Promise.all([
      TournamentRefund.find(q)
        .populate('userId', 'username email')
        .populate('tournamentId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TournamentRefund.countDocuments(q),
    ]);
    res.json({ refunds: items, page, limit, total, pages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load refunds' });
  }
});

router.post('/refunds/:id/retry', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { retryFailedRefund } = require('../services/tournamentRefundService');
    const result = await retryFailedRefund(req.params.id, req.userId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/wallet/freeze', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { freezeAmount } = require('../services/walletFreezeService');
    const { userId, amount, reason, payoutId } = req.body || {};
    if (!userId || !amount || !reason) {
      return res.status(400).json({ error: 'userId, amount, and reason are required' });
    }
    const freeze = await freezeAmount({
      userId,
      amount,
      reason,
      adminId: req.userId,
      payoutId,
    });
    res.json({ message: 'Amount frozen', freeze });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, code: error.code });
  }
});

router.post('/wallet/freeze/:id/release', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { releaseFreeze } = require('../services/walletFreezeService');
    const freeze = await releaseFreeze(req.params.id, req.userId);
    res.json({ message: 'Freeze released', freeze });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/audit-logs', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const AdminAuditLog = require('../models/AdminAuditLog');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const q = {};
    if (req.query.action) q.action = req.query.action;
    if (req.query.tournamentId) q.tournamentId = req.query.tournamentId;
    const [items, total] = await Promise.all([
      AdminAuditLog.find(q)
        .populate('adminId', 'username')
        .populate('userId', 'username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(q),
    ]);
    res.json({ logs: items, page, limit, total, pages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

module.exports = router;
