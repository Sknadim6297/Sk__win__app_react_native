const express = require('express');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const TournamentParticipant = require('../models/TournamentParticipant');
const Tournament = require('../models/Tournament');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get all users (admin only)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
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

module.exports = router;
