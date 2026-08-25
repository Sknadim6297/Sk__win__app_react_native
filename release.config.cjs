/** Shared APK release metadata — used by backend, website build, and deploy scripts. */
module.exports = {
  /** Public download stays on last successful EAS APK until free-plan quota resets / new build finishes. */
  version: '1.0.4',
  versionCode: 1,
  fileName: 'WAREZONE-v1.0.4.apk',
  title: 'WAREZONE Tournament',
  androidMin: 'Android 8.0 (API 26)+',
  releaseNotes:
    'WAREZONE v1.0.4 — contest list/details ALL CAPS to match live, PWA auto-refresh, Android update prompts. (v1.0.5 Email OTP + landing polish is ready in app.json — rebuild when EAS quota resets.)',
  /**
   * Absolute APK URL used when the binary is not in git (GitHub push size limits).
   * Expo artifact (expires ~30 days).
   */
  externalDownloadUrl:
    'https://expo.dev/artifacts/eas/PIkfPlr3a7hKzoi8O0Kk5BNABtlHjLva86MZP1LyhUQ.apk',
};
