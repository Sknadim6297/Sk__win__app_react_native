const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  side: {
    type: String,
    enum: ['A', 'B'],
  },
  players: [
    {
      name: { type: String, required: true, trim: true },
      gamingUID: { type: String, default: '', trim: true },
    },
  ],
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
// Only Custom Match uses side A/B. BR teams omit side — do not unique on null.
teamSchema.index(
  { tournamentId: 1, side: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'registered',
      side: { $type: 'string' },
    },
  }
);

module.exports = mongoose.model('Team', teamSchema);
