/**
 * Build a padded Android adaptive-icon foreground.
 * Android only shows the center ~66% of the foreground — full-bleed logos get cropped.
 *
 * Run: node scripts/prepare-android-icon.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'logo', 'WAREZONE_LOGO.png');
const DEST = path.join(ROOT, 'assets', 'logo', 'WAREZONE_ADAPTIVE_FOREGROUND.png');
const CANVAS = 1024;
const LOGO_SCALE = 0.56; // ~56% of canvas — matches Instagram-style safe padding
const BG = '#0a0e1a';

async function getSharp() {
  try {
    return require('sharp');
  } catch {
    console.log('[android-icon] installing sharp…');
    execFileSync('npm', ['install', '--no-save', 'sharp'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    return require('sharp');
  }
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.warn('[android-icon] source logo missing:', SRC);
    process.exit(0);
  }

  const sharp = await getSharp();
  const meta = await sharp(SRC).metadata();
  const logoSize = Math.round(CANVAS * LOGO_SCALE);

  const logo = await sharp(SRC)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const left = Math.round((CANVAS - logoSize) / 2);
  const top = Math.round((CANVAS - logoSize) / 2);

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(DEST);

  const out = fs.statSync(DEST);
  console.log(
    `[android-icon] wrote ${path.relative(ROOT, DEST)} (${CANVAS}x${CANVAS}, logo ${logoSize}px from ${meta.width}x${meta.height}, ${(out.size / 1024).toFixed(1)} KB)`
  );
}

main().catch((err) => {
  console.error('[android-icon]', err);
  process.exit(1);
});
