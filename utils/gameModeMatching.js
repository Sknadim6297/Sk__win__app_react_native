/** Client-side mirror of backend/utils/gameModeMatching.js */

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Map labels to home-screen mode buckets.
 * Order matters: One Tap must win over generic "CS" / Clash Squad.
 */
const MODE_BUCKETS = [
  {
    id: 'onetap',
    match: (key) => /onetap/.test(key) || key.includes('onetap'),
  },
  {
    id: 'lonewolf',
    match: (key) => /lonewolf/.test(key) || /^lw/.test(key) || key.includes('lonewolf'),
  },
  {
    id: 'clashsquad',
    match: (key) =>
      /clashsquad/.test(key) ||
      (key.includes('clash') && !/onetap/.test(key)) ||
      (/^cs/.test(key) && !/onetap/.test(key)),
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

function readMatchTypeName(tournament) {
  return (
    (tournament?.matchType && typeof tournament.matchType === 'object' && tournament.matchType.name) ||
    tournament?.matchTypeName ||
    (typeof tournament?.matchType === 'string' &&
    tournament.matchType &&
    !/^[a-f0-9]{24}$/i.test(tournament.matchType)
      ? tournament.matchType
      : '') ||
    ''
  );
}

function readGameModeName(tournament) {
  const gameModeRef = tournament?.gameMode;
  return (
    (gameModeRef && typeof gameModeRef === 'object' && gameModeRef.name) ||
    tournament?.gameModeName ||
    ''
  );
}

export function resolveTournamentGameModeId(tournament, modes) {
  const list = Array.isArray(modes) ? modes : [];
  if (!list.length) return null;

  const matchTypeName = readMatchTypeName(tournament);
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

  const gameModeName = readGameModeName(tournament);
  const gmBucket = bucketForLabel(gameModeName);
  if (gmBucket) {
    const byName = list.find((m) => modeBucket(m) === gmBucket);
    if (byName) return String(byName._id || byName.id);
  }

  return gameModeId ? String(gameModeId) : null;
}

export function tournamentBelongsToGameMode(tournament, gameMode, modes) {
  const modeId = String(gameMode?._id || gameMode?.id || gameMode || '');
  if (!modeId) return true;

  const modeList =
    modes && modes.length
      ? modes
      : [{ _id: modeId, id: modeId, name: gameMode?.name || '' }];
  const targetMode = modeList.find((m) => String(m._id || m.id) === modeId) || gameMode;
  const targetBucket = modeBucket(targetMode);

  const matchTypeName = readMatchTypeName(tournament);
  const gameModeName = readGameModeName(tournament);
  const matchBucket = bucketForLabel(matchTypeName);
  const gameModeBucket = bucketForLabel(gameModeName);

  // Match type is authoritative when it maps to a bucket.
  if (matchBucket && targetBucket) {
    return matchBucket === targetBucket;
  }

  if (gameModeBucket && targetBucket) {
    return gameModeBucket === targetBucket;
  }

  const resolved = resolveTournamentGameModeId(tournament, modeList);
  return resolved === modeId;
}

export { bucketForLabel, normalizeKey };
