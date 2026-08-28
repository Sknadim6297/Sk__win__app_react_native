/**
 * Remove all Daily Auto Match masters and their auto-generated tournaments.
 *
 * Run: node scripts/clear-daily-auto.js
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

async function wipeRelated(tournamentIds) {
  if (!tournamentIds.length) return;
  const filter = { tournament: { $in: tournamentIds } };
  const filterId = { tournamentId: { $in: tournamentIds } };
  const byTid = { $or: [{ tournament: { $in: tournamentIds } }, { tournamentId: { $in: tournamentIds } }] };

  await TournamentParticipant.deleteMany(filter);
  await TeamMember.deleteMany({ team: { $in: (await Team.find({ tournament: { $in: tournamentIds } }).distinct('_id')) } });
  await Team.deleteMany({ tournament: { $in: tournamentIds } });
  await PrizeDistribution.deleteMany(filterId);
  await BattleRoyaleResult.deleteMany(byTid);
  await BattleRoyaleTeamResult.deleteMany(byTid);
  await CustomMatchResult.deleteMany(byTid);
  await TournamentResult.deleteMany(filterId);
  await WinnerPayout.deleteMany(filterId);
  await TournamentRefund.deleteMany(filterId);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected:', MONGODB_URI);

  const masters = await DailyAutoMatch.find({}).select('_id displayId name').lean();
  const masterIds = masters.map((m) => m._id);
  console.log(`\nDaily Auto masters: ${masters.length}`);
  masters.forEach((m) => console.log(`  - ${m.displayId || m._id}: ${m.name}`));

  const autoTournaments = await Tournament.find({
    $or: [
      { autoMatchId: { $exists: true, $ne: null } },
      ...(masterIds.length ? [{ autoMatchId: { $in: masterIds } }] : []),
    ],
  }).select('_id name autoMatchId').lean();

  const tournamentIds = autoTournaments.map((t) => t._id);
  console.log(`\nAuto-generated tournaments: ${autoTournaments.length}`);
  autoTournaments.forEach((t) => console.log(`  - ${t.name}`));

  if (tournamentIds.length) {
    await wipeRelated(tournamentIds);
    const removed = await Tournament.deleteMany({ _id: { $in: tournamentIds } });
    console.log(`\nDeleted tournaments: ${removed.deletedCount}`);
  }

  const removedMasters = await DailyAutoMatch.deleteMany({});
  console.log(`Deleted daily auto masters: ${removedMasters.deletedCount}`);
  console.log('\nDone — Daily Auto Matches page should be empty. Create new masters manually if needed.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
