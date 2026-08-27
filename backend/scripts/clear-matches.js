/**
 * Wipe all matches/tournaments and related join/result data.
 * Keeps users, games, modes, and maps so you can create matches yourself.
 *
 * Run: node scripts/clear-matches.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

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
const DailyAutoMatch = require('../models/DailyAutoMatch');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skwinn';

async function wipe(model, label) {
  const result = await model.deleteMany({});
  console.log(`  ${label}: ${result.deletedCount}`);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected:', MONGODB_URI);
  console.log('\nClearing all matches...');

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
  await wipe(DailyAutoMatch, 'daily auto-match templates');

  console.log('\nDone. No matches left — create them from the admin panel.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
