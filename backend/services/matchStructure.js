/**
 * Canonical split between the two live match products:
 *   team_vs_team  — Clash Squad 1v1 / 2v2 / 4v4 (Team A vs Team B)
 *   battle_royale — Full-map Solo / Duo / Squad (slot grid, optional kill rewards)
 *
 * Entry fee model:
 *   tournament.entryFee = amount PER PLAYER
 *   Solo join charges 1× entryFee
 *   Duo/Squad/Clash team join charges entryFee × playersPerTeam (captain pays the team total)
 */

function isCustomMatch(tournament) {
  const c = tournament?.category || tournament?.tournamentType;
  return c === 'custom' || c === 'custom_match' || !!tournament?.isCustomMatch;
}

function isBattleRoyale(tournament) {
  if (isCustomMatch(tournament)) return false;
  const c = tournament?.category || tournament?.tournamentType;
  if (c === 'battle_royale') return true;
  const modeName = tournament?.gameMode?.name || '';
  return String(modeName).toLowerCase().includes('battle royale');
}

function getPlayersPerTeam(mode) {
  const m = String(mode || 'solo').toLowerCase();
  if (m === 'squad' || m === 'team') return 4;
  if (m === 'duo') return 2;
  return 1;
}

function formatModeLabel(mode) {
  const m = String(mode || 'solo').toLowerCase();
  if (m === 'team') return 'Team';
  if (m === 'duo') return 'Duo';
  if (m === 'squad') return 'Squad';
  if (m === 'solo') return 'Solo';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function customFormatLabel(playersPerTeam) {
  if (playersPerTeam === 4) return '4v4';
  if (playersPerTeam === 2) return '2v2';
  return '1v1';
}

const BR_MAX_PLAYERS = 50;

function getMatchStructure(tournament) {
  const mode = String(tournament?.mode || 'solo').toLowerCase();
  const playersPerTeam = getPlayersPerTeam(mode);
  const custom = isCustomMatch(tournament);
  const playerFormatLabel = formatModeLabel(mode);

  if (custom) {
    return {
      kind: 'team_vs_team',
      matchType: 'Clash Squad',
      formatLabel: customFormatLabel(playersPerTeam),
      playerFormatLabel,
      mode,
      modeLabel: playerFormatLabel,
      playersPerTeam,
      totalSlots: 2,
      slotUnit: 'teams',
      entryUnit: 'player',
      hasKillRewards: false,
      usesTeamRegistration: true,
      usesSlotGrid: false,
      usesTeamSides: true,
    };
  }

  const totalSlots = mode === 'solo' ? BR_MAX_PLAYERS : Math.floor(BR_MAX_PLAYERS / playersPerTeam);
  return {
    kind: 'battle_royale',
    matchType: 'Battle Royale',
    formatLabel: 'Battle Royale',
    playerFormatLabel,
    mode,
    modeLabel: playerFormatLabel,
    playersPerTeam,
    totalSlots,
    slotUnit: 'slots',
    entryUnit: 'player',
    hasKillRewards: true,
    usesTeamRegistration: mode !== 'solo',
    usesSlotGrid: true,
    usesTeamSides: false,
  };
}

/**
 * Resolve what the joiner must pay.
 * entryFee on the tournament is always per-player.
 */
function resolveEntryCharge(tournament) {
  const feePerPlayer = Math.max(0, Number(tournament?.entryFee) || 0);
  const structure = getMatchStructure(tournament);
  const playersCharged = structure.usesTeamRegistration
    ? Math.max(1, Number(structure.playersPerTeam) || 1)
    : 1;
  const totalAmount = feePerPlayer * playersCharged;
  return {
    feePerPlayer,
    playersCharged,
    totalAmount,
    entryUnit: 'player',
    chargedPer: playersCharged > 1 ? 'team_total' : 'player',
    usesTeamRegistration: structure.usesTeamRegistration,
  };
}

/** Estimated collection from booked joining units (players for solo, teams for team modes). */
function collectedFromBooked(tournamentOrFee, bookedSlots, playersPerTeam) {
  if (tournamentOrFee && typeof tournamentOrFee === 'object') {
    const { totalAmount } = resolveEntryCharge(tournamentOrFee);
    return totalAmount * Math.max(0, Number(bookedSlots) || 0);
  }
  const feePerPlayer = Math.max(0, Number(tournamentOrFee) || 0);
  const ppt = Math.max(1, Number(playersPerTeam) || 1);
  return feePerPlayer * ppt * Math.max(0, Number(bookedSlots) || 0);
}

module.exports = {
  BR_MAX_PLAYERS,
  isCustomMatch,
  isBattleRoyale,
  getPlayersPerTeam,
  formatModeLabel,
  customFormatLabel,
  getMatchStructure,
  resolveEntryCharge,
  collectedFromBooked,
};
