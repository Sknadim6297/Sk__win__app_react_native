const MatchType = require('../models/MatchType');

/** Canonical player formats — never shown as a field named "Format" on the UI. */
const PLAYER_FORMATS = {
  solo: { key: 'solo', label: 'Solo', playersPerTeam: 1 },
  duo: { key: 'duo', label: 'Duo', playersPerTeam: 2 },
  squad: { key: 'squad', label: 'Squad', playersPerTeam: 4 },
};

const DEFAULT_MATCH_TYPES = [
  {
    name: 'Battle Royale',
    isTeamVsTeam: false,
    hasKillRewards: true,
    defaultSlots: 48,
    sortOrder: 0,
  },
  {
    name: 'Clash Squad',
    isTeamVsTeam: true,
    hasKillRewards: false,
    defaultSlots: 2,
    sortOrder: 1,
  },
  {
    name: 'Lone Wolf',
    isTeamVsTeam: false,
    hasKillRewards: true,
    defaultSlots: 48,
    sortOrder: 2,
  },
];

function normalizePlayerFormat(value) {
  const v = String(value || 'solo').toLowerCase().trim();
  if (v === 'duo') return 'duo';
  if (v === 'squad' || v === 'team') return 'squad';
  return 'solo';
}

function playersPerTeamFromFormat(playerFormat) {
  return PLAYER_FORMATS[normalizePlayerFormat(playerFormat)]?.playersPerTeam || 1;
}

function playerFormatLabel(playerFormat) {
  return PLAYER_FORMATS[normalizePlayerFormat(playerFormat)]?.label || 'Solo';
}

async function ensureDefaultMatchTypes() {
  for (const def of DEFAULT_MATCH_TYPES) {
    const existing = await MatchType.findOne({ name: def.name });
    if (!existing) {
      await MatchType.create({ ...def, active: true });
    } else {
      // Always keep catalog defaults available for seeding / tournaments
      existing.isTeamVsTeam = def.isTeamVsTeam;
      existing.hasKillRewards = def.hasKillRewards;
      if (existing.defaultSlots == null) existing.defaultSlots = def.defaultSlots;
      if (existing.sortOrder == null) existing.sortOrder = def.sortOrder;
      existing.active = true;
      await existing.save();
    }
  }
  // Soft-hide legacy Solo/Duo/Squad "match types" that were player formats
  await MatchType.updateMany(
    { name: { $in: ['Solo', 'Duo', 'Squad', 'Clash Squad Duo', 'Clash Squad Solo', 'Team'] } },
    { $set: { active: false } }
  );
  return MatchType.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
}

async function findMatchTypeByName(name) {
  return (
    (await MatchType.findOne({ name, active: true })) ||
    (await MatchType.findOne({ name }))
  );
}

function resolveMatchTypeDoc(tournament) {
  const ref = tournament?.matchType;
  if (ref && typeof ref === 'object' && ref.name) return ref;
  return null;
}

/**
 * Resolve capacity from Match Type + Player Format.
 * Battle Royale / Lone Wolf: always 48 player slots on the grid.
 * Clash Squad (team vs team): 2 sides.
 * Solo joins 1 slot, Duo 2, Squad 4 (validated at book time).
 */
function resolveCapacityFromSelection({
  matchType,
  playerFormat,
  slots, // ignored for BR — always 48
}) {
  const mt = matchType || {};
  const format = normalizePlayerFormat(playerFormat);
  const playersPerTeam = playersPerTeamFromFormat(format);
  const isTeamVsTeam = Boolean(mt.isTeamVsTeam);
  const hasKillRewards = mt.hasKillRewards != null ? Boolean(mt.hasKillRewards) : !isTeamVsTeam;

  let slotCount;
  if (isTeamVsTeam) {
    slotCount = 2;
  } else {
    // Fixed 48-player grid for Solo / Duo / Squad
    slotCount = 48;
  }

  const totalPlayerCapacity = isTeamVsTeam ? slotCount * playersPerTeam : 48;
  // Team registration UI only for Clash Squad; BR Duo/Squad pick multiple slots on the grid
  const usesTeamRegistration = isTeamVsTeam;
  const category = isTeamVsTeam ? 'custom' : 'battle_royale';

  return {
    ok: true,
    playerFormat: format,
    mode: format,
    category,
    slots: slotCount,
    playersPerTeam,
    slotsRequiredToJoin: isTeamVsTeam ? playersPerTeam : playersPerTeam,
    totalPlayerCapacity,
    maxTeams: isTeamVsTeam ? 2 : Math.floor(48 / playersPerTeam),
    maxParticipants: totalPlayerCapacity,
    usesTeamRegistration,
    isTeamVsTeam,
    hasKillRewards,
    matchTypeName: mt.name || null,
  };
}

function applyMatchTypeToTournamentFields(matchType, playerFormat, slots) {
  return resolveCapacityFromSelection({ matchType, playerFormat, slots });
}

module.exports = {
  PLAYER_FORMATS,
  DEFAULT_MATCH_TYPES,
  normalizePlayerFormat,
  playersPerTeamFromFormat,
  playerFormatLabel,
  ensureDefaultMatchTypes,
  findMatchTypeByName,
  resolveMatchTypeDoc,
  resolveCapacityFromSelection,
  applyMatchTypeToTournamentFields,
};
