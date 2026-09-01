/**
 * Keep release.config.cjs + website/src/release.js in sync with app.json.
 * Run automatically before apk:sync / website:build.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const RELEASE_CONFIG = path.join(ROOT, 'release.config.cjs');
const WEBSITE_RELEASE = path.join(ROOT, 'website', 'src', 'release.js');

function readAppVersion() {
  const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  const expo = app.expo || {};
  const version = String(expo.version || '1.0.0').trim();
  const versionCode = Number(expo.android?.versionCode) || 1;
  return { version, versionCode };
}

function readExistingRelease() {
  if (!fs.existsSync(RELEASE_CONFIG)) return {};
  delete require.cache[require.resolve(RELEASE_CONFIG)];
  return require(RELEASE_CONFIG);
}

function writeReleaseConfig({ version, versionCode, prev }) {
  const fileName = `WAREZONE-v${version}.apk`;
  const versionChanged = String(prev.version || '') !== version;
  const external =
    versionChanged || !prev.externalDownloadUrl ? '' : String(prev.externalDownloadUrl || '');
  const body = `/** Shared APK release metadata — auto-synced from app.json by scripts/sync-release-metadata.js */
module.exports = {
  version: '${version}',
  versionCode: ${versionCode},
  fileName: '${fileName}',
  title: ${JSON.stringify(prev.title || 'WAREZONE Tournament')},
  androidMin: ${JSON.stringify(prev.androidMin || 'Android 8.0 (API 26)+')},
  releaseNotes: ${JSON.stringify(
    versionChanged
      ? `WAREZONE v${version} — latest Android release. Uninstall any older WAREZONE app before installing.`
      : prev.releaseNotes ||
          `WAREZONE v${version} — latest Android release. Uninstall any older WAREZONE app before installing.`
  )},
  /** Only used when public/downloads/${fileName} is missing (e.g. before first deploy). */
  externalDownloadUrl: ${JSON.stringify(external)},
};
`;
  fs.writeFileSync(RELEASE_CONFIG, body, 'utf8');
}

function writeWebsiteRelease({ version, prev }) {
  const fileName = `WAREZONE-v${version}.apk`;
  const body = `/** Keep in sync with /release.config.cjs (generated from app.json) */
export const APP_RELEASE = {
  version: '${version}',
  fileName: '${fileName}',
  title: ${JSON.stringify(prev.title || 'WAREZONE Tournament')},
  androidMin: ${JSON.stringify(prev.androidMin || 'Android 8.0 (API 26)+')},
  releaseNotes: ${JSON.stringify(
    prev.releaseNotes ||
      `WAREZONE v${version} — latest Android release.`
  )},
};

/** Expo Web PWA (same app screens). Override with VITE_PWA_URL on sk-win-web. */
export const PWA_URL = String(
  import.meta.env.VITE_PWA_URL || 'https://sk-win-pwa.onrender.com'
).replace(/\\/$/, '');

export const IOS_TESTFLIGHT_URL = String(import.meta.env.VITE_IOS_TESTFLIGHT_URL || '').trim();
export const IOS_APP_STORE_URL = String(import.meta.env.VITE_IOS_APP_URL || '').trim();
export const IOS_INSTALL_URL = IOS_APP_STORE_URL || IOS_TESTFLIGHT_URL;
`;
  fs.writeFileSync(WEBSITE_RELEASE, body, 'utf8');
}

function main() {
  const { version, versionCode } = readAppVersion();
  const prev = readExistingRelease();
  writeReleaseConfig({ version, versionCode, prev });
  writeWebsiteRelease({ version, prev });
  console.log(`[release] synced metadata → v${version} (versionCode ${versionCode})`);
}

main();
