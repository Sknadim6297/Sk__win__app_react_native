const AdminAPI = (() => {
  const TOKEN_KEY = 'skwin_admin_token';
  const USER_KEY = 'skwin_admin_user';

  const base = () => '';

  function token() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user || {}));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(path, options = {}) {
    const headers = {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };
    if (token()) headers.Authorization = `Bearer ${token()}`;

    const res = await fetch(`${base()}/api${path}`, { ...options, headers });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || 'Invalid response' };
    }
    if (!res.ok) {
      const err = new Error(data?.error || data?.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      if (
        res.status === 401 ||
        (res.status === 404 && /user not found/i.test(String(data?.error || data?.message || '')))
      ) {
        clearSession();
        if (!location.hash.includes('login')) location.hash = '#/login';
      }
      throw err;
    }
    return data;
  }

  const qs = (params = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.set(k, v);
    });
    const s = sp.toString();
    return s ? `?${s}` : '';
  };

    async function compressImage(file) {
      if (!file || !String(file.type || '').startsWith('image/') || file.type === 'image/gif') {
        return file;
      }
      if (file.size && file.size < 350 * 1024) return file;

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(file);
      });

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not load image'));
        image.src = dataUrl;
      });

      const maxW = 1600;
      let width = img.width;
      let height = img.height;
      if (width > maxW) {
        height = Math.round((height * maxW) / width);
        width = maxW;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob) return file;
      const name = String(file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg' });
    }

    async function upload(file) {
      const headers = {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (token()) headers.Authorization = `Bearer ${token()}`;
      const ready = await compressImage(file);
      const fd = new FormData();
      fd.append('image', ready);
      const res = await fetch(`${base()}/api/upload`, {
        method: 'POST',
        headers,
        body: fd,
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Upload failed');
      }
      return data;
    }

    return {
    token,
    user,
    setSession,
    clearSession,
    request,
    qs,
    upload,
    login: (email, password) =>
      request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    stats: () => request('/admin/stats'),
    paymentStats: () => request('/admin/payment-stats'),
    users: (params) => request(`/admin/all${qs(params)}`),
    userDetails: (id) => request(`/admin/user/${id}/details`),
    suspendUser: (id) => request(`/admin/suspend/${id}`, { method: 'POST' }),
    banUser: (id, reason) => request(`/admin/ban/${id}`, { method: 'POST', body: JSON.stringify({ reason }) }),
    activateUser: (id) => request(`/admin/activate/${id}`, { method: 'POST' }),
    verifyUser: (id) => request(`/admin/verify/${id}`, { method: 'POST' }),
    tournaments: (params) => request(`/tournament-management/admin/list${qs(params)}`),
    tournament: (id) => request(`/tournament-management/admin/${id}`),
    createTournament: (body) => request('/tournaments/admin/create', { method: 'POST', body: JSON.stringify(body) }),
    updateTournament: (id, body) => request(`/tournaments/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteTournament: (id) => request(`/tournaments/admin/${id}`, { method: 'DELETE' }),
    setStatus: (id, status) =>
      request(`/tournaments/admin/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    setRoom: (id, body) => request(`/tournaments/admin/${id}/room`, { method: 'PUT', body: JSON.stringify(body) }),
    publish: (id) => request(`/tournament-management/admin/${id}/publish`, { method: 'POST' }),
    startMatch: (id) => request(`/tournament-management/admin/${id}/start-match`, { method: 'POST' }),
    completeMatch: (id) => request(`/tournament-management/admin/${id}/complete-match`, { method: 'POST' }),
    publishResults: (id) => request(`/tournament-management/admin/${id}/publish-results`, { method: 'POST' }),
    cancelMatch: (id) => request(`/tournament-management/admin/${id}/cancel`, { method: 'POST' }),
    prize: (id) => request(`/tournament-management/admin/${id}/prize-distribution`),
    savePrize: (id, body) =>
      request(`/tournament-management/admin/${id}/prize-distribution`, { method: 'PUT', body: JSON.stringify(body) }),
    lockTournament: (id, locked) =>
      request(`/tournaments/admin/${id}/lock`, { method: 'POST', body: JSON.stringify({ locked }) }),
    history: (params) => request(`/tournaments/admin/history${qs(params)}`),
    entries: (id) => request(`/tournaments/admin/${id}/participants`),
    transactions: (params) => request(`/admin/transactions${qs(params)}`),
    refunds: (params) => request(`/admin/refunds${qs(params)}`),
    retryRefund: (id) => request(`/admin/refunds/${id}/retry`, { method: 'POST' }),
    auditLogs: (params) => request(`/admin/audit-logs${qs(params)}`),
    payouts: (params) => request(`/tournament-management/admin/payouts${qs(params)}`),
    brResults: (id) => request(`/tournament-management/admin/${id}/results/battle-royale`),
    saveBrResults: (id, body) =>
      request(`/tournament-management/admin/${id}/results/battle-royale`, { method: 'POST', body: JSON.stringify(body) }),
    customResults: (id) => request(`/tournament-management/admin/${id}/results/custom-match`),
    saveCustomResults: (id, body) =>
      request(`/tournament-management/admin/${id}/results/custom-match`, { method: 'POST', body: JSON.stringify(body) }),
    tournamentPayouts: (id) => request(`/tournament-management/admin/${id}/payouts`),
    games: () => request('/games/admin/all'),
    createGame: (body) => request('/games/admin/create', { method: 'POST', body: JSON.stringify(body) }),
    updateGame: (id, body) => request(`/games/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteGame: (id) => request(`/games/admin/${id}`, { method: 'DELETE' }),
    modes: (gameId) => request(`/games/admin/${gameId}/modes`),
    createMode: (body) => request('/games/modes/admin/create', { method: 'POST', body: JSON.stringify(body) }),
    updateMode: (id, body) => request(`/games/modes/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteMode: (id) => request(`/games/modes/admin/${id}`, { method: 'DELETE' }),
    maps: () => request('/maps/admin/all'),
    createMap: (body) => request('/maps/admin/create', { method: 'POST', body: JSON.stringify(body) }),
    updateMap: (id, body) => request(`/maps/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteMap: (id) => request(`/maps/admin/${id}`, { method: 'DELETE' }),
    matchTypes: () => request('/match-types/admin/all'),
    matchTypesPublic: () => request('/match-types/list'),
    createMatchType: (body) => request('/match-types/admin/create', { method: 'POST', body: JSON.stringify(body) }),
    updateMatchType: (id, body) => request(`/match-types/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteMatchType: (id) => request(`/match-types/admin/${id}`, { method: 'DELETE' }),
    setMatchTypeActive: (id, active) =>
      request(`/match-types/admin/${id}/active`, { method: 'POST', body: JSON.stringify({ active: Boolean(active) }) }),
    tickets: () => request('/support/admin/tickets'),
    updateTicket: (id, body) => request(`/support/admin/tickets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    announcements: () => request('/announcements/admin/list'),
    createAnnouncement: (body) => request('/announcements/admin', { method: 'POST', body: JSON.stringify(body) }),
    updateAnnouncement: (id, body) =>
      request(`/announcements/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteAnnouncement: (id) => request(`/announcements/admin/${id}`, { method: 'DELETE' }),
    sliders: () => request('/sliders/admin/list'),
    createSlider: (body) => request('/sliders/admin', { method: 'POST', body: JSON.stringify(body) }),
    updateSlider: (id, body) => request(`/sliders/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteSlider: (id) => request(`/sliders/admin/${id}`, { method: 'DELETE' }),
    dailyAutoMatches: () => request('/daily-auto-matches/admin/list'),
    dailyAutoMatch: (id) => request(`/daily-auto-matches/admin/${id}`),
    createDailyAutoMatch: (body) =>
      request('/daily-auto-matches/admin', { method: 'POST', body: JSON.stringify(body) }),
    updateDailyAutoMatch: (id, body) =>
      request(`/daily-auto-matches/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    activateDailyAutoMatch: (id) =>
      request(`/daily-auto-matches/admin/${id}/activate`, { method: 'POST' }),
    deactivateDailyAutoMatch: (id) =>
      request(`/daily-auto-matches/admin/${id}/deactivate`, { method: 'POST' }),
    duplicateDailyAutoMatch: (id) =>
      request(`/daily-auto-matches/admin/${id}/duplicate`, { method: 'POST' }),
    deleteDailyAutoMatch: (id) => request(`/daily-auto-matches/admin/${id}`, { method: 'DELETE' }),
    generateDailyAutoMatchToday: (id) =>
      request(`/daily-auto-matches/admin/${id}/generate-today`, { method: 'POST' }),
    dailyAutoMatchTournaments: (id) =>
      request(`/daily-auto-matches/admin/${id}/tournaments`),
  };
})();
