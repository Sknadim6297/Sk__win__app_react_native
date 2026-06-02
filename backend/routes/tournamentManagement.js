const express = require('express');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const PrizeDistribution = require('../models/PrizeDistribution');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const CustomMatchResult = require('../models/CustomMatchResult');
const { authMiddleware } = require('../middleware/auth');
const lifecycle = require('../services/tournamentLifecycle');

const router = express.Router();

async function requireAdmin(req, res) {
  const admin = await User.findById(req.userId);
  if (!admin) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return admin;
}

function formatListItem(tournament, joinStats) {
  const status = lifecycle.getEffectiveStatus(tournament);
  const type = lifecycle.getTournamentType(tournament);
  const { joinedCount, capacity, unit, isFull, usesTeams } = joinStats;
  return {
    _id: tournament._id,
    name: tournament.name,
    tournamentType: type,
    category: tournament.category,
    entryFee: tournament.entryFee,
    joinedCount,
    capacity,
    joinUnit: unit,
    usesTeams,
    isFull,
    showFullBadge: lifecycle.shouldShowFullBadge(status, isFull),
    fullLabel: type === 'custom_match' ? 'Match Full' : 'Tournament Full',
    status,
    lifecycleStatus: status,
    matchDate: tournament.startDate,
    startDate: tournament.startDate,
    gameMode: tournament.gameMode,
    maxParticipants: tournament.maxParticipants,
    maxTeams: tournament.maxTeams,
    prizePool: tournament.prizePool,
    resultsPublished: status === 'result_published',
  };
}

// ——— Admin list ———
router.get('/admin/list', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournaments = await Tournament.find()
      .populate('gameMode', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const list = await Promise.all(
      tournaments.map(async (t) => {
        const joinStats = await lifecycle.getJoinStats(t._id, t);
        return formatListItem(t, joinStats);
      })
    );

    const STATUS_ORDER = ['draft', 'upcoming', 'incoming', 'ongoing', 'completed', 'result_published', 'cancelled'];
    list.sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.status);
      const bi = STATUS_ORDER.indexOf(b.status);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return new Date(b.matchDate) - new Date(a.matchDate);
    });

    res.json(list);
  } catch (error) {
    console.error('admin list:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// ——— Single tournament (admin) ———
router.get('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournament = await Tournament.findById(req.params.id).populate('gameMode', 'name');
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const joinStats = await lifecycle.getJoinStats(tournament._id, tournament);
    const prizeDistribution = await PrizeDistribution.findOne({ tournamentId: tournament._id }).lean();
    const status = lifecycle.getEffectiveStatus(tournament);

    let participants = [];
    let teams = [];

    if (lifecycle.isCustomMatch(tournament)) {
      teams = await Team.find({ tournamentId: tournament._id, status: 'registered' })
        .populate('captainUserId', 'username email')
        .lean();
      const members = await TeamMember.find({ tournamentId: tournament._id })
        .populate('userId', 'username email')
        .lean();
      teams = teams.map((team) => ({
        ...team,
        members: members.filter((m) => String(m.teamId) === String(team._id)),
      }));
    } else {
      participants = await TournamentParticipant.find({
        tournamentId: tournament._id,
        status: { $in: ['joined', 'winner'] },
      })
        .populate('userId', 'username email')
        .sort({ slotNumber: 1 })
        .lean();
    }

    res.json({
      tournament: tournament.toObject(),
      status,
      joinedCount: joinStats.joinedCount,
      capacity: joinStats.capacity,
      joinUnit: joinStats.unit,
      usesTeams: joinStats.usesTeams,
      isFull: joinStats.isFull,
      showFullBadge: lifecycle.shouldShowFullBadge(status, joinStats.isFull),
      prizeDistribution,
      participants,
      teams,
    });
  } catch (error) {
    console.error('admin get:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// ——— Prize distribution ———
router.put('/admin/:id/prize-distribution', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const type = lifecycle.getTournamentType(tournament);
    const { rankTiers, winnerPrize, runnerUpPrize } = req.body;

    if (type === 'battle_royale') {
      const v = lifecycle.validateRankTiers(rankTiers);
      if (!v.ok) return res.status(400).json({ error: v.error });
    } else {
      if (Number(winnerPrize) < 0 || Number(runnerUpPrize || 0) < 0) {
        return res.status(400).json({ error: 'Prize cannot be negative' });
      }
    }

    const doc = await PrizeDistribution.findOneAndUpdate(
      { tournamentId: tournament._id },
      {
        tournamentId: tournament._id,
        tournamentType: type,
        rankTiers: type === 'battle_royale' ? rankTiers : [],
        winnerPrize: type === 'custom_match' ? Number(winnerPrize) || 0 : 0,
        runnerUpPrize: type === 'custom_match' ? Number(runnerUpPrize) || 0 : 0,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ prizeDistribution: doc });
  } catch (error) {
    console.error('prize distribution:', error);
    res.status(500).json({ error: 'Failed to save prize distribution' });
  }
});

router.get('/admin/:id/prize-distribution', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const doc = await PrizeDistribution.findOne({ tournamentId: req.params.id }).lean();
    res.json(doc || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prize distribution' });
  }
});

// ——— Lifecycle transitions ———
async function transitionStatus(req, res, nextStatus) {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  if (lifecycle.ensureLifecycleSynced(tournament)) {
    await tournament.save();
  }

  const check = lifecycle.assertTransition(tournament, nextStatus);
  if (!check.ok) return res.status(400).json({ error: check.error });

  lifecycle.syncLegacyFields(tournament, nextStatus);
  await tournament.save();

  res.json({
    message: `Tournament is now ${nextStatus}`,
    tournament,
    status: nextStatus,
    redirectToResultEntry: nextStatus === 'completed',
  });
}

router.post('/admin/:id/publish', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await transitionStatus(req, res, 'upcoming');
  } catch (e) {
    res.status(500).json({ error: 'Failed to publish tournament' });
  }
});

router.post('/admin/:id/start-match', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await transitionStatus(req, res, 'ongoing');
  } catch (e) {
    res.status(500).json({ error: 'Failed to start match' });
  }
});

router.post('/admin/:id/complete-match', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await transitionStatus(req, res, 'completed');
  } catch (e) {
    res.status(500).json({ error: 'Failed to complete match' });
  }
});

router.post('/admin/:id/publish-results', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const status = lifecycle.getEffectiveStatus(tournament);
    if (status !== 'completed' && status !== 'result_published') {
      return res.status(400).json({ error: 'Tournament must be completed before publishing results' });
    }

    if (lifecycle.isBattleRoyale(tournament)) {
      const joinedCount = await lifecycle.getJoinedCount(tournament._id, tournament);
      const resultCount = await BattleRoyaleResult.countDocuments({ tournamentId: tournament._id });
      if (joinedCount > 0 && resultCount < joinedCount) {
        return res.status(400).json({ error: 'Save results for every joined player first' });
      }
    } else {
      const custom = await CustomMatchResult.findOne({ tournamentId: tournament._id });
      if (!custom) {
        return res.status(400).json({ error: 'Save custom match results first' });
      }
    }

    lifecycle.syncLegacyFields(tournament, 'result_published');
    await tournament.save();

    res.json({ message: 'Results published', tournament });
  } catch (e) {
    res.status(500).json({ error: 'Failed to publish results' });
  }
});

// ——— Battle Royale results ———
router.get('/admin/:id/results/battle-royale', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const participants = await TournamentParticipant.find({
      tournamentId: tournament._id,
      status: { $in: ['joined', 'winner'] },
    })
      .populate('userId', 'username email')
      .sort({ slotNumber: 1 });

    const saved = await BattleRoyaleResult.find({ tournamentId: tournament._id })
      .populate('userId', 'username')
      .sort({ position: 1 });

    const prizeDistribution = await PrizeDistribution.findOne({ tournamentId: tournament._id }).lean();

    res.json({
      participants,
      results: saved,
      prizeDistribution,
      status: lifecycle.getEffectiveStatus(tournament),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load result entry data' });
  }
});

router.post('/admin/:id/results/battle-royale', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { entries } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const status = lifecycle.getEffectiveStatus(tournament);
    if (status !== 'completed' && status !== 'result_published') {
      return res.status(400).json({ error: 'Results can only be entered when match is completed' });
    }
    if (status === 'result_published') {
      return res.status(400).json({ error: 'Tournament is read-only after results are published' });
    }

    const joinedCount = await lifecycle.getJoinedCount(tournament._id, tournament);
    const validation = lifecycle.validateBattleRoyaleResults(entries, joinedCount);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const participantUserIds = new Set(
      (
        await TournamentParticipant.find({
          tournamentId: tournament._id,
          status: { $in: ['joined', 'winner'] },
        }).select('userId')
      ).map((p) => String(p.userId))
    );

    for (const e of entries) {
      if (!participantUserIds.has(String(e.userId))) {
        return res.status(400).json({ error: 'All result players must be joined participants' });
      }
    }

    await BattleRoyaleResult.deleteMany({ tournamentId: tournament._id });

    const docs = await BattleRoyaleResult.insertMany(
      entries.map((e) => ({
        tournamentId: tournament._id,
        userId: e.userId,
        participantId: e.participantId,
        position: Number(e.position),
        kills: Number(e.kills) || 0,
        prize: Number(e.prize) || 0,
        gamingUsername: e.gamingUsername,
        gamingUID: e.gamingUID,
      }))
    );

    for (const e of entries) {
      await TournamentParticipant.findOneAndUpdate(
        { tournamentId: tournament._id, userId: e.userId },
        {
          rank: Number(e.position),
          prizeAmount: Number(e.prize) || 0,
          status: Number(e.position) === 1 ? 'winner' : 'joined',
        }
      );
    }

    res.json({ message: 'Battle Royale results saved', results: docs });
  } catch (e) {
    console.error('save BR results:', e);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

// Auto-fill prizes from tiers
router.post('/admin/:id/results/battle-royale/prize-preview', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { positions } = req.body;
    const prizeDistribution = await PrizeDistribution.findOne({ tournamentId: req.params.id }).lean();
    const preview = (positions || []).map((rank) => ({
      position: rank,
      prize: lifecycle.getPrizeForRank(prizeDistribution, rank),
    }));
    res.json({ preview });
  } catch (e) {
    res.status(500).json({ error: 'Failed to preview prizes' });
  }
});

// ——— Custom match results ———
router.get('/admin/:id/results/custom-match', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const teams = await Team.find({ tournamentId: tournament._id, status: 'registered' }).lean();
    const members = await TeamMember.find({ tournamentId: tournament._id })
      .populate('userId', 'username')
      .lean();

    const saved = await CustomMatchResult.findOne({ tournamentId: tournament._id })
      .populate('winnerTeamId')
      .populate('runnerUpTeamId')
      .populate('mvpUserId', 'username');

    const prizeDistribution = await PrizeDistribution.findOne({ tournamentId: tournament._id }).lean();

    res.json({
      teams: teams.map((t) => ({
        ...t,
        members: members.filter((m) => String(m.teamId) === String(t._id)),
      })),
      result: saved,
      prizeDistribution,
      status: lifecycle.getEffectiveStatus(tournament),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load custom match data' });
  }
});

router.post('/admin/:id/results/custom-match', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const status = lifecycle.getEffectiveStatus(tournament);
    if (status !== 'completed') {
      return res.status(400).json({ error: 'Results can only be entered when match is completed' });
    }
    if (status === 'result_published') {
      return res.status(400).json({ error: 'Tournament is read-only after results are published' });
    }

    const teams = await Team.find({ tournamentId: tournament._id, status: 'registered' });
    const teamIds = teams.map((t) => t._id);

    const payload = req.body;
    const v = lifecycle.validateCustomResult(payload, teamIds);
    if (!v.ok) return res.status(400).json({ error: v.error });

    const mvpOnTeam = await TeamMember.findOne({
      tournamentId: tournament._id,
      userId: payload.mvpUserId,
      teamId: { $in: teamIds },
    });
    if (!mvpOnTeam) {
      return res.status(400).json({ error: 'MVP must belong to one of the participating teams' });
    }

    const doc = await CustomMatchResult.findOneAndUpdate(
      { tournamentId: tournament._id },
      {
        tournamentId: tournament._id,
        winnerTeamId: payload.winnerTeamId,
        runnerUpTeamId: payload.runnerUpTeamId,
        mvpUserId: payload.mvpUserId,
        winnerPrize: Number(payload.winnerPrize) || 0,
        runnerUpPrize: Number(payload.runnerUpPrize) || 0,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Custom match results saved', result: doc });
  } catch (e) {
    console.error('save custom:', e);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

// ——— Public results (new) ———
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
        rank: r.position,
        position: r.position,
        userId: r.userId?._id || r.userId,
        username: r.userId?.username,
        gamingID: r.gamingUsername,
        gamingUID: r.gamingUID,
        kills: r.kills,
        prize: r.prize,
        totalReward: r.prize,
      }));

      const winner = leaderboard.find((e) => e.rank === 1) || null;

      return res.json({
        tournament: {
          _id: tournament._id,
          name: tournament.name,
          category: tournament.category,
          status,
        },
        tournamentType: 'battle_royale',
        isBattleRoyale: true,
        winner,
        leaderboard,
      });
    }

    const custom = await CustomMatchResult.findOne({ tournamentId: req.params.id })
      .populate('winnerTeamId')
      .populate('runnerUpTeamId')
      .populate('mvpUserId', 'username')
      .lean();

    if (!custom) {
      return res.status(404).json({ error: 'Results not found' });
    }

    const mvpMember = await TeamMember.findOne({
      tournamentId: req.params.id,
      userId: custom.mvpUserId,
    }).lean();

    return res.json({
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        category: tournament.category,
        status,
      },
      tournamentType: 'custom_match',
      isBattleRoyale: false,
      customMatch: {
        winnerTeam: custom.winnerTeamId,
        runnerUpTeam: custom.runnerUpTeamId,
        mvp: {
          userId: custom.mvpUserId,
          username: custom.mvpUserId?.username,
          gamingUsername: mvpMember?.gamingUsername,
          gamingUID: mvpMember?.gamingUID,
        },
        winnerPrize: custom.winnerPrize,
        runnerUpPrize: custom.runnerUpPrize,
      },
    });
  } catch (e) {
    console.error('public results:', e);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// ——— Export ———
router.get('/admin/:id/results/export', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const tournament = await Tournament.findById(req.params.id).lean();
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const type = lifecycle.getTournamentType(tournament);

    if (type === 'battle_royale') {
      const rows = await BattleRoyaleResult.find({ tournamentId: req.params.id })
        .populate('userId', 'username email')
        .sort({ position: 1 });
      return res.json({
        tournamentName: tournament.name,
        type: 'battle_royale',
        rows: rows.map((r) => ({
          rank: r.position,
          player: r.gamingUsername || r.userId?.username,
          kills: r.kills,
          prize: r.prize,
        })),
      });
    }

    const custom = await CustomMatchResult.findOne({ tournamentId: req.params.id })
      .populate('winnerTeamId', 'name')
      .populate('runnerUpTeamId', 'name')
      .populate('mvpUserId', 'username');

    res.json({
      tournamentName: tournament.name,
      type: 'custom_match',
      custom,
    });
  } catch (e) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Register team (Custom Match) — captain + members
router.post('/:id/register-team', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot join as participants' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    if (!lifecycle.isCustomMatch(tournament)) {
      return res.status(400).json({ error: 'Team registration is only for Custom Match tournaments' });
    }

    const status = lifecycle.getEffectiveStatus(tournament);
    if (!lifecycle.canJoin(status)) {
      return res.status(400).json({ error: 'Registration is not open' });
    }

    const { teamName, members } = req.body;
    if (!teamName || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Team name and at least one member are required' });
    }

    const teamCount = await Team.countDocuments({ tournamentId: tournament._id, status: 'registered' });
    const capacity = await lifecycle.getCapacity(tournament);
    if (teamCount >= capacity) {
      return res.status(400).json({ error: 'Match is full — both teams registered', isFull: true });
    }

    const existingMember = await TeamMember.findOne({
      tournamentId: tournament._id,
      userId: req.userId,
    });
    if (existingMember) {
      return res.status(400).json({ error: 'You are already registered in this tournament' });
    }

    const team = await Team.create({
      tournamentId: tournament._id,
      name: teamName.trim(),
      captainUserId: req.userId,
    });

    const memberDocs = members.map((m, idx) => ({
      tournamentId: tournament._id,
      teamId: team._id,
      userId: m.userId || (idx === 0 ? req.userId : m.userId),
      gamingUsername: m.gamingUsername || m.gamingID,
      gamingUID: m.gamingUID,
      role: String(m.userId || req.userId) === String(req.userId) ? 'captain' : 'member',
    }));

    if (!memberDocs.some((m) => String(m.userId) === String(req.userId))) {
      memberDocs.unshift({
        tournamentId: tournament._id,
        teamId: team._id,
        userId: req.userId,
        gamingUsername: members[0]?.gamingUsername,
        gamingUID: members[0]?.gamingUID,
        role: 'captain',
      });
    }

    await TeamMember.insertMany(memberDocs);
    tournament.currentParticipants = teamCount + 1;
    await tournament.save();

    res.status(201).json({ message: 'Team registered', team });
  } catch (e) {
    console.error('register-team:', e);
    res.status(500).json({ error: e.message || 'Failed to register team' });
  }
});

module.exports = router;
