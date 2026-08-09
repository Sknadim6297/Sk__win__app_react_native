const mongoose = require('mongoose');

/**
 * Winner payout lifecycle:
 * PENDING (10-min wait) → PAID
 * PENDING → BLOCKED | CANCELLED | REJECTED | FAILED
 * PAID → REVERSED (only if full balance available; prefer freeze for disputes)
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
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  resultModel: {
    type: String,
    enum: [
      'CustomMatchResult',
      'BattleRoyaleResult',
      'BattleRoyaleTeamResult',
      'TournamentResult',
    ],
    required: true,
  },
  matchType: {
    type: String,
    enum: ['solo', 'duo', 'squad', 'team', 'battle_royale', 'custom_match', 'other'],
    default: 'other',
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: [
      'PENDING',
      'PROCESSING',
      'PAID',
      'BLOCKED',
      'CANCELLED',
      'REJECTED',
      'REVERSED',
      'FAILED',
    ],
    default: 'PENDING',
    index: true,
  },
  winnerPublishedAt: Date,
  scheduledPayoutAt: { type: Date, index: true },
  walletTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
  },
  reversalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
  },
  paidAt: Date,
  blockedAt: Date,
  blockedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  blockReason: String,
  cancelledAt: Date,
  cancelledByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelReason: String,
  rejectedAt: Date,
  rejectedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectReason: String,
  reversedAt: Date,
  reversedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reverseReason: String,
  failedAt: Date,
  failReason: String,
  adminRemark: String,
  usernameSnapshot: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

winnerPayoutSchema.index(
  { tournamentId: 1, resultId: 1, userId: 1 },
  { unique: true }
);
winnerPayoutSchema.index({ status: 1, scheduledPayoutAt: 1 });

winnerPayoutSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WinnerPayout', winnerPayoutSchema);
