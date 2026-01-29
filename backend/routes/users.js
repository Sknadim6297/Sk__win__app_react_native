const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update KYC
router.post('/kyc', authMiddleware, async (req, res) => {
  try {
    const { fullName, idType, idNumber, dateOfBirth } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.kycDetails = {
      fullName,
      idType,
      idNumber,
      dateOfBirth,
    };
    user.kycVerified = true;

    await user.save();

    res.json({
      message: 'KYC updated successfully',
      user: {
        id: user._id,
        username: user.username,
        kycVerified: user.kycVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'KYC update failed' });
  }
});

module.exports = router;
