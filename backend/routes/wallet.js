const express = require('express');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Notification = require('../models/Notification');
const CoinPack = require('../models/CoinPack');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get wallet balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Session expired — please log in again',
        code: 'USER_NOT_FOUND',
      });
    }

    const balance = user.wallet.balance || 0;
    const bonusBalance = user.wallet.bonusBalance || 0;

    res.json({
      success: true,
      balance,
      bonusBalance,
      totalBalance: balance + bonusBalance,
      bonusUsed: user.wallet.bonusUsed || 0,
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
      return res.status(401).json({
        success: false,
        message: 'Session expired — please log in again',
        code: 'USER_NOT_FOUND',
      });
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

    await Notification.create({
      userId: req.userId,
      type: 'wallet',
      title: 'Wallet Top-up Successful',
      message: `₹${amountNum} added to your wallet. Current balance: ₹${user.wallet.balance}.`,
    });

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

    if (amountNum < 25) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹25' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Session expired — please log in again',
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.wallet.balance < amountNum) {
      return res.status(400).json({ success: false, message: 'Insufficient real balance. Bonus balance cannot be withdrawn.' });
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

    await Notification.create({
      userId: req.userId,
      type: 'wallet',
      title: 'Withdrawal Requested',
      message: `Withdrawal request of ₹${amountNum} submitted. Current balance: ₹${user.wallet.balance}.`,
    });

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

// Buy coin pack (admin-configured)
router.post('/buy-pack', authMiddleware, async (req, res) => {
  try {
    const { packId } = req.body;
    if (!packId) {
      return res.status(400).json({ success: false, message: 'Pack ID required' });
    }

    const pack = await CoinPack.findOne({ _id: packId, isActive: true });
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Coin pack not available' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Session expired — please log in again',
        code: 'USER_NOT_FOUND',
      });
    }

    const coinsAdded = pack.coins + (pack.bonusCoins || 0);

    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'deposit',
      amount: pack.priceInr,
      paymentMethod: 'coin_pack',
      transactionId: `PACK-${Date.now()}`,
      description: `Purchased ${pack.label} (+${coinsAdded} coins)`,
      status: 'completed',
    });
    await transaction.save();

    user.wallet.balance += coinsAdded;
    user.wallet.totalDeposited += pack.priceInr;
    await user.save();

    await Notification.create({
      userId: req.userId,
      type: 'wallet',
      title: 'Coins Added',
      message: `${coinsAdded} coins added to your wallet.`,
    });

    res.json({
      success: true,
      message: 'Coins purchased successfully',
      coinsAdded,
      balance: user.wallet.balance,
      bonusBalance: user.wallet.bonusBalance,
      totalBalance: user.wallet.balance + user.wallet.bonusBalance,
      totalDeposited: user.wallet.totalDeposited,
    });
  } catch (error) {
    console.error('Buy pack error:', error);
    res.status(500).json({ success: false, message: 'Purchase failed' });
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
