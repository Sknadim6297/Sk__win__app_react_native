# Android APK downloads

## Share with users

| What | URL |
|------|-----|
| **Download page (share this)** | `https://stunning-glorifier-panama.ngrok-free.dev/download` |
| Direct APK | `https://stunning-glorifier-panama.ngrok-free.dev/downloads/WarZone-AMR-v1.0.0.apk` |
| Local (PC only) | `http://localhost:5000/download` |

Keep backend + ngrok running so phones can open the link.

## File required

Place your EAS APK here (exact name):

```
public/downloads/WarZone-AMR-v1.0.0.apk
```

Steps:
1. Download APK from Expo build page
2. Rename to `WarZone-AMR-v1.0.0.apk`
3. Copy into `public/downloads/`
4. Refresh `/download` — button becomes active

## Rebuild

```bash
eas build --platform android --profile preview
```
