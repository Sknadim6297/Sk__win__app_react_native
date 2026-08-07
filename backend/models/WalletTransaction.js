const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'tournament_entry', 'tournament_reward', 'refund', 'referral_bonus'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  paymentMethod: String,
  transactionId: {
    type: String,
    index: true,
    sparse: true,
  },
  tournamentId: mongoose.Schema.Types.ObjectId,
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
