const express = require('express');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const TournamentParticipant = require('../models/TournamentParticipant');
const TournamentResult = require('../models/TournamentResult');
const WalletTransaction = require('../models/WalletTransaction');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// ===== ADMIN ROUTES (Must be before :id routes) =====

// Create tournament (Admin)
router.post('/admin/create', authMiddleware, async (req, res) => {
  try {
    console.log('Tournament creation request:', req.body);
    console.log('User ID:', req.userId);

    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create tournaments' });
    }

    const { 
      name, 
      description, 
      game,
      gameMode,
      mode,
      map,
      version,
      rules,
      entryFee, 
      prizePool,
      perKill,
      maxParticipants, 
      startDate, 
      endDate, 
      minimumKYC, 
      minimumBalance,
      prizes, 
      roomId, 
      roomPassword, 
      showRoomCredentials 
    } = req.body;

    console.log('Extracted fields:', { name, game, gameMode, startDate, maxParticipants });

    if (!name || !game || !gameMode || !startDate) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: { name: !name, game: !game, gameMode: !gameMode, startDate: !startDate }
      });
    }

    // Verify game and gameMode exist
    console.log('Verifying game and gameMode:', { game, gameMode });
    const gameExists = await Game.findById(game);
    const gameModeExists = await GameMode.findById(gameMode);
    
    if (!gameExists) {
      console.log('Game not found:', game);
      return res.status(400).json({ error: 'Game not found', gameId: game });
    }
    
    if (!gameModeExists) {
      console.log('Game mode not found:', gameMode);
      return res.status(400).json({ error: 'Game mode not found', gameModeId: gameMode });
    }

    console.log('Found game and gameMode:', { 
      game: gameExists.name, 
      gameMode: gameModeExists.name 
    });
    console.log('Found game and gameMode:', { 
      game: gameExists.name, 
      gameMode: gameModeExists.name 
    });

    const tournamentData = {
      name,
      description: description || '',
      game,
      gameMode,
      mode: mode || 'solo',
      map: map || 'Bermuda',
      version: version || 'TPP',
      rules: rules || [],
      entryFee: entryFee || 0,
      prizePool: prizePool || 0,
      perKill: perKill || 0,
      maxParticipants: maxParticipants || 20,
      currentParticipants: 0,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      minimumKYC: minimumKYC || false,
      minimumBalance: minimumBalance || 0,
      prizes: prizes || {
        first: prizePool ? prizePool * 0.5 : 0,
        second: prizePool ? prizePool * 0.3 : 0,
        third: prizePool ? prizePool * 0.2 : 0,
      },
      roomId: roomId || '',
      roomPassword: roomPassword || '',
      showRoomCredentials: !!showRoomCredentials,
      status: 'upcoming',
      registeredPlayers: [],
      createdBy: req.userId,
    };

    console.log('Creating tournament with data:', tournamentData);

    const tournament = new Tournament(tournamentData);
    await tournament.save();

    console.log('Tournament saved successfully:', tournament._id);

    const populatedTournament = await Tournament.findById(tournament._id)
      .populate('game', 'name')
      .populate('gameMode', 'name');

    console.log('Tournament populated successfully');

    res.status(201).json({
      message: 'Tournament created successfully',
      tournament: populatedTournament,
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create tournament', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update tournament (Admin)
router.put('/admin/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update tournaments' });
    }

    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('game', 'name').populate('gameMode', 'name');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({ message: 'Tournament updated successfully', tournament });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// Delete tournament (Admin)
router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete tournaments' });
    }

    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Clean up related data
    await TournamentParticipant.deleteMany({ tournamentId: req.params.id });
    await TournamentResult.deleteMany({ tournamentId: req.params.id });

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Get tournaments by game mode (Admin)
router.get('/admin/by-gamemode/:gameModeId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view this' });
    }

    const tournaments = await Tournament.find({ gameMode: req.params.gameModeId })
      .populate('game', 'name')
      .populate('gameMode', 'name')
      .populate('registeredPlayers', 'username email')
      .sort({ startDate: -1 });

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments by game mode:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get all tournaments (admin with participants)
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view this' });
    }

    const tournaments = await Tournament.find()
      .populate('registeredPlayers', 'username email wallet')
      .sort({ startDate: -1 });

    // Fetch participant details for each tournament
    const tournamentsWithParticipants = await Promise.all(
      tournaments.map(async (tournament) => {
        const participants = await TournamentParticipant.find({ tournamentId: tournament._id })
          .populate('userId', 'username email');
        return {
          ...tournament.toObject(),
          participants,
          participantCount: participants.length,
        };
      })
    );

    res.json(tournamentsWithParticipants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Set room ID and password (Admin)
router.put('/admin/:id/room', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update room details' });
    }

    const { roomId, roomPassword, showRoomCredentials } = req.body;

    if (showRoomCredentials && (!roomId || !roomPassword)) {
      return res.status(400).json({ error: 'Room ID and password are required to show credentials' });
    }

    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { roomId: roomId || '', roomPassword: roomPassword || '', showRoomCredentials: !!showRoomCredentials },
      { new: true }
    );

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      message: 'Room details updated',
      tournament,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update room details' });
  }
});

// Update tournament status (Admin)
router.put('/admin/:id/status', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update tournaments' });
    }

    const { status } = req.body;
    const validStatuses = ['upcoming', 'live', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // If cancelling, refund all participants
    if (status === 'cancelled') {
      const participants = await TournamentParticipant.find({ tournamentId: req.params.id });
      
      for (const participant of participants) {
        const user = await User.findById(participant.userId);
        if (user) {
          user.wallet.balance += tournament.entryFee;
          await user.save();

          // Create refund transaction
          await WalletTransaction.create({
            userId: participant.userId,
            type: 'refund',
            amount: tournament.entryFee,
            tournamentId: req.params.id,
            description: `Refund for cancelled tournament: ${tournament.name}`,
            status: 'completed',
          });
        }
      }

      // Update all participant statuses to disqualified
      await TournamentParticipant.updateMany(
        { tournamentId: req.params.id },
        { status: 'disqualified' }
      );
    }

    tournament.status = status;
    await tournament.save();

    res.json({
      message: `Tournament status updated to ${status}`,
      tournament,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// Select winners (Admin)
router.post('/admin/:id/winners', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can select winners' });
    }

    const { firstWinnerId, secondWinnerId, thirdWinnerId } = req.body;

    if (!firstWinnerId || !secondWinnerId || !thirdWinnerId) {
      return res.status(400).json({ error: 'All three winners are required' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if status is completed
    if (tournament.status !== 'completed') {
      return res.status(400).json({ error: 'Tournament must be completed first' });
    }

    const winners = [
      { userId: firstWinnerId, rank: 1, prizeAmount: tournament.prizes.first },
      { userId: secondWinnerId, rank: 2, prizeAmount: tournament.prizes.second },
      { userId: thirdWinnerId, rank: 3, prizeAmount: tournament.prizes.third },
    ];

    // Delete any existing results for this tournament
    await TournamentResult.deleteMany({ tournamentId: req.params.id });

    // Create new results
    const results = await TournamentResult.insertMany(
      winners.map(winner => ({
        tournamentId: req.params.id,
        userId: winner.userId,
        rank: winner.rank,
        prizeAmount: winner.prizeAmount,
        prizeCredited: false,
      }))
    );

    // Update participant statuses
    for (const winner of winners) {
      await TournamentParticipant.findOneAndUpdate(
        { tournamentId: req.params.id, userId: winner.userId },
        { status: 'winner', rank: winner.rank, prizeAmount: winner.prizeAmount },
        { new: true }
      );
    }

    res.json({
      message: 'Winners selected successfully',
      results,
    });
  } catch (error) {
    console.error('Error selecting winners:', error);
    res.status(500).json({ error: 'Failed to select winners' });
  }
});

// Distribute prizes (Admin)
router.post('/admin/:id/distribute-prizes', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can distribute prizes' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const results = await TournamentResult.find({ tournamentId: req.params.id, prizeCredited: false });

    if (results.length === 0) {
      return res.status(400).json({ error: 'No prizes to distribute or already distributed' });
    }

    const distributedPrizes = [];

    for (const result of results) {
      const user = await User.findById(result.userId);
      if (user) {
        // Credit prize to wallet
        user.wallet.balance += result.prizeAmount;
        user.tournament.wins += 1;
        user.tournament.earnings += result.prizeAmount;
        await user.save();

        // Create transaction
        const transaction = await WalletTransaction.create({
          userId: result.userId,
          type: 'tournament_reward',
          amount: result.prizeAmount,
          tournamentId: req.params.id,
          description: `Prize for ${result.rank === 1 ? '1st' : result.rank === 2 ? '2nd' : '3rd'} place in ${tournament.name}`,
          status: 'completed',
        });

        // Mark prize as credited
        result.prizeCredited = true;
        result.prizeTransactionId = transaction._id;
        await result.save();

        distributedPrizes.push({
          userId: result.userId,
          rank: result.rank,
          prizeAmount: result.prizeAmount,
          username: user.username,
        });
      }
    }

    res.json({
      message: 'Prizes distributed successfully',
      distributedPrizes,
    });
  } catch (error) {
    console.error('Error distributing prizes:', error);
    res.status(500).json({ error: 'Failed to distribute prizes' });
  }
});

// Delete tournament (Admin)
router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete tournaments' });
    }

    const tournament = await Tournament.findByIdAndDelete(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Clean up related records
    await TournamentParticipant.deleteMany({ tournamentId: req.params.id });
    await TournamentResult.deleteMany({ tournamentId: req.params.id });

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// ===== USER ROUTES =====

// Get all tournaments
router.get('/list', async (req, res) => {
  try {
    const userId = req.headers.authorization ? await extractUserIdFromToken(req.headers.authorization) : null;
    const tournaments = await Tournament.find()
      .populate('game', 'name')
      .populate('gameMode', 'name')
      .sort({ startDate: -1 });

    // Add participant count and user joined status for each tournament
    const tournamentsWithCounts = await Promise.all(
      tournaments.map(async (tournament) => {
        const participantCount = await TournamentParticipant.countDocuments({
          tournamentId: tournament._id,
        });

        let userJoined = false;
        if (userId) {
          const userParticipant = await TournamentParticipant.findOne({
            tournamentId: tournament._id,
            userId,
          });
          userJoined = !!userParticipant;
        }

        return {
          ...tournament.toObject(),
          participantCount,
          userJoined,
        };
      })
    );

    res.json(tournamentsWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Helper to extract user ID from token (for unauthenticated requests)
async function extractUserIdFromToken(authHeader) {
  try {
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    // Decode token logic - assuming JWT
    const decoded = require('jsonwebtoken').decode(token);
    return decoded?.userId || null;
  } catch (err) {
    return null;
  }
}

// Get tournament details with participants
router.get('/:id/details', authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participant = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    const participantCount = await TournamentParticipant.countDocuments({
      tournamentId: req.params.id,
    });

    const userJoined = !!participant;
    const roomCredentialsVisible = tournament.showRoomCredentials && userJoined;

    res.json({
      ...tournament.toObject(),
      userJoined,
      participantCount,
      showRoomCredentials: tournament.showRoomCredentials,
      roomCredentialsVisible,
      roomId: roomCredentialsVisible ? tournament.roomId : null,
      roomPassword: roomCredentialsVisible ? tournament.roomPassword : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament details' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get participants
    const participants = await TournamentParticipant.find({ tournamentId: req.params.id })
      .populate('userId', 'username email');

    res.json({
      ...tournament.toObject(),
      participants,
      participantCount: participants.length,
      roomId: null,
      roomPassword: null,
      showRoomCredentials: tournament.showRoomCredentials,
    });
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

    // Check if already joined
    const alreadyJoined = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    // Check participant count
    const participantCount = await TournamentParticipant.countDocuments({
      tournamentId: req.params.id,
    });

    // Check eligibility
    const checks = {
      isActive: user.status === 'active',
      hasKYC: tournament.minimumKYC ? user.kycVerified : true,
      hasSufficientBalance: user.wallet.balance >= tournament.entryFee,
      spotsAvailable: participantCount < tournament.maxPlayers,
      notAlreadyRegistered: !alreadyJoined,
      tournamentStatus: tournament.status === 'upcoming',
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
    console.error('Error checking eligibility:', error);
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

    if (tournament.status !== 'upcoming') {
      return res.status(400).json({ error: 'Tournament is not accepting registrations' });
    }

    // Check if already joined
    const alreadyJoined = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    if (alreadyJoined) {
      return res.status(400).json({ error: 'Already registered for this tournament' });
    }

    // Check spot availability
    const participantCount = await TournamentParticipant.countDocuments({
      tournamentId: req.params.id,
    });

    if (participantCount >= tournament.maxPlayers) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    // Add participant
    const participant = new TournamentParticipant({
      tournamentId: req.params.id,
      userId: req.userId,
      status: 'joined',
    });
    await participant.save();

    // Deduct entry fee
    user.wallet.balance -= tournament.entryFee;
    user.tournament.participatedCount += 1;
    await user.save();

    // Create transaction
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'tournament_entry',
      amount: tournament.entryFee,
      tournamentId: req.params.id,
      description: `Entry fee for ${tournament.name}`,
      status: 'completed',
    });
    await transaction.save();

    // Add to tournament registeredPlayers array (for backward compatibility)
    tournament.registeredPlayers.push(req.userId);
    await tournament.save();

    res.json({
      message: 'Successfully joined tournament',
      participant,
      walletBalance: user.wallet.balance,
    });
  } catch (error) {
    console.error('Error joining tournament:', error);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// Get room info (5 minutes before start)
router.get('/:id/room-info', authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if user is a participant
    const participant = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant in this tournament' });
    }

    // Check if tournament starts within 5 minutes
    const now = new Date();
    const startTime = new Date(tournament.startDate);
    const timeDiff = startTime - now;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff > fiveMinutes) {
      return res.status(400).json({
        error: 'Room details will be shown 5 minutes before tournament starts',
        timeRemaining: timeDiff,
      });
    }

    if (timeDiff < 0) {
      return res.status(400).json({ error: 'Tournament has already started' });
    }

    if (!tournament.showRoomCredentials) {
      return res.status(403).json({
        error: 'Room details are hidden by admin',
      });
    }

    // Return room info
    res.json({
      roomId: tournament.roomId || 'Not set',
      roomPassword: tournament.roomPassword ? '●●●●●' : 'Not set',
      actualPassword: tournament.roomPassword, // In production, encrypt this
      tournamentName: tournament.name,
      startTime: tournament.startDate,
      timeRemaining: timeDiff,
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room information' });
  }
});

// Get user's tournament history
router.get('/user/history', authMiddleware, async (req, res) => {
  try {
    const participants = await TournamentParticipant.find({ userId: req.userId })
      .populate('tournamentId')
      .sort({ joinedAt: -1 });

    const tournaments = participants.map(p => ({
      ...p.toObject(),
      tournament: p.tournamentId,
    }));

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournament history:', error);
    res.status(500).json({ error: 'Failed to fetch tournament history' });
  }
});

// Get tournament results
router.get('/:id/results', async (req, res) => {
  try {
    const results = await TournamentResult.find({ tournamentId: req.params.id })
      .populate('userId', 'username email')
      .sort({ rank: 1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament results' });
  }
});

module.exports = router;
