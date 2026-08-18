/**
 * Copy the Android APK into website/dist/downloads so the Download App
 * page works on the same domain (Express or static host).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEST_DIR = path.join(ROOT, 'website', 'dist', 'downloads');
const SRC_DIRS = [
  path.join(ROOT, 'public', 'downloads'),
  path.join(ROOT, 'backend', 'public', 'downloads'),
];

function copyApks() {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  let copied = 0;
  for (const dir of SRC_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.apk')) continue;
      const src = path.join(dir, name);
      const st = fs.statSync(src);
      if (!st.isFile() || st.size < 1024) continue;
      fs.copyFileSync(src, path.join(DEST_DIR, name));
      copied += 1;
      console.log('[apk] copied', name, `(${Math.round(st.size / 1024 / 1024)} MB)`);
    }
  }
  if (!copied) {
    console.warn('[apk] no APK found in public/downloads — Download App will not have a file yet');
  }
}

copyApks();
