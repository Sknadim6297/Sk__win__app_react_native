import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfigDiagnostics } from '../utils/apiConfig';
import {
  clearPushTokenOnLogout,
  dismissPendingNotificationNavigation,
} from '../utils/pushNotifications';
import {
  getGuestEntryRoute,
  markPreferLoginAfterLogout,
} from '../utils/welcomeOnboarding';

export const AuthContext = createContext();

const AUTH_TIMEOUT_MS = 20000;

/** Shared headers for browser + ngrok (CORS-safe when backend allows this header). */
function authHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
    ...extra,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = AUTH_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => {
    try {
      controller?.abort();
    } catch {
      /* ignore */
    }
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (/ERR_NGROK_6030|multiple endpoints/i.test(text)) {
      throw new Error(
        'Ngrok has two tunnels on the same URL. Stop extra ngrok windows and keep only one: ngrok http 5000'
      );
    }
    if (/ngrok|You are about to visit/i.test(text)) {
      throw new Error(
        'Ngrok blocked this request. Keep one ngrok tunnel running to port 5000, then try login again.'
      );
    }
    if (response.status === 404 && /not found/i.test(text)) {
      throw new Error(
        'The API server is not running (Render returned Not Found). Open Render Dashboard, start sk-win-api, wait until it is Live, then try again.'
      );
    }
    throw new Error(
      `Server returned an invalid response (HTTP ${response.status}). Is the backend running?`
    );
  }
}

async function persistSession(data) {
  const userRole = data.user?.role || 'user';
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  await AsyncStorage.setItem('userRole', userRole);
  return userRole;
}

async function clearStoredSession() {
  await AsyncStorage.multiRemove(['token', 'user', 'userRole']);
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Cold open while logged out → Landing; after logout → Auth
  const [guestInitialRoute, setGuestInitialRoute] = useState(() => getGuestEntryRoute());

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const resetSessionState = () => {
    setUser(null);
    setToken(null);
    setRole(null);
    setIsAuthenticated(false);
  };

  const preferLoginScreen = () => {
    markPreferLoginAfterLogout();
    setGuestInitialRoute('Auth');
  };

  const checkAuthStatus = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('user');
      const savedRole = await AsyncStorage.getItem('userRole');

      if (!savedToken || !savedUser) {
        return;
      }

      const apiUrl = getApiUrl();
      const profileRes = await fetchWithTimeout(`${apiUrl}/users/profile`, {
        headers: authHeaders({ Authorization: `Bearer ${savedToken}` }),
      });

      if (!profileRes.ok) {
        if (__DEV__) {
          console.log('[Auth] Stored session invalid — clearing (DB reset or user deleted)');
        }
        await clearStoredSession();
        preferLoginScreen();
        resetSessionState();
        return;
      }

      const profile = await parseJsonResponse(profileRes);
      const parsedUser = JSON.parse(savedUser);
      const mergedUser = { ...parsedUser, ...profile, role: profile.role || parsedUser.role };
      const restoredRole = profile.role || savedRole || mergedUser.role || 'user';

      await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
      await AsyncStorage.setItem('userRole', restoredRole);

      setToken(savedToken);
      setUser(mergedUser);
      setRole(restoredRole);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Keep offline session briefly only if network flake — clear to avoid stuck blank admin/web
      await clearStoredSession().catch(() => {});
      preferLoginScreen();
      resetSessionState();
    } finally {
      setIsLoading(false);
    }
  };

  const applySession = (data) => {
    const userRole = data.user?.role || 'user';
    setToken(data.token);
    setUser(data.user);
    setRole(userRole);
    setIsAuthenticated(true);
    return userRole;
  };

  const updateUser = async (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  };

  const login = async (identifier, password) => {
    const apiUrl = getApiUrl();
    try {
      const loginId = String(identifier || '').trim();
      const response = await fetchWithTimeout(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          identifier: loginId,
          email: loginId,
          password,
        }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Login failed',
          status: response.status,
        };
      }

      if (!data.token || !data.user) {
        return { success: false, error: 'Invalid server response' };
      }

      const userRole = data.user?.role || 'user';
      await dismissPendingNotificationNavigation();
      await persistSession(data);
      applySession(data);

      if (__DEV__) {
        console.log('[Auth] Login OK', {
          email: data.user?.email,
          role: userRole,
          api: apiUrl,
          hasToken: Boolean(data.token),
        });
      }

      return { success: true, user: data.user, role: userRole };
    } catch (error) {
      console.error('Login error:', error);
      const diag = getApiConfigDiagnostics();
      const aborted = error?.name === 'AbortError';
      const message = aborted
        ? `Login timed out talking to ${apiUrl}. The Render API may be waking up — wait 1 minute and try again.`
        : error.message?.includes('Network request failed') ||
            error.message?.includes('Failed to fetch')
          ? diag.isPrivate
            ? `Cannot reach server at ${apiUrl}. Start backend (npm run dev in /backend) and refresh.`
            : `Cannot reach server at ${apiUrl}. Check internet, and that sk-win-api is Live on Render.`
          : error.message || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (payload = {}) => {
    const apiUrl = getApiUrl();
    try {
      const {
        firstName = '',
        lastName = '',
        username = '',
        email = '',
        phone = '',
        password = '',
        referralCode = '',
      } = payload;

      const response = await fetchWithTimeout(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          username: String(username).trim(),
          email: String(email).trim().toLowerCase(),
          phone: String(phone).trim(),
          password,
          referralCode: String(referralCode).trim(),
        }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Registration failed',
          status: response.status,
        };
      }

      if (data.token && data.user) {
        await dismissPendingNotificationNavigation();
        await persistSession(data);
        applySession(data);
        return {
          success: true,
          user: data.user,
          referralApplied: Boolean(data.referralApplied),
          autoLogin: true,
        };
      }

      return {
        success: true,
        user: data.user,
        referralApplied: Boolean(data.referralApplied),
        autoLogin: false,
      };
    } catch (error) {
      console.error('Registration error:', error);
      const aborted = error?.name === 'AbortError';
      const message = aborted
        ? `Registration timed out talking to ${apiUrl}.`
        : error.message?.includes('Network request failed') ||
            error.message?.includes('Failed to fetch')
          ? `Cannot reach server at ${apiUrl}. Start backend and check your network.`
          : error.message || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async (idToken) => {
    const apiUrl = getApiUrl();
    try {
      const response = await fetchWithTimeout(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ idToken }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error:
              'Google sign-in API is not deployed on this server. Redeploy the backend to Render and set GOOGLE_* environment variables.',
            status: 404,
            code: data.code,
          };
        }
        return {
          success: false,
          error: data.error || data.message || 'Google sign-in failed',
          status: response.status,
          code: data.code,
        };
      }

      if (!data.token || !data.user) {
        return { success: false, error: 'Invalid server response' };
      }

      await dismissPendingNotificationNavigation();
      await persistSession(data);
      applySession(data);

      return {
        success: true,
        user: data.user,
        role: data.user?.role || 'user',
        isNewUser: Boolean(data.isNewUser),
      };
    } catch (error) {
      console.error('Google login error:', error);
      const diag = getApiConfigDiagnostics();
      const aborted = error?.name === 'AbortError';
      const message = aborted
        ? `Google sign-in timed out talking to ${apiUrl}.`
        : error.message?.includes('Network request failed') ||
            error.message?.includes('Failed to fetch')
          ? diag.isPrivate
            ? `Cannot reach server at ${apiUrl}. Start backend and try again.`
            : `Cannot reach server at ${apiUrl}. Check internet / ngrok.`
          : error.message || 'Google sign-in failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // Don't let a slow/hanging push cleanup block web logout
      await Promise.race([
        clearPushTokenOnLogout().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      /* ignore */
    }

    try {
      await clearStoredSession();
    } catch (error) {
      console.error('Logout storage clear error:', error);
    }

    // Web: rewrite URL before clearing auth state so the remounted guest navigator
    // reads /login instead of an authenticated path like /profile or /home.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const path = String(window.location?.pathname || '');
        if (!/\/(login|signin|welcome|register|signup)\/?$/i.test(path)) {
          window.history.replaceState({}, '', '/login');
        }
      } catch {
        /* ignore */
      }
    }

    // Next guest stack must open on login, not welcome
    preferLoginScreen();
    resetSessionState();
  };

  const getAuthToken = () => token;
  const isAdmin = () => role === 'admin' || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        role,
        isLoading,
        guestInitialRoute,
        login,
        loginWithGoogle,
        register,
        logout,
        getAuthToken,
        updateUser,
        isAdmin,
        getApiUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
