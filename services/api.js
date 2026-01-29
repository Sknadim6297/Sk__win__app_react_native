import AsyncStorage from '@react-native-async-storage/async-storage';

// Your machine's IP address (192.168.31.216)
const API_URL = 'http://192.168.31.216:5000/api';

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

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// User Services
export const userService = {
  getProfile: () => apiCall('/users/profile'),
  updateKYC: (kycData) => apiCall('/users/kyc', {
    method: 'POST',
    body: JSON.stringify(kycData),
  }),
};

// Wallet Services
export const walletService = {
  getBalance: () => apiCall('/wallet/balance'),
  topup: (amount, paymentMethod, transactionId) => apiCall('/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ amount, paymentMethod, transactionId }),
  }),
  withdraw: (amount, bankDetails) => apiCall('/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount, bankDetails }),
  }),
  getHistory: () => apiCall('/wallet/history'),
};

// Tournament Services
export const tournamentService = {
  getList: () => apiCall('/tournaments/list'),
  getDetails: (id) => apiCall(`/tournaments/${id}/details`),
  canJoin: (id) => apiCall(`/tournaments/${id}/canJoin`),
  join: (id) => apiCall(`/tournaments/${id}/join`, {
    method: 'POST',
  }),
  getRoomInfo: (id) => apiCall(`/tournaments/${id}/room-info`),
  getResults: (id) => apiCall(`/tournaments/${id}/results`),
  getHistory: () => apiCall('/tournaments/user/history'),
  
  // Admin endpoints
  createTournament: (data) => apiCall('/tournaments/admin/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAllTournaments: () => apiCall('/tournaments/admin/all'),
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
  deleteTournament: (id) => apiCall(`/tournaments/admin/${id}`, {
    method: 'DELETE',
  }),
};

// Admin Services
export const adminService = {
  getAllUsers: () => apiCall('/admin/all'),
  getStats: () => apiCall('/admin/stats'),
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
};
