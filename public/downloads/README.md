# Android APK downloads

## Share with users

| What | URL |
|------|-----|
| **Download page (share this)** | Your Render frontend `/download` |
| Direct APK | `/downloads/WAREZONE-v1.0.3.apk` |

## File required

Place the EAS production APK here (exact name from `release.config.cjs`):

```
public/downloads/WAREZONE-v1.0.3.apk
```

Current release: **v1.0.3** (~19 MB)

Steps:
1. Download APK from Expo build page (or use `eas build`)
2. Run `node scripts/sync-latest-apk.js path\to\app.apk`
3. Commit `public/downloads/` and push so Render serves the new file

## Rebuild

```bash
npm run build:android
```
