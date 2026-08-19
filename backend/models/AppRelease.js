const mongoose = require('mongoose');

/**
 * Latest APK release metadata + download counter.
 */
const appReleaseSchema = new mongoose.Schema(
  {
    version: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    title: { type: String, default: 'WAREZONE Tournament' },
    androidMin: { type: String, default: 'Android 8.0+' },
    releaseNotes: { type: String, default: '' },
    downloadCount: { type: Number, default: 0, min: 0 },
    isLatest: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppRelease', appReleaseSchema);
