const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const PrizeDistribution = require('../models/PrizeDistribution');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const CustomMatchResult = require('../models/CustomMatchResult');

const LIFECYCLE = ['draft', 'upcoming', 'ongoing', 'completed', 'result_published', 'cancelled'];

const TRANSITIONS = {
  draft: ['upcoming', 'cancelled'],
  upcoming: ['ongoing', 'cancelled', 'draft'],
  ongoing: ['completed', 'cancelled'],
  completed: ['result_published', 'ongoing'],
  result_published: [],
  cancelled: ['draft'],
};

function isBattleRoyale(tournament) {
  const c = tournament.category || tournament.tournamentType;
  if (c === 'battle_royale') return true;
  if (c === 'custom' || c === 'custom_match') return false;
  const modeName = tournament?.gameMode?.name || '';
  return String(modeName).toLowerCase().includes('battle royale');
}

function isCustomMatch(tournament) {
  const c = tournament.category || tournament.tournamentType;
  return c === 'custom' || c === 'custom_match';
}

function getTournamentType(tournament) {
  return isCustomMatch(tournament) ? 'custom_match' : 'battle_royale';
}

function mapLegacyStatus(status) {
  if (!status) return null;
  if (status === 'upcoming') return 'upcoming';
  if (status === 'incoming' || status === 'locked') return 'upcoming';
  if (status === 'live') return 'ongoing';
  if (status === 'result_published') return 'result_published';
  if (['draft', 'ongoing', 'completed', 'cancelled'].includes(status)) return status;
  return null;
}

/**
 * Resolve lifecycle for API + transitions.
 * Old tournaments may have status=incoming but lifecycleStatus missing (lean) or default draft (findById).
 */
function getEffectiveStatus(tournament) {
  if (tournament.resultsPublished) return 'result_published';

  const legacy = mapLegacyStatus(tournament.status);
  const lifecycle = tournament.lifecycleStatus;

  if (legacy === 'result_published') return 'result_published';

  // Default draft on load must not override a real legacy status (incoming, ongoing, etc.)
  if (lifecycle === 'draft' && legacy && legacy !== 'draft') {
    return legacy;
  }

  if (lifecycle) return lifecycle;

  return legacy || 'draft';
}

/** Persist lifecycleStatus when it disagrees with resolved effective status (legacy data). */
function ensureLifecycleSynced(tournament) {
  const effective = getEffectiveStatus(tournament);
  if (tournament.lifecycleStatus !== effective) {
    syncLegacyFields(tournament, effective);
    return true;
  }
  return false;
}

function syncLegacyFields(tournament, lifecycleStatus) {
  tournament.lifecycleStatus = lifecycleStatus;
  tournament.status = lifecycleStatus;
  tournament.resultsPublished = lifecycleStatus === 'result_published';
  if (lifecycleStatus === 'ongoing' || lifecycleStatus === 'completed' || lifecycleStatus === 'result_published') {
    tournament.locked = true;
  }
  if (lifecycleStatus === 'upcoming' || lifecycleStatus === 'draft') {
    tournament.locked = false;
  }
  tournament.updatedAt = new Date();
}

async function getParticipantCount(tournamentId) {
  return TournamentParticipant.countDocuments({
    tournamentId,
    status: { $in: ['joined', 'winner'] },
  });
}

async function getTeamCount(tournamentId) {
  return Team.countDocuments({ tournamentId, status: 'registered' });
}

/** Join display + full check (supports legacy participant slots on custom matches). */
async function getJoinStats(tournamentId, tournament) {
  if (isCustomMatch(tournament)) {
    const teamCount = await getTeamCount(tournamentId);
    const maxTeams = tournament.maxTeams || 2;
    if (teamCount > 0) {
      return {
        joinedCount: teamCount,
        capacity: maxTeams,
        unit: 'teams',
        isFull: teamCount >= maxTeams,
        usesTeams: true,
      };
    }
    const playerCount = await getParticipantCount(tournamentId);
    const maxPlayers = tournament.maxParticipants || 48;
    return {
      joinedCount: playerCount,
      capacity: maxPlayers,
      unit: 'players',
      isFull: playerCount >= maxPlayers,
      usesTeams: false,
    };
  }

  const joinedCount = await getParticipantCount(tournamentId);
  const capacity = tournament.maxParticipants || 50;
  return {
    joinedCount,
    capacity,
    unit: 'players',
    isFull: joinedCount >= capacity,
    usesTeams: false,
  };
}

async function getJoinedCount(tournamentId, tournament) {
  const stats = await getJoinStats(tournamentId, tournament);
  return stats.joinedCount;
}

async function getCapacity(tournament) {
  const id = tournament._id || tournament;
  if (isCustomMatch(tournament)) {
    const teamCount = await getTeamCount(id);
    if (teamCount > 0) return tournament.maxTeams || 2;
    return tournament.maxParticipants || 48;
  }
  return tournament.maxParticipants || 50;
}

function canJoin(lifecycleStatus) {
  return lifecycleStatus === 'upcoming' || lifecycleStatus === 'incoming';
}

/** FULL badge only matters while registration is open. */
function shouldShowFullBadge(lifecycleStatus, isFull) {
  if (!isFull) return false;
  return canJoin(lifecycleStatus);
}

function getPrizeForRank(prizeDistribution, rank) {
  if (!prizeDistribution?.rankTiers?.length) return 0;
  const tier = prizeDistribution.rankTiers.find((t) => rank >= t.rankFrom && rank <= t.rankTo);
  return tier ? tier.prize : 0;
}

function validateRankTiers(tiers) {
  if (!Array.isArray(tiers) || !tiers.length) {
    return { ok: false, error: 'At least one prize tier is required for Battle Royale' };
  }
  for (const t of tiers) {
    if (t.rankFrom > t.rankTo) {
      return { ok: false, error: 'rankFrom cannot be greater than rankTo' };
    }
    if (t.prize < 0) return { ok: false, error: 'Prize cannot be negative' };
  }
  return { ok: true };
}

function validateBattleRoyaleResults(entries, joinedCount) {
  if (!Array.isArray(entries) || entries.length !== joinedCount) {
    return {
      ok: false,
      error: `Every joined player must have a result (${joinedCount} required, got ${entries?.length || 0})`,
    };
  }
  const positions = entries.map((e) => Number(e.position));
  const unique = new Set(positions);
  if (unique.size !== positions.length) {
    return { ok: false, error: 'Duplicate positions are not allowed' };
  }
  if (positions.some((p) => !p || p < 1)) {
    return { ok: false, error: 'Invalid position' };
  }
  for (const e of entries) {
    if (Number(e.kills) < 0) return { ok: false, error: 'Kills cannot be negative' };
    if (Number(e.prize) < 0) return { ok: false, error: 'Prize cannot be negative' };
  }
  return { ok: true };
}

function validateCustomResult(payload, teamIds) {
  const { winnerTeamId, runnerUpTeamId, mvpUserId, winnerPrize, runnerUpPrize } = payload;
  if (!winnerTeamId || !runnerUpTeamId || !mvpUserId) {
    return { ok: false, error: 'Winner, runner-up, and MVP are required' };
  }
  if (String(winnerTeamId) === String(runnerUpTeamId)) {
    return { ok: false, error: 'Winner and runner-up cannot be the same team' };
  }
  const teamSet = new Set(teamIds.map(String));
  if (!teamSet.has(String(winnerTeamId)) || !teamSet.has(String(runnerUpTeamId))) {
    return { ok: false, error: 'Teams must be registered participants' };
  }
  if (Number(winnerPrize) < 0 || Number(runnerUpPrize || 0) < 0) {
    return { ok: false, error: 'Prize cannot be negative' };
  }
  return { ok: true };
}

function assertTransition(tournament, nextStatus) {
  const current = getEffectiveStatus(tournament);
  const allowed = TRANSITIONS[current] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      error: `Cannot transition from ${current} to ${nextStatus}`,
    };
  }
  return { ok: true };
}

module.exports = {
  LIFECYCLE,
  TRANSITIONS,
  isBattleRoyale,
  isCustomMatch,
  getTournamentType,
  mapLegacyStatus,
  getEffectiveStatus,
  ensureLifecycleSynced,
  syncLegacyFields,
  getParticipantCount,
  getTeamCount,
  getJoinStats,
  getJoinedCount,
  getCapacity,
  canJoin,
  shouldShowFullBadge,
  getPrizeForRank,
  validateRankTiers,
  validateBattleRoyaleResults,
  validateCustomResult,
  assertTransition,
};
