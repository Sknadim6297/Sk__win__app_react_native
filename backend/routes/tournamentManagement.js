const express = require('express');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const PrizeDistribution = require('../models/PrizeDistribution');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const CustomMatchResult = require('../models/CustomMatchResult');
const WalletTransaction = require('../models/WalletTransaction');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const lifecycle = require('../services/tournamentLifecycle');

const router = express.Router();

const MAX_BONUS_ENTRY_PERCENT = 0.2;

const getEntryPaymentSplit = (user, entryFee) => {
  const fee = Number(entryFee) || 0;
  const bonusBalance = Number(user?.wallet?.bonusBalance) || 0;
  const maxBonusAllowed = Math.floor(fee * MAX_BONUS_ENTRY_PERCENT);
  const bonusUsed = Math.min(bonusBalance, maxBonusAllowed);
  const realMoneyRequired = Math.max(fee - bonusUsed, 0);
  return { bonusUsed, realMoneyRequired, maxBonusAllowed };
};

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
    resultsPublished: lifecycle.areResultsPublished(tournament),
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
        // Heal stuck Draft/Upcoming mismatch in DB
        const doc = await Tournament.findById(t._id);
        if (doc && lifecycle.ensureLifecycleSynced(doc)) {
          await doc.save();
          Object.assign(t, {
            status: doc.status,
            lifecycleStatus: doc.lifecycleStatus,
            locked: doc.locked,
            resultsPublished: doc.resultsPublished,
          });
        }
        const joinStats = await lifecycle.getJoinStats(t._id, t);
        return formatListItem(t, joinStats);
      })
    );

    const STATUS_ORDER = ['draft', 'upcoming', 'incoming', 'ongoing', 'completed', 'cancelled'];
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
      resultsPublished: lifecycle.areResultsPublished(tournament),
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
      if (Number(winnerPrize) < 0) {
        return res.status(400).json({ error: 'Prize cannot be negative' });
      }
    }

    const doc = await PrizeDistribution.findOneAndUpdate(
      { tournamentId: tournament._id },
      {
        tournamentId: tournament._id,
        tournamentType: type,
        rankTiers: type === 'battle_royale' ? rankTiers : [],
        winnerPrize:
          type === 'custom_match'
            ? Number(winnerPrize) || Number(tournament.prizePool) || 0
            : 0,
        runnerUpPrize: 0,
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
    if (status !== 'completed') {
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

    const marked = lifecycle.markResultsPublished(tournament);
    if (!marked.ok) return res.status(400).json({ error: marked.error });
    await tournament.save();

    res.json({
      message: 'Results published',
      tournament,
      status: 'completed',
      resultsPublished: true,
    });
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
    if (status !== 'completed') {
      return res.status(400).json({ error: 'Results can only be entered when match is completed' });
    }
    if (lifecycle.areResultsPublished(tournament)) {
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
    if (lifecycle.areResultsPublished(tournament)) {
      return res.status(400).json({ error: 'Tournament is read-only after results are published' });
    }
    if (status !== 'completed') {
      return res.status(400).json({
        error: 'Mark the tournament as Completed before entering or publishing results',
      });
    }

    const teams = await Team.find({ tournamentId: tournament._id, status: 'registered' });
    if (teams.length < 1) {
      return res.status(400).json({ error: 'No registered teams found' });
    }

    const teamIds = teams.map((t) => t._id);
    let { winnerTeamId, runnerUpTeamId, mvpUserId, winnerPrize, runnerUpPrize, publish } = req.body;

    // Auto runner-up = the other registered team
    if (winnerTeamId && !runnerUpTeamId) {
      const other = teams.find((t) => String(t._id) !== String(winnerTeamId));
      if (other) runnerUpTeamId = other._id;
    }

    // Auto MVP = winning team captain when not provided
    if (winnerTeamId && !mvpUserId) {
      const winnerTeam = teams.find((t) => String(t._id) === String(winnerTeamId));
      if (winnerTeam?.captainUserId) mvpUserId = winnerTeam.captainUserId;
    }

    // Custom Match: winner gets 100% of configured prize; loser gets ₹0
    const prizeDistribution = await PrizeDistribution.findOne({ tournamentId: tournament._id }).lean();
    const resolvedWinnerPrize =
      Number(winnerPrize) > 0
        ? Number(winnerPrize)
        : Number(prizeDistribution?.winnerPrize) ||
          Number(tournament.prizes?.first) ||
          Number(tournament.prizePool) ||
          0;
    const resolvedRunnerUpPrize = 0;

    const payload = {
      winnerTeamId,
      runnerUpTeamId,
      mvpUserId,
      winnerPrize: resolvedWinnerPrize,
      runnerUpPrize: resolvedRunnerUpPrize,
    };
    const v = lifecycle.validateCustomResult(payload, teamIds);
    if (!v.ok) return res.status(400).json({ error: v.error });

    if (!runnerUpTeamId) {
      return res.status(400).json({ error: 'Runner-up team is required (need 2 registered teams)' });
    }

    const doc = await CustomMatchResult.findOneAndUpdate(
      { tournamentId: tournament._id },
      {
        tournamentId: tournament._id,
        winnerTeamId,
        runnerUpTeamId,
        mvpUserId: mvpUserId || undefined,
        winnerPrize: resolvedWinnerPrize,
        runnerUpPrize: resolvedRunnerUpPrize,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Keep PrizeDistribution in sync (winner only)
    await PrizeDistribution.findOneAndUpdate(
      { tournamentId: tournament._id },
      {
        tournamentId: tournament._id,
        tournamentType: 'custom_match',
        rankTiers: [],
        winnerPrize: resolvedWinnerPrize,
        runnerUpPrize: 0,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    if (publish) {
      const marked = lifecycle.markResultsPublished(tournament);
      if (!marked.ok) return res.status(400).json({ error: marked.error });
      await tournament.save();

      // Credit winner prize to team captain's wallet (once)
      if (resolvedWinnerPrize > 0 && !doc.prizeCredited) {
        const winnerTeam = teams.find((t) => String(t._id) === String(winnerTeamId));
        const captainId = winnerTeam?.captainUserId;
        if (captainId) {
          const captain = await User.findById(captainId);
          if (captain) {
            captain.wallet.balance = (captain.wallet.balance || 0) + resolvedWinnerPrize;
            captain.wallet.totalWinnings = (captain.wallet.totalWinnings || 0) + resolvedWinnerPrize;
            captain.tournament.wins = (captain.tournament.wins || 0) + 1;
            captain.tournament.earnings = (captain.tournament.earnings || 0) + resolvedWinnerPrize;
            await captain.save();

            await WalletTransaction.create({
              userId: captainId,
              type: 'tournament_reward',
              amount: resolvedWinnerPrize,
              tournamentId: tournament._id,
              description: `Custom Match winner prize — ${tournament.name}`,
              status: 'completed',
            });

            await Notification.create({
              userId: captainId,
              tournamentId: tournament._id,
              type: 'tournament_update',
              title: 'Winner Prize Credited',
              message: `₹${resolvedWinnerPrize} credited for winning ${tournament.name}.`,
            });

            doc.prizeCredited = true;
            await doc.save();
          }
        }
      }

      return res.json({
        message: 'Results published successfully',
        result: doc,
        status: 'completed',
        resultsPublished: true,
        winnerPrizeCredited: resolvedWinnerPrize,
      });
    }

    res.json({ message: 'Custom match results saved', result: doc, status, resultsPublished: false });
  } catch (e) {
    console.error('save custom:', e);
    res.status(500).json({ error: e.message || 'Failed to save custom match results' });
  }
});

// ——— Public results (new) ———
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
        runnerUpPrize: 0,
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

// Register team (Custom Match) — Team Name + Side + player names
router.post('/:id/register-team', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot join as participants' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    if (!lifecycle.isCustomMatch(tournament) && !lifecycle.usesTeamRegistration(tournament)) {
      return res.status(400).json({
        error: 'Team registration is for Custom Match or Duo/Squad Battle Royale only. Solo uses slot booking.',
      });
    }

    const status = lifecycle.getEffectiveStatus(tournament);
    if (!lifecycle.canJoin(status)) {
      return res.status(400).json({ error: 'Registration is not open' });
    }

    const isCustom = lifecycle.isCustomMatch(tournament);
    const { teamName, teamSide, players } = req.body;
    const sideRaw = String(teamSide || req.body.side || '')
      .trim()
      .toUpperCase()
      .replace('TEAM ', '');
    const side = sideRaw === 'A' || sideRaw === 'B' ? sideRaw : null;

    if (!teamName || !String(teamName).trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (isCustom && !side) {
      return res.status(400).json({ error: 'Team side must be Team A or Team B' });
    }

    const requiredPlayers = lifecycle.getPlayersPerTeam(tournament.mode);
    if (!Array.isArray(players) || players.length !== requiredPlayers) {
      const modeLabel = String(tournament.mode || 'solo').toLowerCase();
      return res.status(400).json({
        error:
          modeLabel === 'squad'
            ? 'Squad requires exactly 4 player names per team'
            : modeLabel === 'duo'
              ? 'Duo requires exactly 2 player names per team'
              : 'Solo requires exactly 1 player name',
        requiredPlayers,
      });
    }

    const normalizedPlayers = players.map((p, idx) => {
      const name = String(typeof p === 'string' ? p : p?.name || p?.gamingUsername || '').trim();
      const gamingUID = String(typeof p === 'object' ? p?.gamingUID || '' : '').trim();
      return { name, gamingUID, index: idx };
    });

    if (normalizedPlayers.some((p) => !p.name)) {
      return res.status(400).json({ error: 'All player name fields are required' });
    }

    const teamCount = await Team.countDocuments({ tournamentId: tournament._id, status: 'registered' });
    const maxTeams = isCustom
      ? tournament.maxTeams || 2
      : tournament.maxTeams ||
        Math.floor((tournament.maxParticipants || 50) / requiredPlayers);
    if (teamCount >= maxTeams) {
      return res.status(400).json({
        error: isCustom ? 'Match is full — both teams registered' : 'All team slots are full',
        isFull: true,
      });
    }

    if (isCustom && side) {
      const sideTaken = await Team.findOne({
        tournamentId: tournament._id,
        side,
        status: 'registered',
      });
      if (sideTaken) {
        return res.status(400).json({ error: `Team ${side} is already registered` });
      }
    }

    const nameTaken = await Team.findOne({
      tournamentId: tournament._id,
      status: 'registered',
      name: { $regex: `^${String(teamName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (nameTaken) {
      return res.status(400).json({ error: 'A team with this name is already registered in this match' });
    }

    const existingMember = await TeamMember.findOne({
      tournamentId: tournament._id,
      userId: req.userId,
    });
    const existingParticipant = await TournamentParticipant.findOne({
      tournamentId: tournament._id,
      userId: req.userId,
    });
    if (existingMember || existingParticipant) {
      return res.status(400).json({ error: 'You are already registered in this tournament' });
    }

    // Entry fee is charged once per team (captain pays for the whole team)
    const { bonusUsed, realMoneyRequired } = getEntryPaymentSplit(user, tournament.entryFee);
    if (user.wallet.balance < realMoneyRequired) {
      return res.status(400).json({
        error: `Insufficient real balance! Team entry is ₹${tournament.entryFee} (need ₹${realMoneyRequired} real; can use ₹${bonusUsed} bonus). Current: ₹${user.wallet.balance}.`,
      });
    }

    const teamPayload = {
      tournamentId: tournament._id,
      name: String(teamName).trim(),
      players: normalizedPlayers.map(({ name, gamingUID }) => ({ name, gamingUID })),
      captainUserId: req.userId,
    };
    if (isCustom && side) teamPayload.side = side;

    const team = await Team.create(teamPayload);

    await TeamMember.create({
      tournamentId: tournament._id,
      teamId: team._id,
      userId: req.userId,
      gamingUsername: normalizedPlayers[0].name,
      gamingUID: normalizedPlayers[0].gamingUID,
      role: 'captain',
    });

    user.wallet.balance -= realMoneyRequired;
    user.wallet.bonusBalance = Math.max((user.wallet.bonusBalance || 0) - bonusUsed, 0);
    user.wallet.bonusUsed = (user.wallet.bonusUsed || 0) + bonusUsed;
    user.tournament.participatedCount = (user.tournament.participatedCount || 0) + 1;
    await user.save();

    const entryLabel = isCustom ? 'Custom Match' : 'Battle Royale';
    const sideLabel = side ? ` / Team ${side}` : '';

    await WalletTransaction.create({
      userId: req.userId,
      type: 'tournament_entry',
      amount: tournament.entryFee,
      tournamentId: tournament._id,
      description: `${entryLabel} team entry (₹${tournament.entryFee} per team) — ${tournament.name}${sideLabel}`,
      status: 'completed',
    });

    await Notification.create({
      userId: req.userId,
      tournamentId: tournament._id,
      type: 'tournament_update',
      title: 'Team Registered',
      message: `Team "${team.name}"${sideLabel} registered for ${tournament.name}. Entry fee ₹${tournament.entryFee} paid once for your whole team.`,
    });

    tournament.currentParticipants = (teamCount + 1) * requiredPlayers;
    if (!tournament.registeredPlayers.some((id) => String(id) === String(req.userId))) {
      tournament.registeredPlayers.push(req.userId);
    }
    await tournament.save();

    res.status(201).json({
      message: 'Team registered successfully. Entry fee charged once for the whole team.',
      team: {
        _id: team._id,
        name: team.name,
        side: team.side,
        players: team.players,
      },
      payment: {
        entryFee: tournament.entryFee,
        chargedPer: 'team',
        bonusUsed,
        realMoneyRequired,
      },
    });
  } catch (e) {
    console.error('register-team:', e);
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Team name or side is already taken for this match' });
    }
    res.status(500).json({ error: e.message || 'Failed to register team' });
  }
});

module.exports = router;
