const mongoose = require('mongoose');

/**
 * Tracks ZapUPI orders (wallet top-up OR tournament entry Pay & Join).
 * Wallet top-up: credit after verified SUCCESS via walletCredited flag.
 * Tournament entry: join after verified SUCCESS/PAID via tournamentJoined flag (no wallet credit).
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
      default: 'zapupi',
    },
    paymentUrl: String,
    zapupiTxnId: { type: String, index: true, sparse: true },
    zapupiUtr: String,
    zapupiEnvironment: String,
    qrExpiresAt: Date,
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
    webhookProcessed: {
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
    lastStatusPayload: mongoose.Schema.Types.Mixed,
    lastVerifiedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
    /** Legacy Cashfree fields kept so old rows still load. */
    cashfreeOrderId: String,
    cashfreePaymentId: { type: String, index: true, sparse: true },
    paymentSessionId: String,
    qrPayload: String,
    qrImageUrl: String,
    cfOrderStatus: String,
    cfPaymentStatus: String,
  },
  { timestamps: true }
);

paymentOrderSchema.index({ userId: 1, createdAt: -1 });
paymentOrderSchema.index({ userId: 1, tournamentId: 1, purpose: 1, status: 1 });
paymentOrderSchema.index({ zapupiTxnId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
