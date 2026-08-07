# WarZone AMR — APK Download Page

> This project uses **Express + MongoDB** (not Laravel). The download experience is implemented to match your requirements on the existing stack.

## URLs

| Path | Purpose |
|------|---------|
| `GET /download` | Modern APK landing page |
| `GET /api/download/release` | Version, size, date, download count (JSON) |
| `GET /downloads/WarZone-AMR-v1.0.0.apk` | Increment counter → stream APK |

## Setup

1. Build/export your Android APK (EAS):
   ```bash
   npm run build:android
   ```
2. Copy the APK to:
   ```
   public/downloads/WarZone-AMR-v1.0.0.apk
   ```
3. Restart backend:
   ```bash
   cd backend && npm run dev
   ```
4. Open:
   ```
   http://localhost:5000/download
   ```
   Or via ngrok:
   ```
   https://YOUR-NGROK-HOST/download
   ```

## Files

- `public/download/index.html` — UI (Tailwind CDN, glassmorphism, responsive)
- `public/downloads/` — APK storage
- `backend/models/AppRelease.js` — release + counter
- `backend/routes/download.js` — release API helpers
- `backend/server.js` — `/download` + `/downloads/:file` routes

## Auto fields

- **APK size** — from `fs.stat` when the file exists
- **Last updated** — APK file mtime (fallback: DB `publishedAt`)
- **Downloads** — incremented on each successful APK request

## Update a new version

1. Add `public/downloads/WarZone-AMR-v1.0.1.apk`
2. In MongoDB `appreleases`, set latest document:
   - `version: "1.0.1"`
   - `fileName: "WarZone-AMR-v1.0.1.apk"`
   - `isLatest: true`
   - update `releaseNotes` / `publishedAt`
