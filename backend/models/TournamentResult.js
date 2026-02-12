const mongoose = require('mongoose');

const tournamentResultSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  teamId: String,
  kills: {
    type: Number,
    default: 0,
    min: 0,
  },
  rank: {
    type: Number,
    min: 1,
    required: true,
  },
  prizeAmount: {
    type: Number,
    required: true,
  },
  perKillAmount: {
    type: Number,
    default: 0,
  },
  rewardType: {
    type: String,
    enum: ['per_kill', 'survival', 'hybrid'],
    default: 'survival',
  },
  killReward: {
    type: Number,
    default: 0,
  },
  survivalReward: {
    type: Number,
    default: 0,
  },
  totalReward: {
    type: Number,
    default: 0,
  },
  screenshotUrl: String,
  prizeCredited: {
    type: Boolean,
    default: false,
  },
  prizeTransactionId: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('TournamentResult', tournamentResultSchema);
