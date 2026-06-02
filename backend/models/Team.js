const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  captainUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['registered', 'withdrawn'],
    default: 'registered',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

teamSchema.index({ tournamentId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
