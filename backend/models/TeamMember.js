const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
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
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gamingUsername: String,
  gamingUID: String,
  role: {
    type: String,
    enum: ['captain', 'member'],
    default: 'member',
  },
  joinedAt: { type: Date, default: Date.now },
});

teamMemberSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });
teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
