/**
 * Seeds 10 dummy tournaments for UI / flow testing:
 * - 5 Custom (Lone Wolf) — prize pool only
 * - 5 Battle Royale (Full Map) — prize pool + per kill
 *
 * Run: npm run seed:tournaments
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Game = require('./models/Game');
const GameMode = require('./models/GameMode');
const Tournament = require('./models/Tournament');
const TournamentParticipant = require('./models/TournamentParticipant');
const TournamentResult = require('./models/TournamentResult');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sk-win';
const SEED_TAG = 'dummy-tournament-v1';
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

function splitPrizes(prizePool) {
  return {
    first: Math.floor(prizePool * 0.5),
    second: Math.floor(prizePool * 0.3),
    third: Math.floor(prizePool * 0.2),
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
      description: 'Custom matches — 1v1 and arena modes',
      image: BANNER_IMAGES[1],
      status: 'active',
    });
  }

  let fullMapMode = await GameMode.findOne({ game: game._id, name: 'Full Map' });
  if (!fullMapMode) {
    fullMapMode = await GameMode.create({
      game: game._id,
      name: 'Full Map Battle Royale',
      description: 'Classic BR — prize pool + per kill',
      image: BANNER_IMAGES[2],
      status: 'active',
    });
  }

  return { game, loneWolfMode, fullMapMode };
}

async function clearPreviousSeed() {
  const old = await Tournament.find({ name: { $in: SEED_TITLES } }).select('_id');
  const ids = old.map((t) => t._id);
  if (ids.length) {
    await TournamentParticipant.deleteMany({ tournamentId: { $in: ids } });
    await TournamentResult.deleteMany({ tournamentId: { $in: ids } });
    await Tournament.deleteMany({ _id: { $in: ids } });
    console.log(`Removed ${ids.length} previous seed tournaments`);
  }
}

function makeBookings(players, count, startSlot = 1) {
  const capped = Math.min(count, players.length);
  if (count > players.length) {
    console.warn(`  ⚠ Requested ${count} bookings but only ${players.length} unique test players — capping.`);
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

async function attachParticipants(tournament, bookings, category) {
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

async function attachResults(tournament, players, bookings, { isBR, publish }) {
  const ordered = [...bookings].sort((a, b) => a.slotNumber - b.slotNumber);
  const killTable = [12, 8, 5, 4, 3, 2, 1, 0, 0, 0];
  const results = [];

  for (let i = 0; i < ordered.length; i++) {
    const rank = i + 1;
    const b = ordered[i];
    const kills = isBR ? killTable[i] || 0 : 0;
    const perKill = tournament.perKill || 0;
    const killReward = isBR ? kills * perKill : 0;
    const survivalReward =
      rank === 1
        ? tournament.prizes.first
        : rank === 2
          ? tournament.prizes.second
          : rank === 3
            ? tournament.prizes.third
            : 0;
    const totalReward = killReward + survivalReward;

    results.push({
      tournamentId: tournament._id,
      userId: b.userId,
      kills,
      rank,
      prizeAmount: survivalReward,
      perKillAmount: perKill,
      rewardType: isBR ? 'per_kill' : 'survival',
      killReward,
      survivalReward,
      totalReward,
      prizeCredited: false,
    });

    await TournamentParticipant.updateOne(
      { tournamentId: tournament._id, userId: b.userId },
      {
        rank,
        prizeAmount: totalReward,
        status: rank === 1 ? 'winner' : 'joined',
      }
    );
  }

  await TournamentResult.insertMany(results);

  if (publish) {
    tournament.resultsPublished = true;
    tournament.status = 'result_published';
    tournament.statusOverride = true;
    await tournament.save();
  }
}

async function createTournament(def, ctx) {
  const { game, admin, matchNumber } = ctx;
  const maxSlots = def.maxParticipants || 48;
  const bookings = def.bookings || [];
  const prizePool = def.prizePool;
  const prizes = splitPrizes(prizePool);

  const tournament = await Tournament.create({
    name: def.name,
    description: def.description,
    bannerImage: def.bannerImage || BANNER_IMAGES[matchNumber % BANNER_IMAGES.length],
    bannerTitle: def.bannerTitle || def.name.toUpperCase(),
    matchNumber: 40000 + matchNumber,
    game: game._id,
    gameMode: def.gameModeId,
    mode: def.mode || 'solo',
    category: def.category,
    rewardType: def.category === 'custom' ? 'survival' : 'per_kill',
    map: def.map,
    rules: def.rules || DEFAULT_RULES,
    entryFee: def.entryFee,
    prizePool,
    perKill: def.category === 'custom' ? 0 : def.perKill,
    maxParticipants: maxSlots,
    currentParticipants: bookings.length,
    registeredPlayers: bookings.map((b) => b.userId),
    status: def.status,
    statusOverride: def.statusOverride ?? false,
    locked: def.locked ?? false,
    startDate: def.startDate,
    endDate: def.endDate,
    resultsPublished: def.resultsPublished ?? false,
    prizes,
    slots: buildSlots(maxSlots, bookings),
    createdBy: admin._id,
    minimumBalance: def.entryFee,
    roomId: def.roomId || '',
    roomPassword: def.roomPassword || '',
    showRoomCredentials: def.showRoomCredentials ?? false,
  });

  if (bookings.length) {
    await attachParticipants(tournament, bookings, def.category);
  }

  if (def.seedResults) {
    await attachResults(tournament, ctx.players, bookings, {
      isBR: def.category === 'battle_royale',
      publish: def.resultsPublished,
    });
  }

  return tournament;
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
      gameModeId: loneWolfMode._id,
      map: 'Training Ground',
      entryFee: 5,
      prizePool: 200,
      maxParticipants: 48,
      startDate: minutesFromNow(30),
      endDate: hoursFromNow(3),
      status: 'incoming',
      statusOverride: false,
      bookings: [],
      description: 'Solo custom clash — winner takes the prize pool. Empty slots for join testing.',
    },
    {
      name: '1v1 Arena',
      category: 'custom',
      gameModeId: loneWolfMode._id,
      map: 'Arena Alpha',
      entryFee: 10,
      prizePool: 400,
      maxParticipants: 48,
      startDate: hoursFromNow(2),
      endDate: hoursFromNow(5),
      status: 'incoming',
      bookings: makeBookings(players, 24),
      description: 'Half-filled custom arena — test countdown and partial slots.',
    },
    {
      name: 'Sniper Challenge',
      category: 'custom',
      gameModeId: loneWolfMode._id,
      map: 'Sniper Ridge',
      entryFee: 15,
      prizePool: 600,
      maxParticipants: 48,
      startDate: hoursAgo(0.15),
      endDate: hoursFromNow(2),
      status: 'ongoing',
      statusOverride: true,
      locked: true,
      bookings: makeBookings(players, 32),
      description: 'Ongoing custom match — join should be blocked.',
    },
    {
      name: 'Desert Duel',
      category: 'custom',
      gameModeId: loneWolfMode._id,
      map: 'Desert Ruins',
      entryFee: 12,
      prizePool: 500,
      maxParticipants: 48,
      startDate: hoursAgo(4),
      endDate: hoursAgo(1),
      status: 'completed',
      statusOverride: true,
      bookings: makeBookings(players, 10),
      seedResults: true,
      description: 'Completed custom — positions only, no kills.',
    },
    {
      name: 'Fast Combat Room',
      category: 'custom',
      gameModeId: loneWolfMode._id,
      map: 'Combat Lab',
      entryFee: 8,
      prizePool: 350,
      maxParticipants: 48,
      startDate: hoursAgo(6),
      endDate: hoursAgo(3),
      status: 'result_published',
      statusOverride: true,
      resultsPublished: true,
      bookings: makeBookings(players, 12),
      seedResults: true,
      description: 'Result published custom — test leaderboard & winner badge.',
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
      startDate: minutesFromNow(30),
      endDate: hoursFromNow(3),
      status: 'incoming',
      bookings: [],
      description: 'Upcoming BR — empty slots, per kill ₹5.',
    },
    {
      name: 'Purgatory Survival',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Purgatory',
      entryFee: 10,
      prizePool: 1200,
      perKill: 8,
      maxParticipants: 48,
      startDate: hoursFromNow(2),
      endDate: hoursFromNow(5),
      status: 'incoming',
      bookings: makeBookings(players.slice(4), 24),
      description: 'Half-filled BR — prize pool + per kill visible.',
    },
    {
      name: 'Kalahari Rush',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Kalahari',
      entryFee: 12,
      prizePool: 1500,
      perKill: 10,
      maxParticipants: 48,
      startDate: hoursAgo(0.2),
      endDate: hoursFromNow(2),
      status: 'ongoing',
      statusOverride: true,
      locked: true,
      bookings: makeBookings(players, 40),
      description: 'Ongoing BR — join disabled, nearly full.',
    },
    {
      name: 'Alpine Warzone',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Alpine',
      entryFee: 15,
      prizePool: 2000,
      perKill: 12,
      maxParticipants: 48,
      startDate: hoursAgo(5),
      endDate: hoursAgo(2),
      status: 'completed',
      statusOverride: true,
      bookings: makeBookings(players, 8),
      seedResults: true,
      description: 'Completed BR with kills & placements (not yet published).',
    },
    {
      name: 'Nextterra Championship',
      category: 'battle_royale',
      gameModeId: fullMapMode._id,
      map: 'Nextterra',
      entryFee: 20,
      prizePool: 3000,
      perKill: 15,
      maxParticipants: 48,
      startDate: hoursAgo(8),
      endDate: hoursAgo(4),
      status: 'result_published',
      statusOverride: true,
      resultsPublished: true,
      bookings: makeBookings(players, 48, 1),
      description: 'Fully booked BR (48/48) — published results & leaderboard.',
    },
  ];

  console.log('\n--- Lone Wolf (Custom) ---');
  for (const def of customDefs) {
    const t = await createTournament(def, { ...ctx, matchNumber: nextNum() });
    console.log(`  ✓ ${t.name} [${t.status}] slots ${t.currentParticipants}/${t.maxParticipants}`);
  }

  console.log('\n--- Full Map (Battle Royale) ---');
  for (const def of brDefs) {
    const t = await createTournament(def, { ...ctx, matchNumber: nextNum() });
    console.log(`  ✓ ${t.name} [${t.status}] slots ${t.currentParticipants}/${t.maxParticipants} perKill ₹${t.perKill}`);
  }

  console.log('\n✅ Seed complete — 10 tournaments');
  console.log('   Game modes: Lone Wolf (custom) | Full Map Battle Royale');
  console.log('   Test login: seed_player_1 … seed_player_50 / password: test1234');
  console.log('   Admin: admin@skwin.com / admin123\n');

  await mongoose.connection.close();
}

seedTournaments().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.connection.close();
  process.exit(1);
});
