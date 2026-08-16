/**
 * Seeds 10 dummy tournaments for admin lifecycle + result entry testing:
 * - 5 Custom (team vs team) — CustomMatchResult + PrizeDistribution
 * - 5 Battle Royale (solo slots) — BattleRoyaleResult + rank tiers
 *
 * Run from backend/: npm run seed:tournaments
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Game = require('./models/Game');
const GameMode = require('./models/GameMode');
const Tournament = require('./models/Tournament');
const TournamentParticipant = require('./models/TournamentParticipant');
const Team = require('./models/Team');
const TeamMember = require('./models/TeamMember');
const PrizeDistribution = require('./models/PrizeDistribution');
const BattleRoyaleResult = require('./models/BattleRoyaleResult');
const CustomMatchResult = require('./models/CustomMatchResult');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sk-win';
const SEED_TAG = 'dummy-tournament-v2';

const BANNER_IMAGES = [
  'img_1775898188319.jpg',
  'img_1779015715280.jpg',
  'img_1779100796118.png',
  'img_1778934537217.png',
  'img_1779116982623.png',
];

const SEED_TITLES = [
  'Lone Wolf Clash',
  '1v1 Arena',
  'Sniper Challenge',
  'Desert Duel',
  'Fast Combat Room',
  'Bermuda Battle',
  'Purgatory Survival',
  'Kalahari Rush',
  'Alpine Warzone',
  'Nextterra Championship',
];

const DEFAULT_RULES = [
  'Minimum level 40+ required to join.',
  'Room ID and password shared 8–10 minutes before match.',
  'No hacks, emulators, or teaming — instant disqualification.',
  'Wrong gaming ID / UID = no refund.',
  'Review prize pool distribution before joining.',
];

function minutesFromNow(m) {
  return new Date(Date.now() + m * 60 * 1000);
}

function hoursFromNow(h) {
  return minutesFromNow(h * 60);
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function splitPrizes(prizePool) {
  return {
    first: Math.floor(prizePool * 0.5),
    second: Math.floor(prizePool * 0.3),
    third: Math.floor(prizePool * 0.2),
  };
}

function brRankTiers(prizePool) {
  const p = splitPrizes(prizePool);
  return [
    { rankFrom: 1, rankTo: 1, prize: p.first },
    { rankFrom: 2, rankTo: 2, prize: p.second },
    { rankFrom: 3, rankTo: 3, prize: p.third },
  ];
}

function customPrizeSplit(prizePool) {
  return {
    winnerPrize: Number(prizePool) || 0,
    runnerUpPrize: 0,
  };
}

async function ensureAdmin() {
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    const password = await bcrypt.hash('admin123', 10);
    admin = await User.create({
      username: 'admin',
      email: 'admin@skwin.com',
      password,
      role: 'admin',
      verified: true,
      wallet: { balance: 50000, bonusBalance: 5000 },
    });
    console.log('Created admin (admin@skwin.com / admin123)');
  }
  return admin;
}

async function ensureTestPlayers(count = 50) {
  const players = [];
  const password = await bcrypt.hash('test1234', 10);
  for (let i = 1; i <= count; i++) {
    const username = `seed_player_${i}`;
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({
        username,
        email: `seed_player_${i}@test.skwin.local`,
        password,
        role: 'user',
        verified: true,
        gameUsername: `Gamer${i}`,
        wallet: { balance: 5000, bonusBalance: 200 },
      });
    }
    players.push(user);
  }
  return players;
}

async function ensureGameAndModes() {
  let game = await Game.findOne({ name: /free fire/i });
  if (!game) {
    game = await Game.create({
      name: 'Free Fire MAX',
      image: BANNER_IMAGES[0],
      rating: 4.8,
      players: '3M+',
      description: 'Battle royale mobile esports',
      isPopular: true,
      status: 'active',
    });
    console.log('Created game: Free Fire MAX');
  }

  let loneWolfMode = await GameMode.findOne({ game: game._id, name: 'Lone Wolf' });
  if (!loneWolfMode) {
    loneWolfMode = await GameMode.create({
      game: game._id,
      name: 'Lone Wolf',
      description: 'Custom matches — squad vs squad',
      image: BANNER_IMAGES[1],
      status: 'active',
    });
  }

  let fullMapMode = await GameMode.findOne({
    game: game._id,
    name: { $regex: /full\s*map/i },
  }).sort({ createdAt: 1 });
  if (!fullMapMode) {
    fullMapMode = await GameMode.create({
      game: game._id,
      name: 'BR FULL MAP',
      description: 'Classic BR — prize pool + per kill',
      image: BANNER_IMAGES[2],
      status: 'active',
    });
  }

  const duplicateFullMap = await GameMode.find({
    game: game._id,
    name: { $regex: /full\s*map/i },
    _id: { $ne: fullMapMode._id },
  });
  for (const extra of duplicateFullMap) {
    await Tournament.updateMany({ gameMode: extra._id }, { $set: { gameMode: fullMapMode._id, game: game._id } });
    await extra.deleteOne();
    console.log(`Merged duplicate mode "${extra.name}" into "${fullMapMode.name}"`);
  }

  return { game, loneWolfMode, fullMapMode };
}

async function clearPreviousSeed() {
  const old = await Tournament.find({ name: { $in: SEED_TITLES } }).select('_id');
  const ids = old.map((t) => t._id);
  if (!ids.length) return;

  await TournamentParticipant.deleteMany({ tournamentId: { $in: ids } });
  await TeamMember.deleteMany({ tournamentId: { $in: ids } });
  await Team.deleteMany({ tournamentId: { $in: ids } });
  await BattleRoyaleResult.deleteMany({ tournamentId: { $in: ids } });
  await CustomMatchResult.deleteMany({ tournamentId: { $in: ids } });
  await PrizeDistribution.deleteMany({ tournamentId: { $in: ids } });
  await Tournament.deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${ids.length} previous seed tournaments (+ related results/teams)`);
}

function buildSlots(maxSlots, bookings) {
  const slots = [];
  for (let i = 1; i <= maxSlots; i++) {
    const b = bookings.find((x) => x.slotNumber === i);
    slots.push({
      slotNumber: i,
      userId: b?.userId || null,
      gamingUsername: b?.gamingID || null,
      gamingUID: b?.gamingUID || null,
      bookedAt: b ? b.bookedAt || new Date() : null,
      isBooked: !!b,
    });
  }
  return slots;
}

function makeBookings(players, count, startSlot = 1) {
  const capped = Math.min(count, players.length);
  if (count > players.length) {
    console.warn(`  ⚠ Requested ${count} bookings but only ${players.length} players — capping.`);
  }
  return Array.from({ length: capped }, (_, i) => {
    const p = players[i];
    const n = startSlot + i;
    return {
      slotNumber: n,
      userId: p._id,
      gamingID: `FF_${p.username}`,
      gamingUID: `${1000000000 + n}`,
      bookedAt: hoursAgo(2),
    };
  });
}

async function attachBrParticipants(tournament, bookings) {
  for (const b of bookings) {
    await TournamentParticipant.create({
      tournamentId: tournament._id,
      userId: b.userId,
      slotNumber: b.slotNumber,
      gamingUsername: b.gamingID,
      gamingUID: b.gamingUID,
      status: 'joined',
      joinedAt: b.bookedAt,
    });
  }
}

async function attachCustomTeams(tournament, players, teamSize = 4) {
  const sliceA = players.slice(0, teamSize);
  const sliceB = players.slice(teamSize, teamSize * 2);
  if (sliceA.length < teamSize || sliceB.length < teamSize) {
    throw new Error(`Need ${teamSize * 2} players for custom teams, got ${players.length}`);
  }

  const teamA = await Team.create({
    tournamentId: tournament._id,
    name: 'Alpha Squad',
    captainUserId: sliceA[0]._id,
    status: 'registered',
  });
  const teamB = await Team.create({
    tournamentId: tournament._id,
    name: 'Bravo Squad',
    captainUserId: sliceB[0]._id,
    status: 'registered',
  });

  const attachMembers = async (team, members) => {
    for (let i = 0; i < members.length; i++) {
      const p = members[i];
      await TeamMember.create({
        tournamentId: tournament._id,
        teamId: team._id,
        userId: p._id,
        gamingUsername: `FF_${p.username}`,
        gamingUID: `${1000000000 + i + (team === teamA ? 1 : 10)}`,
        role: i === 0 ? 'captain' : 'member',
      });
    }
  };

  await attachMembers(teamA, sliceA);
  await attachMembers(teamB, sliceB);

  tournament.currentParticipants = 2;
  tournament.registeredPlayers = [...sliceA, ...sliceB].map((p) => p._id);
  await tournament.save();

  return { teamA, teamB, mvpUser: sliceA[1] };
}

async function seedPrizeDistribution(tournament, type) {
  if (type === 'battle_royale') {
    return PrizeDistribution.create({
      tournamentId: tournament._id,
      tournamentType: 'battle_royale',
      rankTiers: brRankTiers(tournament.prizePool),
      winnerPrize: 0,
      runnerUpPrize: 0,
    });
  }
  const { winnerPrize, runnerUpPrize } = customPrizeSplit(tournament.prizePool);
  return PrizeDistribution.create({
    tournamentId: tournament._id,
    tournamentType: 'custom_match',
    rankTiers: [],
    winnerPrize,
    runnerUpPrize,
  });
}

async function seedBattleRoyaleResults(tournament, bookings, prizeDistribution) {
  const ordered = [...bookings].sort((a, b) => a.slotNumber - b.slotNumber);
  const killTable = [12, 8, 5, 4, 3, 2, 1, 0, 0, 0];
  const perKill = tournament.perKill || 0;
  const entries = [];

  for (let i = 0; i < ordered.length; i++) {
    const rank = i + 1;
    const b = ordered[i];
    const kills = killTable[i] || 0;
    const placementPrize = prizeDistribution.rankTiers.reduce((sum, tier) => {
      if (rank >= tier.rankFrom && rank <= tier.rankTo) return tier.prize;
      return sum;
    }, 0);
    const prize = placementPrize + kills * perKill;

    entries.push({
      tournamentId: tournament._id,
      userId: b.userId,
      position: rank,
      kills,
      prize,
      gamingUsername: b.gamingID,
      gamingUID: b.gamingUID,
    });

    await TournamentParticipant.updateOne(
      { tournamentId: tournament._id, userId: b.userId },
      {
        rank,
        prizeAmount: prize,
        status: rank === 1 ? 'winner' : 'joined',
      }
    );
  }

  await BattleRoyaleResult.insertMany(entries);
}

async function seedCustomMatchResult(tournament, teams, mvpUser, prizeDistribution) {
  await CustomMatchResult.create({
    tournamentId: tournament._id,
    winnerTeamId: teams.teamA._id,
    runnerUpTeamId: teams.teamB._id,
    mvpUserId: mvpUser._id,
    winnerPrize: prizeDistribution.winnerPrize,
    runnerUpPrize: prizeDistribution.runnerUpPrize,
  });
}

async function createTournament(def, ctx) {
  const { game, admin, matchNumber } = ctx;
  const lifecycleStatus = def.lifecycleStatus;
  const maxSlots = def.maxParticipants || 48;
  const prizePool = def.prizePool;
  const prizes = splitPrizes(prizePool);
  const locked = ['ongoing', 'completed', 'result_published'].includes(lifecycleStatus);

  const tournament = await Tournament.create({
    name: def.name,
    description: `${def.description} [${SEED_TAG}]`,
    bannerImage: def.bannerImage || BANNER_IMAGES[matchNumber % BANNER_IMAGES.length],
    bannerTitle: def.bannerTitle || def.name.toUpperCase(),
    matchNumber: 50000 + matchNumber,
    game: game._id,
    gameMode: def.gameModeId,
    mode: def.mode || 'solo',
    category: def.category,
    lifecycleStatus,
    status: lifecycleStatus,
    rewardType: def.category === 'custom' ? 'survival' : 'per_kill',
    map: def.map,
    rules: def.rules || DEFAULT_RULES,
    entryFee: def.entryFee,
    prizePool,
    perKill: def.category === 'custom' ? 0 : def.perKill,
    maxParticipants: maxSlots,
    maxTeams: def.maxTeams || 2,
    currentParticipants: 0,
    registeredPlayers: [],
    locked,
    startDate: def.startDate,
    endDate: def.endDate,
    resultsPublished: lifecycleStatus === 'result_published',
    prizes,
    slots: def.category === 'battle_royale' ? buildSlots(maxSlots, def.bookings || []) : [],
    createdBy: admin._id,
    minimumBalance: def.entryFee,
    roomId: def.roomId || (locked ? 'SEEDROOM99' : ''),
    roomPassword: def.roomPassword || (locked ? 'seed99' : ''),
    showRoomCredentials: def.showRoomCredentials ?? locked,
  });

  let prizeDistribution = null;

  if (def.category === 'custom' && def.teamPlayers?.length) {
    const teams = await attachCustomTeams(tournament, def.teamPlayers, def.teamSize || 4);
    prizeDistribution = await seedPrizeDistribution(tournament, 'custom_match');
    if (def.seedResults) {
      await seedCustomMatchResult(tournament, teams, teams.mvpUser, prizeDistribution);
    }
    return { tournament, prizeDistribution, teams };
  }

  if (def.bookings?.length) {
    await attachBrParticipants(tournament, def.bookings);
    tournament.currentParticipants = def.bookings.length;
    tournament.registeredPlayers = def.bookings.map((b) => b.userId);
    await tournament.save();
  }

  if (def.category === 'battle_royale') {
    prizeDistribution = await seedPrizeDistribution(tournament, 'battle_royale');
    if (def.seedResults && def.bookings?.length) {
      await seedBattleRoyaleResults(tournament, def.bookings, prizeDistribution);
    }
  }

  return { tournament, prizeDistribution };
}

async function seedTournaments() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected:', mongoose.connection.name);

  await clearPreviousSeed();
  const admin = await ensureAdmin();
  const players = await ensureTestPlayers(50);
  const { game, loneWolfMode, fullMapMode } = await ensureGameAndModes();

  const ctx = { game, admin, players, matchNumber: 0 };
  const nextNum = () => {
    ctx.matchNumber += 1;
    return ctx.matchNumber;
  };

  const customDefs = [
    {
      name: 'Lone Wolf Clash',
      category: 'custom',
      mode: 'squad',
      gameModeId: loneWolfMode._id,
      map: 'Training Ground',
      entryFee: 5,
      prizePool: 200,
      lifecycleStatus: 'upcoming',
      startDate: minutesFromNow(30),
      endDate: hoursFromNow(3),
      teamPlayers: players.slice(0, 8),
      description: 'Upcoming squad custom — register teams, no results yet.',
    },
    {
      name: '1v1 Arena',
      category: 'custom',
      mode: 'squad',
      gameModeId: loneWolfMode._id,
      map: 'Arena Alpha',
      entryFee: 10,
      prizePool: 400,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(2),
      endDate: hoursFromNow(5),
      teamPlayers: players.slice(8, 16),
      description: 'Both teams registered — ready to publish & start.',
    },
    {
      name: 'Sniper Challenge',
      category: 'custom',
      mode: 'squad',
      gameModeId: loneWolfMode._id,
      map: 'Sniper Ridge',
      entryFee: 15,
      prizePool: 600,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.15),
      endDate: hoursFromNow(2),
      teamPlayers: players.slice(16, 24),
      description: 'Live custom match — join blocked.',
    },
    {
      name: 'Desert Duel',
      category: 'custom',
      mode: 'squad',
      gameModeId: loneWolfMode._id,
      map: 'Desert Ruins',
      entryFee: 12,
      prizePool: 500,
      lifecycleStatus: 'completed',
      startDate: hoursAgo(4),
      endDate: hoursAgo(1),
      teamPlayers: players.slice(24, 32),
      description: 'Completed — enter results in admin, then publish (no results saved yet).',
    },
    {
      name: 'Fast Combat Room',
      category: 'custom',
      mode: 'squad',
      gameModeId: loneWolfMode._id,
      map: 'Combat Lab',
      entryFee: 8,
      prizePool: 350,
      lifecycleStatus: 'result_published',
      startDate: hoursAgo(6),
      endDate: hoursAgo(3),
      teamPlayers: players.slice(32, 40),
      seedResults: true,
      description: 'Published custom — winner/runner-up/MVP visible to players.',
    },
  ];

  const brDefs = [
    {
      name: 'Bermuda Battle',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Bermuda',
      entryFee: 7,
      prizePool: 800,
      perKill: 5,
      maxParticipants: 48,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.2),
      endDate: hoursFromNow(2),
      bookings: makeBookings(players.slice(0, 12), 12),
      roomId: 'FFBERM01',
      roomPassword: 'live01',
      showRoomCredentials: true,
      description: 'Live Full Map BR — Bermuda.',
    },
    {
      name: 'Purgatory Survival',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Purgatory',
      entryFee: 10,
      prizePool: 1200,
      perKill: 8,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.15),
      endDate: hoursFromNow(2),
      bookings: makeBookings(players.slice(4), 24),
      roomId: 'FFPURG02',
      roomPassword: 'live02',
      showRoomCredentials: true,
      description: 'Live Full Map BR — Purgatory.',
    },
    {
      name: 'Kalahari Rush',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Kalahari',
      entryFee: 12,
      prizePool: 1500,
      perKill: 10,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.1),
      endDate: hoursFromNow(2),
      bookings: makeBookings(players, 40),
      roomId: 'FFKALA03',
      roomPassword: 'live03',
      showRoomCredentials: true,
      description: 'Live Full Map BR — Kalahari.',
    },
    {
      name: 'Alpine Warzone',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Alpine',
      entryFee: 15,
      prizePool: 2000,
      perKill: 12,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.05),
      endDate: hoursFromNow(3),
      bookings: makeBookings(players.slice(8), 18),
      roomId: 'FFALPI04',
      roomPassword: 'live04',
      showRoomCredentials: true,
      description: 'Live Full Map BR — Alpine.',
    },
    {
      name: 'Nextterra Championship',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Nextterra',
      entryFee: 20,
      prizePool: 3000,
      perKill: 15,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.08),
      endDate: hoursFromNow(3),
      bookings: makeBookings(players, 32),
      roomId: 'FFNEXT05',
      roomPassword: 'live05',
      showRoomCredentials: true,
      description: 'Live Full Map BR — Nextterra.',
    },
  ];

  console.log('\n--- Lone Wolf (Custom, 2 squads) ---');
  for (const def of customDefs) {
    const { tournament } = await createTournament(def, { ...ctx, matchNumber: nextNum() });
    const extra = def.seedResults ? ' + CustomMatchResult' : def.lifecycleStatus === 'completed' ? ' (awaiting result entry)' : '';
    console.log(`  ✓ ${tournament.name} [${tournament.lifecycleStatus}] teams 2/2${extra}`);
  }

  console.log('\n--- Full Map (Battle Royale) ---');
  for (const def of brDefs) {
    const { tournament } = await createTournament(def, { ...ctx, matchNumber: nextNum() });
    const slots = `${tournament.currentParticipants}/${tournament.maxParticipants}`;
    const extra = def.seedResults ? ' + BattleRoyaleResult' : '';
    console.log(`  ✓ ${tournament.name} [${tournament.lifecycleStatus}] ${slots} perKill ₹${tournament.perKill}${extra}`);
  }

  console.log('\n✅ Seed complete — 10 tournaments (v2 lifecycle models)');
  console.log('   Custom: mixed upcoming / live / completed (Lone Wolf)');
  console.log('   Full Map: 5 live dummy BR matches (home badge counts live only)');
  console.log('   Test login: seed_player_1 … seed_player_50 / test1234');
  console.log('   Admin: admin@skwin.com / admin123\n');

  await mongoose.connection.close();
}

seedTournaments().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.connection.close();
  process.exit(1);
});
