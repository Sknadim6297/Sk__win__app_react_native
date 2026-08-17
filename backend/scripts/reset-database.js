/**
 * Full catalog reset: wipes tournaments, games, modes, match/payment
 * records and related operational data, then recreates the admin login
 * and default maps so you can add everything from scratch.
 *
 * Keeps nothing from dummy seed data.
 *
 * Run from backend/: npm run reset:data
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const Map = require('../models/Map');
const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const PrizeDistribution = require('../models/PrizeDistribution');
const BattleRoyaleResult = require('../models/BattleRoyaleResult');
const BattleRoyaleTeamResult = require('../models/BattleRoyaleTeamResult');
const CustomMatchResult = require('../models/CustomMatchResult');
const TournamentResult = require('../models/TournamentResult');
const WinnerPayout = require('../models/WinnerPayout');
const TournamentRefund = require('../models/TournamentRefund');
const WalletTransaction = require('../models/WalletTransaction');
const WalletFreeze = require('../models/WalletFreeze');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentLog = require('../models/PaymentLog');
const Notification = require('../models/Notification');
const HomeSlider = require('../models/HomeSlider');
const Announcement = require('../models/Announcement');
const TutorialVideo = require('../models/TutorialVideo');
const SupportTicket = require('../models/SupportTicket');
const AdminAuditLog = require('../models/AdminAuditLog');
const AdminPasswordReset = require('../models/AdminPasswordReset');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skwinn';
const DEFAULT_MAPS = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'Nexterra', 'Solara'];

async function wipe(model, label) {
  const result = await model.deleteMany({});
  console.log(`  ${label}: ${result.deletedCount}`);
}

function clearUploads() {
  const dir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.gitkeep') continue;
    fs.rmSync(path.join(dir, file), { force: true });
  }
  console.log('  uploaded images: cleared');
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected:', MONGODB_URI);
  console.log('\nWiping catalog and match data...');

  await wipe(Tournament, 'tournaments');
  await wipe(TournamentParticipant, 'participants');
  await wipe(Team, 'teams');
  await wipe(TeamMember, 'team members');
  await wipe(PrizeDistribution, 'prize distributions');
  await wipe(BattleRoyaleResult, 'BR results');
  await wipe(BattleRoyaleTeamResult, 'BR team results');
  await wipe(CustomMatchResult, 'custom results');
  await wipe(TournamentResult, 'tournament results');
  await wipe(WinnerPayout, 'winner payouts');
  await wipe(TournamentRefund, 'refunds');
  await wipe(Game, 'games');
  await wipe(GameMode, 'game modes');
  await wipe(Map, 'maps');
  await wipe(HomeSlider, 'home sliders');
  await wipe(Announcement, 'announcements');
  await wipe(TutorialVideo, 'tutorials');
  await wipe(PaymentOrder, 'payment orders');
  await wipe(PaymentLog, 'payment logs');
  await wipe(WalletTransaction, 'wallet transactions');
  await wipe(WalletFreeze, 'wallet freezes');
  await wipe(Notification, 'notifications');
  await wipe(SupportTicket, 'support tickets');
  await wipe(AdminAuditLog, 'audit logs');
  await wipe(AdminPasswordReset, 'admin password resets');

  console.log('\nClearing uploaded files...');
  clearUploads();

  console.log('\nRecreating admin login...');
  await User.deleteMany({});
  const password = await bcrypt.hash('admin123', 10);
  await User.create({
    username: 'admin',
    email: 'admin@skwin.com',
    password,
    role: 'admin',
    verified: true,
    status: 'active',
    wallet: { balance: 0, bonusBalance: 0, frozenBalance: 0 },
  });

  await Map.insertMany(DEFAULT_MAPS.map((name, sortOrder) => ({ name, active: true, sortOrder })));

  const games = await Game.countDocuments();
  const modes = await GameMode.countDocuments();
  const tournaments = await Tournament.countDocuments();
  console.log('\nReady for a clean start.');
  console.log(`  games: ${games}`);
  console.log(`  modes: ${modes}`);
  console.log(`  tournaments: ${tournaments}`);
  console.log('  admin: admin@skwin.com / admin123');
  console.log('  maps: default list restored');
  console.log('\nAdd games & modes first, then create tournaments. Upload images from the admin panel.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
