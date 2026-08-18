const mongoose = require('mongoose');

const adminPasswordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // OTP flow fields. These are optional because the admin reset-link flow
  // reuses this collection but does not require an OTP.
  otpHash: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  resetTokenHash: { type: String, default: null },
  resetTokenExpiresAt: { type: Date, default: null },
  /**
   * Token hash used by the email reset-link flow.
   * We intentionally use a deterministic hash (sha256) so the backend can find the record by token
   * without ever returning the raw token to the client.
   */
  resetTokenSha256Hash: { type: String, default: null },
  used: { type: Boolean, default: false },
  channel: { type: String, default: 'auto' },
  phone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

adminPasswordResetSchema.index({ email: 1, createdAt: -1 });
adminPasswordResetSchema.index({ resetTokenSha256Hash: 1, used: 1 });

module.exports = mongoose.model('AdminPasswordReset', adminPasswordResetSchema);
