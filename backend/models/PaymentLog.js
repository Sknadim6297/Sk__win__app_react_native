const mongoose = require('mongoose');

/**
 * Append-only audit log for ZapUPI payment lifecycle events.
 */
const paymentLogSchema = new mongoose.Schema(
  {
    orderId: { type: String, index: true },
    paymentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentOrder',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['api', 'webhook', 'poll', 'system', 'admin'],
      default: 'api',
    },
    message: String,
    requestPayload: mongoose.Schema.Types.Mixed,
    responsePayload: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed,
    success: { type: Boolean, default: true },
    errorCode: String,
  },
  { timestamps: true }
);

paymentLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentLog', paymentLogSchema);
