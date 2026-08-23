const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const PrizeDistribution = require('../models/PrizeDistribution');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const CustomMatchResult = require('../models/CustomMatchResult');
const matchStructure = require('./matchStructure');
const {
  resolveCapacityFromSelection,
  normalizePlayerFormat,
} = require('./matchTypeService');

const LIFECYCLE = ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'];

const TRANSITIONS = {
  draft: ['upcoming', 'cancelled'],
  upcoming: ['ongoing', 'cancelled', 'draft'],
  ongoing: ['completed', 'cancelled'],
  completed: ['ongoing'],
  cancelled: ['draft'],
};

function isBattleRoyale(tournament) {
  return matchStructure.isBattleRoyale(tournament);
}

function isCustomMatch(tournament) {
  return matchStructure.isCustomMatch(tournament);
}

function getMatchStructure(tournament) {
  return matchStructure.getMatchStructure(tournament);
}

function resolveEntryCharge(tournament) {
  return matchStructure.resolveEntryCharge(tournament);
}

function getTournamentType(tournament) {
  return isCustomMatch(tournament) ? 'custom_match' : 'battle_royale';
}

function mapLegacyStatus(status) {
  if (!status) return null;
  if (status === 'upcoming' || status === 'incoming') return 'upcoming';
  if (status === 'locked') return 'upcoming';
  if (status === 'live') return 'ongoing';
  // Legacy: result_published was a status — treat as completed (results flag is separate)
  if (status === 'result_published') return 'completed';
  if (['draft', 'ongoing', 'completed', 'cancelled'].includes(status)) return status;
  return null;
}

/**
 * Normalize any admin/user status string to canonical lifecycle status.
 */
function normalizeLifecycleStatus(status) {
  const mapped = mapLegacyStatus(status);
  if (mapped) return mapped;
  if (status === 'draft') return 'draft';
  return null;
}

/**
 * Resolve lifecycle for API + transitions.
 * Prefer the further-along status when status and lifecycleStatus disagree.
 * Results publishing is a boolean flag — never a separate tournament status.
 */
function getEffectiveStatus(tournament) {
  const legacy = mapLegacyStatus(tournament.status);
  const lifecycle = mapLegacyStatus(tournament.lifecycleStatus) || tournament.lifecycleStatus;

  const ORDER = ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'];
  const li = lifecycle ? ORDER.indexOf(lifecycle) : -1;
  const si = legacy ? ORDER.indexOf(legacy) : -1;

  // If one side progressed past draft and the other is still draft, trust the progressed one
  if (lifecycle === 'draft' && legacy && legacy !== 'draft') return legacy;
  if (legacy === 'draft' && lifecycle && lifecycle !== 'draft') return lifecycle;

  // Prefer the more advanced status when both are set
  if (li >= 0 && si >= 0 && li !== si) {
    if (lifecycle === 'cancelled' || legacy === 'cancelled') return 'cancelled';
    return ORDER[Math.max(li, si)];
  }

  if (lifecycle && ORDER.includes(lifecycle)) return lifecycle;
  if (legacy) return legacy;
  return 'draft';
}

function areResultsPublished(tournament) {
  if (!tournament) return false;
  if (tournament.resultsPublished === true) return true;
  // Legacy documents that still store result_published as status
  return (
    tournament.status === 'result_published' ||
    tournament.lifecycleStatus === 'result_published'
  );
}

/** Persist lifecycleStatus when it disagrees with resolved effective status (legacy data). */
function ensureLifecycleSynced(tournament) {
  let changed = false;
  // Migrate legacy result_published status → completed + resultsPublished
  if (
    tournament.lifecycleStatus === 'result_published' ||
    tournament.status === 'result_published'
  ) {
    tournament.lifecycleStatus = 'completed';
    tournament.status = 'completed';
    tournament.resultsPublished = true;
    if (!tournament.resultsPublishedAt) tournament.resultsPublishedAt = new Date();
    changed = true;
  }

  const effective = getEffectiveStatus(tournament);
  if (tournament.lifecycleStatus !== effective || tournament.status !== effective) {
    const keepPublished = areResultsPublished(tournament);
    syncLegacyFields(tournament, effective);
    if (effective === 'completed' && keepPublished) {
      tournament.resultsPublished = true;
    }
    changed = true;
  }
  return changed;
}

function syncLegacyFields(tournament, lifecycleStatus) {
  let normalized = normalizeLifecycleStatus(lifecycleStatus) || lifecycleStatus;

  // Publishing used to set status to result_published — map to completed + flag
  if (normalized === 'result_published') {
    tournament.lifecycleStatus = 'completed';
    tournament.status = 'completed';
    tournament.resultsPublished = true;
    if (!tournament.resultsPublishedAt) tournament.resultsPublishedAt = new Date();
    tournament.locked = true;
    tournament.updatedAt = new Date();
    return;
  }

  const keepPublished =
    normalized === 'completed' && areResultsPublished(tournament);

  tournament.lifecycleStatus = normalized;
  tournament.status = normalized;

  if (normalized === 'completed') {
    tournament.resultsPublished = keepPublished;
  } else {
    tournament.resultsPublished = false;
    tournament.resultsPublishedAt = undefined;
  }

  if (normalized === 'ongoing' || normalized === 'completed') {
    tournament.locked = true;
  }
  if (normalized === 'upcoming' || normalized === 'draft') {
    tournament.locked = false;
  }
  tournament.updatedAt = new Date();
}

/** Mark results visible without changing tournament status (stays Completed). */
function markResultsPublished(tournament) {
  const status = getEffectiveStatus(tournament);
  if (status !== 'completed') {
    return { ok: false, error: 'Tournament must be completed before publishing results' };
  }
  if (areResultsPublished(tournament)) {
    return {
      ok: false,
      error: 'Results already published — payouts will not run again',
      alreadyPublished: true,
    };
  }
  tournament.lifecycleStatus = 'completed';
  tournament.status = 'completed';
  tournament.resultsPublished = true;
  tournament.resultsPublishedAt = new Date();
  tournament.locked = true;
  tournament.updatedAt = new Date();
  return { ok: true };
}

/** Statuses that are visible on the user panel */
function isUserVisibleStatus(status) {
  const s = normalizeLifecycleStatus(status) || status;
  return ['upcoming', 'ongoing', 'completed', 'locked', 'incoming', 'live'].includes(s);
}

function isDraftStatus(tournament) {
  return getEffectiveStatus(tournament) === 'draft';
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

/** Custom Match or BR Duo/Squad — captain registers a full roster (pays fee × players). */
function usesTeamRegistration(tournament) {
  return getMatchStructure(tournament).usesTeamRegistration;
}

function getPlayersPerTeam(modeOrTournament) {
  return matchStructure.getPlayersPerTeam(modeOrTournament);
}

/** Default BR player capacity used only when no joiningSlots are provided. */
const BR_MAX_PLAYERS = matchStructure.BR_MAX_PLAYERS;

/**
 * Capacity from Match Type + Player Format + joining slots.
 * Prefer resolveCapacityFromSelection when matchType doc is available.
 */
function resolveTournamentCapacity({
  category,
  mode,
  playerFormat,
  maxParticipants,
  maxTeams,
  playersPerTeam: pptIn,
  slots,
  joiningSlots,
  matchType,
}) {
  const isCustom = category === 'custom' || category === 'custom_match';
  const format = normalizePlayerFormat(playerFormat || mode || 'solo');
  const mt = matchType || { isTeamVsTeam: isCustom, hasKillRewards: !isCustom };
  const slotHint =
    joiningSlots != null && Number(joiningSlots) > 0
      ? Number(joiningSlots)
      : slots != null && Number(slots) > 0
        ? Number(slots)
        : maxTeams != null && Number(maxTeams) > 0 && format !== 'solo'
          ? Number(maxTeams)
          : maxParticipants != null && Number(maxParticipants) > 0 && format === 'solo'
            ? Number(maxParticipants)
            : undefined;

  const capacity = resolveCapacityFromSelection({
    matchType: mt,
    playerFormat: format,
    slots: slotHint,
  });

  // Preserve explicit ppt override if caller passed one (rare)
  if (pptIn != null && Number(pptIn) > 0) {
    capacity.playersPerTeam = Math.max(1, Number(pptIn));
    capacity.totalPlayerCapacity = capacity.slots * capacity.playersPerTeam;
    capacity.maxParticipants = capacity.totalPlayerCapacity;
  }

  return {
    ok: true,
    mode: capacity.mode,
    playerFormat: capacity.playerFormat,
    maxTeams: capacity.maxTeams,
    maxParticipants: capacity.maxParticipants,
    playersPerTeam: capacity.playersPerTeam,
    category: capacity.category,
    slots: capacity.slots,
    joiningSlots: capacity.slots,
    totalPlayerCapacity: capacity.totalPlayerCapacity,
    usesTeamRegistration: capacity.usesTeamRegistration,
    isTeamVsTeam: capacity.isTeamVsTeam,
    hasKillRewards: capacity.hasKillRewards,
  };
}

function getPlacementPrize(tournament, position) {
  const rank = Number(position) || 0;
  if (rank === 1) return Number(tournament?.prizes?.first) || 0;
  if (rank === 2) return Number(tournament?.prizes?.second) || 0;
  if (rank === 3) return Number(tournament?.prizes?.third) || 0;
  return 0;
}

function calculateBrReward({ placementPrize, kills, perKill }) {
  const k = Math.max(0, Number(kills) || 0);
  const pk = Math.max(0, Number(perKill) || 0);
  const place = Math.max(0, Number(placementPrize) || 0);
  return {
    placementPrize: place,
    killReward: k * pk,
    totalReward: place + k * pk,
    kills: k,
    perKill: pk,
  };
}

/** Join display + full check */
async function getJoinStats(tournamentId, tournament) {
  const structure = getMatchStructure(tournament);
  if (structure.usesTeamRegistration) {
    const teamCount = await getTeamCount(tournamentId);
    return {
      joinedCount: teamCount,
      capacity: structure.totalSlots,
      unit: structure.slotUnit,
      isFull: teamCount >= structure.totalSlots,
      usesTeams: true,
      matchKind: structure.kind,
      formatLabel: structure.formatLabel,
      playerFormatLabel: structure.playerFormatLabel,
      modeLabel: structure.modeLabel,
      slotsRequiredToJoin: structure.slotsRequiredToJoin,
    };
  }

  // BR 48-slot grid: occupancy = booked seats
  let bookedSlots = 0;
  if (Array.isArray(tournament?.slots) && tournament.slots.length) {
    bookedSlots = tournament.slots.filter((s) => s.isBooked).length;
  } else {
    bookedSlots = await getParticipantCount(tournamentId);
  }
  const needed = Math.max(1, Number(structure.slotsRequiredToJoin) || 1);
  return {
    joinedCount: bookedSlots,
    capacity: structure.totalSlots,
    unit: structure.slotUnit,
    isFull: bookedSlots + needed > structure.totalSlots,
    usesTeams: false,
    matchKind: structure.kind,
    formatLabel: structure.formatLabel,
    playerFormatLabel: structure.playerFormatLabel,
    modeLabel: structure.modeLabel,
    slotsRequiredToJoin: structure.slotsRequiredToJoin,
  };
}

async function getJoinedCount(tournamentId, tournament) {
  const stats = await getJoinStats(tournamentId, tournament);
  return stats.joinedCount;
}

async function getCapacity(tournament) {
  if (isCustomMatch(tournament)) {
    return tournament.maxTeams || 2;
  }
  return tournament.maxParticipants || 50;
}

/** Required roster size per team by mode */
function getCustomMatchPlayersPerTeam(mode) {
  return getPlayersPerTeam(mode);
}

const ROOM_VISIBLE_BEFORE_MS = 2 * 60 * 1000;

/**
 * Room ID/password become visible to joined users 2 minutes before start.
 * Admin may force-show via showRoomCredentials.
 */
function getRoomCredentialsVisibility(tournament, { userJoined = false } = {}) {
  const hasCreds = !!(tournament.roomId || tournament.roomPassword);
  if (!hasCreds) {
    return {
      visible: false,
      hasCredentials: false,
      message: userJoined
        ? 'Please wait. Match ID and password will be available 2 minutes before the match starts.'
        : null,
      unlockAt: tournament.startDate
        ? new Date(new Date(tournament.startDate).getTime() - ROOM_VISIBLE_BEFORE_MS)
        : null,
    };
  }

  if (!userJoined) {
    return {
      visible: false,
      hasCredentials: true,
      message: null,
      unlockAt: null,
    };
  }

  if (tournament.showRoomCredentials) {
    return { visible: true, hasCredentials: true, message: null, unlockAt: null };
  }

  const start = new Date(tournament.startDate).getTime();
  const unlockAt = new Date(start - ROOM_VISIBLE_BEFORE_MS);
  if (Date.now() >= unlockAt.getTime()) {
    return { visible: true, hasCredentials: true, message: null, unlockAt };
  }

  return {
    visible: false,
    hasCredentials: true,
    message: 'Please wait. Match ID and password will be available 2 minutes before the match starts.',
    unlockAt,
  };
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
    if (Number(e.kills) < 0 || Number.isNaN(Number(e.kills))) {
      return { ok: false, error: 'Kills must be a non-negative number' };
    }
    if (Number(e.prize) < 0) return { ok: false, error: 'Prize cannot be negative' };
  }
  return { ok: true };
}

function validateBattleRoyaleTeamResults(entries, teamIds) {
  if (!Array.isArray(entries) || !entries.length) {
    return { ok: false, error: 'Team results are required' };
  }
  const teamSet = new Set((teamIds || []).map(String));
  const seenTeams = new Set();
  const seenPositions = new Set();

  for (const e of entries) {
    const teamId = String(e.teamId || '');
    const position = Number(e.position);
    const kills = Number(e.kills);

    if (!teamSet.has(teamId)) {
      return { ok: false, error: 'All result teams must be registered for this tournament' };
    }
    if (seenTeams.has(teamId)) {
      return { ok: false, error: 'Duplicate team in results' };
    }
    seenTeams.add(teamId);

    if (!position || position < 1) {
      return { ok: false, error: 'Invalid team placement' };
    }
    if (seenPositions.has(position)) {
      return { ok: false, error: 'Duplicate placements are not allowed' };
    }
    seenPositions.add(position);

    if (Number.isNaN(kills) || kills < 0) {
      return { ok: false, error: 'Team kills must be a non-negative number' };
    }
  }

  return { ok: true };
}

function validateCustomResult(payload, teamIds) {
  const { winnerTeamId, runnerUpTeamId, winnerPrize, runnerUpPrize } = payload;
  if (!winnerTeamId) {
    return { ok: false, error: 'Winning team is required' };
  }
  const teamSet = new Set(teamIds.map(String));
  if (!teamSet.has(String(winnerTeamId))) {
    return { ok: false, error: 'Winner must be a registered team' };
  }
  if (runnerUpTeamId) {
    if (String(winnerTeamId) === String(runnerUpTeamId)) {
      return { ok: false, error: 'Winner and runner-up cannot be the same team' };
    }
    if (!teamSet.has(String(runnerUpTeamId))) {
      return { ok: false, error: 'Runner-up must be a registered team' };
    }
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
  BR_MAX_PLAYERS,
  isBattleRoyale,
  isCustomMatch,
  getMatchStructure,
  resolveEntryCharge,
  getTournamentType,
  usesTeamRegistration,
  getPlayersPerTeam,
  resolveTournamentCapacity,
  getPlacementPrize,
  calculateBrReward,
  mapLegacyStatus,
  normalizeLifecycleStatus,
  getEffectiveStatus,
  areResultsPublished,
  markResultsPublished,
  ensureLifecycleSynced,
  syncLegacyFields,
  isUserVisibleStatus,
  isDraftStatus,
  getParticipantCount,
  getTeamCount,
  getJoinStats,
  getJoinedCount,
  getCapacity,
  getCustomMatchPlayersPerTeam,
  getRoomCredentialsVisibility,
  ROOM_VISIBLE_BEFORE_MS,
  canJoin,
  shouldShowFullBadge,
  getPrizeForRank,
  validateRankTiers,
  validateBattleRoyaleResults,
  validateBattleRoyaleTeamResults,
  validateCustomResult,
  assertTransition,
};
