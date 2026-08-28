/** Normalize labels for fuzzy game-mode / match-type matching. */
function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const MODE_BUCKETS = [
  {
    id: 'lonewolf',
    match: (key) => /lonewolf/.test(key) || /^lw/.test(key) || key.includes('lonewolf'),
  },
  {
    id: 'clashsquad',
    match: (key) => /clashsquad/.test(key) || /^cs/.test(key) || key.includes('clash'),
  },
  {
    id: 'onetap',
    match: (key) => /onetap/.test(key) || key.includes('onetap'),
  },
  {
    id: 'battleroyale',
    match: (key) =>
      /battleroyale/.test(key) ||
      /^br/.test(key) ||
      key.includes('royale') ||
      key.includes('survival') ||
      key.includes('fullmap'),
  },
];

function bucketForLabel(label) {
  const key = normalizeKey(label);
  if (!key) return null;
  const hit = MODE_BUCKETS.find((b) => b.match(key));
  return hit ? hit.id : null;
}

function modeBucket(mode) {
  return bucketForLabel(mode?.name || '');
}

/**
 * Map a tournament to the home-screen game mode card it belongs on.
 * Match type wins over gameMode when they disagree (admin often picks LW mode for CS matches).
 */
function resolveTournamentGameModeId(tournament, modes) {
  const list = Array.isArray(modes) ? modes : [];
  if (!list.length) return null;

  const matchTypeName =
    (tournament?.matchType && typeof tournament.matchType === 'object' && tournament.matchType.name) ||
    tournament?.matchTypeName ||
    '';
  const matchBucket = bucketForLabel(matchTypeName);
  if (matchBucket) {
    const byType = list.find((m) => modeBucket(m) === matchBucket);
    if (byType) return String(byType._id || byType.id);
  }

  const gameModeRef = tournament?.gameMode;
  const gameModeId =
    gameModeRef && typeof gameModeRef === 'object' ? gameModeRef._id || gameModeRef.id : gameModeRef;
  if (gameModeId && list.some((m) => String(m._id || m.id) === String(gameModeId))) {
    return String(gameModeId);
  }

  const gameModeName =
    (gameModeRef && typeof gameModeRef === 'object' && gameModeRef.name) || tournament?.gameModeName || '';
  const gmBucket = bucketForLabel(gameModeName);
  if (gmBucket) {
    const byName = list.find((m) => modeBucket(m) === gmBucket);
    if (byName) return String(byName._id || byName.id);
  }

  return gameModeId ? String(gameModeId) : null;
}

function tournamentBelongsToGameMode(tournament, gameMode, modes) {
  const modeId = String(gameMode?._id || gameMode?.id || gameMode || '');
  if (!modeId) return true;

  const targetMode = (modes && modes[0]) || gameMode;
  const targetBucket = modeBucket(targetMode);
  const matchTypeName =
    (tournament?.matchType && typeof tournament.matchType === 'object' && tournament.matchType.name) ||
    tournament?.matchTypeName ||
    '';
  const matchBucket = bucketForLabel(matchTypeName);

  // Match type is authoritative when present — fixes admin picking the wrong game mode.
  if (matchBucket && targetBucket) {
    return matchBucket === targetBucket;
  }

  const resolved = resolveTournamentGameModeId(tournament, modes || [gameMode]);
  return resolved === modeId;
}

module.exports = {
  normalizeKey,
  bucketForLabel,
  resolveTournamentGameModeId,
  tournamentBelongsToGameMode,
};
