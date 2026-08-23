/** Shared APK release metadata — used by backend, website build, and deploy scripts. */
module.exports = {
  version: '1.0.3',
  /** Must stay in sync with app.json → expo.android.versionCode for latest APK */
  versionCode: 4,
  fileName: 'WAREZONE-v1.0.3.apk',
  title: 'WAREZONE Tournament',
  androidMin: 'Android 8.0 (API 26)+',
  releaseNotes:
    'WAREZONE v1.0.3 — update prompts, notification open fix, contest details text polish, and latest match flows.',
};
