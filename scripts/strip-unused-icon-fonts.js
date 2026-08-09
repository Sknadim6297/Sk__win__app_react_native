/**
 * Delete unused @expo/vector-icons font files so they cannot be packaged.
 * Keep only Ionicons + MaterialCommunityIcons (used throughout the app).
 */
const fs = require('fs');
const path = require('path');

const KEEP = new Set(['Ionicons.ttf', 'MaterialCommunityIcons.ttf']);

const CANDIDATES = [
  path.join(
    __dirname,
    '..',
    'node_modules',
    '@expo',
    'vector-icons',
    'build',
    'vendor',
    'react-native-vector-icons',
    'Fonts'
  ),
  path.join(__dirname, '..', 'node_modules', 'react-native-vector-icons', 'Fonts'),
];

let removed = 0;
let saved = 0;

for (const dir of CANDIDATES) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.ttf') && !file.endsWith('.otf')) continue;
    if (KEEP.has(file)) continue;
    const full = path.join(dir, file);
    const size = fs.statSync(full).size;
    fs.unlinkSync(full);
    removed += 1;
    saved += size;
    console.log(`Removed icon font ${file} (${(size / 1024).toFixed(1)} KB)`);
  }
}

console.log(
  `strip-unused-icon-fonts: removed ${removed} files, saved ~${(saved / 1024 / 1024).toFixed(2)} MB`
);
