const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'deposit',
      'withdraw',
      'tournament_entry',
      'tournament_reward',
      'winning',
      'winning_reversal',
      'refund',
      'referral_bonus',
    ],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending',
  },
  paymentMethod: String,
  transactionId: {
    type: String,
    index: true,
    sparse: true,
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    index: true,
    sparse: true,
  },
  /** Links wallet txn to WinnerPayout (credit or reversal) */
  payoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WinnerPayout',
    index: true,
    sparse: true,
  },
  /** For winning_reversal: the original winning WalletTransaction */
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
    sparse: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
  },
  reason: String,
  paymentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentOrder',
    index: true,
    sparse: true,
  },
  cashfreePaymentId: {
    type: String,
    index: true,
    sparse: true,
  },
  zapupiTxnId: {
    type: String,
    index: true,
    sparse: true,
  },
  zapupiUtr: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

walletTransactionSchema.index(
  { transactionId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { transactionId: { $type: 'string' } } }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
