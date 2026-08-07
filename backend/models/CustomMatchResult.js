const mongoose = require('mongoose');

const customMatchResultSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    unique: true,
  },
  winnerTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  runnerUpTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  mvpUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  winnerPrize: { type: Number, default: 0, min: 0 },
  runnerUpPrize: { type: Number, default: 0, min: 0 },
  /** Prevents double-crediting winner prize to wallet */
  prizeCredited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CustomMatchResult', customMatchResultSchema);
