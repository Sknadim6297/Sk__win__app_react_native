const mongoose = require('mongoose');

const rankTierSchema = new mongoose.Schema(
  {
    rankFrom: { type: Number, required: true, min: 1 },
    rankTo: { type: Number, required: true, min: 1 },
    prize: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const prizeDistributionSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    unique: true,
  },
  tournamentType: {
    type: String,
    enum: ['battle_royale', 'custom_match'],
    required: true,
  },
  rankTiers: [rankTierSchema],
  winnerPrize: { type: Number, default: 0, min: 0 },
  runnerUpPrize: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PrizeDistribution', prizeDistributionSchema);
