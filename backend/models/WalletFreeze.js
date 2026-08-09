const mongoose = require('mongoose');

/** Partial wallet freeze — frozen funds are not withdrawable. */
const walletFreezeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'WinnerPayout' },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction' },
  status: {
    type: String,
    enum: ['active', 'released'],
    default: 'active',
    index: true,
  },
  frozenAt: { type: Date, default: Date.now },
  releasedAt: Date,
  releasedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WalletFreeze', walletFreezeSchema);
