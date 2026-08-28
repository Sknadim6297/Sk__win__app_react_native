/**
 * Match structure + entry charge.
 *
 * Match Type  = product (Battle Royale / Clash Squad / Lone Wolf)
 * Player Format = Solo / Duo / Squad
 * BR grid = always 48 slots. Join must select 1 / 2 / 4 slots by format.
 * Entry fee = per player; totalAmount = fee × playersPerTeam (backend only)
 */

const {
  resolveMatchTypeDoc,
  normalizePlayerFormat,
  playersPerTeamFromFormat,
  playerFormatLabel,
} = require('./matchTypeService');

const BR_GRID_SLOTS = 48;

function isCustomMatch(tournament) {
  const mt = resolveMatchTypeDoc(tournament);
  if (mt) return Boolean(mt.isTeamVsTeam);
  const c = tournament?.category || tournament?.tournamentType;
  return c === 'custom' || c === 'custom_match' || !!tournament?.isCustomMatch;
}

function isLoneWolfMatch(tournament) {
  const mt = resolveMatchTypeDoc(tournament);
  if (mt?.name && /lone\s*wolf/i.test(mt.name)) return true;
  const name =
    tournament?.matchTypeName ||
    (typeof tournament?.matchType === 'string' && !/^[a-f0-9]{24}$/i.test(tournament.matchType)
      ? tournament.matchType
      : '');
  return /lone\s*wolf/i.test(String(name || ''));
}

function isBattleRoyale(tournament) {
  if (isCustomMatch(tournament)) return false;
  const mt = resolveMatchTypeDoc(tournament);
  if (mt) return !mt.isTeamVsTeam;
  const c = tournament?.category || tournament?.tournamentType;
  if (c === 'battle_royale') return true;
  return false;
}

function getPlayersPerTeam(modeOrTournament) {
  if (modeOrTournament && typeof modeOrTournament === 'object') {
    const format = normalizePlayerFormat(
      modeOrTournament.playerFormat || modeOrTournament.mode || 'solo'
    );
    return playersPerTeamFromFormat(format);
  }
  return playersPerTeamFromFormat(modeOrTournament);
}

function formatModeLabel(mode) {
  return playerFormatLabel(mode);
}

function customFormatLabel(playersPerTeam) {
  if (playersPerTeam === 4) return '4v4';
  if (playersPerTeam === 2) return '2v2';
  return '1v1';
}

const BR_MAX_PLAYERS = BR_GRID_SLOTS;

function getMatchStructure(tournament) {
  const mt = resolveMatchTypeDoc(tournament);
  const playerFormat = normalizePlayerFormat(
    tournament?.playerFormat || tournament?.mode || 'solo'
  );
  const playersPerTeam = playersPerTeamFromFormat(playerFormat);
  const isTeamVsTeam = mt ? Boolean(mt.isTeamVsTeam) : isCustomMatch(tournament);
  const matchTypeName =
    mt?.name ||
    (typeof tournament?.matchType === 'string' && !/^[a-f0-9]{24}$/i.test(tournament.matchType)
      ? tournament.matchType
      : null) ||
    (isTeamVsTeam ? 'Clash Squad' : 'Battle Royale');
  const hasKillRewards = mt
    ? Boolean(mt.hasKillRewards)
    : !isTeamVsTeam;
  const pfLabel = playerFormatLabel(playerFormat);

  if (isTeamVsTeam) {
    return {
      kind: 'team_vs_team',
      matchType: matchTypeName,
      matchTypeName,
      playerFormat,
      playerFormatLabel: pfLabel,
      formatLabel: customFormatLabel(playersPerTeam),
      mode: playerFormat,
      modeLabel: pfLabel,
      playersPerTeam,
      slotsRequiredToJoin: playersPerTeam,
      slots: 2,
      totalSlots: 2,
      totalPlayerCapacity: 2 * playersPerTeam,
      slotUnit: 'teams',
      entryUnit: 'player',
      hasKillRewards,
      usesTeamRegistration: true,
      usesSlotGrid: false,
      usesTeamSides: true,
    };
  }

  if (isLoneWolfMatch(tournament)) {
    return {
      kind: 'lone_wolf',
      matchType: matchTypeName,
      matchTypeName,
      playerFormat,
      playerFormatLabel: pfLabel,
      formatLabel: customFormatLabel(playersPerTeam),
      mode: playerFormat,
      modeLabel: pfLabel,
      playersPerTeam,
      slotsRequiredToJoin: playersPerTeam,
      slots: 2,
      totalSlots: 2,
      totalPlayerCapacity: 2 * playersPerTeam,
      slotUnit: 'teams',
      entryUnit: 'player',
      hasKillRewards,
      usesTeamRegistration: true,
      usesSlotGrid: false,
      usesTeamSides: true,
    };
  }

  // Battle Royale only: fixed 48-slot grid
  return {
    kind: 'battle_royale',
    matchType: matchTypeName,
    matchTypeName,
    playerFormat,
    playerFormatLabel: pfLabel,
    formatLabel: matchTypeName,
    mode: playerFormat,
    modeLabel: pfLabel,
    playersPerTeam,
    slotsRequiredToJoin: playersPerTeam,
    slots: BR_GRID_SLOTS,
    totalSlots: BR_GRID_SLOTS,
    totalPlayerCapacity: BR_GRID_SLOTS,
    slotUnit: 'slots',
    entryUnit: 'player',
    hasKillRewards,
    /** Only Battle Royale uses the 48-slot grid. Lone Wolf + Clash Squad use team join. */
    usesTeamRegistration: false,
    usesSlotGrid: true,
    usesTeamSides: false,
  };
}

function resolveEntryCharge(tournament) {
  const feePerPlayer = Math.max(0, Number(tournament?.entryFee) || 0);
  const structure = getMatchStructure(tournament);
  // Always charge fee × roster size (Solo 1, Duo 2, Squad 4)
  const playersCharged = Math.max(1, Number(structure.playersPerTeam) || 1);
  const totalAmount = feePerPlayer * playersCharged;
  return {
    feePerPlayer,
    playersCharged,
    totalAmount,
    entryUnit: 'player',
    chargedPer: playersCharged > 1 ? 'team_total' : 'player',
    usesTeamRegistration: structure.usesTeamRegistration,
    matchTypeName: structure.matchTypeName,
    playerFormat: structure.playerFormat,
    playerFormatLabel: structure.playerFormatLabel,
  };
}

function buildPublicMatchFields(tournament, structure, charge) {
  const s = structure || getMatchStructure(tournament);
  const c = charge || resolveEntryCharge(tournament);
  const prizePool = Math.max(0, Number(tournament?.prizePool) || 0);
  const perKill = Math.max(0, Number(tournament?.perKill) || 0);
  const showPerKill = Boolean(s.hasKillRewards) && perKill > 0;
  const showPrizePool = prizePool > 0;
  const slotsLabel =
    s.kind === 'team_vs_team' ? `${s.slots} Team Slots` : `${s.slots} Slots`;

  return {
    gameName: tournament?.game?.name || null,
    matchType: s.matchTypeName,
    matchTypeName: s.matchTypeName,
    playerFormat: s.playerFormat,
    playerFormatLabel: s.playerFormatLabel,
    playersPerTeam: s.playersPerTeam,
    slotsRequiredToJoin: s.slotsRequiredToJoin,
    slots: s.slots,
    totalSlots: s.slots,
    totalPlayerCapacity: s.totalPlayerCapacity,
    slotsLabel,
    entryFeePerPlayer: c.feePerPlayer,
    entryFeeLabel: `₹${c.feePerPlayer} / Player`,
    mapName: tournament?.map || null,
    prizePool: showPrizePool ? prizePool : null,
    showPrizePool,
    prizePerKill: showPerKill ? perKill : null,
    showPrizePerKill: showPerKill,
    perKill: showPerKill ? perKill : 0,
    hasKillRewards: Boolean(s.hasKillRewards),
    feePerPlayer: c.feePerPlayer,
    playersCharged: c.playersCharged,
    totalAmount: c.totalAmount,
    entryCharge: {
      feePerPlayer: c.feePerPlayer,
      playersCharged: c.playersCharged,
      totalAmount: c.totalAmount,
      matchTypeName: c.matchTypeName,
      playerFormat: c.playerFormat,
    },
  };
}

function collectedFromBooked(tournamentOrFee, bookedSlots, playersPerTeam) {
  if (tournamentOrFee && typeof tournamentOrFee === 'object') {
    const { totalAmount } = resolveEntryCharge(tournamentOrFee);
    const ppt = Math.max(1, Number(getPlayersPerTeam(tournamentOrFee)) || 1);
    // bookedSlots may be team entries or raw slots; prefer entry units
    const entries = Math.max(0, Math.floor((Number(bookedSlots) || 0) / ppt) || Number(bookedSlots) || 0);
    return totalAmount * entries;
  }
  const feePerPlayer = Math.max(0, Number(tournamentOrFee) || 0);
  const ppt = Math.max(1, Number(playersPerTeam) || 1);
  return feePerPlayer * ppt * Math.max(0, Number(bookedSlots) || 0);
}

module.exports = {
  BR_MAX_PLAYERS,
  BR_GRID_SLOTS,
  isCustomMatch,
  isLoneWolfMatch,
  isBattleRoyale,
  getPlayersPerTeam,
  formatModeLabel,
  customFormatLabel,
  getMatchStructure,
  resolveEntryCharge,
  buildPublicMatchFields,
  collectedFromBooked,
};
