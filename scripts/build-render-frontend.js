/**
 * Build the Render static frontend: APK download landing at site root.
 * Does NOT build the Expo web app (kept for local admin:web / future /app use).
 *
 * Env (optional):
 *   APK_VERSION          default 1.0.0
 *   APK_FILE_NAME        default WAREZONE-v1.0.0.apk
 *   APK_DOWNLOAD_URL     absolute or site-relative URL to the APK
 *                        If unset and the file exists under public/downloads/,
 *                        the APK is copied into dist/downloads/ and URL is set to /downloads/<file>
 *   APK_SIZE_LABEL       force display size (e.g. "89.0 MB"); otherwise measured from file when available
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const TEMPLATE = path.join(ROOT, 'public', 'apk-landing', 'index.html');
const LOGO_SRC = path.join(ROOT, 'assets', 'logo', 'WAREZONE_LOGO.png');
const DOWNLOADS_DIR = path.join(ROOT, 'public', 'downloads');

const DEFAULT_FILE = 'WAREZONE-v1.0.0.apk';
const version = String(process.env.APK_VERSION || '1.0.0').trim() || '1.0.0';
const fileName = String(process.env.APK_FILE_NAME || DEFAULT_FILE).trim() || DEFAULT_FILE;
const localApkPath = path.join(DOWNLOADS_DIR, fileName);

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function main() {
  if (!fs.existsSync(TEMPLATE)) {
    console.error('Missing template:', TEMPLATE);
    process.exit(1);
  }

  const localExists = fs.existsSync(localApkPath);
  let sizeLabel = String(process.env.APK_SIZE_LABEL || '').trim();
  let downloadUrl = String(process.env.APK_DOWNLOAD_URL || '').trim();
  let ready = false;

  rmrf(DIST);
  ensureDir(DIST);
  ensureDir(path.join(DIST, 'brand'));
  ensureDir(path.join(DIST, 'downloads'));

  if (fs.existsSync(LOGO_SRC)) {
    copyFile(LOGO_SRC, path.join(DIST, 'brand', 'logo.png'));
  } else {
    console.warn('Logo missing at', LOGO_SRC);
  }

  if (localExists) {
    const sizeBytes = fs.statSync(localApkPath).size;
    if (!sizeLabel) sizeLabel = formatBytes(sizeBytes);

    const isAbsoluteUrl = /^https?:\/\//i.test(downloadUrl);
    if (!isAbsoluteUrl) {
      // Host APK on the static site (relative URL or unset)
      copyFile(localApkPath, path.join(DIST, 'downloads', fileName));
      if (!downloadUrl) {
        downloadUrl = `/downloads/${encodeURIComponent(fileName)}`;
      }
      console.log(`Copied APK → dist/downloads/${fileName} (${sizeLabel})`);
    } else {
      console.log(`Using remote APK_DOWNLOAD_URL (${sizeLabel || 'size unknown'})`);
    }
    ready = true;
  } else if (downloadUrl) {
    ready = true;
    if (!sizeLabel) sizeLabel = '';
    console.log('Local APK missing; using APK_DOWNLOAD_URL only');
  } else {
    console.error(
      `FATAL: APK not found at ${localApkPath}.\n` +
        'Place WAREZONE-v1.0.0.apk in public/downloads/ before deploying the Render frontend.'
    );
    process.exit(1);
  }

  let html = fs.readFileSync(TEMPLATE, 'utf8');
  const replacements = {
    __APK_VERSION__: version,
    __APK_DOWNLOAD_URL__: downloadUrl || '',
    __APK_SIZE_LABEL__: sizeLabel || '',
    __APK_FILE_NAME__: fileName,
    __APK_READY__: ready ? 'true' : 'false',
  };

  for (const [token, value] of Object.entries(replacements)) {
    html = html.split(token).join(value);
  }

  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
  // Keep a copy under /download for shared links that already use that path
  ensureDir(path.join(DIST, 'download'));
  fs.writeFileSync(path.join(DIST, 'download', 'index.html'), html, 'utf8');

  console.log('Render frontend ready in dist/');
  console.log({
    version,
    fileName,
    downloadUrl: downloadUrl || null,
    sizeLabel: sizeLabel || null,
    ready,
  });
}

main();
