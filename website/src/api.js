const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function url(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function get(path) {
  const res = await fetch(url(path), {
    headers: {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': '1',
    },
  });
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new Error(`Unexpected response (${res.status})`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  homeConfig: () => get('/api/config/home'),
  sliders: () => get('/api/sliders'),
  games: () => get('/api/games/list'),
  gameModes: (id) => get(`/api/games/${id}/modes`),
  tournaments: () => get('/api/tournaments/list'),
  tournament: (id) => get(`/api/tournaments/${id}`),
  slots: (id) => get(`/api/tournaments/${id}/slots`),
  results: (id) => get(`/api/tournaments/${id}/results`),
  leaderboard: (period = 'all') => get(`/api/users/leaderboard?period=${encodeURIComponent(period)}`),
  announcements: () => get('/api/announcements'),
  announcement: (id) => get(`/api/announcements/${id}`),
  tutorials: () => get('/api/tutorials'),
  downloadRelease: () => get('/api/download/release'),
  site: () => get('/api/config/site'),
};

export { API_BASE, url };
