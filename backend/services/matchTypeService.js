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
