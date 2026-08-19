/**
 * Copy the WAREZONE logo into public/ for PWA / iPhone Home Screen icons.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'logo', 'ROUND_GAME_LOGO.png');
const PUBLIC = path.join(ROOT, 'public');

function copy(name) {
  const dest = path.join(PUBLIC, name);
  fs.copyFileSync(SRC, dest);
  console.log('[pwa] copied', name);
}

if (!fs.existsSync(SRC)) {
  console.warn('[pwa] logo missing:', SRC);
  process.exit(0);
}

fs.mkdirSync(PUBLIC, { recursive: true });
copy('apple-touch-icon.png');
