/* WAREZONE PWA — shell cache + web push (system notifications when app is closed). */
const SHELL = 'warezone-shell-v1.0.5';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(['/', '/index.html', '/manifest.webmanifest']).catch(() => {}))
  );
  // Do not skipWaiting here — client shows update badge, then sends SKIP_WAITING.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/** System notification while PWA is backgrounded / closed (like WhatsApp Web). */
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = { body: event.data ? event.data.text() : '' };
    } catch {
      payload = {};
    }
  }

  // Expo / FCM style payloads
  const title =
    payload.title ||
    payload.data?.title ||
    (payload.notification && payload.notification.title) ||
    'WAREZONE';
  const body =
    payload.body ||
    payload.message ||
    payload.data?.message ||
    payload.data?.body ||
    (payload.notification && payload.notification.body) ||
    'New update';
  const data = payload.data || payload || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body: String(body),
      icon: '/apple-touch-icon.png',
      badge: '/apple-touch-icon.png',
      tag: String(data.tag || data.type || 'warezone'),
      renotify: true,
      data,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  let path = '/home';
  if (data.screen === 'MyWallet' || data.type === 'wallet') path = '/wallet/manage';
  else if (data.tournamentId) {
    path =
      data.type === 'result'
        ? `/match-results/${data.tournamentId}`
        : `/tournament/${data.tournamentId}`;
  } else if (data.screen === 'ImportantUpdates' || data.type === 'announcement') {
    path = '/updates';
  } else if (data.screen === 'Notifications') {
    path = '/notifications';
  }

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          if (client.navigate) {
            try {
              await client.navigate(path);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(path);
      }
    })()
  );
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
