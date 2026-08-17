const Tournament = require('../models/Tournament');
const DailyAutoMatch = require('../models/DailyAutoMatch');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const PrizeDistribution = require('../models/PrizeDistribution');
const lifecycle = require('./tournamentLifecycle');
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

function normalizeCategory(category) {
  return category === 'custom' || category === 'custom_match' ? 'custom' : 'battle_royale';
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

function templateFieldsFromBody(body = {}) {
  const matchCategory = normalizeCategory(body.category);
  const capacity = lifecycle.resolveTournamentCapacity({
    category: matchCategory,
    mode: body.mode || 'solo',
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
    mode: capacity.mode,
    category: matchCategory,
    map: body.map || 'Bermuda',
    rules: rules.length ? rules : DEFAULT_MATCH_RULES,
    entryFee: Number(body.entryFee) || 0,
    prizePool,
    perKill: matchCategory === 'custom' ? 0 : Number(body.perKill) || 0,
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
  return {
    ...item,
    _id: item._id,
    displayId: item.displayId || displayIdFor(item.autoMatchNumber),
    startTime,
    startTimeLabel: indiaTime.formatTime12(startTime),
    category: item.category,
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
  const fields = templateFieldsFromBody(body);
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
    .sort({ autoMatchNumber: 1 });
  return Promise.all(items.map((item) => attachListExtras(item)));
}

async function getAutoMatch(id) {
  const item = await DailyAutoMatch.findOne({ _id: id, deletedAt: null })
    .populate('game', 'name image')
    .populate('gameMode', 'name image');
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
    mode: body.mode !== undefined ? body.mode : item.mode,
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
  const fields = templateFieldsFromBody(nextBody);
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
  const matchCategory = normalizeCategory(autoMatch.category);
  const capacity = lifecycle.resolveTournamentCapacity({
    category: matchCategory,
    mode: autoMatch.mode || 'solo',
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
    mode: capacity.mode,
    category: matchCategory,
    map: autoMatch.map || 'Bermuda',
    rules: Array.isArray(autoMatch.rules) && autoMatch.rules.length ? autoMatch.rules : DEFAULT_MATCH_RULES,
    entryFee: Number(autoMatch.entryFee) || 0,
    prizePool,
    perKill: matchCategory === 'custom' ? 0 : Number(autoMatch.perKill) || 0,
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
  const autoMatch = looksLikeAutoMatchDoc(autoMatchOrId)
    ? autoMatchOrId
    : await DailyAutoMatch.findById(autoMatchOrId);

  if (!autoMatch || autoMatch.deletedAt) {
    return { skipped: true, reason: 'not_found' };
  }
  if (!allowInactive && !autoMatch.isActive) {
    return { skipped: true, reason: 'inactive', autoMatchId: autoMatch._id };
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
  const configs = await DailyAutoMatch.find({ isActive: true, deletedAt: null });
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
  const autoMatch = await DailyAutoMatch.findById(autoMatchId).select(
    'name displayId autoMatchNumber deletedAt'
  );
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
    .sort({ generatedDate: -1, startDate: -1 })
    .lean();

  return {
    autoMatch: formatAutoMatch(autoMatch),
    tournaments: tournaments.map((t) => ({
      _id: t._id,
      name: t.name,
      matchNumber: t.matchNumber,
      generatedDate: t.generatedDate,
      generatedDateLabel: indiaTime.formatDisplayDate(t.generatedDate),
      startDate: t.startDate,
      entryFee: t.entryFee,
      prizePool: t.prizePool,
      status: lifecycle.getEffectiveStatus(t),
      isAutoGenerated: true,
      autoMatchId: t.autoMatchId,
    })),
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
};
