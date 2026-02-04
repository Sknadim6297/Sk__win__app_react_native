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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      balance: user.wallet.balance || 0,
      totalDeposited: user.wallet.totalDeposited || 0,
      totalWithdrawn: user.wallet.totalWithdrawn || 0,
      totalWinnings: user.wallet.totalWinnings || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch wallet balance' });
  }
});

// Top up wallet
router.post('/topup', authMiddleware, async (req, res) => {
  try {
    const { amount, paymentMethod = 'demo', transactionId = `TXN_${Date.now()}` } = req.body;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (amountNum < 10) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₹10' });
    }

    if (amountNum > 10000) {
      return res.status(400).json({ success: false, message: 'Maximum deposit amount is ₹10,000 per transaction' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create transaction
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'deposit',
      amount: amountNum,
      paymentMethod,
      transactionId,
      description: `Wallet top-up via ${paymentMethod}`,
      status: 'completed',
    });

    await transaction.save();

    // Update wallet
    user.wallet.balance += amountNum;
    user.wallet.totalDeposited += amountNum;
    await user.save();

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      balance: user.wallet.balance,
      transaction,
    });
  } catch (error) {
    console.error('Topup error:', error);
    res.status(500).json({ success: false, message: 'Top-up failed: ' + error.message });
  }
});

// Withdraw from wallet
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (amountNum < 50) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹50' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.wallet.balance < amountNum) {
      return res.status(400).json({ success: false, message: 'Insufficient balance. You cannot withdraw more than your current balance.' });
    }

    // Create transaction
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'withdraw',
      amount: amountNum,
      description: 'Wallet withdrawal',
      status: 'pending',
    });

    await transaction.save();

    // Update wallet
    user.wallet.balance -= amountNum;
    user.wallet.totalWithdrawn += amountNum;
    await user.save();

    res.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      balance: user.wallet.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Withdrawal failed: ' + error.message });
  }
});

// Get transaction history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Fetching history for userId:', userId);
    
    if (!userId) {
      console.log('No userId in request');
      return res.status(200).json({ 
        success: true,
        transactions: []
      });
    }

    let transactions = [];
    try {
      transactions = await WalletTransaction.find({ userId: userId })
        .sort({ createdAt: -1 })
        .limit(50);
    } catch (dbError) {
      console.error('Database query error:', dbError.message);
      // Return empty array instead of failing
      transactions = [];
    }

    console.log('Transactions found:', transactions?.length || 0);

    res.json({
      success: true,
      transactions: Array.isArray(transactions) ? transactions : [],
    });
  } catch (error) {
    console.error('History endpoint error:', error.message, error.stack);
    res.status(200).json({ 
      success: true,
      transactions: []
    });
  }
});

module.exports = router;
