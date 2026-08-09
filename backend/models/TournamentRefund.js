const mongoose = require('mongoose');

/**
 * Idempotent tournament entry-fee refunds.
 * Unique: tournamentId + userId + kind (entry_refund).
 */
const tournamentRefundSchema = new mongoose.Schema({
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
    index: true,
  },
  amount: { type: Number, required: true, min: 0 },
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
  },
  walletTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  kind: {
    type: String,
    enum: ['entry_refund'],
    default: 'entry_refund',
  },
  failureReason: String,
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  failedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

tournamentRefundSchema.index(
  { tournamentId: 1, userId: 1, kind: 1 },
  { unique: true }
);

tournamentRefundSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('TournamentRefund', tournamentRefundSchema);
