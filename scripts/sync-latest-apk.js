/**
 * Copy the latest EAS-built APK into public/downloads using release.config.cjs.
 *
 * Usage:
 *   node scripts/sync-latest-apk.js path/to/downloaded.apk
 *   node scripts/sync-latest-apk.js
 *     (uses newest .apk in public/downloads/ or %USERPROFILE%/Downloads/)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEST_DIR = path.join(ROOT, 'public', 'downloads');

function loadRelease() {
  delete require.cache[require.resolve('../release.config.cjs')];
  return require('../release.config.cjs');
}

function syncMetadata() {
  execSync('node scripts/sync-release-metadata.js', { cwd: ROOT, stdio: 'inherit' });
}

function findNewestApk(dirs) {
  const found = [];
  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.apk')) continue;
      const filePath = path.join(dir, name);
      try {
        const st = fs.statSync(filePath);
        if (st.isFile() && st.size > 1024) found.push({ filePath, mtime: st.mtime, size: st.size, name });
      } catch {
        /* skip */
      }
    }
  }
  found.sort((a, b) => b.mtime - a.mtime);
  return found[0] || null;
}

function main() {
  syncMetadata();
  const release = loadRelease();
  const DEST_FILE = path.join(DEST_DIR, release.fileName);

  const argPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
  let source = null;

  if (argPath) {
    if (!fs.existsSync(argPath) || !argPath.toLowerCase().endsWith('.apk')) {
      console.error('Provide a valid .apk file path.');
      process.exit(1);
    }
    source = { filePath: argPath, name: path.basename(argPath) };
  } else {
    source = findNewestApk([
      DEST_DIR,
      path.join(process.env.USERPROFILE || '', 'Downloads'),
      path.join(process.env.HOME || '', 'Downloads'),
    ]);
  }

  if (!source) {
    console.error('No APK found. Build one with: eas build --platform android --profile preview');
    console.error('Then run: node scripts/sync-latest-apk.js C:\\path\\to\\downloaded.apk');
    process.exit(1);
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  // Remove every other APK so only the configured latest file is served.
  for (const name of fs.readdirSync(DEST_DIR)) {
    if (!name.toLowerCase().endsWith('.apk')) continue;
    if (name === release.fileName) continue;
    fs.rmSync(path.join(DEST_DIR, name), { force: true });
    console.log('[apk] removed old', name);
  }

  fs.copyFileSync(source.filePath, DEST_FILE);
  const st = fs.statSync(DEST_FILE);
  console.log('[apk] synced', release.fileName, `v${release.version}`, `(${Math.round(st.size / 1024 / 1024)} MB)`);
  console.log('[apk] from', source.filePath);
  console.log('\nNext: npm run website:build && git add public/downloads && git push');
}

main();
