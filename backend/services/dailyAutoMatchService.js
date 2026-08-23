const Tournament = require('../models/Tournament');
const DailyAutoMatch = require('../models/DailyAutoMatch');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const MatchType = require('../models/MatchType');
const PrizeDistribution = require('../models/PrizeDistribution');
const lifecycle = require('./tournamentLifecycle');
const {
  ensureDefaultMatchTypes,
  applyMatchTypeToTournamentFields,
  normalizePlayerFormat,
  playerFormatLabel,
  playersPerTeamFromFormat,
  findMatchTypeByName,
} = require('./matchTypeService');
const indiaTime = require('../utils/indiaTime');

const DEFAULT_MATCH_RULES = [
  'Minimum level 40+ required to join.',
  'Room ID and password shared 8–10 minutes before match.',
  'No hacks, emulators, or teaming — instant disqualification.',
  'Wrong gaming ID / UID = no refund.',
  'Review prize pool distribution before joining.',
];

function parseRulesInput(rules) {
  if (!rules) return [];
  const lines = Array.isArray(rules) ? rules : String(rules).split(/\r?\n/);
  return lines.flatMap((line) => String(line).split(/\r?\n/)).map((line) => line.trim()).filter(Boolean);
}

function displayIdFor(number) {
  return `AUTO${Number(number)}`;
}

function isDuplicateKeyError(error) {
  return error && (error.code === 11000 || error.code === 11001);
}

async function getNextMatchNumber() {
  const latest = await Tournament.findOne({ matchNumber: { $ne: null } })
    .sort({ matchNumber: -1 })
    .select('matchNumber')
    .lean();
  if (latest?.matchNumber) return latest.matchNumber + 1;
  const total = await Tournament.countDocuments();
  return 30000 + total + 1;
}

async function getNextAutoMatchNumber() {
  const latest = await DailyAutoMatch.findOne({ autoMatchNumber: { $ne: null } })
    .sort({ autoMatchNumber: -1 })
    .select('autoMatchNumber')
    .lean();
  return (latest?.autoMatchNumber || 0) + 1;
}

function buildPrizes(matchCategory, prizePool, prizes) {
  if (matchCategory === 'custom') {
    const winnerPrize = Number(prizes?.first) || Number(prizePool) || 0;
    return { first: winnerPrize, second: 0, third: 0 };
  }
  if (prizes && (prizes.first != null || prizes.second != null || prizes.third != null)) {
    return {
      first: Number(prizes.first) || 0,
      second: Number(prizes.second) || 0,
      third: Number(prizes.third) || 0,
    };
  }
  const pool = Number(prizePool) || 0;
  return {
    first: pool ? Math.floor(pool * 0.5) : 0,
    second: pool ? Math.floor(pool * 0.3) : 0,
    third: pool ? Math.floor(pool * 0.2) : 0,
  };
}

async function validateCatalog(gameId, gameModeId) {
  const [game, gameMode] = await Promise.all([
    Game.findById(gameId),
    GameMode.findById(gameModeId),
  ]);
  if (!game) {
    const error = new Error('Game not found');
    error.status = 400;
    throw error;
  }
  if (!gameMode) {
    const error = new Error('Game mode not found');
    error.status = 400;
    throw error;
  }
  return { game, gameMode };
}

async function resolveMatchTypeDoc(body = {}, fallbackCategory) {
  await ensureDefaultMatchTypes();
  const id = body.matchType || body.matchTypeId;
  if (id) {
    const doc = await MatchType.findById(id);
    if (!doc) {
      const error = new Error('Match Type not found');
      error.status = 400;
      throw error;
    }
    return doc;
  }
  const isCustom =
    fallbackCategory === 'custom' ||
    fallbackCategory === 'custom_match' ||
    body.category === 'custom' ||
    body.category === 'custom_match';
  const name = isCustom ? 'Clash Squad' : 'Battle Royale';
  const doc =
    (await MatchType.findOne({ name, active: true })) ||
    (await MatchType.findOne({ name }));
  if (!doc) {
    const error = new Error('No matching Match Type. Create one in Admin → Match Types.');
    error.status = 400;
    throw error;
  }
  return doc;
}

async function templateFieldsFromBody(body = {}) {
  const mt = await resolveMatchTypeDoc(body, body.category);
  const playerFormat = normalizePlayerFormat(body.playerFormat || body.mode || 'solo');
  const slotInput =
    body.joiningSlots != null
      ? Number(body.joiningSlots)
      : body.slots != null
        ? Number(body.slots)
        : undefined;
  const synced = applyMatchTypeToTournamentFields(mt, playerFormat, slotInput);
  const matchCategory = synced.category;

  const capacity = lifecycle.resolveTournamentCapacity({
    category: matchCategory,
    mode: synced.mode,
    playerFormat: synced.playerFormat,
    playersPerTeam: synced.playersPerTeam,
    slots: synced.slots,
    joiningSlots: synced.slots,
    matchType: mt,
  });
  if (!capacity.ok) {
    const error = new Error(capacity.error);
    error.status = 400;
    throw error;
  }

  const rules = parseRulesInput(body.rules);
  const prizePool = Number(body.prizePool) || 0;
  const prizes = buildPrizes(matchCategory, prizePool, body.prizes);

  return {
    name: String(body.name || '').trim(),
    description: body.description || '',
    bannerImage: body.bannerImage || '',
    bannerTitle: typeof body.bannerTitle === 'string' ? body.bannerTitle.trim() : '',
    game: body.game,
    gameMode: body.gameMode,
    matchType: mt._id,
    playerFormat: capacity.playerFormat,
    joiningSlots: capacity.joiningSlots,
    mode: capacity.mode,
    category: matchCategory,
    map: body.map || 'Bermuda',
    rules: rules.length ? rules : DEFAULT_MATCH_RULES,
    entryFee: Number(body.entryFee) || 0,
    prizePool,
    perKill: !mt.hasKillRewards || matchCategory === 'custom' ? 0 : Number(body.perKill) || 0,
    prizes,
    minimumBalance: Number(body.minimumBalance) || 0,
    roomId: body.roomId || '',
    roomPassword: body.roomPassword || '',
    showRoomCredentials: Boolean(body.showRoomCredentials),
    startTime: indiaTime.normalizeTime(body.startTime),
    repeat: 'daily',
    isActive: body.isActive !== false && body.isActive !== 'false',
    publishOnGenerate: body.publishOnGenerate !== false && body.publishOnGenerate !== 'false',
  };
}

function formatAutoMatch(doc, extras = {}) {
  if (!doc) return null;
  const item = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const startTime = indiaTime.normalizeTime(item.startTime);
  const playerFormat = normalizePlayerFormat(item.playerFormat || item.mode || 'solo');
  const playersPerTeam = playersPerTeamFromFormat(playerFormat);
  const matchTypeName =
    (item.matchType && typeof item.matchType === 'object' && item.matchType.name) ||
    extras.matchTypeName ||
    null;
  const isTeamVsTeam = Boolean(
    item.matchType && typeof item.matchType === 'object'
      ? item.matchType.isTeamVsTeam
      : item.category === 'custom' || item.category === 'custom_match'
  );
  const slots = isTeamVsTeam ? 2 : Number(item.joiningSlots) || 48;

  return {
    ...item,
    _id: item._id,
    displayId: item.displayId || displayIdFor(item.autoMatchNumber),
    startTime,
    startTimeLabel: indiaTime.formatTime12(startTime),
    category: item.category,
    playerFormat,
    playerFormatLabel: playerFormatLabel(playerFormat),
    playersPerTeam,
    matchTypeName,
    slots,
    joiningSlots: slots,
    slotsLabel: isTeamVsTeam ? `${slots} Team Slots` : `${slots} Slots`,
    entryFeeLabel: `₹${Number(item.entryFee) || 0} / Player`,
    isActive: item.isActive !== false && !item.deletedAt,
    repeat: item.repeat || 'daily',
    ...extras,
  };
}

async function attachListExtras(item) {
  const today = indiaTime.getDateString();
  const todayTournament = await Tournament.findOne({
    autoMatchId: item._id,
    generatedDate: today,
    isAutoGenerated: true,
  })
    .select('_id name startDate generatedDate')
    .lean();

  const generatedCount = await Tournament.countDocuments({
    autoMatchId: item._id,
    isAutoGenerated: true,
  });

  let nextMatchDate = null;
  let nextMatchLabel = 'Paused';
  if (item.isActive && !item.deletedAt) {
    nextMatchDate = todayTournament ? indiaTime.addDays(today, 1) : today;
    nextMatchLabel = `${indiaTime.formatDisplayDate(nextMatchDate)} · ${indiaTime.formatTime12(item.startTime)}`;
  }

  return formatAutoMatch(item, {
    todayTournamentExists: Boolean(todayTournament),
    todayTournamentId: todayTournament?._id || null,
    generatedCount,
    nextMatchDate,
    nextMatchLabel,
  });
}

async function createAutoMatch(body, createdBy) {
  if (!body?.name || !body?.game || !body?.gameMode) {
    const error = new Error('Name, game and game mode are required');
    error.status = 400;
    throw error;
  }
  await validateCatalog(body.game, body.gameMode);
  const fields = await templateFieldsFromBody(body);
  if (!fields.name) {
    const error = new Error('Tournament name is required');
    error.status = 400;
    throw error;
  }

  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const autoMatchNumber = await getNextAutoMatchNumber();
    try {
      const created = await DailyAutoMatch.create({
        ...fields,
        autoMatchNumber,
        displayId: displayIdFor(autoMatchNumber),
        createdBy,
      });
      return attachListExtras(created);
    } catch (error) {
      lastError = error;
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  throw lastError || new Error('Failed to create Daily Auto Match');
}

async function listAutoMatches({ includeDeleted = false } = {}) {
  const filter = includeDeleted ? {} : { deletedAt: null };
  const items = await DailyAutoMatch.find(filter)
    .populate('game', 'name image')
    .populate('gameMode', 'name image')
    .populate('matchType')
    .sort({ autoMatchNumber: 1 });
  return Promise.all(items.map((item) => attachListExtras(item)));
}

async function getAutoMatch(id) {
  const item = await DailyAutoMatch.findOne({ _id: id, deletedAt: null })
    .populate('game', 'name image')
    .populate('gameMode', 'name image')
    .populate('matchType');
  if (!item) {
    const error = new Error('Daily Auto Match not found');
    error.status = 404;
    throw error;
  }
  return attachListExtras(item);
}

async function updateAutoMatch(id, body) {
  const item = await DailyAutoMatch.findOne({ _id: id, deletedAt: null });
  if (!item) {
    const error = new Error('Daily Auto Match not found');
    error.status = 404;
    throw error;
  }

  const nextBody = {
    name: body.name !== undefined ? body.name : item.name,
    description: body.description !== undefined ? body.description : item.description,
    bannerImage: body.bannerImage !== undefined ? body.bannerImage : item.bannerImage,
    bannerTitle: body.bannerTitle !== undefined ? body.bannerTitle : item.bannerTitle,
    game: body.game !== undefined ? body.game : item.game,
    gameMode: body.gameMode !== undefined ? body.gameMode : item.gameMode,
    matchType: body.matchType !== undefined ? body.matchType : item.matchType,
    matchTypeId: body.matchTypeId,
    playerFormat:
      body.playerFormat !== undefined
        ? body.playerFormat
        : body.mode !== undefined
          ? body.mode
          : item.playerFormat || item.mode,
    mode: body.mode !== undefined ? body.mode : item.mode,
    slots: body.slots !== undefined ? body.slots : body.joiningSlots !== undefined ? body.joiningSlots : item.joiningSlots,
    joiningSlots:
      body.joiningSlots !== undefined
        ? body.joiningSlots
        : body.slots !== undefined
          ? body.slots
          : item.joiningSlots,
    category: body.category !== undefined ? body.category : item.category,
    map: body.map !== undefined ? body.map : item.map,
    rules: body.rules !== undefined ? body.rules : item.rules,
    entryFee: body.entryFee !== undefined ? body.entryFee : item.entryFee,
    prizePool: body.prizePool !== undefined ? body.prizePool : item.prizePool,
    perKill: body.perKill !== undefined ? body.perKill : item.perKill,
    prizes: body.prizes !== undefined ? body.prizes : item.prizes,
    minimumBalance: body.minimumBalance !== undefined ? body.minimumBalance : item.minimumBalance,
    roomId: body.roomId !== undefined ? body.roomId : item.roomId,
    roomPassword: body.roomPassword !== undefined ? body.roomPassword : item.roomPassword,
    showRoomCredentials:
      body.showRoomCredentials !== undefined ? body.showRoomCredentials : item.showRoomCredentials,
    startTime: body.startTime !== undefined ? body.startTime : item.startTime,
    isActive: body.isActive !== undefined ? body.isActive : item.isActive,
    publishOnGenerate:
      body.publishOnGenerate !== undefined ? body.publishOnGenerate : item.publishOnGenerate,
  };

  await validateCatalog(nextBody.game, nextBody.gameMode);
  const fields = await templateFieldsFromBody(nextBody);
  Object.assign(item, fields);
  await item.save();
  return getAutoMatch(item._id);
}

async function setActive(id, isActive) {
  const item = await DailyAutoMatch.findOne({ _id: id, deletedAt: null });
  if (!item) {
    const error = new Error('Daily Auto Match not found');
    error.status = 404;
    throw error;
  }
  item.isActive = Boolean(isActive);
  await item.save();
  return getAutoMatch(item._id);
}

async function softDeleteAutoMatch(id) {
  const item = await DailyAutoMatch.findOne({ _id: id, deletedAt: null });
  if (!item) {
    const error = new Error('Daily Auto Match not found');
    error.status = 404;
    throw error;
  }
  item.deletedAt = new Date();
  item.isActive = false;
  await item.save();
  return { deleted: true, id: item._id, displayId: item.displayId };
}

async function duplicateAutoMatch(id, createdBy) {
  const source = await DailyAutoMatch.findOne({ _id: id, deletedAt: null }).lean();
  if (!source) {
    const error = new Error('Daily Auto Match not found');
    error.status = 404;
    throw error;
  }
  return createAutoMatch(
    {
      ...source,
      name: `${source.name} (Copy)`,
      isActive: false,
    },
    createdBy
  );
}

async function ensurePrizeDistribution(tournament) {
  if (tournament.category !== 'custom' && tournament.category !== 'custom_match') return;
  const winnerPrize = Number(tournament.prizes?.first) || Number(tournament.prizePool) || 0;
  await PrizeDistribution.findOneAndUpdate(
    { tournamentId: tournament._id },
    {
      tournamentId: tournament._id,
      tournamentType: 'custom_match',
      rankTiers: [],
      winnerPrize,
      runnerUpPrize: 0,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

async function findGenerated(autoMatchId, dateStr) {
  return Tournament.findOne({
    autoMatchId,
    generatedDate: dateStr,
    isAutoGenerated: true,
  });
}

async function createGeneratedTournament(autoMatch, dateStr, createdBy) {
  const mt =
    autoMatch.matchType && typeof autoMatch.matchType === 'object' && autoMatch.matchType.name
      ? autoMatch.matchType
      : await resolveMatchTypeDoc(
          { matchType: autoMatch.matchType },
          autoMatch.category
        );
  const playerFormat = normalizePlayerFormat(
    autoMatch.playerFormat || autoMatch.mode || 'solo'
  );
  const synced = applyMatchTypeToTournamentFields(
    mt,
    playerFormat,
    autoMatch.joiningSlots || autoMatch.slots
  );
  const matchCategory = synced.category;
  const capacity = lifecycle.resolveTournamentCapacity({
    category: matchCategory,
    mode: synced.mode,
    playerFormat: synced.playerFormat,
    playersPerTeam: synced.playersPerTeam,
    slots: synced.slots,
    joiningSlots: synced.slots,
    matchType: mt,
  });
  if (!capacity.ok) {
    throw new Error(capacity.error);
  }

  const prizePool = Number(autoMatch.prizePool) || 0;
  const prizes = buildPrizes(matchCategory, prizePool, autoMatch.prizes);
  const startDate = indiaTime.buildStartDate(dateStr, autoMatch.startTime);
  const publish = autoMatch.publishOnGenerate !== false;
  const status = publish ? 'upcoming' : 'draft';

  const tournamentData = {
    name: autoMatch.name,
    description: autoMatch.description || '',
    bannerImage: autoMatch.bannerImage || '',
    bannerTitle: autoMatch.bannerTitle || '',
    game: autoMatch.game?._id || autoMatch.game,
    gameMode: autoMatch.gameMode?._id || autoMatch.gameMode,
    matchType: mt._id || autoMatch.matchType,
    playerFormat: capacity.playerFormat,
    joiningSlots: capacity.joiningSlots,
    mode: capacity.mode,
    category: matchCategory,
    map: autoMatch.map || 'Bermuda',
    rules: Array.isArray(autoMatch.rules) && autoMatch.rules.length ? autoMatch.rules : DEFAULT_MATCH_RULES,
    entryFee: Number(autoMatch.entryFee) || 0,
    prizePool,
    perKill: !mt.hasKillRewards || matchCategory === 'custom' ? 0 : Number(autoMatch.perKill) || 0,
    rewardType: matchCategory === 'custom' ? 'survival' : 'per_kill',
    maxParticipants: capacity.maxParticipants,
    maxTeams: capacity.maxTeams,
    currentParticipants: 0,
    startDate,
    endDate: null,
    minimumBalance: Number(autoMatch.minimumBalance) || 0,
    prizes,
    roomId: autoMatch.roomId || '',
    roomPassword: autoMatch.roomPassword || '',
    showRoomCredentials: Boolean(autoMatch.showRoomCredentials),
    lifecycleStatus: status,
    status,
    statusOverride: true,
    registeredPlayers: [],
    createdBy: createdBy || autoMatch.createdBy,
    isAutoGenerated: true,
    autoMatchId: autoMatch._id,
    generatedDate: dateStr,
  };

  let lastError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    tournamentData.matchNumber = (await getNextMatchNumber()) + attempt;
    try {
      const tournament = new Tournament(tournamentData);
      lifecycle.syncLegacyFields(tournament, status);
      tournament.statusOverride = true;
      await tournament.save();
      await ensurePrizeDistribution(tournament);
      return { tournament, created: true };
    } catch (error) {
      lastError = error;
      if (isDuplicateKeyError(error)) {
        const existing = await findGenerated(autoMatch._id, dateStr);
        if (existing) return { tournament: existing, created: false };
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Failed to generate tournament');
}

function looksLikeAutoMatchDoc(value) {
  return Boolean(value && typeof value === 'object' && value.game && value.startTime && (value.name || value.autoMatchNumber));
}

/**
 * Generate the actual tournament for a Daily Auto Match + calendar date.
 * Safe to call repeatedly: unique index + duplicate-key handling prevent doubles.
 */
async function generateForDate(autoMatchOrId, dateStr, { createdBy, allowInactive = false } = {}) {
  let autoMatch = looksLikeAutoMatchDoc(autoMatchOrId)
    ? autoMatchOrId
    : await DailyAutoMatch.findById(autoMatchOrId).populate('matchType');

  if (!autoMatch || autoMatch.deletedAt) {
    return { skipped: true, reason: 'not_found' };
  }
  if (!allowInactive && !autoMatch.isActive) {
    return { skipped: true, reason: 'inactive', autoMatchId: autoMatch._id };
  }

  // Ensure matchType is populated when passed as a plain doc
  if (autoMatch.matchType && !autoMatch.matchType.name) {
    autoMatch = await DailyAutoMatch.findById(autoMatch._id).populate('matchType');
  }

  await validateCatalog(autoMatch.game, autoMatch.gameMode);

  const existing = await findGenerated(autoMatch._id, dateStr);
  if (existing) {
    return {
      alreadyExists: true,
      created: false,
      tournament: existing,
      autoMatchId: autoMatch._id,
      generatedDate: dateStr,
    };
  }

  const { tournament, created } = await createGeneratedTournament(autoMatch, dateStr, createdBy);

  if (created) {
    autoMatch.lastGeneratedDate = dateStr;
    await autoMatch.save();
  }

  return {
    created,
    alreadyExists: !created,
    tournament,
    autoMatchId: autoMatch._id,
    generatedDate: dateStr,
  };
}

async function generateToday(autoMatchId, options = {}) {
  return generateForDate(autoMatchId, indiaTime.getDateString(), {
    ...options,
    allowInactive: options.allowInactive !== false,
  });
}

async function runDailyGeneration(now = new Date()) {
  const dateStr = indiaTime.getDateString(now);
  console.log('[DailyAutoMatch] Processing daily auto matches');
  const configs = await DailyAutoMatch.find({ isActive: true, deletedAt: null }).populate('matchType');
  const results = {
    date: dateStr,
    processed: configs.length,
    created: 0,
    alreadyExists: 0,
    skipped: 0,
    errors: 0,
  };

  for (const config of configs) {
    try {
      const result = await generateForDate(config, dateStr, { createdBy: config.createdBy });
      if (result.created) {
        results.created += 1;
        console.log(
          `[DailyAutoMatch] Generated tournament ${result.tournament?._id} from ${config.displayId} for ${dateStr}`
        );
      } else if (result.alreadyExists) {
        results.alreadyExists += 1;
        console.log(
          `[DailyAutoMatch] Tournament already exists for ${config.displayId} on ${dateStr}`
        );
      } else {
        results.skipped += 1;
      }
    } catch (error) {
      results.errors += 1;
      console.error(
        `[DailyAutoMatch] Failed to generate ${config.displayId || config._id} for ${dateStr}:`,
        error.message
      );
    }
  }

  return results;
}

async function listGeneratedTournaments(autoMatchId) {
  const autoMatch = await DailyAutoMatch.findById(autoMatchId)
    .populate('matchType')
    .select('name displayId autoMatchNumber deletedAt matchType playerFormat mode joiningSlots category entryFee prizePool perKill map startTime');
  if (!autoMatch) {
    const error = new Error('Daily Auto Match not found');
    error.status = 404;
    throw error;
  }

  const tournaments = await Tournament.find({
    autoMatchId: autoMatch._id,
    isAutoGenerated: true,
  })
    .populate('game', 'name')
    .populate('gameMode', 'name')
    .populate('matchType', 'name isTeamVsTeam hasKillRewards')
    .sort({ generatedDate: -1, startDate: -1 })
    .lean();

  return {
    autoMatch: formatAutoMatch(autoMatch),
    tournaments: tournaments.map((t) => {
      const playerFormat = normalizePlayerFormat(t.playerFormat || t.mode || 'solo');
      const ppt = playersPerTeamFromFormat(playerFormat);
      const mtName =
        (t.matchType && typeof t.matchType === 'object' && t.matchType.name) || null;
      const isTeamVsTeam = Boolean(
        t.matchType && typeof t.matchType === 'object'
          ? t.matchType.isTeamVsTeam
          : t.category === 'custom' || t.category === 'custom_match'
      );
      const slots = isTeamVsTeam ? 2 : Number(t.joiningSlots) || 48;
      return {
        _id: t._id,
        name: t.name,
        matchNumber: t.matchNumber,
        generatedDate: t.generatedDate,
        generatedDateLabel: indiaTime.formatDisplayDate(t.generatedDate),
        startDate: t.startDate,
        entryFee: t.entryFee,
        prizePool: t.prizePool,
        perKill: t.perKill,
        map: t.map,
        mode: t.mode,
        playerFormat,
        playerFormatLabel: playerFormatLabel(playerFormat),
        playersPerTeam: ppt,
        matchTypeName: mtName,
        slots,
        slotsLabel: isTeamVsTeam ? `${slots} Team Slots` : `${slots} Slots`,
        status: lifecycle.getEffectiveStatus(t),
        isAutoGenerated: true,
        autoMatchId: t.autoMatchId,
      };
    }),
  };
}

function pickRandom(list, fallback) {
  const arr = Array.isArray(list) && list.length ? list : [fallback];
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitterAmount(base, spread = 10) {
  const n = Number(base) || 0;
  const delta = Math.floor(Math.random() * (spread + 1));
  return Math.max(0, n + (Math.random() < 0.5 ? -delta : delta));
}

/**
 * Create 5 sample Daily Auto Match masters with varied Match Type / Player Format / prizes.
 * Skips templates that already exist by name. Optionally generates today's tournaments
 * for both newly created and existing sample masters.
 */
async function seedSampleDailyAutoMatches(createdBy, { generateToday: doGenerate = true } = {}) {
  const seededTypes = await ensureDefaultMatchTypes();

  const game = await Game.findOne({ active: { $ne: false } }).sort({ createdAt: 1 });
  if (!game) {
    const error = new Error('No game found. Create a game under Games & Modes first.');
    error.status = 400;
    throw error;
  }
  const gameMode =
    (await GameMode.findOne({ game: game._id, active: { $ne: false } }).sort({ createdAt: 1 })) ||
    (await GameMode.findOne({ game: game._id }).sort({ createdAt: 1 }));
  if (!gameMode) {
    const error = new Error('No game mode found for the first game. Add a mode under Games & Modes.');
    error.status = 400;
    throw error;
  }

  let mapNames = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'Nexterra'];
  try {
    const Map = require('../models/Map');
    const dbMaps = await Map.find({ active: { $ne: false } }).select('name').lean();
    const names = (dbMaps || []).map((m) => m.name).filter(Boolean);
    if (names.length) mapNames = names;
  } catch (_) {
    /* optional catalog */
  }

  const fromSeed = (name) => (seededTypes || []).find((t) => t.name === name);
  const battleRoyale = fromSeed('Battle Royale') || (await findMatchTypeByName('Battle Royale'));
  const clashSquad = fromSeed('Clash Squad') || (await findMatchTypeByName('Clash Squad'));
  const loneWolf = fromSeed('Lone Wolf') || (await findMatchTypeByName('Lone Wolf'));
  if (!battleRoyale || !clashSquad) {
    const error = new Error('Could not create default Match Types (Battle Royale / Clash Squad). Check the Match Types page.');
    error.status = 400;
    throw error;
  }

  const samples = [
    {
      name: 'Daily BR Solo Rush',
      bannerTitle: 'DAILY BATTLE ROYALE SOLO',
      description:
        'Classic Solo Battle Royale. Pick 1 slot on the 48-seat grid. Room ID shared ~10 minutes before start.',
      matchType: battleRoyale._id,
      matchTypeLabel: 'Battle Royale',
      playerFormat: 'solo',
      map: pickRandom(mapNames, 'Bermuda'),
      startTime: '10:00',
      entryFee: jitterAmount(50, 15),
      prizePool: jitterAmount(10000, 1500),
      perKill: jitterAmount(50, 10),
      rules: [
        ...DEFAULT_MATCH_RULES,
        'Solo only — select exactly 1 slot when joining.',
      ],
    },
    {
      name: 'Daily BR Duo Challenge',
      bannerTitle: 'DAILY BATTLE ROYALE DUO',
      description:
        'Duo Battle Royale. Captain selects 2 slots and pays entry for both players (₹ × 2).',
      matchType: battleRoyale._id,
      matchTypeLabel: 'Battle Royale',
      playerFormat: 'duo',
      map: pickRandom(mapNames, 'Purgatory'),
      startTime: '14:00',
      entryFee: jitterAmount(40, 10),
      prizePool: jitterAmount(8000, 1200),
      perKill: jitterAmount(40, 8),
      rules: [
        ...DEFAULT_MATCH_RULES,
        'Duo — select exactly 2 slots when joining.',
      ],
    },
    {
      name: 'Daily BR Squad War',
      bannerTitle: 'DAILY BATTLE ROYALE SQUAD',
      description:
        'Full Squad Battle Royale. Select 4 slots on join. Prize pool + kill rewards.',
      matchType: battleRoyale._id,
      matchTypeLabel: 'Battle Royale',
      playerFormat: 'squad',
      map: pickRandom(mapNames, 'Kalahari'),
      startTime: '18:00',
      entryFee: jitterAmount(30, 10),
      prizePool: jitterAmount(12000, 2000),
      perKill: jitterAmount(30, 8),
      rules: [
        ...DEFAULT_MATCH_RULES,
        'Squad — select exactly 4 slots when joining.',
      ],
    },
    {
      name: 'Daily Clash Squad 4v4',
      bannerTitle: 'DAILY CLASH SQUAD',
      description:
        'Team A vs Team B Clash Squad. Captain registers the full roster and pays team total.',
      matchType: clashSquad._id,
      matchTypeLabel: 'Clash Squad',
      playerFormat: 'squad',
      map: pickRandom(mapNames, 'Bermuda'),
      startTime: '20:00',
      entryFee: jitterAmount(50, 10),
      prizePool: jitterAmount(5000, 800),
      perKill: 0,
      rules: [
        ...DEFAULT_MATCH_RULES,
        'Clash Squad — Team A vs Team B registration.',
      ],
    },
    {
      name: 'Daily Lone Wolf Night',
      bannerTitle: 'DAILY LONE WOLF',
      description:
        'Late-night Lone Wolf Solo. Lower entry, steady kill rewards. 48-slot grid.',
      matchType: (loneWolf || battleRoyale)._id,
      matchTypeLabel: loneWolf ? 'Lone Wolf' : 'Battle Royale',
      playerFormat: 'solo',
      map: pickRandom(mapNames, 'Alpine'),
      startTime: '22:00',
      entryFee: jitterAmount(20, 8),
      prizePool: jitterAmount(3000, 500),
      perKill: jitterAmount(25, 5),
      rules: [
        ...DEFAULT_MATCH_RULES,
        'Lone Wolf Solo — select exactly 1 slot.',
      ],
    },
  ];

  const created = [];
  const skipped = [];
  const generated = [];
  const details = [];

  async function ensureToday(autoMatchId, displayId) {
    if (!doGenerate) return;
    try {
      const result = await generateToday(autoMatchId, {
        createdBy,
        allowInactive: true,
      });
      if (result.tournament) {
        generated.push({
          autoMatchId,
          displayId,
          tournamentId: result.tournament._id,
          tournamentName: result.tournament.name,
          created: Boolean(result.created),
          alreadyExists: Boolean(result.alreadyExists),
        });
      }
    } catch (err) {
      generated.push({
        autoMatchId,
        displayId,
        error: err.message,
      });
    }
  }

  for (const sample of samples) {
    const { matchTypeLabel, ...payload } = sample;
    const exists = await DailyAutoMatch.findOne({
      name: sample.name,
      deletedAt: null,
    }).lean();
    if (exists) {
      skipped.push({ name: sample.name, id: exists._id, displayId: exists.displayId });
      details.push({
        name: sample.name,
        displayId: exists.displayId,
        status: 'existing',
        matchType: matchTypeLabel,
        playerFormat: playerFormatLabel(sample.playerFormat),
        map: exists.map || sample.map,
        startTime: exists.startTime || sample.startTime,
        entryFee: exists.entryFee,
        prizePool: exists.prizePool,
      });
      await ensureToday(exists._id, exists.displayId);
      continue;
    }
    const item = await createAutoMatch(
      {
        ...payload,
        game: game._id,
        gameMode: gameMode._id,
        isActive: true,
        publishOnGenerate: true,
        slots: 48,
      },
      createdBy
    );
    created.push(item);
    details.push({
      name: item.name,
      displayId: item.displayId,
      status: 'created',
      matchType: item.matchTypeName || matchTypeLabel,
      playerFormat: item.playerFormatLabel,
      map: item.map,
      startTime: item.startTimeLabel || item.startTime,
      entryFee: item.entryFee,
      prizePool: item.prizePool,
      perKill: item.perKill,
      slotsLabel: item.slotsLabel,
    });
    await ensureToday(item._id, item.displayId);
  }

  const genOk = generated.filter((g) => g.tournamentId && !g.error).length;
  const genNew = generated.filter((g) => g.created).length;

  let message;
  if (created.length > 0) {
    message = `Created ${created.length} sample master${created.length === 1 ? '' : 's'}`;
    if (doGenerate) message += ` · ${genNew} new tournament${genNew === 1 ? '' : 's'} for today (${genOk} ready)`;
    message += '. Open All Tournaments to join/test.';
  } else if (doGenerate && genOk > 0) {
    message = `All 5 sample masters already exist · ${genOk} today’s tournament${genOk === 1 ? '' : 's'} ready in All Tournaments.`;
  } else {
    message = 'All 5 sample Daily Auto Matches already exist. Use Generate today on each row if needed.';
  }

  return {
    game: { _id: game._id, name: game.name },
    gameMode: { _id: gameMode._id, name: gameMode.name },
    created,
    skipped,
    generated,
    details,
    message,
  };
}

module.exports = {
  DEFAULT_MATCH_RULES,
  parseRulesInput,
  displayIdFor,
  formatAutoMatch,
  createAutoMatch,
  listAutoMatches,
  getAutoMatch,
  updateAutoMatch,
  setActive,
  softDeleteAutoMatch,
  duplicateAutoMatch,
  generateForDate,
  generateToday,
  runDailyGeneration,
  listGeneratedTournaments,
  seedSampleDailyAutoMatches,
};
