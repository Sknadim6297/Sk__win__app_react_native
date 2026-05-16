/**
 * Build URLs reachable from phones on the same network (not localhost).
 */
function getPublicBaseUrl(req) {
  const fromEnv = process.env.PUBLIC_BASE_URL || process.env.API_PUBLIC_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (req) {
    const host = req.get('host');
    if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
      return `${req.protocol}://${host}`;
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
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        const baseParsed = new URL(base);
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

module.exports = { getPublicBaseUrl, normalizeMediaUrl };
