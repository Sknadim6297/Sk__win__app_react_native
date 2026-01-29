const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  game: {
    type: String,
    default: 'Free Fire',
  },
  entryFee: {
    type: Number,
    required: true,
  },
  prizePool: {
    type: Number,
    required: true,
  },
  maxPlayers: {
    type: Number,
    required: true,
  },
  registeredPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  minimumKYC: {
    type: Boolean,
    default: true,
  },
  minimumBalance: {
    type: Number,
    default: 0,
  },
  winners: [{
    userId: mongoose.Schema.Types.ObjectId,
    position: Number,
    reward: Number,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Tournament', tournamentSchema);
