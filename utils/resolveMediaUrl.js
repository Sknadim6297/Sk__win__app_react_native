import { getApiUrl } from './apiConfig';

/**
 * Turn relative /uploads paths into device-reachable URLs.
 * Rewrites localhost/127.0.0.1 from server uploads to the app's API host (LAN IP).
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  const apiBase = getApiUrl().replace(/\/api\/?$/, '');

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      const apiHost = new URL(apiBase.startsWith('http') ? apiBase : `http://${apiBase}`);

      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '10.0.2.2'
      ) {
        parsed.hostname = apiHost.hostname;
        parsed.port = apiHost.port || parsed.port;
        return parsed.toString();
      }

      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return `${apiBase}${trimmed}`;
    }

    return `${apiBase}/${trimmed}`;
  } catch {
    return trimmed.startsWith('http') ? trimmed : `${apiBase}/${trimmed.replace(/^\//, '')}`;
  }
}
