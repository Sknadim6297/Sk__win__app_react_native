const express = require('express');
const bcrypt = require('bcryptjs');
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

module.exports = router;
