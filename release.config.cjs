/** Shared APK release metadata — used by backend, website build, and deploy scripts. */
module.exports = {
  version: '1.0.4',
  /** Matches this EAS production build's remote appBuildVersion */
  versionCode: 1,
  fileName: 'WAREZONE-v1.0.4.apk',
  title: 'WAREZONE Tournament',
  androidMin: 'Android 8.0 (API 26)+',
  releaseNotes:
    'WAREZONE v1.0.4 — contest list/details ALL CAPS to match live, PWA auto-refresh, Android update prompts.',
  /**
   * Absolute APK URL used when the binary is not in git (GitHub push size limits).
   * Expo artifact (expires ~30 days) — replace by syncing into public/downloads/ when possible.
   */
  externalDownloadUrl:
    'https://expo.dev/artifacts/eas/PIkfPlr3a7hKzoi8O0Kk5BNABtlHjLva86MZP1LyhUQ.apk',
};
