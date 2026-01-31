const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
  },
  gameMode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameMode',
    required: true,
  },
  mode: {
    type: String,
    enum: ['solo', 'duo', 'squad'],
    default: 'solo',
  },
  map: {
    type: String,
    default: 'Bermuda',
  },
  rules: [{
    type: String,
  }],
  entryFee: {
    type: Number,
    required: true,
  },
  prizePool: {
    type: Number,
    required: true,
  },
  perKill: {
    type: Number,
    default: 0,
  },
  maxParticipants: {
    type: Number,
    required: true,
  },
  currentParticipants: {
    type: Number,
    default: 0,
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
  roomId: String, // Game room ID
  roomPassword: String, // Game room password (encrypted)
  showRoomCredentials: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  prizes: {
    first: Number,
    second: Number,
    third: Number,
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
