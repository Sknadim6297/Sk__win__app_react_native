const mongoose = require('mongoose');

const coinPackSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    coins: { type: Number, required: true, min: 1 },
    bonusCoins: { type: Number, default: 0, min: 0 },
    priceInr: { type: Number, required: true, min: 1 },
    isBest: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CoinPack', coinPackSchema);
