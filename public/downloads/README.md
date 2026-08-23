# Android APK downloads

## Current release

**WAREZONE v1.0.4** — download via the website `/download` page (API may use the Expo artifact URL when the APK is not in this folder).

## Local file (optional)

```
public/downloads/WAREZONE-v1.0.4.apk
```

If GitHub rejects the large binary push, set `externalDownloadUrl` in `release.config.cjs` to the EAS artifact link, then later run:

```bash
node scripts/sync-latest-apk.js path\to\WAREZONE-v1.0.4.apk
git add public/downloads && git push
```

## Rebuild

```bash
npm run build:android
```
