/* WAREZONE PWA — cache the app shell only. Never cache API or uploads. */
const SHELL = 'warezone-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(['/', '/index.html', '/manifest.webmanifest']).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isApiRequest(url) {
  const u = String(url || '');
  return (
    u.includes('/api/') ||
    u.includes('/uploads/') ||
    u.includes('sk-win-api.onrender.com')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (isApiRequest(req.url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/index.html', copy).catch(() => {}));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const dest = req.destination;
  if (!['style', 'script', 'font', 'image'].includes(dest)) return;

  // Network-first so deploys update; cache only as offline fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy).catch(() => {}));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
