const mongoose = require('mongoose');

/**
 * Winner / prize payout lifecycle for admin control + wallet audit.
 * PENDING → PAID → REVERSED
 * PENDING → CANCELLED
 * PROCESSING is short-lived during credit/reverse races.
 */
const winnerPayoutSchema = new mongoose.Schema({
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
  /** Source result document id */
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  resultModel: {
    type: String,
    enum: ['CustomMatchResult', 'BattleRoyaleResult', 'TournamentResult'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'PAID', 'REVERSED', 'CANCELLED', 'FAILED'],
    default: 'PENDING',
    index: true,
  },
  walletTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
  },
  reversalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
  },
  paidAt: Date,
  reversedAt: Date,
  cancelledAt: Date,
  failedAt: Date,
  reversedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reverseReason: String,
  cancelReason: String,
  failReason: String,
  usernameSnapshot: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

winnerPayoutSchema.index(
  { tournamentId: 1, resultId: 1, userId: 1 },
  { unique: true }
);

winnerPayoutSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WinnerPayout', winnerPayoutSchema);
