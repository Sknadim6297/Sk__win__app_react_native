const mongoose = require('mongoose');

const battleRoyaleResultSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentParticipant',
  },
  position: { type: Number, required: true, min: 1 },
  kills: { type: Number, default: 0, min: 0 },
  prize: { type: Number, default: 0, min: 0 },
  gamingUsername: String,
  gamingUID: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

battleRoyaleResultSchema.index({ tournamentId: 1, position: 1 }, { unique: true });
battleRoyaleResultSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('BattleRoyaleResult', battleRoyaleResultSchema);
