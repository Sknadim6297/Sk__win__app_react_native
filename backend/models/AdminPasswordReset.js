const mongoose = require('mongoose');

const adminPasswordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otpHash: { type: String, required: true },
  otpExpiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  resetTokenHash: { type: String, default: null },
  resetTokenExpiresAt: { type: Date, default: null },
  used: { type: Boolean, default: false },
  channel: { type: String, default: 'auto' },
  phone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

adminPasswordResetSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('AdminPasswordReset', adminPasswordResetSchema);
