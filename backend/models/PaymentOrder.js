const mongoose = require('mongoose');

/**
 * Tracks Cashfree orders (wallet top-up OR tournament entry Pay & Join).
 * Wallet top-up: credit after SUCCESS via walletCredited flag.
 * Tournament entry: join after SUCCESS/PAID via tournamentJoined flag (no wallet credit).
 */
const paymentOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['wallet_topup', 'tournament_entry'],
      default: 'wallet_topup',
      index: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      index: true,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: [
        'CREATED',
        'PENDING',
        'ACTIVE',
        'PAID',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'USER_DROPPED',
      ],
      default: 'CREATED',
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'cashfree_qr',
    },
    cashfreeOrderId: String,
    cashfreePaymentId: { type: String, index: true, sparse: true },
    paymentSessionId: String,
    qrPayload: String,
    qrImageUrl: String,
    qrExpiresAt: Date,
    cfOrderStatus: String,
    cfPaymentStatus: String,
    walletCredited: {
      type: Boolean,
      default: false,
      index: true,
    },
    tournamentJoined: {
      type: Boolean,
      default: false,
      index: true,
    },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletTransaction',
    },
    failureReason: String,
    rawCreateResponse: mongoose.Schema.Types.Mixed,
    rawPayResponse: mongoose.Schema.Types.Mixed,
    lastVerifiedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

paymentOrderSchema.index({ userId: 1, createdAt: -1 });
paymentOrderSchema.index({ userId: 1, tournamentId: 1, purpose: 1, status: 1 });
paymentOrderSchema.index({ cashfreePaymentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
