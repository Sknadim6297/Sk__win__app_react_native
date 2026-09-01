/**
 * Copy brand assets + Android APK into website/public and website/dist
 * so the static frontend (sk-win-web) works without the API serving the site.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function loadRelease() {
  delete require.cache[require.resolve('../release.config.cjs')];
  return require('../release.config.cjs');
}

execSync('node scripts/sync-release-metadata.js', { cwd: ROOT, stdio: 'inherit' });
const release = loadRelease();
const DEST_DIR = path.join(ROOT, 'public', 'downloads');
const PUBLIC_DOWNLOADS = path.join(ROOT, 'public', 'downloads');
const WEBSITE_DIST_DOWNLOADS = path.join(ROOT, 'website', 'dist', 'downloads');
const PUBLIC_DIR = path.join(ROOT, 'website', 'public');
const SRC_DIRS = [PUBLIC_DOWNLOADS, path.join(ROOT, 'backend', 'public', 'downloads')];
const APP_LOGO = path.join(ROOT, 'assets', 'logo', 'WAREZONE_LOGO.png');

function syncBrandLogo() {
  if (!fs.existsSync(APP_LOGO)) return;
  fs.copyFileSync(APP_LOGO, path.join(PUBLIC_DIR, 'logo.png'));
  console.log('[brand] synced app logo → website/public/logo.png');
}

function copyApks() {
  fs.mkdirSync(WEBSITE_DIST_DOWNLOADS, { recursive: true });
  fs.mkdirSync(PUBLIC_DOWNLOADS, { recursive: true });

  const configuredPath = path.join(PUBLIC_DOWNLOADS, release.fileName);
  const source = fs.existsSync(configuredPath)
    ? { filePath: configuredPath, name: release.fileName }
    : findNewestApk(SRC_DIRS);

  if (!source) {
    console.warn(
      `[apk] no APK for v${release.version} — build then run:\n` +
        `  eas build --platform android --profile preview\n` +
        `  npm run apk:sync -- path/to/WAREZONE-v${release.version}.apk`
    );
    return;
  }

  const publicDest = path.join(PUBLIC_DOWNLOADS, release.fileName);
  const distDest = path.join(WEBSITE_DIST_DOWNLOADS, release.fileName);

  if (path.resolve(source.filePath) !== path.resolve(publicDest)) {
    fs.copyFileSync(source.filePath, publicDest);
  }
  fs.copyFileSync(publicDest, distDest);

  // Purge stale APKs from public + dist.
  for (const dir of [PUBLIC_DOWNLOADS, WEBSITE_DIST_DOWNLOADS]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.apk')) continue;
      if (name === release.fileName) continue;
      fs.rmSync(path.join(dir, name), { force: true });
      console.log('[apk] removed stale', path.relative(ROOT, path.join(dir, name)));
    }
  }

  const st = fs.statSync(distDest);
  console.log('[apk] published', release.fileName, `v${release.version}`, `(${Math.round(st.size / 1024 / 1024)} MB)`);
}

function findNewestApk(dirs) {
  const found = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.apk')) continue;
      const filePath = path.join(dir, name);
      try {
        const st = fs.statSync(filePath);
        if (st.isFile() && st.size > 1024) found.push({ filePath, mtime: st.mtime, name });
      } catch {
        /* skip */
      }
    }
  }
  found.sort((a, b) => b.mtime - a.mtime);
  return found[0] || null;
}

copyApks();
syncBrandLogo();
