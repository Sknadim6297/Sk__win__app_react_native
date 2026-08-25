# Android APK downloads

## Current public download

**WAREZONE v1.0.4** — website `/download` (local file or Expo artifact URL).

## Next release (prepared in app)

`app.json` is already bumped to **1.0.5** (versionCode 6) with latest features.
EAS Free Android builds for `@nadim123456` are exhausted until **Tue Sep 01 2026**.

When quota resets (or after upgrading Expo):

```bash
eas build --platform android --profile production --non-interactive
# then update release.config.cjs version/fileName/externalDownloadUrl to 1.0.5
node scripts/sync-latest-apk.js path\to\WAREZONE-v1.0.5.apk
npm run website:build
git add release.config.cjs website/src/release.js public/downloads app.json
git commit -m "Release WAREZONE v1.0.5 APK for website download"
git push
```
