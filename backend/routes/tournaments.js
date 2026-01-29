const express = require('express');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const WalletTransaction = require('../models/WalletTransaction');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get all tournaments
router.get('/list', async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('registeredPlayers', 'username email')
      .sort({ startDate: -1 });

    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get tournament details
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('registeredPlayers', 'username email');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Check if user can join tournament
router.get('/:id/canJoin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check eligibility
    const checks = {
      isActive: user.status === 'active',
      hasKYC: tournament.minimumKYC ? user.kycVerified : true,
      hasSufficientBalance: user.wallet.balance >= (tournament.entryFee + tournament.minimumBalance),
      spotsAvailable: tournament.registeredPlayers.length < tournament.maxPlayers,
      notAlreadyRegistered: !tournament.registeredPlayers.includes(req.userId),
    };

    const canJoin = Object.values(checks).every(v => v);

    res.json({
      canJoin,
      checks,
      reason: !canJoin ? Object.entries(checks)
        .filter(([_, v]) => !v)
        .map(([k, _]) => k)
        .join(', ') : 'Eligible to join',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// Join tournament
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check eligibility
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    if (tournament.minimumKYC && !user.kycVerified) {
      return res.status(403).json({ error: 'KYC verification required' });
    }

    if (user.wallet.balance < tournament.entryFee) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    if (tournament.registeredPlayers.length >= tournament.maxPlayers) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    if (tournament.registeredPlayers.includes(req.userId)) {
      return res.status(400).json({ error: 'Already registered' });
    }

    // Register player
    tournament.registeredPlayers.push(req.userId);
    await tournament.save();

    // Deduct entry fee
    user.wallet.balance -= tournament.entryFee;
    user.tournament.participatedCount += 1;
    await user.save();

    // Create transaction
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'tournament_entry',
      amount: tournament.entryFee,
      tournamentId: tournament._id,
      description: `Entry fee for ${tournament.name}`,
      status: 'completed',
    });
    await transaction.save();

    res.json({
      message: 'Successfully joined tournament',
      tournament,
      walletBalance: user.wallet.balance,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// Get user tournaments (history)
router.get('/user/history', authMiddleware, async (req, res) => {
  try {
    const tournaments = await Tournament.find({
      registeredPlayers: req.userId,
    }).sort({ startDate: -1 });

    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament history' });
  }
});

module.exports = router;
