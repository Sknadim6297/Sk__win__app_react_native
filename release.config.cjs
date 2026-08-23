/** Shared APK release metadata — used by backend, website build, and deploy scripts. */
module.exports = {
  version: '1.0.4',
  /** Bumped with each public APK; EAS remote build number may differ — semver drives update checks */
  versionCode: 2,
  fileName: 'WAREZONE-v1.0.4.apk',
  title: 'WAREZONE Tournament',
  androidMin: 'Android 8.0 (API 26)+',
  releaseNotes:
    'WAREZONE v1.0.4 — contest list/details ALL CAPS to match live, PWA auto-refresh, Android update prompts.',
};
