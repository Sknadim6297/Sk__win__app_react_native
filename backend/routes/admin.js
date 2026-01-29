const express = require('express');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get all users (admin only)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user statistics (admin only)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ verified: true });
    const kycVerifiedUsers = await User.countDocuments({ kycVerified: true });
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
      kycVerifiedUsers,
      suspendedUsers,
      bannedUsers,
      totalWalletBalance: totalWalletBalance[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Suspend user (admin only)
router.post('/suspend/:userId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
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
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'banned', banReason: reason },
      { new: true }
    );

    res.json({ message: 'User banned', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Activate user (admin only)
router.post('/activate/:userId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
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

module.exports = router;
