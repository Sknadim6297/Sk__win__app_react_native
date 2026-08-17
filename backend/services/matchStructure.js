/**
 * Canonical split between the two live match products:
 *   team_vs_team  — Clash Squad 1v1 / 2v2 / 4v4 (Team A vs Team B)
 *   battle_royale — Full-map Solo / Duo / Squad (slot grid, optional kill rewards)
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
  if (m === 'squad') return 4;
  if (m === 'duo') return 2;
  return 1;
}

function formatModeLabel(mode) {
  const m = String(mode || 'solo').toLowerCase();
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

  if (custom) {
    return {
      kind: 'team_vs_team',
      matchType: 'Clash Squad',
      formatLabel: customFormatLabel(playersPerTeam),
      mode,
      modeLabel: formatModeLabel(mode),
      playersPerTeam,
      totalSlots: 2,
      slotUnit: 'teams',
      entryUnit: 'team',
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
    mode,
    modeLabel: formatModeLabel(mode),
    playersPerTeam,
    totalSlots,
    slotUnit: 'slots',
    entryUnit: mode === 'solo' ? 'player' : 'team',
    hasKillRewards: true,
    usesTeamRegistration: mode !== 'solo',
    usesSlotGrid: true,
    usesTeamSides: false,
  };
}

function collectedFromBooked(entryFee, bookedSlots) {
  return Math.max(0, Number(entryFee) || 0) * Math.max(0, Number(bookedSlots) || 0);
}

module.exports = {
  BR_MAX_PLAYERS,
  isCustomMatch,
  isBattleRoyale,
  getPlayersPerTeam,
  formatModeLabel,
  customFormatLabel,
  getMatchStructure,
  collectedFromBooked,
};
