# Mobile data (4G/5G) networking setup

## Root cause

The app worked on **Wi‑Fi** because Expo/dev was using your PC’s **LAN IP** (e.g. `192.168.x.x:5000`) or `localhost`. Those addresses are **not reachable on the public internet**, so **mobile data fails**.

## Fix (required)

### 1. Deploy API on a public host

Your backend must listen on `0.0.0.0` (already configured) and be reachable from the internet:

- VPS (DigitalOcean, AWS, etc.) with **port 80/443** open
- Or a tunnel for testing: [ngrok](https://ngrok.com), Cloudflare Tunnel

### 2. Configure the React Native app

Create `.env` in the **project root**:

```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
```

Restart Expo with cache clear:

```bash
npx expo start -c
```

### 3. Configure the backend (uploads / images)

In `backend/.env`:

```env
PUBLIC_BASE_URL=https://api.yourdomain.com
```

Use the **same host** as the API (no `/api` suffix). Restart the backend.

### 4. Use HTTPS in production

- Mobile apps should use `https://` for `EXPO_PUBLIC_API_URL`
- Put nginx/Caddy in front of Node with TLS (Let’s Encrypt)

HTTP is only allowed in dev via `app.config.js` when `EXPO_PUBLIC_API_URL` starts with `http://`.

## Verify on cellular data

1. On your phone (Wi‑Fi **off**), open the browser:
   - `https://api.yourdomain.com/api/health`
2. You should see JSON: `{ "status": "OK", ... }`
3. Open the app — login and home should load.

## Debugging

In Metro logs, look for:

```text
[API Config] { "url": "...", "isPrivate": false, "source": "EXPO_PUBLIC_API_URL" }
```

If `isPrivate: true`, the URL is still local/LAN — update `.env`.

Failed requests log:

```text
[API] Request failed { method, fullUrl, ms, message, hostname, isPrivate }
```

## What changed in code

| Area | Change |
|------|--------|
| `utils/apiConfig.js` | Public URL via `EXPO_PUBLIC_API_URL`; warns on private IPs; no silent LAN fallback in production |
| `services/api.js` | Detailed request/error logging |
| `utils/resolveMediaUrl.js` | Rewrites private hosts in image URLs to API origin |
| `app.config.js` | Loads `extra.apiUrl`; cleartext HTTP only when URL is `http://` |
| `backend/utils/publicUrl.js` | Warns if `PUBLIC_BASE_URL` is LAN-only |
| Admin UI | Removed hardcoded `172.20.10.3` image URL |

## ngrok quick test (development)

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
ngrok http 5000
```

Set in root `.env`:

```env
EXPO_PUBLIC_API_URL=https://YOUR-ID.ngrok-free.app/api
```

Set in `backend/.env`:

```env
PUBLIC_BASE_URL=https://YOUR-ID.ngrok-free.app
```

Restart Expo and backend.
