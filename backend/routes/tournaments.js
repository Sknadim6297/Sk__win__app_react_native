const express = require('express');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const TournamentParticipant = require('../models/TournamentParticipant');
const TournamentResult = require('../models/TournamentResult');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const CustomMatchResult = require('../models/CustomMatchResult');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const lifecycle = require('../services/tournamentLifecycle');
const WalletTransaction = require('../models/WalletTransaction');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const MAX_BONUS_ENTRY_PERCENT = 0.2;

const getEntryPaymentSplit = (user, entryFee) => {
  const fee = Number(entryFee) || 0;
  const bonusBalance = Number(user?.wallet?.bonusBalance) || 0;
  const maxBonusAllowed = Math.floor(fee * MAX_BONUS_ENTRY_PERCENT);
  const bonusUsed = Math.min(bonusBalance, maxBonusAllowed);
  const realMoneyRequired = Math.max(fee - bonusUsed, 0);

  return {
    bonusUsed,
    realMoneyRequired,
    maxBonusAllowed,
  };
};

const normalizeStatus = (status) => {
  if (status === 'upcoming') return 'incoming';
  if (status === 'live') return 'ongoing';
  return status;
};

async function getNextMatchNumber() {
  const latest = await Tournament.findOne({ matchNumber: { $ne: null } })
    .sort({ matchNumber: -1 })
    .select('matchNumber')
    .lean();
  if (latest?.matchNumber) {
    return latest.matchNumber + 1;
  }
  const total = await Tournament.countDocuments();
  return 30000 + total + 1;
}

function resolveMatchNumber(tournament) {
  if (tournament.matchNumber) return tournament.matchNumber;
  const id = tournament._id?.toString() || '';
  const derived = parseInt(id.slice(-6), 16) % 80000;
  return 10000 + derived;
}

const getSurvivalReward = (tournament, rank) => {
  if (!rank) return 0;
  if (rank === 1) return tournament?.prizes?.first || 0;
  if (rank === 2) return tournament?.prizes?.second || 0;
  if (rank === 3) return tournament?.prizes?.third || 0;
  return 0;
};

const isBattleRoyaleTournament = (tournament) => {
  if (tournament?.category === 'battle_royale') return true;
  if (tournament?.category === 'custom') return false;
  const modeName = tournament?.gameMode?.name || '';
  return String(modeName).toLowerCase().includes('battle royale');
};

const calculateResultRewards = (tournament, resultsInput) => {
  const isBR = isBattleRoyaleTournament(tournament);
  const perKillAmount = isBR ? (tournament.perKill || 0) : 0;

  const teamMap = new Map();
  for (const entry of resultsInput) {
    const teamId = entry.teamId || entry.userId?.toString();
    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, { teamKills: 0, members: [] });
    }
    const team = teamMap.get(teamId);
    const kills = isBR ? (Number(entry.kills) || 0) : 0;
    team.teamKills += kills;
    team.members.push(entry.userId?.toString());
  }

  return resultsInput.map((entry) => {
    const teamId = entry.teamId || entry.userId?.toString();
    const team = teamMap.get(teamId) || { teamKills: 0, members: [] };
    const teamSize = Math.max(team.members.length, 1);
    const kills = isBR ? (Number(entry.kills) || 0) : 0;
    const teamKillReward = isBR ? team.teamKills * perKillAmount : 0;
    const killReward = isBR ? Math.round(teamKillReward / teamSize) : 0;
    const survivalReward = getSurvivalReward(tournament, entry.rank);
    const totalReward = killReward + survivalReward;

    return {
      ...entry,
      kills,
      teamId,
      perKillAmount,
      rewardType: isBR ? 'battle_royale' : 'custom',
      killReward,
      survivalReward,
      totalReward: killReward + survivalReward,
      prizeAmount: survivalReward,
    };
  });
};

async function getJoinEligibility(tournament, participantCount) {
  const status = lifecycle.getEffectiveStatus(tournament);
  const joined = participantCount ?? tournament.currentParticipants ?? 0;
  const isCustom = lifecycle.isCustomMatch(tournament);
  const max = isCustom ? (tournament.maxTeams || 2) : (tournament.maxParticipants || 50);

  if (status === 'draft') {
    return { canJoin: false, reason: 'Tournament is not published yet' };
  }
  if (tournament.resultsPublished || status === 'result_published') {
    return { canJoin: false, reason: 'Results have been published for this match' };
  }
  if (status === 'ongoing' || status === 'live') {
    return { canJoin: false, reason: 'Match has started — registration is locked' };
  }
  if (status === 'completed' || status === 'cancelled') {
    return { canJoin: false, reason: 'This tournament is not open for joining' };
  }
  if (status === 'locked') {
    return { canJoin: false, reason: 'Registration is closed' };
  }
  if (joined >= max) {
    return {
      canJoin: false,
      reason: isCustom ? 'Match is full — both teams registered' : 'Tournament is full — all slots taken',
      isFull: true,
    };
  }
  if (status !== 'upcoming' && status !== 'incoming') {
    return { canJoin: false, reason: 'Match is not open for joining' };
  }
  return { canJoin: true, reason: null, isFull: false };
}

// Helper function to calculate tournament status based on time
function calculateTournamentStatus(tournament) {
  if (tournament.lifecycleStatus) {
    return lifecycle.getEffectiveStatus(tournament);
  }

  const now = new Date();
  const startDate = new Date(tournament.startDate);
  const endDate = tournament.endDate ? new Date(tournament.endDate) : null;
  const normalizedStatus = normalizeStatus(tournament.status);

  if (tournament.resultsPublished || normalizedStatus === 'result_published') {
    return 'result_published';
  }

  if (['draft', 'upcoming', 'ongoing', 'completed', 'result_published', 'cancelled'].includes(tournament.status)) {
    return tournament.status;
  }

  // Respect manual override
  if (tournament.statusOverride) {
    if (normalizedStatus === 'cancelled') return 'cancelled';
    if (normalizedStatus === 'completed') return 'completed';
    if (normalizedStatus === 'result_published') return 'result_published';
    if (normalizedStatus === 'ongoing') return 'ongoing';
    if (normalizedStatus === 'incoming') return 'incoming';
  }

  // If manually set to cancelled, keep it cancelled
  if (normalizedStatus === 'cancelled') {
    return 'cancelled';
  }

  // If manually set to completed, keep it completed
  if (normalizedStatus === 'completed') {
    return 'completed';
  }

  // If room credentials are shared, tournament becomes locked
  if (tournament.roomCredentialsSharedAt || (tournament.roomId && tournament.roomPassword && tournament.showRoomCredentials)) {
    if (!tournament.locked) {
      tournament.locked = true;
      tournament.lockedAt = tournament.roomCredentialsSharedAt || new Date();
      tournament.status = 'locked';
    }
    
    // Check if it should move to live
    if (!tournament.statusOverride) {
      if (now >= startDate) {
        return 'ongoing';
      }
      return 'locked';
    }
  }

  // Auto-calculate based on time
  if (endDate && now > endDate) {
    return 'completed';
  }

  if (now >= startDate && (!endDate || now <= endDate)) {
    return 'ongoing';
  }

  if (now < startDate) {
    return tournament.locked ? 'locked' : 'incoming';
  }

  return 'incoming';
}

// ===== ADMIN ROUTES (Must be before :id routes) =====

// Test route for debugging
router.get('/admin/test', (req, res) => {
  res.json({ message: 'Admin test route working' });
});

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
      bannerImage,
      bannerTitle,
      game,
      gameMode,
      mode,
      category,
      map,
      rules,
      entryFee, 
      prizePool,
      perKill,
      maxParticipants, 
      startDate, 
      endDate, 
      minimumBalance,
      prizes, 
      roomId, 
      roomPassword, 
      showRoomCredentials,
      status,
      statusOverride
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

    const matchCategory = category === 'custom' ? 'custom' : 'battle_royale';

    const tournamentData = {
      name,
      description: description || '',
      bannerImage: bannerImage || '',
      bannerTitle: bannerTitle || '',
      game,
      gameMode,
      mode: mode || 'solo',
      category: matchCategory,
      map: map || 'Bermuda',
      rules: rules || [],
      entryFee: entryFee || 0,
      prizePool: prizePool || 0,
      perKill: matchCategory === 'custom' ? 0 : (perKill || 0),
      rewardType: matchCategory === 'custom' ? 'survival' : 'per_kill',
      maxParticipants: maxParticipants || 20,
      currentParticipants: 0,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      minimumBalance: minimumBalance || 0,
      prizes: prizes || {
        first: prizePool ? prizePool * 0.5 : 0,
        second: prizePool ? prizePool * 0.3 : 0,
        third: prizePool ? prizePool * 0.2 : 0,
      },
      roomId: roomId || '',
      roomPassword: roomPassword || '',
      showRoomCredentials: !!showRoomCredentials,
      lifecycleStatus: 'draft',
      status: 'draft',
      maxTeams: matchCategory === 'custom' ? (req.body.maxTeams || 2) : 2,
      statusOverride: true,
      registeredPlayers: [],
      createdBy: req.userId,
    };

    tournamentData.matchNumber = await getNextMatchNumber();

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
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update tournaments' });
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    if (updateData.status) {
      updateData.status = normalizeStatus(updateData.status);
      if (typeof updateData.statusOverride !== 'boolean') {
        updateData.statusOverride = updateData.status !== 'incoming';
      }
    }
    
    // Check if room credentials are being shared for the first time
    if (updateData.showRoomCredentials && updateData.roomId && updateData.roomPassword) {
      const existingTournament = await Tournament.findById(req.params.id);
      if (!existingTournament.roomCredentialsSharedAt) {
        updateData.roomCredentialsSharedAt = new Date();
        updateData.locked = true;
        updateData.lockedAt = new Date();
        updateData.status = 'locked';
      }
    }

    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('game', 'name').populate('gameMode', 'name');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Update status based on current time
    const newStatus = calculateTournamentStatus(tournament);
    if (newStatus !== tournament.status) {
      tournament.status = newStatus;
      await tournament.save();
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
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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

// Lock/Unlock tournament (Admin)
router.post('/admin/:id/lock', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can lock/unlock tournaments' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const { locked } = req.body;
    
    tournament.locked = locked;
    if (locked) {
      tournament.lockedAt = new Date();
      tournament.status = 'locked';
    } else {
      tournament.lockedAt = null;
      // Recalculate status when unlocking
      const now = new Date();
      const startDate = new Date(tournament.startDate);
      if (now >= startDate) {
        tournament.status = 'live';
      } else {
        tournament.status = 'upcoming';
      }
    }
    
    await tournament.save();

    const populatedTournament = await Tournament.findById(tournament._id)
      .populate('game', 'name')
      .populate('gameMode', 'name');

    res.json({ 
      message: `Tournament ${locked ? 'locked' : 'unlocked'} successfully`, 
      tournament: populatedTournament 
    });
  } catch (error) {
    console.error('Error locking/unlocking tournament:', error);
    res.status(500).json({ error: 'Failed to lock/unlock tournament' });
  }
});

// Get tournaments by game mode (Admin)
router.get('/admin/by-gamemode/:gameModeId', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get all tournaments (admin with participants)
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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

    const winnerIds = [firstWinnerId, secondWinnerId, thirdWinnerId];
    const participants = await TournamentParticipant.find({
      tournamentId: req.params.id,
      userId: { $in: winnerIds },
    }).select('userId');

    if (participants.length !== winnerIds.length) {
      return res.status(400).json({ error: 'All winners must be participants of this tournament' });
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
        perKillAmount: tournament.perKill || 0,
        rewardType: tournament.rewardType || 'survival',
        killReward: 0,
        survivalReward: winner.prizeAmount,
        totalReward: winner.prizeAmount,
        screenshotUrl: null,
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

// Submit match results (Admin) — deprecated; use /api/tournament-management
router.post('/admin/:id/results', authMiddleware, (req, res) => {
  res.status(410).json({
    error: 'Deprecated. Use POST /api/tournament-management/admin/:id/results/battle-royale or custom-match',
  });
});

// Publish results — makes leaderboard visible to users
router.post('/admin/:id/publish-results', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can publish results' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const type = lifecycle.getTournamentType(tournament);
    if (type === 'battle_royale') {
      const joinedCount = await lifecycle.getJoinedCount(tournament._id, tournament);
      const resultCount = await BattleRoyaleResult.countDocuments({ tournamentId: req.params.id });
      if (joinedCount > 0 && resultCount < joinedCount) {
        return res.status(400).json({ error: 'Save results for every joined player first' });
      }
    } else {
      const custom = await CustomMatchResult.findOne({ tournamentId: req.params.id });
      if (!custom) {
        return res.status(400).json({ error: 'Save custom match results before publishing' });
      }
    }

    lifecycle.syncLegacyFields(tournament, 'result_published');
    await tournament.save();

    res.json({ message: 'Results published successfully', status: 'result_published' });
  } catch (error) {
    console.error('Error publishing results:', error);
    res.status(500).json({ error: 'Failed to publish results' });
  }
});

// Distribute prizes (Admin)
router.post('/admin/:id/distribute-prizes', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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
        const rewardAmount = result.totalReward || result.prizeAmount || 0;

        if (rewardAmount > 0) {
          // Credit reward to wallet
          user.wallet.balance += rewardAmount;
          user.tournament.wins += result.rank >= 1 && result.rank <= 3 ? 1 : 0;
          user.tournament.earnings += rewardAmount;
          await user.save();

          // Create transaction
          const transaction = await WalletTransaction.create({
            userId: result.userId,
            type: 'tournament_reward',
            amount: rewardAmount,
            tournamentId: req.params.id,
            description: `Reward for ${tournament.name}`,
            status: 'completed',
          });

          await Notification.create({
            userId: result.userId,
            tournamentId: tournament._id,
            type: 'tournament_update',
            title: 'Tournament Reward Credited',
            message: `₹${rewardAmount} has been credited for ${tournament.name}.`,
          });

          // Mark prize as credited
          result.prizeCredited = true;
          result.prizeTransactionId = transaction._id;
          await result.save();
        } else {
          result.prizeCredited = true;
          await result.save();
        }

        distributedPrizes.push({
          userId: result.userId,
          rank: result.rank,
          prizeAmount: rewardAmount,
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
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
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

// Get tournament history with participants (Admin)
router.get('/admin/history', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view tournament history' });
    }

    const tournaments = await Tournament.find()
      .populate('game', 'name')
      .populate('gameMode', 'name')
      .sort({ startDate: -1 });

    // Fetch participants for each tournament
    const tournamentHistory = await Promise.all(
      tournaments.map(async (tournament) => {
        const participants = await TournamentParticipant.find({ 
          tournamentId: tournament._id 
        })
          .populate('userId', 'username email phoneNumber')
          .sort({ joinedAt: -1 });

        // Calculate status based on time
        const calculatedStatus = calculateTournamentStatus(tournament);

        return {
          _id: tournament._id,
          name: tournament.name,
          game: tournament.game,
          gameMode: tournament.gameMode,
          mode: tournament.mode,
          map: tournament.map,
          entryFee: tournament.entryFee,
          prizePool: tournament.prizePool,
          perKill: tournament.perKill,
          maxParticipants: tournament.maxParticipants,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          status: calculatedStatus,
          roomId: tournament.roomId,
          roomPassword: tournament.roomPassword,
          showRoomCredentials: tournament.showRoomCredentials,
          totalJoined: participants.length,
          participants: participants.map(p => ({
            userId: p.userId?._id,
            username: p.userId?.username,
            email: p.userId?.email,
            phoneNumber: p.userId?.phoneNumber,
            slotNumber: p.slotNumber,
            gamingUsername: p.gamingUsername,
            status: p.status,
            joinedAt: p.joinedAt,
            rank: p.rank,
            prizeAmount: p.prizeAmount,
          })),
        };
      })
    );

    res.json(tournamentHistory);
  } catch (error) {
    console.error('Error fetching tournament history:', error);
    res.status(500).json({ error: 'Failed to fetch tournament history' });
  }
});

// Get participants for a specific tournament (Admin)
router.get('/admin/:id/participants', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view participants' });
    }

    const tournament = await Tournament.findById(req.params.id)
      .populate('game', 'name')
      .populate('gameMode', 'name');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participants = await TournamentParticipant.find({ 
      tournamentId: req.params.id 
    })
      .populate('userId', 'username email phoneNumber wallet')
      .sort({ joinedAt: -1 });

    res.json({
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        game: tournament.game,
        gameMode: tournament.gameMode,
        maxParticipants: tournament.maxParticipants,
        roomId: tournament.roomId,
        roomPassword: tournament.roomPassword,
        showRoomCredentials: tournament.showRoomCredentials,
      },
      participants: participants.map(p => ({
        _id: p._id,
        userId: p.userId?._id,
        username: p.userId?.username,
        email: p.userId?.email,
        phoneNumber: p.userId?.phoneNumber,
        walletBalance: p.userId?.wallet?.balance,
        slotNumber: p.slotNumber,
        gamingUsername: p.gamingUsername,
        teamName: p.teamName,
        status: p.status,
        joinedAt: p.joinedAt,
        rank: p.rank,
        prizeAmount: p.prizeAmount,
      })),
      totalJoined: participants.length,
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// ===== USER ROUTES =====

// Debug endpoint to check user's joined tournaments
router.get('/debug/my-joins', authMiddleware, async (req, res) => {
  try {
    const participants = await TournamentParticipant.find({ userId: req.userId })
      .populate('tournamentId', 'name')
      .select('tournamentId slotNumber gamingUsername joinedAt');
    
    res.json({
      userId: req.userId,
      totalJoined: participants.length,
      tournaments: participants.map(p => ({
        tournamentId: p.tournamentId?._id,
        tournamentName: p.tournamentId?.name,
        slotNumber: p.slotNumber,
        gamingUsername: p.gamingUsername,
        joinedAt: p.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// Get all tournaments
router.get('/list', async (req, res) => {
  try {
    const userId = req.headers.authorization ? await extractUserIdFromToken(req.headers.authorization) : null;
    const tournaments = await Tournament.find()
      .populate('game', 'name image')
      .populate('gameMode', 'name image')
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
          
          // Debug logging
          if (userParticipant) {
            console.log(`User ${userId} has joined tournament ${tournament._id} (${tournament.name})`);
          }
        }

        // Calculate real-time status
        const calculatedStatus = calculateTournamentStatus(tournament);

        const doc = tournament.toObject();
        return {
          ...doc,
          matchNumber: resolveMatchNumber(doc),
          currentParticipants: participantCount,
          participantCount,
          userJoined,
          status: calculatedStatus,
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
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    // Verify and decode token properly
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Extracted userId from token:', decoded.userId);
    return decoded.userId || null;
  } catch (err) {
    console.error('Error extracting userId from token:', err.message);
    return null;
  }
}

// Get tournament details with participants
router.get('/:id/details', authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('game', 'name image')
      .populate('gameMode', 'name image');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participant = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    const participants = await TournamentParticipant.find({ tournamentId: req.params.id })
      .populate('userId', 'username gameUsername')
      .sort({ slotNumber: 1 });

    const participantCount = participants.length;
    const userJoined = !!participant;
    const calculatedStatus = calculateTournamentStatus(tournament);
    const roomCredentialsVisible =
      (calculatedStatus === 'ongoing' || calculatedStatus === 'live') &&
      userJoined &&
      (tournament.roomId || tournament.roomPassword);

    const doc = tournament.toObject();
    const joinCheck = await getJoinEligibility(tournament, participantCount);
    const startMs = new Date(tournament.startDate).getTime() - Date.now();

    res.json({
      ...doc,
      matchNumber: resolveMatchNumber(doc),
      status: calculatedStatus,
      displayStatus: calculatedStatus === 'incoming' ? 'upcoming' : calculatedStatus,
      userJoined,
      participantCount,
      canJoin: joinCheck.canJoin && !userJoined,
      joinBlockReason: joinCheck.reason,
      countdownMs: Math.max(startMs, 0),
      resultsPublished: !!tournament.resultsPublished,
      participants: participants.map((p) => ({
        userId: p.userId?._id || p.userId,
        slotNumber: p.slotNumber,
        gamingUsername: p.gamingUsername,
        gamingUID: p.gamingUID,
        username: p.userId?.username,
        joinedAt: p.joinedAt,
      })),
      myGamingDetails: participant
        ? {
            gamingID: participant.gamingUsername,
            gamingUID: participant.gamingUID,
            slotNumber: participant.slotNumber,
          }
        : null,
      showRoomCredentials: tournament.showRoomCredentials,
      roomCredentialsVisible,
      roomId: roomCredentialsVisible ? tournament.roomId : null,
      roomPassword: roomCredentialsVisible ? tournament.roomPassword : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament details' });
  }
});

// Get user's joined tournaments (My Contests) - MUST BE BEFORE /:id
router.get('/my-tournaments', authMiddleware, async (req, res) => {
  try {
    const participants = await TournamentParticipant.find({ userId: req.userId })
      .populate({
        path: 'tournamentId',
        populate: [
          { path: 'game', select: 'name' },
          { path: 'gameMode', select: 'name' }
        ]
      })
      .sort({ joinedAt: -1 });

    const myTournaments = participants
      .filter(p => p.tournamentId) // Filter out null tournaments
      .map(p => {
        const tournament = p.tournamentId;
        const calculatedStatus = calculateTournamentStatus(tournament);
        
        return {
          ...tournament.toObject(),
          status: calculatedStatus,
          userJoined: true,
          joinedAt: p.joinedAt,
          participantStatus: p.status,
          rank: p.rank,
          prizeAmount: p.prizeAmount,
        };
      });

    res.json(myTournaments);
  } catch (error) {
    console.error('Error fetching my tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get user's tournament history - MUST BE BEFORE /:id
router.get('/user/history', authMiddleware, async (req, res) => {
  try {
    const participants = await TournamentParticipant.find({ userId: req.userId })
      .populate({
        path: 'tournamentId',
        populate: [
          { path: 'game', select: 'name' },
          { path: 'gameMode', select: 'name' },
        ],
      })
      .sort({ joinedAt: -1 });

    const tournaments = participants.map(p => ({
      ...p.toObject(),
      tournament: p.tournamentId
        ? {
            ...p.tournamentId.toObject(),
            status: calculateTournamentStatus(p.tournamentId),
          }
        : null,
    }));

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournament history:', error);
    res.status(500).json({ error: 'Failed to fetch tournament history' });
  }
});

// Check if user can join tournament
router.get('/:id/canJoin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
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
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Prevent admins from joining tournaments as participants
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot join tournaments as participants' });
    }

    // Check eligibility
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const { bonusUsed, realMoneyRequired } = getEntryPaymentSplit(user, tournament.entryFee);

    if (user.wallet.balance < realMoneyRequired) {
      return res.status(400).json({ 
        error: `Insufficient real balance! You need ₹${realMoneyRequired} real money and can use ₹${bonusUsed} bonus. Current real balance: ₹${user.wallet.balance}.` 
      });
    }

    // Check if tournament is locked (room credentials shared)
    if (tournament.locked || tournament.status === 'locked') {
      return res.status(400).json({ 
        error: 'Tournament will start soon! Registration is now closed. Better luck in the next tournament!' 
      });
    }

    if (tournament.status === 'live') {
      return res.status(400).json({ 
        error: 'Tournament has already started! Registration is closed. Join the next tournament!' 
      });
    }

    if (tournament.status === 'completed') {
      return res.status(400).json({ 
        error: 'This tournament has ended. Check out our upcoming tournaments!' 
      });
    }

    if (tournament.status !== 'upcoming') {
      return res.status(400).json({ 
        error: 'Registration is currently closed for this tournament. Try another one!' 
      });
    }

    // Check if already joined
    const alreadyJoined = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    if (alreadyJoined) {
      return res.status(400).json({ 
        error: 'You have already joined this tournament! Good luck!' 
      });
    }

    // Check spot availability
    const participantCount = await TournamentParticipant.countDocuments({
      tournamentId: req.params.id,
    });

    if (participantCount >= tournament.maxPlayers) {
      return res.status(400).json({ 
        error: 'Tournament is full! All slots are taken. Check out other available tournaments!' 
      });
    }

    // Add participant
    const participant = new TournamentParticipant({
      tournamentId: req.params.id,
      userId: req.userId,
      status: 'joined',
    });
    await participant.save();

    // Deduct entry fee with capped bonus usage (20% max from bonus)
    user.wallet.balance -= realMoneyRequired;
    user.wallet.bonusBalance = Math.max((user.wallet.bonusBalance || 0) - bonusUsed, 0);
    user.wallet.bonusUsed = (user.wallet.bonusUsed || 0) + bonusUsed;
    user.tournament.participatedCount += 1;
    await user.save();

    // Create transaction
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'tournament_entry',
      amount: tournament.entryFee,
      tournamentId: req.params.id,
      description: `Entry fee for ${tournament.name} (bonus ₹${bonusUsed}, real ₹${realMoneyRequired})`,
      status: 'completed',
    });
    await transaction.save();

    await Notification.create({
      userId: req.userId,
      tournamentId: tournament._id,
      type: 'tournament_update',
      title: 'Tournament Joined',
      message: `You joined ${tournament.name}. Entry paid: ₹${tournament.entryFee} (bonus ₹${bonusUsed}, real ₹${realMoneyRequired}).`,
    });

    // Add to tournament registeredPlayers array (for backward compatibility)
    tournament.registeredPlayers.push(req.userId);
    await tournament.save();

    res.json({
      message: 'Successfully joined tournament',
      participant,
      walletBalance: user.wallet.balance,
      bonusUsed,
      realMoneyUsed: realMoneyRequired,
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

// Get tournament results — delegates to new result collections
router.get('/:id/results', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('gameMode', 'name').lean();
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const status = lifecycle.getEffectiveStatus(tournament);
    if (status !== 'result_published') {
      return res.status(403).json({ error: 'Results are not published yet' });
    }

    const type = lifecycle.getTournamentType(tournament);

    if (type === 'battle_royale') {
      const results = await BattleRoyaleResult.find({ tournamentId: req.params.id })
        .populate('userId', 'username')
        .sort({ position: 1 })
        .lean();

      const leaderboard = results.map((r) => ({
        userId: r.userId?._id || r.userId,
        username: r.userId?.username,
        gamingID: r.gamingUsername,
        gamingUID: r.gamingUID,
        rank: r.position,
        kills: r.kills,
        prize: r.prize,
        totalReward: r.prize,
        isWinner: r.position === 1,
      }));

      return res.json({
        tournament: {
          _id: tournament._id,
          name: tournament.name,
          category: tournament.category,
          perKill: tournament.perKill,
          prizePool: tournament.prizePool,
          status,
        },
        tournamentType: 'battle_royale',
        isBattleRoyale: true,
        winner: leaderboard.find((e) => e.rank === 1) || null,
        leaderboard,
      });
    }

    const custom = await CustomMatchResult.findOne({ tournamentId: req.params.id })
      .populate('winnerTeamId')
      .populate('runnerUpTeamId')
      .populate('mvpUserId', 'username')
      .lean();

    if (!custom) return res.status(404).json({ error: 'Results not found' });

    const mvpMember = await TeamMember.findOne({
      tournamentId: req.params.id,
      userId: custom.mvpUserId?._id || custom.mvpUserId,
    }).lean();

    return res.json({
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        category: tournament.category,
        prizePool: tournament.prizePool,
        status,
      },
      tournamentType: 'custom_match',
      isBattleRoyale: false,
      customMatch: {
        winnerTeam: custom.winnerTeamId,
        runnerUpTeam: custom.runnerUpTeamId,
        mvp: {
          userId: custom.mvpUserId?._id || custom.mvpUserId,
          username: custom.mvpUserId?.username,
          gamingUsername: mvpMember?.gamingUsername,
          gamingUID: mvpMember?.gamingUID,
        },
        winnerPrize: custom.winnerPrize,
        runnerUpPrize: custom.runnerUpPrize,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament results' });
  }
});

// ===== SLOT BOOKING ENDPOINTS =====

// Get all slots for a tournament (initialized if not exists)
router.get('/:id/slots', async (req, res) => {
  try {
    let tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Initialize slots if not already created
    if (!tournament.slots || tournament.slots.length === 0) {
      const newSlots = [];
      for (let i = 1; i <= 50; i++) {
        newSlots.push({
          slotNumber: i,
          userId: null,
          gamingUsername: null,
          bookedAt: null,
          isBooked: false,
        });
      }
      tournament.slots = newSlots;
      tournament = await tournament.save();
    }

    // Format response with slot details
    const slotsWithUsernames = tournament.slots.map(slot => ({
      slotNumber: slot.slotNumber,
      isBooked: slot.isBooked,
      gamingUsername: slot.isBooked ? slot.gamingUsername : null,
      userId: slot.isBooked ? slot.userId : null,
    }));

    res.json({
      tournamentId: tournament._id,
      totalSlots: 50,
      bookedSlots: tournament.slots.filter(s => s.isBooked).length,
      availableSlots: 50 - tournament.slots.filter(s => s.isBooked).length,
      slots: slotsWithUsernames,
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Book a slot for tournament
router.post('/:id/book-slot', authMiddleware, async (req, res) => {
  try {
    const { slotNumber, gamingID, gamingUID, gamingUsername } = req.body;
    const gamingIdValue = String(gamingID || gamingUsername || '').trim();
    const gamingUidValue = String(gamingUID || '').trim();

    if (!slotNumber || !gamingIdValue || !gamingUidValue) {
      return res.status(400).json({ error: 'Slot number, Gaming ID, and UID are required' });
    }

    if (slotNumber < 1 || slotNumber > 50) {
      return res.status(400).json({ error: 'Invalid slot number. Must be between 1 and 50' });
    }

    if (gamingIdValue.length < 3) {
      return res.status(400).json({ error: 'Gaming ID must be at least 3 characters' });
    }

    if (gamingUidValue.length < 3) {
      return res.status(400).json({ error: 'UID must be at least 3 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Initialize slots if not already created
    if (!tournament.slots || tournament.slots.length === 0) {
      const newSlots = [];
      for (let i = 1; i <= 50; i++) {
        newSlots.push({
          slotNumber: i,
          userId: null,
          gamingUsername: null,
          bookedAt: null,
          isBooked: false,
        });
      }
      tournament.slots = newSlots;
      await tournament.save();
    }

    const participantCount = await TournamentParticipant.countDocuments({
      tournamentId: req.params.id,
    });
    const joinCheck = await getJoinEligibility(tournament, participantCount);
    if (!joinCheck.canJoin) {
      return res.status(400).json({ error: joinCheck.reason, success: false });
    }

    // Check 1: Does user already have a slot in this tournament? (Check slots array)
    const existingSlot = tournament.slots.find(s => s.userId && s.userId.toString() === req.userId);
    if (existingSlot) {
      return res.status(400).json({ 
        error: 'You have already booked a slot in this tournament',
        existingSlotNumber: existingSlot.slotNumber 
      });
    }

    // Check 2: Does user already have a participant record? (Double check)
    const existingParticipant = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });
    if (existingParticipant) {
      return res.status(400).json({ 
        error: 'You have already joined this tournament',
        existingSlotNumber: existingParticipant.slotNumber 
      });
    }

    // Check 3: Find the requested slot
    const slot = tournament.slots.find(s => s.slotNumber === slotNumber);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Check 4: Is THIS specific slot already booked by someone else?
    if (slot.isBooked) {
      return res.status(400).json({ 
        error: 'This slot is already booked by another player',
        slotNumber: slotNumber 
      });
    }

    const { bonusUsed, realMoneyRequired, maxBonusAllowed } = getEntryPaymentSplit(user, tournament.entryFee);

    // Step 1: Check real wallet balance after bonus cap
    if (user.wallet.balance < realMoneyRequired) {
      return res.status(400).json({ 
        success: false,
        error: 'Insufficient balance',
        message: `❌ Insufficient real balance. For entry fee ₹${tournament.entryFee}, you can use up to ₹${maxBonusAllowed} bonus. Required real money: ₹${realMoneyRequired}, current real balance: ₹${user.wallet.balance}.`,
        requiredAmount: tournament.entryFee,
        currentBalance: user.wallet.balance,
      });
    }

    const usernameMismatch =
      user.gameUsername && user.gameUsername.toLowerCase() !== gamingIdValue.toLowerCase();

    if (usernameMismatch) {
      return res.status(200).json({
        success: true,
        step: 'confirm_username_mismatch',
        message: '⚠️ Gaming ID does not match your profile gaming name.',
        profileUsername: user.gameUsername,
        enteredUsername: gamingIdValue,
        warning: 'You can continue, but no refund will be given if details are wrong.',
        requiresConfirmation: true,
      });
    }

    slot.userId = req.userId;
    slot.gamingUsername = gamingIdValue;
    slot.gamingUID = gamingUidValue;
    slot.bookedAt = new Date();
    slot.isBooked = true;

    // Deduct entry fee from wallet with bonus cap
    user.wallet.balance -= realMoneyRequired;
    user.wallet.bonusBalance = Math.max((user.wallet.bonusBalance || 0) - bonusUsed, 0);
    user.wallet.bonusUsed = (user.wallet.bonusUsed || 0) + bonusUsed;
    user.wallet.totalDeposited = (user.wallet.totalDeposited || 0);
    
    // Create transaction record
    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'tournament_entry',
      amount: tournament.entryFee,
      tournamentId: req.params.id,
      description: `Entry fee for ${tournament.name} - Slot ${slotNumber} (bonus ₹${bonusUsed}, real ₹${realMoneyRequired})`,
      status: 'completed',
    });

    // Save all changes atomically
    await tournament.save();
    await user.save();
    await transaction.save();

    // Create tournament participant record
    const participant = new TournamentParticipant({
      tournamentId: req.params.id,
      userId: req.userId,
      slotNumber: slotNumber,
      gamingUsername: gamingIdValue,
      gamingUID: gamingUidValue,
      status: 'joined',
      joinedAt: new Date(),
    });
    await participant.save();

    await Notification.create({
      userId: req.userId,
      tournamentId: tournament._id,
      type: 'tournament_update',
      title: 'Slot Booked',
      message: `Slot #${slotNumber} booked in ${tournament.name}. Entry paid: ₹${tournament.entryFee} (bonus ₹${bonusUsed}, real ₹${realMoneyRequired}).`,
    });

    res.json({
      success: true,
      message: '✅ Joined successfully!',
      booking: {
        slotNumber: slotNumber,
        gamingID: gamingIdValue,
        gamingUID: gamingUidValue,
        gamingUsername: gamingIdValue,
        entryFee: tournament.entryFee,
        tournamentName: tournament.name,
        remainingBalance: user.wallet.balance,
        bonusUsed,
        realMoneyUsed: realMoneyRequired,
      },
    });
  } catch (error) {
    console.error('Error booking slot:', error);
    res.status(500).json({ error: 'Failed to book slot' });
  }
});

// Confirm username mismatch and proceed with booking
router.post('/:id/confirm-slot-booking', authMiddleware, async (req, res) => {
  try {
    const { slotNumber, gamingID, gamingUID, gamingUsername } = req.body;
    const gamingIdValue = String(gamingID || gamingUsername || '').trim();
    const gamingUidValue = String(gamingUID || '').trim();

    if (!slotNumber || !gamingIdValue || !gamingUidValue) {
      return res.status(400).json({ error: 'Slot number, Gaming ID, and UID are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Find the slot
    const slot = tournament.slots.find(s => s.slotNumber === slotNumber);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.isBooked) {
      return res.status(400).json({ error: 'This slot is already booked' });
    }

    const { bonusUsed, realMoneyRequired } = getEntryPaymentSplit(user, tournament.entryFee);

    // Final wallet check
    if (user.wallet.balance < realMoneyRequired) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    slot.userId = req.userId;
    slot.gamingUsername = gamingIdValue;
    slot.gamingUID = gamingUidValue;
    slot.bookedAt = new Date();
    slot.isBooked = true;

    user.wallet.balance -= realMoneyRequired;
    user.wallet.bonusBalance = Math.max((user.wallet.bonusBalance || 0) - bonusUsed, 0);
    user.wallet.bonusUsed = (user.wallet.bonusUsed || 0) + bonusUsed;

    const transaction = new WalletTransaction({
      userId: req.userId,
      type: 'tournament_entry',
      amount: tournament.entryFee,
      tournamentId: req.params.id,
      description: `Entry fee for ${tournament.name} - Slot ${slotNumber} (bonus ₹${bonusUsed}, real ₹${realMoneyRequired})`,
      status: 'completed',
    });

    await tournament.save();
    await user.save();
    await transaction.save();

    const participant = new TournamentParticipant({
      tournamentId: req.params.id,
      userId: req.userId,
      slotNumber: slotNumber,
      gamingUsername: gamingIdValue,
      gamingUID: gamingUidValue,
      status: 'joined',
      joinedAt: new Date(),
    });
    await participant.save();

    await Notification.create({
      userId: req.userId,
      tournamentId: tournament._id,
      type: 'tournament_update',
      title: 'Slot Booked',
      message: `Slot #${slotNumber} booked in ${tournament.name}. Entry paid: ₹${tournament.entryFee} (bonus ₹${bonusUsed}, real ₹${realMoneyRequired}).`,
    });

    res.json({
      success: true,
      message: '✅ Joined successfully!',
      booking: {
        slotNumber: slotNumber,
        gamingID: gamingIdValue,
        gamingUID: gamingUidValue,
        gamingUsername: gamingIdValue,
        entryFee: tournament.entryFee,
        tournamentName: tournament.name,
        remainingBalance: user.wallet.balance,
        bonusUsed,
        realMoneyUsed: realMoneyRequired,
      },
    });
  } catch (error) {
    console.error('Error confirming slot booking:', error);
    res.status(500).json({ error: 'Failed to confirm slot booking' });
  }
});

// ===== GENERIC ROUTE - MUST BE LAST =====
// Get tournament by ID (generic - must be after all specific routes)
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get participants
    const participants = await TournamentParticipant.find({ tournamentId: req.params.id })
      .populate('userId', 'username email');

    const doc = tournament.toObject();
    res.json({
      ...doc,
      matchNumber: resolveMatchNumber(doc),
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

module.exports = router;
