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
  rank: {
    type: Number,
    enum: [1, 2, 3],
    required: true,
  },
  prizeAmount: {
    type: Number,
    required: true,
  },
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
