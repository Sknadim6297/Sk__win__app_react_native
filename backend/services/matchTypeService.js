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
    name: 'CS One Tap',
    isTeamVsTeam: true,
    hasKillRewards: false,
    defaultSlots: 2,
    sortOrder: 2,
  },
  {
    name: 'Lone Wolf',
    isTeamVsTeam: false,
    hasKillRewards: true,
    defaultSlots: 2,
    sortOrder: 3,
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nameMatchRegex(canonicalName) {
  // Treat any whitespace run as equivalent (e.g. "LONE  WOLF" ≈ "Lone Wolf")
  const pattern = escapeRegex(canonicalName).replace(/\\?\s+/g, '\\s+');
  return new RegExp(`^${pattern}$`, 'i');
}

/**
 * Seed only when catalog is empty. Never re-create deleted types.
 * Sync structural flags on existing rows; never force `active` back on.
 * Collapse case/whitespace-only duplicates (e.g. "BATTLE ROYALE" vs "Battle Royale").
 */
async function ensureDefaultMatchTypes() {
  const total = await MatchType.countDocuments();
  if (total === 0) {
    await MatchType.insertMany(
      DEFAULT_MATCH_TYPES.map((def) => ({
        ...def,
        active: true,
      }))
    );
  } else {
    for (const def of DEFAULT_MATCH_TYPES) {
      const matches = await MatchType.find({
        name: { $regex: nameMatchRegex(def.name) },
      }).sort({ createdAt: 1 });

      if (!matches.length) {
        // Do not recreate — admin may have deleted this type intentionally.
        continue;
      }

      // Keep one row (prefer canonical casing / oldest); remove case duplicates.
      let keeper =
        matches.find((m) => m.name === def.name) ||
        matches.find((m) => m.active !== false) ||
        matches[0];

      for (const dup of matches) {
        if (String(dup._id) === String(keeper._id)) continue;
        await MatchType.findByIdAndDelete(dup._id);
      }

      let dirty = false;
      if (keeper.name !== def.name) {
        keeper.name = def.name;
        dirty = true;
      }
      if (keeper.isTeamVsTeam !== def.isTeamVsTeam) {
        keeper.isTeamVsTeam = def.isTeamVsTeam;
        dirty = true;
      }
      if (keeper.hasKillRewards !== def.hasKillRewards) {
        keeper.hasKillRewards = def.hasKillRewards;
        dirty = true;
      }
      if (keeper.defaultSlots == null) {
        keeper.defaultSlots = def.defaultSlots;
        dirty = true;
      }
      if (keeper.sortOrder == null) {
        keeper.sortOrder = def.sortOrder;
        dirty = true;
      }
      if (dirty) await keeper.save();
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

function isLoneWolfMatchType(matchType) {
  const name =
    typeof matchType === 'string'
      ? matchType
      : matchType?.name || matchType?.matchTypeName || '';
  return /lone\s*wolf/i.test(String(name));
}

/** Clash Squad + Lone Wolf use Team A/B join (2 sides). Battle Royale uses 48-slot grid. */
function usesTeamJoinMatchType(matchType, category) {
  const mt = matchType && typeof matchType === 'object' ? matchType : { name: matchType };
  if (mt.isTeamVsTeam) return true;
  if (category === 'custom' || category === 'custom_match') return true;
  return isLoneWolfMatchType(mt);
}

/**
 * Resolve capacity from Match Type + Player Format.
 * Battle Royale: 48-slot grid.
 * Clash Squad / Lone Wolf: 2 team sides (Team A / Team B).
 */
function resolveCapacityFromSelection({
  matchType,
  playerFormat,
  slots, // ignored — derived from match type
}) {
  const mt = matchType || {};
  const format = normalizePlayerFormat(playerFormat);
  const playersPerTeam = playersPerTeamFromFormat(format);
  const isTeamVsTeam = Boolean(mt.isTeamVsTeam);
  const teamJoin = usesTeamJoinMatchType(mt);
  const hasKillRewards = mt.hasKillRewards != null ? Boolean(mt.hasKillRewards) : !isTeamVsTeam;

  const slotCount = teamJoin ? 2 : 48;
  const totalPlayerCapacity = teamJoin ? slotCount * playersPerTeam : 48;
  const usesTeamRegistration = teamJoin;
  const category = isTeamVsTeam ? 'custom' : 'battle_royale';

  return {
    ok: true,
    playerFormat: format,
    mode: format,
    category,
    slots: slotCount,
    playersPerTeam,
    slotsRequiredToJoin: playersPerTeam,
    totalPlayerCapacity,
    maxTeams: teamJoin ? 2 : Math.floor(48 / playersPerTeam),
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
  isLoneWolfMatchType,
  usesTeamJoinMatchType,
  resolveCapacityFromSelection,
  applyMatchTypeToTournamentFields,
};
