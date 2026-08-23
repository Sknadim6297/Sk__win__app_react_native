/**
 * Ensure PWA files land in dist/ after `expo export --platform web`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'sw.js',
  'manifest.webmanifest',
  'apple-touch-icon.png',
];

function copyIfPresent(name) {
  const src = path.join(PUBLIC, name);
  if (!fs.existsSync(src) || !fs.existsSync(DIST)) return;
  fs.copyFileSync(src, path.join(DIST, name));
  console.log('[pwa] dist <-', name);
}

function ensureIndexMeta() {
  const indexPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf8');
  if (!html.includes('manifest.webmanifest')) {
    html = html.replace(
      '</head>',
      '<link rel="manifest" href="/manifest.webmanifest" />\n</head>'
    );
  }
  if (!html.includes('apple-touch-icon')) {
    html = html.replace(
      '</head>',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />\n</head>'
    );
  }
  if (!html.includes('/sw.js')) {
    html = html.replace(
      '</body>',
      `<script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').then(function (reg) {
            try { reg.update(); } catch (e) {}
          }).catch(function () {});
        });
      }
    </script>\n</body>`
    );
  }
  fs.writeFileSync(indexPath, html);
}

if (!fs.existsSync(DIST)) {
  console.warn('[pwa] dist/ missing — run expo export first');
  process.exit(0);
}

FILES.forEach(copyIfPresent);
ensureIndexMeta();
