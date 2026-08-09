/**
 * Optimize bundled raster assets for production APK size.
 * - Logo: max 512px WebP + compressed PNG fallback for Expo icon/splash (PNG required by Expo).
 * - Banner placeholder: max 720px JPEG quality ~72.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('Installing sharp (dev) for image optimization…');
    execFileSync('npm', ['install', '--no-save', 'sharp'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    sharp = require('sharp');
  }

  const logoPath = path.join(ROOT, 'assets', 'logo', 'ROUND_GAME_LOGO.png');
  const bannerPath = path.join(
    ROOT,
    'assets',
    'images',
    '1e84951ea4e43a94485c30851c151ad2.jpg'
  );

  if (fs.existsSync(logoPath)) {
    const before = fs.statSync(logoPath).size;
    const buf = await sharp(logoPath)
      .resize({ width: 512, height: 512, fit: 'cover' })
      .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
      .toBuffer();
    // Keep PNG (Expo icon/splash require PNG); only write if smaller
    if (buf.length < before) {
      fs.writeFileSync(logoPath, buf);
      console.log(
        `Logo: ${(before / 1024).toFixed(1)}KB → ${(buf.length / 1024).toFixed(1)}KB`
      );
    } else {
      console.log(`Logo: kept original (${(before / 1024).toFixed(1)}KB, optimize not smaller)`);
    }
  }

  if (fs.existsSync(bannerPath)) {
    const before = fs.statSync(bannerPath).size;
    const buf = await sharp(bannerPath)
      .resize({ width: 720, withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    if (buf.length < before) {
      const tmp = `${bannerPath}.tmp.jpg`;
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, bannerPath);
      console.log(
        `Banner: ${(before / 1024).toFixed(1)}KB → ${(buf.length / 1024).toFixed(1)}KB`
      );
    } else {
      console.log(`Banner: kept original (${(before / 1024).toFixed(1)}KB)`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
