/** Shared APK release metadata — used by backend, website build, and deploy scripts. */
module.exports = {
  version: '1.0.3',
  /** Must stay in sync with the shipped APK build (EAS remote appBuildVersion for this release) */
  versionCode: 1,
  fileName: 'WAREZONE-v1.0.3.apk',
  title: 'WAREZONE Tournament',
  androidMin: 'Android 8.0 (API 26)+',
  releaseNotes:
    'WAREZONE v1.0.3 — update prompts, notification open fix, contest details text polish, and latest match flows.',
};
