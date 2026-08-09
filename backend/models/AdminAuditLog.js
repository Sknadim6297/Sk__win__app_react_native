const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', index: true },
  payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'WinnerPayout' },
  refundId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentRefund' },
  amount: Number,
  previousStatus: String,
  newStatus: String,
  reason: String,
  meta: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
