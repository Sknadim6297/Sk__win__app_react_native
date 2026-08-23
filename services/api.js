import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfigDiagnostics, logApiConfig } from '../utils/apiConfig';
import {
  isPaymentEnabled,
  PAYMENT_DISABLED_MESSAGE,
  getPaymentDisabledError,
} from '../utils/paymentConfig';

let configLogged = false;

function ensureConfigLogged() {
  if (!configLogged && __DEV__) {
    logApiConfig();
    configLogged = true;
  }
}

function formatNetworkError(error, method, fullUrl) {
  const diag = getApiConfigDiagnostics();
  const msg = error?.message || String(error);

  if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('timeout')) {
    const hint = diag.isPrivate
      ? ' The API URL points to a local/private network address, which does not work on mobile data. Set EXPO_PUBLIC_API_URL in .env to your public HTTPS API URL and restart Expo.'
      : ' Check that the server is online, the URL is correct, and port 443/80 is open on your hosting.';
    return `Unable to reach server at ${diag.url}.${hint}`;
  }

  return msg;
}

// Test API connectivity
export const testAPIConnection = async () => {
  ensureConfigLogged();
  const base = getApiUrl();
  const started = Date.now();
  try {
    const response = await fetch(`${base}/health`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': '1' },
    });
    const ms = Date.now() - started;
    console.log('[API] Health check', { url: `${base}/health`, status: response.status, ms });
    if (response.ok) return base;
  } catch (error) {
    console.error('[API] Health check failed', {
      url: `${base}/health`,
      ms: Date.now() - started,
      message: error.message,
      ...getApiConfigDiagnostics(),
    });
  }
  return null;
};

export const apiCall = async (endpoint, options = {}) => {
  ensureConfigLogged();
  const method = options.method || 'GET';
  const base = getApiUrl();
  const fullUrl = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const started = Date.now();

  try {
    const token = await AsyncStorage.getItem('token');

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Free ngrok interstitial breaks JSON APIs on mobile without this header
      'ngrok-skip-browser-warning': '1',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body = options.body;
    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
    }

    const fetchOptions = {
      method,
      headers,
      ...(body && { body }),
    };

    const timeoutMs = options.timeoutMs ?? 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs / 1000}s`)), timeoutMs)
    );

    const response = await Promise.race([fetch(fullUrl, fetchOptions), timeoutPromise]);
    const ms = Date.now() - started;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error('[API] Non-JSON response', { method, fullUrl, status: response.status, contentType, ms });
      throw new Error(`Server returned ${contentType || 'non-JSON'} response (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (!response.ok) {
      console.warn('[API] Error response', {
        method,
        fullUrl,
        status: response.status,
        ms,
        body: data?.error || data?.message,
      });
      const errorMessage = data.message || data.error || 'API Error';
      const err = new Error(errorMessage);
      err.code = data.code;
      err.status = response.status;
      throw err;
    }

    if (__DEV__ && ms > 3000) {
      console.log('[API] Slow request', { method, endpoint, ms });
    }

    return data;
  } catch (error) {
    const ms = Date.now() - started;
    console.error('[API] Request failed', {
      method,
      fullUrl,
      ms,
      message: error.message,
      status: error.status,
      ...getApiConfigDiagnostics(),
    });

    if (error.message?.includes('Network request failed') || error.message?.includes('timeout')) {
      throw new Error(formatNetworkError(error, method, fullUrl));
    }

    throw error;
  }
};

const getFileMetadata = (fileUri) => {
  const cleanUri = (fileUri || '').split('?')[0];
  const uriParts = cleanUri.split('/');
  let fileName = uriParts[uriParts.length - 1] || `upload_${Date.now()}.jpg`;
  // Strip React Native / Expo query junk and decode
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    /* keep raw */
  }
  let extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || extension === fileName.toLowerCase() || extension.length > 5) {
    extension = 'jpg';
    fileName = `upload_${Date.now()}.jpg`;
  }
  const typeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const type = typeMap[extension] || 'image/jpeg';
  return { fileName, type };
};

export const uploadImageFile = async (fileUri, options = {}) => {
  const base = getApiUrl();
  const fullUrl = `${base}/upload`;
  const started = Date.now();

  try {
    const token = await AsyncStorage.getItem('token');
    const metaUri = fileUri || options.fileName || options.name || 'upload.jpg';
    const { fileName, type } = getFileMetadata(options.fileName || options.name || metaUri);

    const formData = new FormData();

    // Web needs a real Blob/File — RN-style { uri, name, type } is ignored by browsers → "No file uploaded"
    if (Platform.OS === 'web') {
      let blob = options.file || options.blob || null;
      if (!blob && fileUri) {
        const blobRes = await fetch(fileUri);
        blob = await blobRes.blob();
      }
      if (!blob) {
        throw new Error('No file to upload');
      }
      const webFile =
        typeof File !== 'undefined' && !(blob instanceof File)
          ? new File([blob], fileName, { type: blob.type || type })
          : blob;
      formData.append('image', webFile, fileName);
    } else {
      if (!fileUri) throw new Error('No file to upload');
      formData.append('image', {
        uri: fileUri,
        name: fileName,
        type,
      });
    }

    const headers = {
      'ngrok-skip-browser-warning': '1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const ms = Date.now() - started;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error('[API] Upload non-JSON', { fullUrl, status: response.status, ms });
      throw new Error('Server returned non-JSON response. Check upload endpoint.');
    }

    const data = await response.json();
    if (!response.ok) {
      console.warn('[API] Upload failed', { fullUrl, status: response.status, ms, error: data.error });
      throw new Error(data.message || data.error || 'Upload failed');
    }

    console.log('[API] Upload OK', { fullUrl, ms });
    return data;
  } catch (error) {
    console.error('[API] Upload error', {
      fullUrl,
      ms: Date.now() - started,
      message: error.message,
      ...getApiConfigDiagnostics(),
    });
    if (
      error.message?.includes('Network request failed') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('timeout')
    ) {
      throw new Error(formatNetworkError(error, 'POST', fullUrl));
    }
    throw error;
  }
};

// Auth — forgot password (OTP via WhatsApp / SMS / email)
export const authService = {
  forgotPassword: (identifier, channel = 'auto') =>
    apiCall('/auth/forgot-password', {
      method: 'POST',
      body: { identifier, email: identifier, channel },
    }),
  verifyAdminOtp: (email, otp) =>
    apiCall('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp },
    }),
  resetAdminPassword: ({ email, resetToken, password, confirmPassword }) =>
    apiCall('/auth/reset-password', {
      method: 'POST',
      body: { email, resetToken, password, confirmPassword },
    }),
  adminForgotPassword: ({ email }) =>
    apiCall('/admin/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  adminResetPassword: ({ token, password, passwordConfirmation }) =>
    apiCall('/admin/reset-password', {
      method: 'POST',
      body: { token, password, passwordConfirmation },
    }),
};

// User Services
export const userService = {
  getProfile: () => apiCall('/users/profile'),
  getLeaderboard: (period = 'all') =>
    apiCall(`/users/leaderboard?period=${encodeURIComponent(period)}`),
  updateProfile: (profileData) => apiCall('/users/profile', {
    method: 'PUT',
    body: profileData,
  }),
  changePassword: (passwordData) => apiCall('/users/change-password', {
    method: 'PUT',
    body: passwordData,
  }),
};

// Wallet Services
export const walletService = {
  getBalance: () => apiCall('/wallet/balance'),
  topup: (topupData) =>
    apiCall('/wallet/topup', {
      method: 'POST',
      body: topupData,
    }),
  withdraw: (withdrawData) => {
    if (!isPaymentEnabled()) {
      return Promise.reject(getPaymentDisabledError('withdraw'));
    }
    return apiCall('/wallet/withdraw', {
      method: 'POST',
      body: withdrawData,
    });
  },
  getHistory: () => apiCall('/wallet/history'),
  buyPack: (packId) => {
    if (!isPaymentEnabled()) {
      return Promise.reject(getPaymentDisabledError('deposit'));
    }
    return apiCall('/wallet/buy-pack', {
      method: 'POST',
      body: { packId },
    });
  },
};

/** ZapUPI wallet top-up / tournament Pay & Join (backend-only zap_key) */
export const paymentService = {
  getConfig: () => apiCall('/payments/config'),
  createZapUpiQr: (data) =>
    apiCall('/payments/zapupi/create-qr', {
      method: 'POST',
      body: data,
    }),
  createZapUpiOrder: (data) =>
    apiCall('/payments/zapupi/create-order', {
      method: 'POST',
      body: data,
    }),
  getZapUpiStatus: (orderId) => apiCall(`/payments/zapupi/status/${orderId}`),
  cancelZapUpiOrder: (orderId) =>
    apiCall(`/payments/zapupi/cancel/${orderId}`, {
      method: 'POST',
      body: {},
    }),
};

// Config Services
export const configService = {
  getHome: () => apiCall('/config/home'),
  getWalletUi: () => apiCall('/config/wallet-ui'),
};

// Slider Services
export const sliderService = {
  getActive: () => apiCall('/sliders'),
  getAdminList: () => apiCall('/sliders/admin/list'),
  create: (data) => apiCall('/sliders/admin', { method: 'POST', body: data }),
  update: (id, data) => apiCall(`/sliders/admin/${id}`, { method: 'PUT', body: data }),
  delete: (id) => apiCall(`/sliders/admin/${id}`, { method: 'DELETE' }),
};

// Announcement Services
export const announcementService = {
  getActive: () => apiCall('/announcements'),
  getById: (id) => apiCall(`/announcements/${id}`),
  getAdminList: () => apiCall('/announcements/admin/list'),
  create: (data) => apiCall('/announcements/admin', { method: 'POST', body: data }),
  update: (id, data) => apiCall(`/announcements/admin/${id}`, { method: 'PUT', body: data }),
  delete: (id) => apiCall(`/announcements/admin/${id}`, { method: 'DELETE' }),
};

// Support Services
export const supportService = {
  getCategories: () => apiCall('/support/categories'),
  getMyTickets: () => apiCall('/support/my-tickets'),
  createTicket: (data) => apiCall('/support/tickets', { method: 'POST', body: data }),
  getAdminCategories: () => apiCall('/support/admin/categories'),
  createCategory: (data) => apiCall('/support/admin/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) =>
    apiCall(`/support/admin/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => apiCall(`/support/admin/categories/${id}`, { method: 'DELETE' }),
  getAdminTickets: (status) =>
    apiCall(status ? `/support/admin/tickets?status=${status}` : '/support/admin/tickets'),
  updateTicket: (id, data) => apiCall(`/support/admin/tickets/${id}`, { method: 'PUT', body: data }),
};

// Tournament Services
export const tournamentService = {
  getList: () => apiCall('/tournaments/list'),
  getMyTournaments: () => apiCall('/tournaments/my-tournaments'),
  getDetails: (id) => apiCall(`/tournaments/${id}/details`),
  canJoin: (id) => apiCall(`/tournaments/${id}/canJoin`),
  join: (id) => apiCall(`/tournaments/${id}/join`, { method: 'POST' }),
  getRoomInfo: (id) => apiCall(`/tournaments/${id}/room-info`),
  getResults: (id) => apiCall(`/tournaments/${id}/results`),
  getHistory: () => apiCall('/tournaments/user/history'),
  getSlots: (id) => apiCall(`/tournaments/${id}/slots`),
  bookSlot: (id, slotNumberOrNumbers, gamingID, gamingUID, players) => {
    const body =
      Array.isArray(slotNumberOrNumbers)
        ? { slotNumbers: slotNumberOrNumbers, gamingID, gamingUID }
        : { slotNumber: slotNumberOrNumbers, slotNumbers: [slotNumberOrNumbers], gamingID, gamingUID };
    if (Array.isArray(players) && players.length) body.players = players;
    return apiCall(`/tournaments/${id}/book-slot`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  confirmSlotBooking: (id, slotNumberOrNumbers, gamingID, gamingUID, players) => {
    const body =
      Array.isArray(slotNumberOrNumbers)
        ? { slotNumbers: slotNumberOrNumbers, gamingID, gamingUID }
        : { slotNumber: slotNumberOrNumbers, slotNumbers: [slotNumberOrNumbers], gamingID, gamingUID };
    if (Array.isArray(players) && players.length) body.players = players;
    return apiCall(`/tournaments/${id}/confirm-slot-booking`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  createTournament: (data) =>
    apiCall('/tournaments/admin/create', { method: 'POST', body: JSON.stringify(data) }),
  updateTournament: (id, data) =>
    apiCall(`/tournaments/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAllTournaments: () => apiCall('/tournaments/admin/all'),
  getTournamentsByGameMode: (gameModeId) => apiCall(`/tournaments/admin/by-gamemode/${gameModeId}`),
  getTournamentHistory: () => apiCall('/tournaments/admin/history'),
  getTournamentParticipants: (id) => apiCall(`/tournaments/admin/${id}/participants`),
  submitResults: (id, payload) =>
    apiCall(`/tournaments/admin/${id}/results`, { method: 'POST', body: JSON.stringify(payload) }),
  updateStatus: (id, status) =>
    apiCall(`/tournaments/admin/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  setRoomDetails: (id, roomId, roomPassword, showRoomCredentials = false) =>
    apiCall(`/tournaments/admin/${id}/room`, {
      method: 'PUT',
      body: JSON.stringify({ roomId, roomPassword, showRoomCredentials }),
    }),
  selectWinners: (id, winners) =>
    apiCall(`/tournaments/admin/${id}/winners`, { method: 'POST', body: JSON.stringify({ winners }) }),
  publishResults: (id) =>
    apiCall(`/tournament-management/admin/${id}/publish-results`, { method: 'POST' }),
  submitBattleRoyaleResults: (id, entries) =>
    apiCall(`/tournament-management/admin/${id}/results/battle-royale`, {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),
  submitCustomMatchResults: (id, payload) =>
    apiCall(`/tournament-management/admin/${id}/results/custom-match`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  distributePrizes: (id) => apiCall(`/tournaments/admin/${id}/distribute-prizes`, { method: 'POST' }),
  distributeRewards: (id) => apiCall(`/tournaments/admin/${id}/distribute-prizes`, { method: 'POST' }),
  deleteTournament: (id) => apiCall(`/tournaments/admin/${id}`, { method: 'DELETE' }),
  lockTournament: (id, locked) =>
    apiCall(`/tournaments/admin/${id}/lock`, { method: 'PUT', body: JSON.stringify({ locked }) }),
  setTournamentWinners: (tournamentId, winners) =>
    apiCall(`/admin/tournaments/${tournamentId}/set-winners`, {
      method: 'POST',
      body: JSON.stringify({ winners }),
    }),
  completeTournament: (tournamentId) =>
    apiCall(`/admin/tournaments/${tournamentId}/complete`, { method: 'POST' }),
};

export const tournamentManagementService = {
  getAdminList: () => apiCall('/tournament-management/admin/list'),
  getAdminDetail: (id) => apiCall(`/tournament-management/admin/${id}`),
  publish: (id) => apiCall(`/tournament-management/admin/${id}/publish`, { method: 'POST' }),
  startMatch: (id) => apiCall(`/tournament-management/admin/${id}/start-match`, { method: 'POST' }),
  completeMatch: (id) =>
    apiCall(`/tournament-management/admin/${id}/complete-match`, { method: 'POST' }),
  publishResults: (id) =>
    apiCall(`/tournament-management/admin/${id}/publish-results`, { method: 'POST' }),
  getPrizeDistribution: (id) => apiCall(`/tournament-management/admin/${id}/prize-distribution`),
  savePrizeDistribution: (id, data) =>
    apiCall(`/tournament-management/admin/${id}/prize-distribution`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getBattleRoyaleEntry: (id) => apiCall(`/tournament-management/admin/${id}/results/battle-royale`),
  saveBattleRoyaleResults: (id, entries) =>
    apiCall(`/tournament-management/admin/${id}/results/battle-royale`, {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),
  prizePreview: (id, positions) =>
    apiCall(`/tournament-management/admin/${id}/results/battle-royale/prize-preview`, {
      method: 'POST',
      body: JSON.stringify({ positions }),
    }),
  getCustomMatchEntry: (id) => apiCall(`/tournament-management/admin/${id}/results/custom-match`),
  saveCustomMatchResults: (id, payload) =>
    apiCall(`/tournament-management/admin/${id}/results/custom-match`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPayouts: (id) => apiCall(`/tournament-management/admin/${id}/payouts`),
  listAllPayouts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/tournament-management/admin/payouts${query ? `?${query}` : ''}`);
  },
  setAutoPayment: (id, enabled) =>
    apiCall(`/tournament-management/admin/${id}/auto-payment`, {
      method: 'PUT',
      body: JSON.stringify({ enabled: !!enabled }),
    }),
  cancelTournament: (id, reason) =>
    apiCall(`/tournament-management/admin/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Cancelled by admin' }),
    }),
  stopPayout: (payoutId, reason) =>
    apiCall(`/tournament-management/admin/payouts/${payoutId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  blockPayout: (payoutId, reason) =>
    apiCall(`/tournament-management/admin/payouts/${payoutId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  rejectPayout: (payoutId, reason) =>
    apiCall(`/tournament-management/admin/payouts/${payoutId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  reversePayout: (payoutId, reason) =>
    apiCall(`/tournament-management/admin/payouts/${payoutId}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Reversed by admin' }),
    }),
  exportResults: (id) => apiCall(`/tournament-management/admin/${id}/results/export`),
  getPublicResults: (id) => apiCall(`/tournament-management/${id}/results`),
  registerTeam: (id, data) =>
    apiCall(`/tournament-management/${id}/register-team`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const mapService = {
  getList: () => apiCall('/maps/list'),
  getAll: () => apiCall('/maps/admin/all'),
  create: (data) => apiCall('/maps/admin/create', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/maps/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => apiCall(`/maps/admin/${id}`, { method: 'DELETE' }),
};

// Tutorial Services
export const tutorialService = {
  getPublicList: () => apiCall('/tutorials'),
  getAdminList: () => apiCall('/tutorials/admin/list'),
  create: (data) => apiCall('/tutorials/admin/create', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/tutorials/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => apiCall(`/tutorials/admin/${id}`, { method: 'DELETE' }),
};

// Notification Services
export const notificationService = {
  getAll: (filter = 'all') =>
    apiCall(`/notifications${filter && filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : ''}`),
  getUnreadCount: () => apiCall('/notifications/unread/count'),
  markRead: (id) => apiCall(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => apiCall('/notifications/read/all', { method: 'PUT' }),
  adminSend: (payload) =>
    apiCall('/notifications/admin/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// User Services — push token helpers also under userService
export const pushTokenService = {
  save: (token, platform) =>
    apiCall('/users/push-token', {
      method: 'POST',
      body: JSON.stringify({ pushToken: token, fcmToken: token, platform }),
    }),
  clear: (token) =>
    apiCall('/users/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ pushToken: token }),
    }),
};

// Admin Services
export const adminService = {
  getAllUsers: () => apiCall('/admin/all'),
  getStats: () => apiCall('/admin/stats'),
  getPaymentStats: () => apiCall('/admin/payment-stats'),
  getTransactions: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiCall(`/admin/transactions${query ? `?${query}` : ''}`);
  },
  getRefunds: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiCall(`/admin/refunds${query ? `?${query}` : ''}`);
  },
  retryRefund: (id) => apiCall(`/admin/refunds/${id}/retry`, { method: 'POST' }),
  freezeWallet: (payload) =>
    apiCall('/admin/wallet/freeze', { method: 'POST', body: JSON.stringify(payload) }),
  releaseFreeze: (id) =>
    apiCall(`/admin/wallet/freeze/${id}/release`, { method: 'POST' }),
  getAuditLogs: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiCall(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
  getUserDetails: (userId) => apiCall(`/admin/user/${userId}/details`),
  suspendUser: (userId) => apiCall(`/admin/suspend/${userId}`, { method: 'POST' }),
  banUser: (userId, reason) =>
    apiCall(`/admin/ban/${userId}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  activateUser: (userId) => apiCall(`/admin/activate/${userId}`, { method: 'POST' }),
  verifyUser: (userId) => apiCall(`/admin/verify/${userId}`, { method: 'POST' }),
  setTournamentWinners: (tournamentId, winners) =>
    apiCall(`/admin/tournaments/${tournamentId}/set-winners`, {
      method: 'POST',
      body: JSON.stringify({ winners }),
    }),
  completeTournament: (tournamentId) =>
    apiCall(`/admin/tournaments/${tournamentId}/complete`, { method: 'POST' }),
  getHomeConfig: () => apiCall('/admin/home-config'),
  updateHomeConfig: (data) => apiCall('/admin/home-config', { method: 'PUT', body: JSON.stringify(data) }),
  getCoinPacks: () => apiCall('/admin/coin-packs'),
  createCoinPack: (data) => apiCall('/admin/coin-packs', { method: 'POST', body: JSON.stringify(data) }),
  updateCoinPack: (id, data) =>
    apiCall(`/admin/coin-packs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCoinPack: (id) => apiCall(`/admin/coin-packs/${id}`, { method: 'DELETE' }),
};

// Game Services
export const gameService = {
  getPopularGames: () => apiCall('/games/popular'),
  getGamesList: () => apiCall('/games/list'),
  getGameDetails: (gameId) => apiCall(`/games/${gameId}`),
  getGameModes: (gameId) => apiCall(`/games/${gameId}/modes`),
  /** Admin list includes inactive modes and respects sortOrder */
  getAdminGameModes: (gameId) => apiCall(`/games/admin/${gameId}/modes`),
  createGame: (data) => apiCall('/games/admin/create', { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (gameId, data) =>
    apiCall(`/games/admin/${gameId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (gameId) => apiCall(`/games/admin/${gameId}`, { method: 'DELETE' }),
  getAllGames: () => apiCall('/games/admin/all'),
  createGameMode: (data) => apiCall('/games/modes/admin/create', { method: 'POST', body: JSON.stringify(data) }),
  updateGameMode: (modeId, data) =>
    apiCall(`/games/modes/admin/${modeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGameMode: (modeId) => apiCall(`/games/modes/admin/${modeId}`, { method: 'DELETE' }),
  /** Alias used by Game Management image pickers */
  uploadImage: uploadImageFile,
};

export const dailyAutoMatchService = {
  list: () => apiCall('/daily-auto-matches/admin/list'),
  get: (id) => apiCall(`/daily-auto-matches/admin/${id}`),
  create: (data) => apiCall('/daily-auto-matches/admin', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    apiCall(`/daily-auto-matches/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  activate: (id) => apiCall(`/daily-auto-matches/admin/${id}/activate`, { method: 'POST' }),
  deactivate: (id) => apiCall(`/daily-auto-matches/admin/${id}/deactivate`, { method: 'POST' }),
  duplicate: (id) => apiCall(`/daily-auto-matches/admin/${id}/duplicate`, { method: 'POST' }),
  remove: (id) => apiCall(`/daily-auto-matches/admin/${id}`, { method: 'DELETE' }),
  generateToday: (id) =>
    apiCall(`/daily-auto-matches/admin/${id}/generate-today`, { method: 'POST' }),
  getGenerated: (id) => apiCall(`/daily-auto-matches/admin/${id}/tournaments`),
};

/** Public APK release + soft update check */
export const downloadService = {
  getRelease: () => apiCall('/download/release'),
  checkUpdate: (currentVersion) =>
    apiCall(`/download/check?current=${encodeURIComponent(currentVersion || '0.0.0')}`),
};

