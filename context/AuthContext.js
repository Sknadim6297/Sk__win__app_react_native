import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfigDiagnostics } from '../utils/apiConfig';

export const AuthContext = createContext();

const AUTH_TIMEOUT_MS = 20000;

/** Shared headers for browser + ngrok (CORS-safe when backend allows this header). */
function authHeaders(extra = {}) {
  return {
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
    throw new Error('Server returned an invalid response. Is the backend running?');
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const resetSessionState = () => {
    setUser(null);
    setToken(null);
    setRole(null);
    setIsAuthenticated(false);
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

  const login = async (email, password) => {
    const apiUrl = getApiUrl();
    try {
      const response = await fetchWithTimeout(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
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
        ? `Login timed out talking to ${apiUrl}. Is the backend running on port 5000?`
        : error.message?.includes('Network request failed') ||
            error.message?.includes('Failed to fetch')
          ? diag.isPrivate
            ? `Cannot reach server at ${apiUrl}. Start backend (npm run dev in /backend) and refresh.`
            : `Cannot reach server at ${apiUrl}. Check internet / ngrok / CORS.`
          : error.message || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password, referralCode = '') => {
    const apiUrl = getApiUrl();
    try {
      const response = await fetchWithTimeout(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword: password,
          referralCode: referralCode.trim(),
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

  const logout = async () => {
    try {
      await clearStoredSession();
      resetSessionState();
    } catch (error) {
      console.error('Logout error:', error);
    }
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
        login,
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
