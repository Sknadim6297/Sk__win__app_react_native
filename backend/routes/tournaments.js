const express = require('express');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
require('../models/DailyAutoMatch');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const TournamentParticipant = require('../models/TournamentParticipant');
const TournamentResult = require('../models/TournamentResult');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const CustomMatchResult = require('../models/CustomMatchResult');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const PrizeDistribution = require('../models/PrizeDistribution');
const lifecycle = require('../services/tournamentLifecycle');
const winnerPayoutService = require('../services/winnerPayoutService');
const adminTournamentHistory = require('../services/adminTournamentHistory');
const WalletTransaction = require('../models/WalletTransaction');
const {
  notifyTournamentJoined,
  notifyRoomCredentialsAvailable,
  notifyMatchLive,
  notifyMatchCompleted,
} = require('../services/tournamentPushEvents');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const MAX_BONUS_ENTRY_PERCENT = 0.2;

const DEFAULT_MATCH_RULES = [
  'Minimum level 40+ required to join.',
  'Room ID and password shared 8–10 minutes before match.',
  'No hacks, emulators, or teaming — instant disqualification.',
  'Wrong gaming ID / UID = no refund.',
  'Review prize pool distribution before joining.',
];

function parseRulesInput(rules) {
  if (!rules) return [];
  const lines = Array.isArray(rules) ? rules : String(rules).split(/\r?\n/);
  return lines.flatMap((line) => String(line).split(/\r?\n/)).map((line) => line.trim()).filter(Boolean);
}

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

/** Public display status for user apps — never expose result_published as a status */
function toPublicStatus(tournament) {
  const effective = lifecycle.getEffectiveStatus(tournament);
  if (effective === 'ongoing') return 'ongoing';
  if (effective === 'completed') return 'completed';
  if (effective === 'cancelled') return 'cancelled';
  if (effective === 'upcoming') return 'upcoming';
  return effective;
}

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
  if (tournament?.category === 'custom' || tournament?.category === 'custom_match') return false;
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
  const structure = lifecycle.getMatchStructure(tournament);
  const joined = participantCount ?? tournament.currentParticipants ?? 0;
  const max = structure.totalSlots;

  if (status === 'draft') {
    return { canJoin: false, reason: 'Tournament is not published yet' };
  }
  if (status === 'ongoing' || status === 'live') {
    return { canJoin: false, reason: 'Match has started — registration is locked' };
  }
  if (status === 'completed' || status === 'cancelled' || lifecycle.areResultsPublished(tournament)) {
    return { canJoin: false, reason: 'This tournament is not open for joining' };
  }
  if (status === 'locked') {
    return { canJoin: false, reason: 'Registration is closed' };
  }
  if (joined >= max) {
    return {
      canJoin: false,
      reason: structure.usesTeamRegistration || structure.kind === 'team_vs_team'
        ? 'All team slots are full'
        : 'Tournament is full — all slots taken',
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
    return 'completed';
  }

  if (['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'].includes(tournament.status)) {
    return tournament.status === 'result_published' ? 'completed' : tournament.status;
  }

  // Respect manual override
  if (tournament.statusOverride) {
    if (normalizedStatus === 'cancelled') return 'cancelled';
    if (normalizedStatus === 'completed' || normalizedStatus === 'result_published') return 'completed';
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

    const matchCategory =
      category === 'custom' || category === 'custom_match' ? 'custom' : 'battle_royale';

    const capacity = lifecycle.resolveTournamentCapacity({
      category: matchCategory,
      mode: mode || 'solo',
    });
    if (!capacity.ok) {
      return res.status(400).json({ error: capacity.error });
    }
    const resolvedMode = capacity.mode;
    const resolvedMaxTeams = capacity.maxTeams;
    const resolvedMaxParticipants = capacity.maxParticipants;

    const tournamentData = {
      name,
      description: description || '',
      bannerImage: bannerImage || '',
      bannerTitle: bannerTitle || '',
      game,
      gameMode,
      mode: resolvedMode,
      category: matchCategory,
      map: map || 'Bermuda',
      rules: (() => {
        const parsed = parseRulesInput(rules);
        return parsed.length ? parsed : DEFAULT_MATCH_RULES;
      })(),
      entryFee: entryFee || 0,
      prizePool: prizePool || 0,
      perKill: matchCategory === 'custom' ? 0 : (perKill || 0),
      rewardType: matchCategory === 'custom' ? 'survival' : 'per_kill',
      maxParticipants: resolvedMaxParticipants,
      currentParticipants: 0,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      minimumBalance: minimumBalance || 0,
      prizes:
        matchCategory === 'custom'
          ? {
              first:
                Number(prizePool) ||
                Number(prizes?.first) ||
                0,
              second: 0,
              third: 0,
            }
          : prizes || {
              first: prizePool ? prizePool * 0.5 : 0,
              second: prizePool ? prizePool * 0.3 : 0,
              third: prizePool ? prizePool * 0.2 : 0,
            },
      roomId: roomId || '',
      roomPassword: roomPassword || '',
      showRoomCredentials: Boolean(showRoomCredentials),
      lifecycleStatus: 'draft',
      status: 'draft',
      maxTeams: resolvedMaxTeams,
      statusOverride: true,
      registeredPlayers: [],
      createdBy: req.userId,
    };

    tournamentData.matchNumber = await getNextMatchNumber();

    console.log('Creating tournament with data:', tournamentData);

    const tournament = new Tournament(tournamentData);
    await tournament.save();

    console.log('Tournament saved successfully:', tournament._id);

    // Custom Match: single Winner Prize = 100% of prize pool
    if (matchCategory === 'custom') {
      const winnerPrize =
        Number(tournament.prizes?.first) || Number(tournament.prizePool) || 0;
      tournament.prizes = { first: winnerPrize, second: 0, third: 0 };
      await tournament.save();
      await PrizeDistribution.findOneAndUpdate(
        { tournamentId: tournament._id },
        {
          tournamentId: tournament._id,
          tournamentType: 'custom_match',
          rankTiers: [],
          winnerPrize,
          runnerUpPrize: 0,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

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

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.registeredPlayers;
    delete updateData.slots;
    delete updateData.teamSize;
    delete updateData.killRewardEnabled;
    delete updateData.tournamentType;
    delete updateData.autoMatchId;
    delete updateData.generatedDate;
    delete updateData.isAutoGenerated;
    delete updateData.matchNumber;
    if (updateData.rules !== undefined) {
      updateData.rules = parseRulesInput(updateData.rules);
    }
    if (typeof updateData.bannerTitle === 'string') {
      updateData.bannerTitle = updateData.bannerTitle.trim();
    }

    // Apply non-status fields
    const statusInput = updateData.status;
    const statusOverrideInput = updateData.statusOverride;
    delete updateData.status;
    delete updateData.lifecycleStatus;
    delete updateData.statusOverride;

    Object.assign(tournament, updateData);

    if (typeof statusOverrideInput === 'boolean') {
      tournament.statusOverride = statusOverrideInput;
    }

    // Custom Match / BR: enforce capacity from type + mode
    const matchCategory =
      tournament.category === 'custom' || tournament.category === 'custom_match'
        ? 'custom'
        : 'battle_royale';
    const capacity = lifecycle.resolveTournamentCapacity({
      category: matchCategory,
      mode: tournament.mode || 'solo',
    });
    if (!capacity.ok) {
      return res.status(400).json({ error: capacity.error });
    }
    tournament.mode = capacity.mode;
    tournament.maxTeams = capacity.maxTeams;
    tournament.maxParticipants = capacity.maxParticipants;

    if (matchCategory === 'custom') {
      const winnerPrize =
        Number(tournament.prizes?.first) || Number(tournament.prizePool) || 0;
      tournament.prizes = { first: winnerPrize, second: 0, third: 0 };
      tournament.perKill = 0;
      await PrizeDistribution.findOneAndUpdate(
        { tournamentId: tournament._id },
        {
          tournamentId: tournament._id,
          tournamentType: 'custom_match',
          rankTiers: [],
          winnerPrize,
          runnerUpPrize: 0,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } else {
      // Keep BR prize places + kill reward configurable
      if (tournament.perKill == null || Number(tournament.perKill) < 0) {
        tournament.perKill = 0;
      }
      const first =
        Number(tournament.prizes?.first) ||
        (Number(tournament.prizePool) ? Math.floor(Number(tournament.prizePool) * 0.5) : 0);
      const second =
        Number(tournament.prizes?.second) ||
        (Number(tournament.prizePool) ? Math.floor(Number(tournament.prizePool) * 0.3) : 0);
      const third =
        Number(tournament.prizes?.third) ||
        (Number(tournament.prizePool) ? Math.floor(Number(tournament.prizePool) * 0.2) : 0);
      tournament.prizes = { first, second, third };
    }

    // Keep status + lifecycleStatus in sync (fixes Draft stuck after Upcoming)
    if (statusInput) {
      const next = lifecycle.normalizeLifecycleStatus(statusInput) || statusInput;
      if (['draft', 'upcoming', 'ongoing', 'completed', 'result_published', 'cancelled'].includes(next)) {
        lifecycle.syncLegacyFields(tournament, next);
        if (typeof statusOverrideInput !== 'boolean') {
          tournament.statusOverride = next !== 'upcoming';
        }
      }
    }

    // First-time room credential share can lock registration
    if (updateData.showRoomCredentials && updateData.roomId && updateData.roomPassword) {
      if (!tournament.roomCredentialsSharedAt) {
        tournament.roomCredentialsSharedAt = new Date();
        tournament.locked = true;
        tournament.lockedAt = new Date();
      }
    }

    await tournament.save();

    const populatedTournament = await Tournament.findById(tournament._id)
      .populate('game', 'name')
      .populate('gameMode', 'name');

    const effective = lifecycle.getEffectiveStatus(populatedTournament);
    res.json({
      message: 'Tournament updated successfully',
      tournament: {
        ...populatedTournament.toObject(),
        status: effective,
        lifecycleStatus: effective,
      },
    });
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
      .populate('autoMatchId', 'name displayId autoMatchNumber')
      .populate('registeredPlayers', 'username email')
      .sort({ startDate: -1 });

    const withStatus = tournaments.map((t) => {
      if (lifecycle.ensureLifecycleSynced(t)) {
        t.save().catch(() => {});
      }
      const effective = lifecycle.getEffectiveStatus(t);
      const doc = t.toObject();
      return {
        ...doc,
        status: effective,
        lifecycleStatus: effective,
        displayStatus: effective,
      };
    });

    res.json(withStatus);
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

    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      {
        roomId: roomId != null ? String(roomId).trim() : '',
        roomPassword: roomPassword != null ? String(roomPassword).trim() : '',
        ...(showRoomCredentials !== undefined
          ? { showRoomCredentials: !!showRoomCredentials }
          : {}),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const credentialsReady =
      !!String(tournament.roomId || '').trim() &&
      !!String(tournament.roomPassword || '').trim();
    const shouldNotify =
      credentialsReady &&
      (showRoomCredentials === true ||
        tournament.showRoomCredentials === true ||
        (roomId != null && roomPassword != null));

    if (shouldNotify) {
      notifyRoomCredentialsAvailable(tournament).catch((e) =>
        console.error('room credentials notify:', e.message)
      );
    }

    res.json({
      message: 'Room details updated. Players will see them 2 minutes before match start.',
      tournament: {
        _id: tournament._id,
        roomId: tournament.roomId,
        roomPassword: tournament.roomPassword,
        showRoomCredentials: tournament.showRoomCredentials,
        startDate: tournament.startDate,
      },
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
    const next = lifecycle.normalizeLifecycleStatus(status);
    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled', 'draft', 'result_published'];

    if (!next || !validStatuses.includes(next)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // If cancelling — idempotent refunds via TournamentRefund
    if (next === 'cancelled') {
      const { cancelTournamentWithRefunds } = require('../services/tournamentRefundService');
      const result = await cancelTournamentWithRefunds(
        tournament._id,
        admin._id,
        req.body?.reason || 'Cancelled by admin'
      );
      return res.json({
        message: `Tournament status updated to cancelled`,
        tournament: {
          ...result.tournament.toObject(),
          status: 'cancelled',
          lifecycleStatus: 'cancelled',
        },
        refunds: {
          completed: result.completed,
          failed: result.failed,
          skipped: result.skipped,
        },
      });
    }

    lifecycle.syncLegacyFields(tournament, next);
    tournament.statusOverride = true;
    await tournament.save();

    if (next === 'ongoing') {
      notifyMatchLive(tournament).catch((e) => console.error('live notify:', e.message));
    } else if (next === 'completed') {
      notifyMatchCompleted(tournament).catch((e) => console.error('complete notify:', e.message));
    }

    res.json({
      message: `Tournament status updated to ${next}`,
      tournament: {
        ...tournament.toObject(),
        status: next,
        lifecycleStatus: next,
      },
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update tournament', code: error.code });
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

    const status = lifecycle.getEffectiveStatus(tournament);
    if (status !== 'completed') {
      return res.status(400).json({ error: 'Tournament must be completed before publishing results' });
    }

    const marked = lifecycle.markResultsPublished(tournament);
    if (!marked.ok) return res.status(400).json({ error: marked.error });
    await tournament.save();

    res.json({ message: 'Results published successfully', status: 'completed', resultsPublished: true });
  } catch (error) {
    console.error('Error publishing results:', error);
    res.status(500).json({ error: 'Failed to publish results' });
  }
});

// Distribute prizes (Admin) — WinnerPayout lifecycle + optional auto-credit (TEST wallet)
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

    if (!lifecycle.areResultsPublished(tournament)) {
      const marked = lifecycle.markResultsPublished(tournament);
      if (marked.ok) await tournament.save();
    }

    const payoutItems = [];
    for (const result of results) {
      const rewardAmount = result.totalReward || result.prizeAmount || 0;
      if (rewardAmount > 0) {
        payoutItems.push({
          tournamentId: tournament._id,
          userId: result.userId,
          resultId: result._id,
          resultModel: 'TournamentResult',
          amount: rewardAmount,
          description: `Reward for ${tournament.name}`,
        });
      } else {
        result.prizeCredited = true;
        await result.save();
      }
    }

    await winnerPayoutService.ensurePayoutRecords(payoutItems);
    const credit = await winnerPayoutService.autoCreditPendingForTournament(tournament._id, {
      tournamentName: tournament.name,
    });

    const WinnerPayout = require('../models/WinnerPayout');
    const paid = await WinnerPayout.find({
      tournamentId: tournament._id,
      resultModel: 'TournamentResult',
      status: 'PAID',
    });

    for (const p of paid) {
      await TournamentResult.updateOne(
        { _id: p.resultId },
        {
          $set: {
            prizeCredited: true,
            prizeTransactionId: p.walletTransactionId,
          },
        }
      );
    }

    const distributedPrizes = [];
    for (const result of results) {
      const user = await User.findById(result.userId).select('username');
      const rewardAmount = result.totalReward || result.prizeAmount || 0;
      distributedPrizes.push({
        userId: result.userId,
        rank: result.rank,
        prizeAmount: rewardAmount,
        username: user?.username,
      });
    }

    res.json({
      message: 'Prizes distributed successfully',
      distributedPrizes,
      payoutsCredited: credit.credited || 0,
      autoPaymentEnabled: tournament.autoPaymentEnabled !== false,
      controlWindow: winnerPayoutService.getControlWindow(tournament),
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

    const tournamentHistory = await adminTournamentHistory.getAdminHistory(req.query);
    res.json(tournamentHistory);
  } catch (error) {
    console.error('Error fetching tournament history:', error);
    res.status(500).json({ error: 'Failed to fetch tournament history' });
  }
});

// Get participants / slot map for a specific tournament (Admin)
router.get('/admin/:id/participants', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view participants' });
    }

    const data = await adminTournamentHistory.getAdminEntries(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(data);
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

// Get all tournaments (user) — never includes Draft
router.get('/list', async (req, res) => {
  try {
    const userId = req.headers.authorization ? await extractUserIdFromToken(req.headers.authorization) : null;
    // Include anything that may be published; final draft filter uses getEffectiveStatus
    const tournaments = await Tournament.find({
      $or: [
        {
          lifecycleStatus: {
            $in: ['upcoming', 'ongoing', 'completed', 'result_published', 'incoming', 'live', 'locked'],
          },
        },
        {
          status: {
            $in: ['upcoming', 'ongoing', 'completed', 'result_published', 'incoming', 'live', 'locked'],
          },
        },
      ],
    })
      .populate('game', 'name image')
      .populate('gameMode', 'name image')
      .sort({ startDate: -1 });

    const tournamentsWithCounts = await Promise.all(
      tournaments.map(async (tournament) => {
        // Extra safety: hide anything that still resolves as draft
        const effective = lifecycle.getEffectiveStatus(tournament);
        if (effective === 'draft' || effective === 'cancelled') {
          return null;
        }

        if (lifecycle.ensureLifecycleSynced(tournament)) {
          tournament.save().catch(() => {});
        }

        const joinStats = await lifecycle.getJoinStats(tournament._id, tournament);
        const structure = lifecycle.getMatchStructure(tournament);

        let userJoined = false;
        if (userId) {
          if (structure.usesTeamRegistration) {
            const membership = await TeamMember.findOne({
              tournamentId: tournament._id,
              userId,
            });
            userJoined = !!membership;
          } else {
            const userParticipant = await TournamentParticipant.findOne({
              tournamentId: tournament._id,
              userId,
            });
            userJoined = !!userParticipant;
          }
        }

        const doc = tournament.toObject();
        const publicStatus = toPublicStatus(tournament);
        const publicRules = parseRulesInput(doc.rules);
        return {
          ...doc,
          rules: publicRules.length ? publicRules : DEFAULT_MATCH_RULES,
          matchNumber: resolveMatchNumber(doc),
          currentParticipants: joinStats.joinedCount,
          participantCount: joinStats.joinedCount,
          joinUnit: joinStats.unit,
          maxTeams: structure.totalSlots,
          totalSlots: structure.totalSlots,
          matchKind: structure.kind,
          matchType: structure.matchType,
          formatLabel: structure.formatLabel,
          modeLabel: structure.modeLabel,
          hasKillRewards: structure.hasKillRewards,
          isCustomMatch: lifecycle.isCustomMatch(tournament),
          userJoined,
          status: publicStatus,
          lifecycleStatus: effective,
          displayStatus: publicStatus === 'incoming' ? 'upcoming' : publicStatus,
          resultsPublished: lifecycle.areResultsPublished(tournament),
        };
      })
    );

    res.json(tournamentsWithCounts.filter(Boolean));
  } catch (error) {
    console.error('Error fetching tournament list:', error);
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

    const effectiveStatus = lifecycle.getEffectiveStatus(tournament);
    if (effectiveStatus === 'draft') {
      const viewer = await User.findById(req.userId).select('role');
      if (!viewer || viewer.role !== 'admin') {
        return res.status(404).json({ error: 'Tournament not found' });
      }
    }

    if (lifecycle.ensureLifecycleSynced(tournament)) {
      await tournament.save();
    }

    const participant = await TournamentParticipant.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    const teamMembership = await TeamMember.findOne({
      tournamentId: req.params.id,
      userId: req.userId,
    });

    const isCustom = lifecycle.isCustomMatch(tournament);
    const usesTeams = lifecycle.usesTeamRegistration(tournament);
    const userJoined = usesTeams ? !!teamMembership : !!participant;

    const participants = await TournamentParticipant.find({ tournamentId: req.params.id })
      .populate('userId', 'username gameUsername')
      .sort({ slotNumber: 1 });

    const joinStats = await lifecycle.getJoinStats(tournament._id, tournament);
    const calculatedStatus = toPublicStatus(tournament);
    const roomVisibility = lifecycle.getRoomCredentialsVisibility(tournament, { userJoined });

    let teams = [];
    if (usesTeams) {
      const teamDocs = await Team.find({ tournamentId: tournament._id, status: 'registered' }).sort({
        side: 1,
        slotNumber: 1,
        createdAt: 1,
      });
      teams = teamDocs.map((t) => ({
        _id: t._id,
        name: t.name,
        side: t.side,
        slotNumber: t.slotNumber || null,
        players: t.players || [],
        captainUserId: t.captainUserId,
      }));
    }

    const doc = tournament.toObject();
    const publicRules = parseRulesInput(doc.rules);
    if (!publicRules.length) {
      tournament.rules = DEFAULT_MATCH_RULES;
      tournament.markModified('rules');
      await tournament.save().catch(() => {});
    }
    const structure = lifecycle.getMatchStructure(tournament);
    const joinCheck = await getJoinEligibility(tournament, joinStats.joinedCount);
    const startMs = new Date(tournament.startDate).getTime() - Date.now();

    res.json({
      ...doc,
      rules: publicRules.length ? publicRules : DEFAULT_MATCH_RULES,
      matchNumber: resolveMatchNumber(doc),
      status: calculatedStatus,
      lifecycleStatus: lifecycle.getEffectiveStatus(tournament),
      displayStatus: calculatedStatus === 'incoming' ? 'upcoming' : calculatedStatus,
      isCustomMatch: isCustom,
      matchKind: structure.kind,
      matchType: structure.matchType,
      formatLabel: structure.formatLabel,
      modeLabel: structure.modeLabel,
      hasKillRewards: structure.hasKillRewards,
      usesSlotGrid: structure.usesSlotGrid,
      usesTeamSides: structure.usesTeamSides,
      userJoined,
      participantCount: joinStats.joinedCount,
      joinUnit: joinStats.unit,
      totalSlots: structure.totalSlots,
      maxTeams: usesTeams ? joinStats.capacity : tournament.maxTeams || 2,
      canJoin: joinCheck.canJoin && !userJoined,
      joinBlockReason: joinCheck.reason,
      countdownMs: Math.max(startMs, 0),
      resultsPublished: !!tournament.resultsPublished,
      teams,
      participants: structure.usesTeamRegistration
        ? []
        : participants.map((p) => ({
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
      myTeam: teams.find((t) => String(t.captainUserId) === String(req.userId)) || null,
      showRoomCredentials: tournament.showRoomCredentials,
      roomCredentialsVisible: roomVisibility.visible,
      roomCredentialsMessage: roomVisibility.message,
      roomCredentialsUnlockAt: roomVisibility.unlockAt,
      roomId: roomVisibility.visible ? tournament.roomId : null,
      roomPassword: roomVisibility.visible ? tournament.roomPassword : null,
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
          { path: 'game', select: 'name image' },
          { path: 'gameMode', select: 'name image' },
        ],
      })
      .sort({ joinedAt: -1 });

    const teamMemberships = await TeamMember.find({ userId: req.userId })
      .populate({
        path: 'tournamentId',
        populate: [
          { path: 'game', select: 'name image' },
          { path: 'gameMode', select: 'name image' },
        ],
      })
      .sort({ joinedAt: -1 });

    const seen = new Set();
    const myTournaments = [];

    const enrich = async (tournament, joinedAt, extras = {}) => {
      if (!tournament || seen.has(String(tournament._id))) return;
      const effective = lifecycle.getEffectiveStatus(tournament);
      if (effective === 'draft' || effective === 'cancelled') return;
      seen.add(String(tournament._id));

      const isCustom = lifecycle.isCustomMatch(tournament);
      const usesTeams = lifecycle.usesTeamRegistration(tournament);
      const published = lifecycle.areResultsPublished(tournament);
      let myTeam = null;
      let resultSummary = {
        resultPending: false,
        resultsPublished: false,
        myTeamOutcome: null,
        winnerTeamName: null,
        runnerUpTeamName: null,
        resultsPublishedAt: tournament.resultsPublishedAt || null,
      };

      if (usesTeams) {
        const team =
          (await Team.findOne({
            tournamentId: tournament._id,
            captainUserId: req.userId,
            status: 'registered',
          }).lean()) ||
          (await Team.findOne({
            tournamentId: tournament._id,
            status: 'registered',
            _id: (
              await TeamMember.findOne({ tournamentId: tournament._id, userId: req.userId }).select('teamId')
            )?.teamId,
          }).lean());

        if (team) {
          myTeam = {
            _id: team._id,
            name: team.name,
            side: team.side,
            players: team.players || [],
          };
        }

        if (effective === 'completed') {
          if (!published) {
            resultSummary.resultPending = true;
          } else {
            resultSummary.resultsPublished = true;
            const custom = await CustomMatchResult.findOne({ tournamentId: tournament._id })
              .populate('winnerTeamId', 'name side')
              .populate('runnerUpTeamId', 'name side')
              .lean();
            if (custom) {
              resultSummary.winnerTeamName = custom.winnerTeamId?.name || null;
              resultSummary.runnerUpTeamName = custom.runnerUpTeamId?.name || null;
              if (myTeam) {
                const won =
                  String(custom.winnerTeamId?._id || custom.winnerTeamId) === String(myTeam._id);
                resultSummary.myTeamOutcome = won ? 'winner' : 'loser';
              }
            }
          }
        }
      } else if (effective === 'completed') {
        if (!published) {
          resultSummary.resultPending = true;
        } else {
          resultSummary.resultsPublished = true;
          const top = await BattleRoyaleResult.findOne({
            tournamentId: tournament._id,
            position: 1,
          }).lean();
          if (top) {
            resultSummary.winnerTeamName = top.gamingUsername || null;
          }
          if (extras.rank === 1 || extras.participantStatus === 'winner') {
            resultSummary.myTeamOutcome = 'winner';
          } else if (extras.rank) {
            resultSummary.myTeamOutcome = 'loser';
          }
        }
      }

      const doc = tournament.toObject ? tournament.toObject() : { ...tournament };
      const publicStatus = toPublicStatus(tournament);
      myTournaments.push({
        ...doc,
        status: publicStatus,
        lifecycleStatus: effective,
        displayStatus: effective === 'ongoing' ? 'live' : publicStatus,
        resultsPublished: published,
        userJoined: true,
        joinedAt,
        isCustomMatch: isCustom,
        myTeam,
        resultSummary,
        participantCount: isCustom
          ? await Team.countDocuments({ tournamentId: tournament._id, status: 'registered' })
          : await TournamentParticipant.countDocuments({
              tournamentId: tournament._id,
              status: { $in: ['joined', 'winner'] },
            }),
        maxPlayers: isCustom ? tournament.maxTeams || 2 : tournament.maxParticipants,
        joinUnit: isCustom ? 'teams' : 'players',
        ...extras,
      });
    };

    for (const p of participants) {
      await enrich(p.tournamentId, p.joinedAt, {
        participantStatus: p.status,
        rank: p.rank,
        prizeAmount: p.prizeAmount,
        slotNumber: p.slotNumber,
        gamingUsername: p.gamingUsername,
      });
    }
    for (const m of teamMemberships) {
      await enrich(m.tournamentId, m.joinedAt, { participantStatus: 'joined' });
    }

    myTournaments.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
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

    if (user.role === 'admin') {
      return res.json({ canJoin: false, reason: 'Admins cannot join as participants' });
    }

    const isCustom = lifecycle.isCustomMatch(tournament);
    const usesTeams = lifecycle.usesTeamRegistration(tournament);
    const alreadyJoined = usesTeams
      ? await TeamMember.findOne({ tournamentId: req.params.id, userId: req.userId })
      : await TournamentParticipant.findOne({ tournamentId: req.params.id, userId: req.userId });

    if (alreadyJoined) {
      return res.json({ canJoin: false, reason: 'You have already joined this tournament' });
    }

    const joinStats = await lifecycle.getJoinStats(tournament._id, tournament);
    const eligibility = await getJoinEligibility(tournament, joinStats.joinedCount);

    const { realMoneyRequired } = getEntryPaymentSplit(user, tournament.entryFee);
    if (eligibility.canJoin && user.wallet.balance < realMoneyRequired) {
      return res.json({
        canJoin: false,
        code: 'INSUFFICIENT_BALANCE',
        reason: `Insufficient balance. Need ₹${realMoneyRequired} real money for ${usesTeams ? 'team' : 'player'} entry.`,
        realMoneyRequired,
        balance: user.wallet.balance,
        entryFee: tournament.entryFee,
        isCustomMatch: isCustom,
        usesTeamRegistration: usesTeams,
      });
    }

    res.json({
      canJoin: eligibility.canJoin,
      reason: eligibility.reason,
      isFull: eligibility.isFull,
      isCustomMatch: isCustom,
      usesTeamRegistration: usesTeams,
      matchKind: joinStats.matchKind,
      formatLabel: joinStats.formatLabel,
      joinUnit: joinStats.unit,
      joinedCount: joinStats.joinedCount,
      capacity: joinStats.capacity,
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

    if (lifecycle.isCustomMatch(tournament) || lifecycle.usesTeamRegistration(tournament)) {
      return res.status(400).json({
        error: 'This tournament requires team registration. Captain pays once for the whole team.',
        code: 'TEAM_REGISTRATION_REQUIRED',
      });
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

    await notifyTournamentJoined(req.userId, tournament).catch(() => {});

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

// Get room info (visible 2 minutes before start for joined users)
router.get('/:id/room-info', authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const isCustom = lifecycle.isCustomMatch(tournament);
    const joined = isCustom
      ? await TeamMember.findOne({ tournamentId: req.params.id, userId: req.userId })
      : await TournamentParticipant.findOne({ tournamentId: req.params.id, userId: req.userId });

    if (!joined) {
      return res.status(403).json({ error: 'Not a participant in this tournament' });
    }

    const visibility = lifecycle.getRoomCredentialsVisibility(tournament, { userJoined: true });
    if (!visibility.visible) {
      return res.status(400).json({
        error:
          visibility.message ||
          'Please wait. Room details will be available 2 minutes before the match starts.',
        unlockAt: visibility.unlockAt,
      });
    }

    res.json({
      roomId: tournament.roomId || '',
      roomPassword: tournament.roomPassword || '',
      tournamentName: tournament.name,
      startTime: tournament.startDate,
      unlockAt: visibility.unlockAt,
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
    const published = lifecycle.areResultsPublished(tournament);
    if (status === 'completed' && !published) {
      return res.json({
        tournament: {
          _id: tournament._id,
          name: tournament.name,
          category: tournament.category,
          status,
          resultsPublished: false,
        },
        resultPending: true,
        message: 'Result Not Published Yet',
        tournamentType: lifecycle.getTournamentType(tournament),
      });
    }
    if (status !== 'completed' || !published) {
      return res.status(403).json({ error: 'Results are not published yet', resultPending: true });
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
        runnerUpPrize: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament results' });
  }
});

// ===== SLOT BOOKING ENDPOINTS =====

// Get all slots for a tournament (Battle Royale grid, or Team A/B for custom)
router.get('/:id/slots', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const structure = lifecycle.getMatchStructure(tournament);

    if (structure.kind === 'team_vs_team') {
      const teams = await Team.find({ tournamentId: tournament._id, status: 'registered' }).lean();
      const bySide = new Map(teams.map((t) => [String(t.side || '').toUpperCase(), t]));
      const slots = ['A', 'B'].map((side, idx) => {
        const team = bySide.get(side);
        return {
          slotNumber: idx + 1,
          side,
          isBooked: Boolean(team),
          teamName: team?.name || null,
          gamingUsername: team?.name || null,
          players: team?.players || [],
        };
      });
      const bookedSlots = slots.filter((s) => s.isBooked).length;
      return res.json({
        tournamentId: tournament._id,
        matchKind: structure.kind,
        formatLabel: structure.formatLabel,
        totalSlots: 2,
        bookedSlots,
        availableSlots: 2 - bookedSlots,
        slots,
      });
    }

    if (structure.usesTeamRegistration) {
      const teams = await Team.find({ tournamentId: tournament._id, status: 'registered' }).lean();
      const bySlot = new Map(
        teams.filter((t) => t.slotNumber).map((t) => [Number(t.slotNumber), t])
      );
      let auto = 1;
      const used = new Set(bySlot.keys());
      teams
        .filter((t) => !t.slotNumber)
        .forEach((t) => {
          while (used.has(auto) && auto <= structure.totalSlots) auto += 1;
          if (auto <= structure.totalSlots) {
            bySlot.set(auto, t);
            used.add(auto);
            auto += 1;
          }
        });
      const slots = [];
      for (let i = 1; i <= structure.totalSlots; i += 1) {
        const team = bySlot.get(i);
        slots.push({
          slotNumber: i,
          isBooked: Boolean(team),
          teamName: team?.name || null,
          gamingUsername: team?.name || null,
          players: team?.players || [],
        });
      }
      const bookedSlots = slots.filter((s) => s.isBooked).length;
      return res.json({
        tournamentId: tournament._id,
        matchKind: structure.kind,
        formatLabel: structure.formatLabel,
        totalSlots: structure.totalSlots,
        bookedSlots,
        availableSlots: structure.totalSlots - bookedSlots,
        slots,
      });
    }

    if (!tournament.slots || tournament.slots.length === 0) {
      const newSlots = [];
      for (let i = 1; i <= structure.totalSlots; i += 1) {
        newSlots.push({
          slotNumber: i,
          userId: null,
          gamingUsername: null,
          gamingUID: null,
          bookedAt: null,
          isBooked: false,
        });
      }
      tournament.slots = newSlots;
      await tournament.save();
    }

    const slotsWithUsernames = tournament.slots
      .filter((slot) => slot.slotNumber >= 1 && slot.slotNumber <= structure.totalSlots)
      .map((slot) => ({
        slotNumber: slot.slotNumber,
        isBooked: slot.isBooked,
        gamingUsername: slot.isBooked ? slot.gamingUsername : null,
        userId: slot.isBooked ? slot.userId : null,
      }));

    const bookedSlots = slotsWithUsernames.filter((s) => s.isBooked).length;
    res.json({
      tournamentId: tournament._id,
      matchKind: structure.kind,
      formatLabel: structure.formatLabel,
      totalSlots: structure.totalSlots,
      bookedSlots,
      availableSlots: structure.totalSlots - bookedSlots,
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

    const structure = lifecycle.getMatchStructure(tournament);
    if (structure.kind === 'team_vs_team' || structure.usesTeamRegistration) {
      return res.status(400).json({
        error: structure.kind === 'team_vs_team'
          ? 'This is a team-vs-team match. Use team registration (Team A / Team B).'
          : 'This tournament uses team slot booking. Captain pays once — use Register Team.',
        code: 'TEAM_REGISTRATION_REQUIRED',
      });
    }

    if (slotNumber < 1 || slotNumber > structure.totalSlots) {
      return res.status(400).json({ error: `Invalid slot number. Must be between 1 and ${structure.totalSlots}` });
    }

    // Initialize slots if not already created
    if (!tournament.slots || tournament.slots.length === 0) {
      const newSlots = [];
      for (let i = 1; i <= structure.totalSlots; i++) {
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

    await notifyTournamentJoined(req.userId, tournament).catch(() => {});

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

    if (lifecycle.usesTeamRegistration(tournament)) {
      return res.status(400).json({
        error: 'This tournament uses team registration. Captain pays once — use Register Team.',
        code: 'TEAM_REGISTRATION_REQUIRED',
      });
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

    await notifyTournamentJoined(req.userId, tournament).catch(() => {});

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
