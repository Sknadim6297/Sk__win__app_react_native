# Android APK downloads

## Share with users

| What | URL |
|------|-----|
| **Download page (share this)** | Your Render frontend root URL |
| Direct APK | `/downloads/WAREZONE-v1.0.0.apk` |

## File required

Place the optimized EAS APK here (exact name):

```
public/downloads/WAREZONE-v1.0.0.apk
```

Current optimized build (arm64-v8a, Hermes, R8): **~16.3 MB**

Steps:
1. Download APK from Expo build page (or use `eas build`)
2. Rename/copy to `WAREZONE-v1.0.0.apk`
3. Copy into `public/downloads/`
4. Redeploy Render frontend (`npm run build:render-web`)

## Rebuild

```bash
npm run build:android:size
```
