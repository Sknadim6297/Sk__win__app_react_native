import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const AuthContext = createContext();

const DEFAULT_API_URLS = [
  'http://192.168.31.216:5000/api',
  'http://localhost:5000/api',
  'http://127.0.0.1:5000/api',
];

const EXTRA_API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  null;

const API_URL = EXTRA_API_URL || DEFAULT_API_URLS[0];

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null); // Track role separately for persistence
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('user');
      const savedRole = await AsyncStorage.getItem('userRole'); // Restore role from storage
      
      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Restore role from storage or from user object
        const restoredRole = savedRole || parsedUser.role || 'user';
        setRole(restoredRole);
        setIsAuthenticated(true);
        
        console.log(`Auth status restored - Role: ${restoredRole}, User: ${parsedUser.username}`);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
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
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      const userRole = data.user.role || 'user';
      
      // Store token, user, and role persistently
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      await AsyncStorage.setItem('userRole', userRole); // Persist role explicitly
      
      setToken(data.token);
      setUser(data.user);
      setRole(userRole); // Set role in state
      setIsAuthenticated(true);

      console.log(`Login successful - Role: ${userRole}, Email: ${email}`);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          email, 
          password,
          confirmPassword: password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('userRole'); // Clear role on logout
      setUser(null);
      setToken(null);
      setRole(null); // Clear role from state
      setIsAuthenticated(false);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAuthToken = () => token;

  // Helper function to check if user is admin
  const isAdmin = () => role === 'admin';

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
        isAdmin, // Expose admin check function
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
