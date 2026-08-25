/**
 * @deprecated Legacy APK-only landing builder.
 * Marketing site is `website/` (Render: sk-win-web). Use: npm run website:build
 */
console.error(
  [
    'build:render-web is removed.',
    'The old APK landing page was deleted — use the marketing website instead:',
    '  npm run website:build',
    'Deploy: website/ → sk-win-web (see render.yaml).',
  ].join('\n')
);
process.exit(1);
