const mongoose = require('mongoose');

const tournamentParticipantSchema = new mongoose.Schema({
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
  slotNumber: {
    type: Number,
    min: 1,
    max: 50,
  },
  gamingUsername: String, // Gaming username entered during slot booking
  status: {
    type: String,
    enum: ['joined', 'disqualified', 'winner'],
    default: 'joined',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  rank: Number, // 1st, 2nd, 3rd place
  prizeAmount: {
    type: Number,
    default: 0,
  },
  teamName: String,
  roomId: String, // Room ID shown 5 mins before start
  roomPassword: String, // Password shown 5 mins before start
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for unique participant per tournament
tournamentParticipantSchema.index(
  { tournamentId: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model('TournamentParticipant', tournamentParticipantSchema);
