const mongoose = require('mongoose');

/**
 * Team-wise Battle Royale results (Duo / Squad).
 * Solo BR continues to use BattleRoyaleResult (per player).
 */
const battleRoyaleTeamResultSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  position: { type: Number, required: true, min: 1 },
  teamKills: { type: Number, default: 0, min: 0 },
  placementPrize: { type: Number, default: 0, min: 0 },
  killReward: { type: Number, default: 0, min: 0 },
  totalPrize: { type: Number, default: 0, min: 0 },
  /** Optional per-player kill breakdown (must sum to teamKills when provided). */
  playerKills: [
    {
      name: String,
      kills: { type: Number, default: 0, min: 0 },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

battleRoyaleTeamResultSchema.index({ tournamentId: 1, position: 1 }, { unique: true });
battleRoyaleTeamResultSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

battleRoyaleTeamResultSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('BattleRoyaleTeamResult', battleRoyaleTeamResultSchema);
