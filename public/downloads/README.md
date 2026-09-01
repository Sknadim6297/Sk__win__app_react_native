# Android APK downloads

The website serves **one** APK: `WAREZONE-v{version}.apk` from `app.json`.

## Release workflow (every new app version)

1. Bump version in `app.json` (`expo.version` + `expo.android.versionCode`).
2. Build: `npm run build:android` (EAS preview APK).
3. Sync APK into this folder:
   ```bash
   npm run apk:sync -- path\to\downloaded\WAREZONE-v1.0.5.apk
   ```
4. Publish website: `npm run website:build` then deploy.
5. Tell users to **uninstall the old WAREZONE app** before installing the new APK.

`npm run release:prepare` runs metadata sync + apk sync + website build.

**Important:** Do not keep multiple `.apk` files here. Old files are removed automatically on sync.
