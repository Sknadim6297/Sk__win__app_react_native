const express = require('express');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get wallet balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      balance: user.wallet.balance,
      totalDeposited: user.wallet.totalDeposited,
      totalWithdrawn: user.wallet.totalWithdrawn,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// Top up wallet
router.post('/topup', authMiddleware, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create transaction
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'deposit',
      amount,
      paymentMethod,
      transactionId,
      description: `Wallet top-up via ${paymentMethod}`,
      status: 'completed',
    });

    await transaction.save();

    // Update wallet
    user.wallet.balance += amount;
    user.wallet.totalDeposited += amount;
    await user.save();

    res.json({
      message: 'Wallet topped up successfully',
      balance: user.wallet.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: 'Top-up failed' });
  }
});

// Withdraw from wallet
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    if (!user.kycVerified) {
      return res.status(400).json({ error: 'KYC verification required for withdrawal' });
    }

    // Create transaction
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'withdraw',
      amount,
      description: 'Wallet withdrawal',
      status: 'pending',
    });

    await transaction.save();

    // Update wallet
    user.wallet.balance -= amount;
    user.wallet.totalWithdrawn += amount;
    await user.save();

    res.json({
      message: 'Withdrawal initiated',
      balance: user.wallet.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

// Get transaction history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

module.exports = router;
