import { getApiOrigin, isPrivateOrLocalHost } from './apiConfig';

/**
 * Turn relative /uploads paths into absolute URLs using the configured API origin.
 * Rewrites localhost and private LAN hosts from stored DB URLs to the public API origin.
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  const apiOrigin = getApiOrigin();

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);

      if (isPrivateOrLocalHost(parsed.hostname)) {
        const apiParsed = new URL(apiOrigin.startsWith('http') ? apiOrigin : `https://${apiOrigin}`);
        parsed.protocol = apiParsed.protocol;
        parsed.hostname = apiParsed.hostname;
        parsed.port = apiParsed.port;
        return parsed.toString();
      }

      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return `${apiOrigin}${trimmed}`;
    }

    return `${apiOrigin}/${trimmed}`;
  } catch {
    return trimmed.startsWith('http') ? trimmed : `${apiOrigin}/${trimmed.replace(/^\//, '')}`;
  }
}
