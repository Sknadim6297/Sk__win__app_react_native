/**
 * Optimize bundled raster assets for production APK size.
 * Run: npm run optimize:assets
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

async function getSharp() {
  try {
    return require('sharp');
  } catch {
    console.log('Installing sharp (dev) for image optimization…');
    execFileSync('npm', ['install', '--no-save', 'sharp'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    return require('sharp');
  }
}

async function optimizePng(sharp, filePath, { width, height, fit = 'inside' }) {
  if (!fs.existsSync(filePath)) return;
  const before = fs.statSync(filePath).size;
  const buf = await sharp(filePath)
    .resize({ width, height, fit, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 70, effort: 10, colors: 128 })
    .toBuffer();
  if (buf.length < before) {
    fs.writeFileSync(filePath, buf);
    console.log(
      `${path.relative(ROOT, filePath)}: ${(before / 1024).toFixed(1)}KB → ${(buf.length / 1024).toFixed(1)}KB`
    );
  } else {
    // Still rewrite if oversized dimensions help next time; try jpeg-as-png alternate
    const webpTry = await sharp(filePath)
      .resize({ width, height, fit, withoutEnlargement: true })
      .png({ compressionLevel: 9, quality: 60, effort: 10 })
      .toBuffer();
    if (webpTry.length < before) {
      fs.writeFileSync(filePath, webpTry);
      console.log(
        `${path.relative(ROOT, filePath)}: ${(before / 1024).toFixed(1)}KB → ${(webpTry.length / 1024).toFixed(1)}KB`
      );
    } else {
      console.log(
        `${path.relative(ROOT, filePath)}: kept ${(before / 1024).toFixed(1)}KB`
      );
    }
  }
}

async function optimizeJpeg(sharp, filePath, { width, quality = 70 }) {
  if (!fs.existsSync(filePath)) return;
  const before = fs.statSync(filePath).size;
  const buf = await sharp(filePath)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  if (buf.length < before) {
    const tmp = `${filePath}.tmp.jpg`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, filePath);
    console.log(
      `${path.relative(ROOT, filePath)}: ${(before / 1024).toFixed(1)}KB → ${(buf.length / 1024).toFixed(1)}KB`
    );
  } else {
    console.log(`${path.relative(ROOT, filePath)}: kept ${(before / 1024).toFixed(1)}KB`);
  }
}

async function main() {
  const sharp = await getSharp();

  await optimizePng(sharp, path.join(ROOT, 'assets', 'logo', 'WAREZONE_LOGO.png'), {
    width: 512,
    height: 512,
    fit: 'cover',
  });
  await optimizePng(sharp, path.join(ROOT, 'assets', 'ui', 'default-avatar.png'), {
    width: 160,
    height: 160,
    fit: 'cover',
  });
  await optimizePng(sharp, path.join(ROOT, 'assets', 'ui', 'header-coin.png'), {
    width: 128,
    height: 128,
    fit: 'contain',
  });
  await optimizePng(sharp, path.join(ROOT, 'assets', 'ui', 'header-bell.png'), {
    width: 96,
    height: 96,
    fit: 'contain',
  });
  await optimizeJpeg(
    sharp,
    path.join(ROOT, 'assets', 'images', '1e84951ea4e43a94485c30851c151ad2.jpg'),
    { width: 720, quality: 68 }
  );

  // Remove unused / duplicate heavy landing art if still present
  const removePaths = [
    path.join(ROOT, 'assets', 'landing'),
    path.join(ROOT, 'assets', 'images', 'welcome-warzone-hero.jpg'),
  ];
  for (const p of removePaths) {
    if (!fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`Removed folder ${path.relative(ROOT, p)}`);
    } else {
      fs.unlinkSync(p);
      console.log(`Removed ${path.relative(ROOT, p)} (${(st.size / 1024).toFixed(1)}KB)`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
