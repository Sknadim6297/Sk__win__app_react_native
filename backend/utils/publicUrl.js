/**
 * Build absolute URLs for uploads/images that phones can load on any network.
 * PUBLIC_BASE_URL must be a public HTTPS URL in production (not LAN IP).
 */

const PRIVATE_HOST =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/i;

let publicUrlWarned = false;

function isPrivateHost(hostname) {
  return !hostname || PRIVATE_HOST.test(hostname);
}

function warnOnce(...args) {
  if (publicUrlWarned) return;
  publicUrlWarned = true;
  console.warn(...args);
}

function getPublicBaseUrl(req) {
  const fromEnv = (process.env.PUBLIC_BASE_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');

  if (fromEnv) {
    try {
      const { hostname, protocol } = new URL(fromEnv);
      if (isPrivateHost(hostname) && process.env.NODE_ENV === 'production') {
        console.error(
          '[publicUrl] PUBLIC_BASE_URL must be a public URL in production, not %s. Images/API will fail on mobile data.',
          hostname
        );
      } else if (isPrivateHost(hostname)) {
        warnOnce(
          '[publicUrl] PUBLIC_BASE_URL is a LAN/local address (%s). Works on same Wi‑Fi only — use your public domain for 4G/5G.',
          fromEnv
        );
      } else if (protocol !== 'https:' && process.env.NODE_ENV === 'production') {
        warnOnce('[publicUrl] Use HTTPS for PUBLIC_BASE_URL in production.');
      }
    } catch {
      console.error('[publicUrl] Invalid PUBLIC_BASE_URL:', fromEnv);
    }
    return fromEnv;
  }

  if (req) {
    const host = req.get('host');
    if (host && !isPrivateHost(host.split(':')[0])) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  return 'http://127.0.0.1:5000';
}

function normalizeMediaUrl(url, req) {
  if (!url || typeof url !== 'string') return url;

  const base = getPublicBaseUrl(req);

  if (url.startsWith('/')) {
    return `${base}${url}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (isPrivateHost(parsed.hostname)) {
        const baseParsed = new URL(base);
        parsed.protocol = baseParsed.protocol;
        parsed.hostname = baseParsed.hostname;
        parsed.port = baseParsed.port;
        return parsed.toString();
      }
    } catch {
      /* keep original */
    }
    return url;
  }

  return `${base}/${url.replace(/^\//, '')}`;
}

module.exports = { getPublicBaseUrl, normalizeMediaUrl, isPrivateHost };
