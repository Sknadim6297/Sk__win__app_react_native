/**
 * Copy brand assets + Android APK into website/public and website/dist
 * so the static frontend (sk-win-web) works without the API serving the site.
 */
const fs = require('fs');
const path = require('path');
const release = require('../release.config.cjs');

const ROOT = path.join(__dirname, '..');
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

  const source =
    findNewestApk(SRC_DIRS) ||
    (fs.existsSync(path.join(PUBLIC_DOWNLOADS, release.fileName))
      ? { filePath: path.join(PUBLIC_DOWNLOADS, release.fileName), name: release.fileName }
      : null);

  if (!source) {
    console.warn('[apk] no APK found — run: npm run apk:sync path/to/your-build.apk');
    return;
  }

  const publicDest = path.join(PUBLIC_DOWNLOADS, release.fileName);
  const distDest = path.join(WEBSITE_DIST_DOWNLOADS, release.fileName);

  if (path.resolve(source.filePath) !== path.resolve(publicDest)) {
    fs.copyFileSync(source.filePath, publicDest);
  }
  fs.copyFileSync(publicDest, distDest);

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
