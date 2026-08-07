import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * API base URL must be reachable on Wi‑Fi AND mobile data (4G/5G).
 *
 * Set in project root .env (reload Expo after change):
 *   EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
 *
 * Local/LAN URLs (localhost, 192.168.x.x, etc.) do NOT work on cellular data.
 */

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^10\.0\.2\.2$/,
];

let apiConfigWarned = false;

export function isPrivateOrLocalHost(hostname) {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(h));
}

function normalizeApiBase(url) {
  if (!url || typeof url !== 'string') return null;
  let base = url.trim().replace(/\/$/, '');
  if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
}

function readConfiguredUrl() {
  return (
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    Constants.manifest?.extra?.apiUrl ||
    null
  );
}

function getExpoLanApiUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.expoConfig?.debuggerHost;

  if (!hostUri) return null;

  let host = hostUri.split(':')[0];
  if (isPrivateOrLocalHost(host) && Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    host = '10.0.2.2';
  }

  if (isPrivateOrLocalHost(host)) {
    return `http://${host}:5000/api`;
  }

  return null;
}

function warnOnce(...args) {
  if (apiConfigWarned || !__DEV__) return;
  apiConfigWarned = true;
  console.warn(...args);
}

/**
 * Resolved API base including /api suffix, e.g. https://api.example.com/api
 */
export function getApiUrl() {
  const configured = normalizeApiBase(readConfiguredUrl());
  if (configured) {
    try {
      const { hostname, protocol } = new URL(configured);
      if (isPrivateOrLocalHost(hostname) && !__DEV__) {
        console.error(
          '[API] EXPO_PUBLIC_API_URL points to a private/local host (%s). Use a public HTTPS URL for production.',
          hostname
        );
      } else if (isPrivateOrLocalHost(hostname) && __DEV__) {
        warnOnce(
          '[API] Using LAN/local API URL (%s). This works on the same Wi‑Fi only. For 4G/5G testing, set EXPO_PUBLIC_API_URL to your public server.',
          configured
        );
      } else if (__DEV__ && protocol === 'http:') {
        warnOnce('[API] Using HTTP in development. Use HTTPS in production.');
      }
    } catch {
      /* invalid url handled below */
    }
    return configured;
  }

  if (__DEV__) {
    const lan = getExpoLanApiUrl();
    if (lan) {
      warnOnce(
        '[API] No EXPO_PUBLIC_API_URL set — using Expo dev host (%s). Mobile data will NOT work. Add EXPO_PUBLIC_API_URL to .env with your public API URL.',
        lan
      );
      return lan;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
  }

  console.error(
    '[API] EXPO_PUBLIC_API_URL is not configured. Set it in .env to your public API URL (https://your-domain.com/api).'
  );
  return 'https://CONFIGURE_EXPO_PUBLIC_API_URL/api';
}

/** Origin without /api — for uploads and images */
export function getApiOrigin() {
  return getApiUrl().replace(/\/api\/?$/, '');
}

export function getApiConfigDiagnostics() {
  const url = getApiUrl();
  let hostname = '';
  let protocol = '';
  let isPrivate = false;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    protocol = parsed.protocol;
    isPrivate = isPrivateOrLocalHost(hostname);
  } catch (e) {
    return { url, error: e.message, isPrivate: true };
  }
  return {
    url,
    hostname,
    protocol,
    isPrivate,
    platform: Platform.OS,
    source: readConfiguredUrl() ? 'EXPO_PUBLIC_API_URL' : __DEV__ ? 'expo-dev-fallback' : 'missing',
  };
}

export function logApiConfig() {
  const d = getApiConfigDiagnostics();
  console.log('[API Config]', JSON.stringify(d, null, 2));
}
