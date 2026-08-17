/**
 * Wipes all existing tournaments and seeds dummy matches with banner images
 * for list / join testing.
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
const BattleRoyaleTeamResult = require('./models/BattleRoyaleTeamResult');
const CustomMatchResult = require('./models/CustomMatchResult');
const TournamentResult = require('./models/TournamentResult');
const WinnerPayout = require('./models/WinnerPayout');
const TournamentRefund = require('./models/TournamentRefund');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sk-win';
const SEED_TAG = 'dummy-tournament-v3';

const DUMMY_BANNERS = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1538481199705-c740cbf90b6c?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1519669556871-a5de8d2d2b0d?auto=format&fit=crop&w=1200&q=70',
  'https://picsum.photos/seed/skwin-arena/1200/640',
  'https://picsum.photos/seed/skwin-kalahari/1200/640',
  'https://picsum.photos/seed/skwin-bermuda/1200/640',
  'https://picsum.photos/seed/skwin-purgatory/1200/640',
  'https://picsum.photos/seed/skwin-alpine/1200/640',
];

const DEFAULT_RULES = [
  'Minimum level 40+ required to join.',
  'Room ID and password shared 8–10 minutes before match.',
  'No hacks, emulators, or teaming — instant disqualification.',
  'Wrong gaming ID / UID = no refund.',
  'Review prize pool distribution before joining.',
];

function banner(i) {
  return DUMMY_BANNERS[i % DUMMY_BANNERS.length];
}

function minutesFromNow(m) {
  return new Date(Date.now() + m * 60 * 1000);
}

function hoursFromNow(h) {
  return minutesFromNow(h * 60);
}

function daysFromNow(d) {
  return hoursFromNow(d * 24);
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

function brSlotsForMode(mode) {
  if (mode === 'duo') return 25;
  if (mode === 'squad') return 12;
  return 50;
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
      image: banner(0),
      rating: 4.8,
      players: '3M+',
      description: 'Battle royale mobile esports',
      isPopular: true,
      status: 'active',
    });
    console.log('Created game: Free Fire MAX');
  } else {
    game.image = banner(0);
    await game.save();
  }

  let loneWolfMode = await GameMode.findOne({ game: game._id, name: 'Lone Wolf' });
  if (!loneWolfMode) {
    loneWolfMode = await GameMode.create({
      game: game._id,
      name: 'Lone Wolf',
      description: 'Custom matches — squad vs squad',
      image: banner(1),
      status: 'active',
    });
  } else {
    loneWolfMode.image = banner(1);
    await loneWolfMode.save();
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
      image: banner(2),
      status: 'active',
    });
  } else {
    fullMapMode.image = banner(2);
    await fullMapMode.save();
  }

  const duplicateFullMap = await GameMode.find({
    game: game._id,
    name: { $regex: /full\s*map/i },
    _id: { $ne: fullMapMode._id },
  });
  for (const extra of duplicateFullMap) {
    await extra.deleteOne();
    console.log(`Removed duplicate mode "${extra.name}"`);
  }

  return { game, loneWolfMode, fullMapMode };
}

async function clearAllTournaments() {
  const ids = (await Tournament.find({}).select('_id')).map((t) => t._id);
  if (!ids.length) {
    console.log('No existing tournaments to remove');
    return;
  }

  await Promise.all([
    TournamentParticipant.deleteMany({ tournamentId: { $in: ids } }),
    TeamMember.deleteMany({ tournamentId: { $in: ids } }),
    Team.deleteMany({ tournamentId: { $in: ids } }),
    BattleRoyaleResult.deleteMany({ tournamentId: { $in: ids } }),
    BattleRoyaleTeamResult.deleteMany({ tournamentId: { $in: ids } }),
    CustomMatchResult.deleteMany({ tournamentId: { $in: ids } }),
    PrizeDistribution.deleteMany({ tournamentId: { $in: ids } }),
    WinnerPayout.deleteMany({ tournamentId: { $in: ids } }),
    TournamentRefund.deleteMany({ tournamentId: { $in: ids } }),
    TournamentResult.deleteMany({ tournamentId: { $in: ids } }),
    Tournament.deleteMany({ _id: { $in: ids } }),
  ]);
  console.log(`Removed ALL ${ids.length} tournaments (+ related records)`);
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
    side: 'A',
    captainUserId: sliceA[0]._id,
    status: 'registered',
  });
  const teamB = await Team.create({
    tournamentId: tournament._id,
    name: 'Bravo Squad',
    side: 'B',
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

  return { teamA, teamB, mvpUser: sliceA[sliceA.length > 1 ? 1 : 0] };
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
  const isCustom = def.category === 'custom';
  const maxSlots = def.maxParticipants || (isCustom ? 2 : brSlotsForMode(def.mode || 'solo'));
  const prizePool = def.prizePool;
  const prizes = splitPrizes(prizePool);
  const locked = ['ongoing', 'completed', 'result_published'].includes(lifecycleStatus);

  const tournament = await Tournament.create({
    name: def.name,
    description: `${def.description} [${SEED_TAG}]`,
    bannerImage: def.bannerImage || banner(matchNumber),
    bannerTitle: def.bannerTitle || def.name.toUpperCase(),
    matchNumber: 50000 + matchNumber,
    game: game._id,
    gameMode: def.gameModeId,
    mode: def.mode || 'solo',
    category: def.category,
    lifecycleStatus,
    status: lifecycleStatus,
    rewardType: isCustom ? 'survival' : 'per_kill',
    map: def.map,
    rules: def.rules || DEFAULT_RULES,
    entryFee: def.entryFee,
    prizePool,
    perKill: isCustom ? 0 : def.perKill,
    maxParticipants: maxSlots,
    maxTeams: def.maxTeams || (isCustom ? 2 : maxSlots),
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

  if (isCustom && def.teamPlayers?.length) {
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
  } else if (isCustom) {
    prizeDistribution = await seedPrizeDistribution(tournament, 'custom_match');
  }

  return { tournament, prizeDistribution };
}

async function seedTournaments() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected:', mongoose.connection.name);

  await clearAllTournaments();
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
      name: '1v1 Arena',
      category: 'custom',
      mode: 'solo',
      teamSize: 1,
      gameModeId: loneWolfMode._id,
      map: 'Arena Alpha',
      entryFee: 10,
      prizePool: 400,
      lifecycleStatus: 'upcoming',
      startDate: minutesFromNow(25),
      endDate: hoursFromNow(3),
      bannerImage: banner(0),
      description: 'Upcoming 1v1 — empty, ready to join.',
    },
    {
      name: '1v1 Clash',
      category: 'custom',
      mode: 'solo',
      teamSize: 1,
      gameModeId: loneWolfMode._id,
      map: 'Training Ground',
      entryFee: 8,
      prizePool: 250,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(1),
      endDate: hoursFromNow(4),
      bannerImage: banner(1),
      description: 'Upcoming 1v1 clash.',
    },
    {
      name: 'Sniper Duel',
      category: 'custom',
      mode: 'solo',
      teamSize: 1,
      gameModeId: loneWolfMode._id,
      map: 'Sniper Ridge',
      entryFee: 12,
      prizePool: 480,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(3),
      endDate: hoursFromNow(6),
      bannerImage: banner(2),
      description: 'Upcoming 1v1 sniper room.',
    },
    {
      name: 'Duo Clash',
      category: 'custom',
      mode: 'duo',
      teamSize: 2,
      gameModeId: loneWolfMode._id,
      map: 'Combat Lab',
      entryFee: 15,
      prizePool: 600,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(2),
      endDate: hoursFromNow(5),
      bannerImage: banner(3),
      description: 'Upcoming 2v2 — empty, ready to join.',
    },
    {
      name: 'Night Duo',
      category: 'custom',
      mode: 'duo',
      teamSize: 2,
      gameModeId: loneWolfMode._id,
      map: 'Bermuda',
      entryFee: 18,
      prizePool: 720,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(6),
      endDate: hoursFromNow(9),
      bannerImage: banner(4),
      description: 'Upcoming 2v2 night match.',
    },
    {
      name: 'Squad Wars',
      category: 'custom',
      mode: 'squad',
      teamSize: 4,
      gameModeId: loneWolfMode._id,
      map: 'Desert Ruins',
      entryFee: 20,
      prizePool: 800,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(4),
      endDate: hoursFromNow(8),
      bannerImage: banner(5),
      description: 'Upcoming 4v4 — empty, ready to join.',
    },
    {
      name: 'Alpha Rush',
      category: 'custom',
      mode: 'squad',
      teamSize: 4,
      gameModeId: loneWolfMode._id,
      map: 'Kalahari',
      entryFee: 25,
      prizePool: 1000,
      lifecycleStatus: 'upcoming',
      startDate: daysFromNow(1),
      endDate: daysFromNow(1.2),
      bannerImage: banner(6),
      description: 'Upcoming 4v4 tomorrow.',
    },
    {
      name: 'Weekend Cup',
      category: 'custom',
      mode: 'squad',
      teamSize: 4,
      gameModeId: loneWolfMode._id,
      map: 'Purgatory',
      entryFee: 30,
      prizePool: 1200,
      lifecycleStatus: 'upcoming',
      startDate: daysFromNow(2),
      endDate: daysFromNow(2.2),
      bannerImage: banner(7),
      description: 'Upcoming 4v4 weekend cup.',
    },
    {
      name: 'Live Custom Duel',
      category: 'custom',
      mode: 'solo',
      teamSize: 1,
      gameModeId: loneWolfMode._id,
      map: 'Arena Alpha',
      entryFee: 10,
      prizePool: 400,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.2),
      endDate: hoursFromNow(2),
      teamPlayers: players.slice(0, 2),
      bannerImage: banner(8),
      description: 'Live 1v1 — join blocked.',
    },
    {
      name: 'Fast Combat Room',
      category: 'custom',
      mode: 'squad',
      teamSize: 4,
      gameModeId: loneWolfMode._id,
      map: 'Combat Lab',
      entryFee: 8,
      prizePool: 350,
      lifecycleStatus: 'result_published',
      startDate: hoursAgo(6),
      endDate: hoursAgo(3),
      teamPlayers: players.slice(2, 10),
      seedResults: true,
      bannerImage: banner(9),
      description: 'Published custom — winner visible.',
    },
  ];

  const brDefs = [
    {
      name: 'Bermuda Open',
      category: 'battle_royale',
      mode: 'solo',
      gameModeId: fullMapMode._id,
      map: 'Bermuda',
      entryFee: 7,
      prizePool: 800,
      perKill: 5,
      lifecycleStatus: 'upcoming',
      startDate: minutesFromNow(40),
      endDate: hoursFromNow(4),
      bookings: makeBookings(players.slice(10, 22), 12),
      bannerImage: banner(10),
      description: 'Upcoming BR Solo — Bermuda.',
    },
    {
      name: 'Bermuda Night',
      category: 'battle_royale',
      mode: 'solo',
      gameModeId: fullMapMode._id,
      map: 'Bermuda',
      entryFee: 8,
      prizePool: 900,
      perKill: 6,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(2),
      endDate: hoursFromNow(6),
      bookings: makeBookings(players.slice(12, 18), 6),
      bannerImage: banner(11),
      description: 'Upcoming BR Solo night.',
    },
    {
      name: 'Purgatory Duo',
      category: 'battle_royale',
      mode: 'duo',
      gameModeId: fullMapMode._id,
      map: 'Purgatory',
      entryFee: 12,
      prizePool: 1400,
      perKill: 8,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(5),
      endDate: hoursFromNow(9),
      bookings: makeBookings(players.slice(18, 26), 8),
      bannerImage: banner(12),
      description: 'Upcoming BR Duo.',
    },
    {
      name: 'Kalahari Rush',
      category: 'battle_royale',
      mode: 'squad',
      gameModeId: fullMapMode._id,
      map: 'Kalahari',
      entryFee: 15,
      prizePool: 1800,
      perKill: 10,
      lifecycleStatus: 'upcoming',
      startDate: hoursFromNow(8),
      endDate: hoursFromNow(12),
      bookings: makeBookings(players.slice(20, 26), 6),
      bannerImage: banner(13),
      description: 'Upcoming BR Squad.',
    },
    {
      name: 'Alpine Warzone',
      category: 'battle_royale',
      mode: 'solo',
      gameModeId: fullMapMode._id,
      map: 'Alpine',
      entryFee: 10,
      prizePool: 1100,
      perKill: 7,
      lifecycleStatus: 'upcoming',
      startDate: daysFromNow(1),
      endDate: daysFromNow(1.2),
      bookings: makeBookings(players.slice(24, 32), 8),
      bannerImage: banner(14),
      description: 'Upcoming BR Solo — Alpine.',
    },
    {
      name: 'Nextterra Cup',
      category: 'battle_royale',
      mode: 'duo',
      gameModeId: fullMapMode._id,
      map: 'Nextterra',
      entryFee: 14,
      prizePool: 1600,
      perKill: 9,
      lifecycleStatus: 'upcoming',
      startDate: daysFromNow(1.5),
      endDate: daysFromNow(1.7),
      bookings: makeBookings(players.slice(28, 34), 6),
      bannerImage: banner(0),
      description: 'Upcoming BR Duo — Nextterra.',
    },
    {
      name: 'Bermuda Classic',
      category: 'battle_royale',
      mode: 'solo',
      gameModeId: fullMapMode._id,
      map: 'Bermuda',
      entryFee: 6,
      prizePool: 700,
      perKill: 4,
      lifecycleStatus: 'upcoming',
      startDate: daysFromNow(2),
      endDate: daysFromNow(2.2),
      bannerImage: banner(1),
      description: 'Upcoming BR Solo — empty lobby.',
    },
    {
      name: 'Purgatory Night',
      category: 'battle_royale',
      mode: 'squad',
      gameModeId: fullMapMode._id,
      map: 'Purgatory',
      entryFee: 18,
      prizePool: 2200,
      perKill: 12,
      lifecycleStatus: 'upcoming',
      startDate: daysFromNow(3),
      endDate: daysFromNow(3.2),
      bookings: makeBookings(players.slice(30, 34), 4),
      bannerImage: banner(2),
      description: 'Upcoming BR Squad night.',
    },
    {
      name: 'Live Bermuda',
      category: 'battle_royale',
      mode: 'solo',
      gameModeId: fullMapMode._id,
      map: 'Bermuda',
      entryFee: 7,
      prizePool: 800,
      perKill: 5,
      lifecycleStatus: 'ongoing',
      startDate: hoursAgo(0.2),
      endDate: hoursFromNow(2),
      bookings: makeBookings(players.slice(34, 46), 12),
      roomId: 'FFBERM01',
      roomPassword: 'live01',
      showRoomCredentials: true,
      bannerImage: banner(3),
      description: 'Live Full Map BR — Bermuda.',
    },
    {
      name: 'Kalahari Finals',
      category: 'battle_royale',
      mode: 'solo',
      gameModeId: fullMapMode._id,
      map: 'Kalahari',
      entryFee: 12,
      prizePool: 1500,
      perKill: 10,
      lifecycleStatus: 'result_published',
      startDate: hoursAgo(8),
      endDate: hoursAgo(6),
      bookings: makeBookings(players.slice(40, 50), 10),
      seedResults: true,
      bannerImage: banner(4),
      description: 'Published BR — results visible.',
    },
  ];

  console.log('\n--- Lone Wolf (Custom) ---');
  for (const def of customDefs) {
    const { tournament } = await createTournament(def, { ...ctx, matchNumber: nextNum() });
    console.log(
      `  ✓ ${tournament.name} [${tournament.lifecycleStatus}] ${tournament.currentParticipants}/${tournament.maxParticipants} ${def.mode}`
    );
  }

  console.log('\n--- Full Map (Battle Royale) ---');
  for (const def of brDefs) {
    const { tournament } = await createTournament(def, { ...ctx, matchNumber: nextNum() });
    console.log(
      `  ✓ ${tournament.name} [${tournament.lifecycleStatus}] ${tournament.currentParticipants}/${tournament.maxParticipants} ${def.mode}`
    );
  }

  console.log('\n✅ Seed complete — dummy matches with banner images');
  console.log(`   Custom: ${customDefs.length}  |  BR: ${brDefs.length}`);
  console.log('   Most upcoming matches are empty so you can join for testing');
  console.log('   Test login: seed_player_1 … seed_player_50 / test1234');
  console.log('   Admin: admin@skwin.com / admin123\n');

  await mongoose.connection.close();
}

seedTournaments().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.connection.close();
  process.exit(1);
});
