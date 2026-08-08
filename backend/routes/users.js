const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const { ensureUserReferralCode } = require('../utils/referral');
const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await ensureUserReferralCode(user);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, gameUsername, dateOfBirth } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if gameUsername is unique (if provided and different from current)
    if (gameUsername && gameUsername !== user.gameUsername) {
      const existingUser = await User.findOne({ gameUsername });
      if (existingUser && existingUser._id.toString() !== req.userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Game username already taken' 
        });
      }
      user.gameUsername = gameUsername;
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    user.updatedAt = Date.now();

    await user.save();

    await Notification.create({
      userId: req.userId,
      type: 'system',
      title: 'Profile Updated',
      message: 'Your profile details were updated successfully.',
    });

    // Return updated user (without password)
    const updatedUser = await User.findById(req.userId).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Old password and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters long' 
      });
    }

    // Validate password complexity
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasNumber || !hasSpecialChar) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must contain at least 1 number and 1 special character' 
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Old password is incorrect' 
      });
    }

    // Check if new password is same as old
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password cannot be the same as old password' 
      });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// Save push notification token (Expo Push Token or FCM device token)
router.post('/push-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, pushToken, platform } = req.body;
    const token = String(pushToken || fcmToken || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.fcmToken = token;
    user.pushTokens = user.pushTokens || [];
    const existingIdx = user.pushTokens.findIndex((t) => t.token === token);
    if (existingIdx >= 0) {
      user.pushTokens[existingIdx].platform = platform || user.pushTokens[existingIdx].platform;
      user.pushTokens[existingIdx].updatedAt = new Date();
    } else {
      user.pushTokens.push({
        token,
        platform: platform || 'unknown',
        updatedAt: new Date(),
      });
    }
    // Keep last 5 devices
    if (user.pushTokens.length > 5) {
      user.pushTokens = user.pushTokens
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5);
    }
    user.updatedAt = Date.now();
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('push-token:', error);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

// Clear push token on logout
router.delete('/push-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, pushToken } = req.body || {};
    const token = String(pushToken || fcmToken || '').trim();
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (token) {
      user.pushTokens = (user.pushTokens || []).filter((t) => t.token !== token);
      if (user.fcmToken === token) user.fcmToken = null;
    } else {
      user.fcmToken = null;
      user.pushTokens = [];
    }
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear push token' });
  }
});

module.exports = router;
