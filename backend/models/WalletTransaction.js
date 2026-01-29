const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'tournament_entry', 'tournament_reward', 'refund'],
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
  transactionId: String,
  tournamentId: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
