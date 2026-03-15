import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Backend API URL - Update this to your actual backend URL
// For local testing: http://localhost:5000/api (Expo dev server) or http://172.20.10.3:5000/api (physical device)
// For production: https://your-deployed-backend.com/api

const getApiUrl = () => {
  // Explicit override from app.json extra
  const extra =
    Constants.expoConfig?.extra?.apiUrl ||
    Constants.manifest?.extra?.apiUrl;
  if (extra) return extra;

  // Web: derive from browser location
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    return `http://${host === '127.0.0.1' ? 'localhost' : host}:5000/api`;
  }

  // iOS/Android in Expo dev: use the Expo dev server host IP
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

// Test API connectivity
export const testAPIConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, { timeout: 3000 });
    if (response.ok) return API_URL;
  } catch (error) {
    console.log(`Failed to connect to ${API_URL}:`, error.message);
  }
  return null;
};

// Helper function to make API calls with auth
export const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Ensure body is properly stringified if it's an object
    let body = options.body;
    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
    }

    const fetchOptions = {
      method: options.method || 'GET',
      headers,
      ...(body && { body }),
    };

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
    );

    const fetchPromise = fetch(`${API_URL}${endpoint}`, fetchOptions);
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Server returned ${contentType || 'non-JSON'} response. Check if backend is running.`);
    }

    const data = await response.json();

    if (!response.ok) {
      // Return error response with message
      const errorMessage = data.message || data.error || 'API Error';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    // Enhanced error logging for debugging
    console.log('API Call Error Details:');
    console.log('Endpoint:', endpoint);
    console.log('API URL:', API_URL);
    console.log('Error:', error.message);
    console.log('Error Type:', error.constructor.name);
    
    if (error.message.includes('Network request failed') || error.message.includes('timeout')) {
      throw new Error('Unable to connect to server. Please check your internet connection and ensure the server is running.');
    }
    
    throw error;
  }
};

const getFileMetadata = (fileUri) => {
  const uriParts = fileUri.split('/');
  const fileName = uriParts[uriParts.length - 1] || `upload_${Date.now()}.jpg`;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const typeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const type = typeMap[extension] || 'image/jpeg';
  return { fileName, type };
};

export const uploadImageFile = async (fileUri) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const { fileName, type } = getFileMetadata(fileUri);

    const formData = new FormData();
    formData.append('image', {
      uri: fileUri,
      name: fileName,
      type,
    });

    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response. Check upload endpoint.');
    }

    const data = await response.json();
    if (!response.ok) {
      const errorMessage = data.message || data.error || 'Upload failed';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.log('Upload Error:', error.message);
    throw error;
  }
};

// User Services
export const userService = {
  getProfile: () => apiCall('/users/profile'),
  updateProfile: (profileData) => apiCall('/users/profile', {
    method: 'PUT',
    body: profileData, // Let apiCall handle stringify
  }),
  changePassword: (passwordData) => apiCall('/users/change-password', {
    method: 'POST',
    body: passwordData, // Let apiCall handle stringify
  }),
};

// Wallet Services
export const walletService = {
  getBalance: () => apiCall('/wallet/balance'),
  topup: (topupData) => apiCall('/wallet/topup', {
    method: 'POST',
    body: topupData, // Let apiCall handle stringify
  }),
  withdraw: (withdrawData) => apiCall('/wallet/withdraw', {
    method: 'POST',
    body: withdrawData, // Let apiCall handle stringify
  }),
  getHistory: () => apiCall('/wallet/history'),
};

// Tournament Services
export const tournamentService = {
  getList: () => apiCall('/tournaments/list'),
  getMyTournaments: () => apiCall('/tournaments/my-tournaments'),
  getDetails: (id) => apiCall(`/tournaments/${id}/details`),
  canJoin: (id) => apiCall(`/tournaments/${id}/canJoin`),
  join: (id) => apiCall(`/tournaments/${id}/join`, {
    method: 'POST',
  }),
  getRoomInfo: (id) => apiCall(`/tournaments/${id}/room-info`),
  getResults: (id) => apiCall(`/tournaments/${id}/results`),
  getHistory: () => apiCall('/tournaments/user/history'),
  
  // Slot booking endpoints
  getSlots: (id) => apiCall(`/tournaments/${id}/slots`),
  bookSlot: (id, slotNumber, gamingUsername) => apiCall(`/tournaments/${id}/book-slot`, {
    method: 'POST',
    body: JSON.stringify({ slotNumber, gamingUsername }),
  }),
  confirmSlotBooking: (id, slotNumber, gamingUsername) => apiCall(`/tournaments/${id}/confirm-slot-booking`, {
    method: 'POST',
    body: JSON.stringify({ slotNumber, gamingUsername }),
  }),
  
  // Admin endpoints
  createTournament: (data) => apiCall('/tournaments/admin/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTournament: (id, data) => apiCall(`/tournaments/admin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getAllTournaments: () => apiCall('/tournaments/admin/all'),
  getTournamentsByGameMode: (gameModeId) => apiCall(`/tournaments/admin/by-gamemode/${gameModeId}`),
  getTournamentHistory: () => apiCall('/tournaments/admin/history'),
  getTournamentParticipants: (id) => apiCall(`/tournaments/admin/${id}/participants`),
  submitResults: (id, payload) => apiCall(`/tournaments/admin/${id}/results`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateStatus: (id, status) => apiCall(`/tournaments/admin/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  setRoomDetails: (id, roomId, roomPassword, showRoomCredentials = false) => apiCall(`/tournaments/admin/${id}/room`, {
    method: 'PUT',
    body: JSON.stringify({ roomId, roomPassword, showRoomCredentials }),
  }),
  selectWinners: (id, firstWinnerId, secondWinnerId, thirdWinnerId) => 
    apiCall(`/tournaments/admin/${id}/winners`, {
    method: 'POST',
    body: JSON.stringify({ firstWinnerId, secondWinnerId, thirdWinnerId }),
  }),
  distributePrizes: (id) => apiCall(`/tournaments/admin/${id}/distribute-prizes`, {
    method: 'POST',
  }),
  distributeRewards: (id) => apiCall(`/tournaments/admin/${id}/distribute-prizes`, {
    method: 'POST',
  }),
  deleteTournament: (id) => apiCall(`/tournaments/admin/${id}`, {
    method: 'DELETE',
  }),
  lockTournament: (id, locked) => apiCall(`/tournaments/admin/${id}/lock`, {
    method: 'POST',
    body: JSON.stringify({ locked }),
  }),
  setTournamentWinners: (tournamentId, winners) => apiCall(`/admin/tournaments/${tournamentId}/set-winners`, {
    method: 'POST',
    body: JSON.stringify({ winners }),
  }),
  completeTournament: (tournamentId) => apiCall(`/admin/tournaments/${tournamentId}/complete`, {
    method: 'POST',
  }),
};

// Tutorial Services
export const tutorialService = {
  getPublicList: () => apiCall('/tutorials'),
  getAdminList: () => apiCall('/tutorials/admin/list'),
  create: (data) => apiCall('/tutorials/admin/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/tutorials/admin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  remove: (id) => apiCall(`/tutorials/admin/${id}`, {
    method: 'DELETE',
  }),
};

// Notification Services
export const notificationService = {
  getAll: () => apiCall('/notifications'),
  getUnreadCount: () => apiCall('/notifications/unread/count'),
  markRead: (id) => apiCall(`/notifications/${id}/read`, {
    method: 'PUT',
  }),
  markAllRead: () => apiCall('/notifications/read/all', {
    method: 'PUT',
  }),
};

// Admin Services
export const adminService = {
  getAllUsers: () => apiCall('/admin/all'),
  getStats: () => apiCall('/admin/stats'),
  getUserDetails: (userId) => apiCall(`/admin/user/${userId}/details`),
  suspendUser: (userId) => apiCall(`/admin/suspend/${userId}`, {
    method: 'POST',
  }),
  banUser: (userId, reason) => apiCall(`/admin/ban/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  activateUser: (userId) => apiCall(`/admin/activate/${userId}`, {
    method: 'POST',
  }),
  verifyUser: (userId) => apiCall(`/admin/verify/${userId}`, {
    method: 'POST',
  }),
  // Tournament winner and completion endpoints
  setTournamentWinners: (tournamentId, winners) => apiCall(`/admin/tournaments/${tournamentId}/set-winners`, {
    method: 'POST',
    body: JSON.stringify({ winners }),
  }),
  completeTournament: (tournamentId) => apiCall(`/admin/tournaments/${tournamentId}/complete`, {
    method: 'POST',
  }),
};
// Games Services
export const gameService = {
  // Get all popular games for home screen
  getPopularGames: () => apiCall('/games/popular'),
  
  // Get all games
  getGamesList: () => apiCall('/games/list'),
  
  // Get specific game details
  getGameDetails: (gameId) => apiCall(`/games/${gameId}`),
  
  // Get game modes for a specific game
  getGameModes: (gameId) => apiCall(`/games/${gameId}/modes`),
  
  // Admin endpoints
  createGame: (data) => apiCall('/games/admin/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateGame: (gameId, data) => apiCall(`/games/admin/${gameId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteGame: (gameId) => apiCall(`/games/admin/${gameId}`, {
    method: 'DELETE',
  }),
  getAllGames: () => apiCall('/games/admin/all'),
  
  // Game modes
  createGameMode: (data) => apiCall('/games/modes/admin/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateGameMode: (modeId, data) => apiCall(`/games/modes/admin/${modeId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteGameMode: (modeId) => apiCall(`/games/modes/admin/${modeId}`, {
    method: 'DELETE',
  }),
  uploadImage: (fileUri) => uploadImageFile(fileUri),
};