const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const {
  getPlacementPrize,
  calculateBrReward,
  getMatchStructure,
} = require('./tournamentLifecycle');

/**
 * Placement prize + (kills × perKill). Kill-only when no placement prize.
 */
function computeReward(tournament, position, kills) {
  return calculateBrReward({
    placementPrize: getPlacementPrize(tournament, position),
    kills,
    perKill: tournament?.perKill,
  });
}

/** Split whole rupees across payees; remainder goes to earliest members. */
function splitEqually(totalAmount, userIds) {
  const ids = [];
  const seen = new Set();
  for (const id of userIds || []) {
    const s = id ? String(id) : '';
    if (!s || seen.has(s)) continue;
    seen.add(s);
    ids.push(s);
  }
  if (!ids.length) return [];
  const total = Math.max(0, Math.floor(Number(totalAmount) || 0));
  const n = ids.length;
  const base = Math.floor(total / n);
  let remainder = total - base * n;
  return ids.map((userId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { userId, amount: base + extra };
  });
}

/**
 * Payable wallet users for a team = TeamMember.userId records.
 * (Join flow registers the captain as TeamMember; equal-split among those users.)
 */
async function getTeamPayeeUserIds(tournamentId, teamId) {
  const members = await TeamMember.find({ tournamentId, teamId }).select('userId').lean();
  const fromMembers = members.map((m) => m.userId).filter(Boolean);
  if (fromMembers.length) return fromMembers;

  const team = await Team.findById(teamId).select('captainUserId').lean();
  return team?.captainUserId ? [team.captainUserId] : [];
}

async function buildTeamPayoutItems(tournament, teamResults) {
  const items = [];
  for (const row of teamResults || []) {
    const total = Number(row.totalPrize) || 0;
    if (total <= 0) continue;
    const payees = await getTeamPayeeUserIds(tournament._id, row.teamId);
    const shares = splitEqually(total, payees);
    for (const share of shares) {
      if (share.amount <= 0) continue;
      items.push({
        tournamentId: tournament._id,
        userId: share.userId,
        resultId: row._id,
        resultModel: 'BattleRoyaleTeamResult',
        matchType: String(tournament.mode || 'battle_royale').toLowerCase(),
        amount: share.amount,
        usernameSnapshot: '',
        description: `BR team prize — ${tournament.name} (place ${row.position}, ${row.teamKills} kills)`,
      });
    }
  }
  return items;
}

function buildSoloPayoutItems(tournament, soloResults) {
  return (soloResults || [])
    .filter((r) => Number(r.prize) > 0)
    .map((r) => ({
      tournamentId: tournament._id,
      userId: r.userId,
      resultId: r._id,
      resultModel: 'BattleRoyaleResult',
      matchType: 'solo',
      amount: Number(r.prize) || 0,
      usernameSnapshot: r.gamingUsername || '',
      description: `BR prize — ${tournament.name} (pos ${r.position})`,
    }));
}

function enrichSoloEntry(tournament, entry) {
  const position = Number(entry.position);
  const kills = Number(entry.kills) || 0;
  if (Number.isNaN(kills) || kills < 0) {
    return { ok: false, error: 'Kills must be a non-negative number' };
  }
  const reward = computeReward(tournament, position, kills);
  return {
    ok: true,
    entry: {
      ...entry,
      position,
      kills,
      prize: reward.totalReward,
      placementPrize: reward.placementPrize,
      killReward: reward.killReward,
    },
  };
}

function enrichTeamEntry(tournament, entry) {
  const position = Number(entry.position);
  let teamKills = Number(entry.teamKills ?? entry.kills);

  if (Array.isArray(entry.playerKills) && entry.playerKills.length) {
    const sum = entry.playerKills.reduce((s, p) => s + (Number(p.kills) || 0), 0);
    if (entry.teamKills == null && entry.kills == null) {
      teamKills = sum;
    } else if (sum !== teamKills) {
      return {
        ok: false,
        error: 'Player kill breakdown must equal team total kills',
      };
    }
  }

  if (Number.isNaN(teamKills) || teamKills < 0) {
    return { ok: false, error: 'Team kills must be a non-negative number' };
  }

  const reward = computeReward(tournament, position, teamKills);
  return {
    ok: true,
    entry: {
      teamId: entry.teamId,
      position,
      teamKills,
      playerKills: entry.playerKills || [],
      placementPrize: reward.placementPrize,
      killReward: reward.killReward,
      totalPrize: reward.totalReward,
    },
  };
}

function expectedTeamCapacity(tournament) {
  const structure = getMatchStructure(tournament);
  const perTeam = Math.max(1, Number(structure.playersPerTeam) || 1);
  const maxPlayers = Number(tournament.maxParticipants) || structure.totalPlayerCapacity || 50;
  if (perTeam <= 1) return maxPlayers;
  return Math.floor(maxPlayers / perTeam);
}

module.exports = {
  computeReward,
  splitEqually,
  getTeamPayeeUserIds,
  buildTeamPayoutItems,
  buildSoloPayoutItems,
  enrichSoloEntry,
  enrichTeamEntry,
  expectedTeamCapacity,
};
