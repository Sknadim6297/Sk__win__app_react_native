const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 4.5,
  },
  players: {
    type: String,
    default: '2.5M',
  },
  description: String,
  isPopular: {
    type: Boolean,
    default: false,
  },
  /** Lower number shows first on Home / game list (0 = first). */
  sortOrder: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Game', gameSchema);
