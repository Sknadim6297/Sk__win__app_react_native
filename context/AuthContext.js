import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      // Mock authentication - in production, this would call an API
      // Check if admin credentials
      const isAdmin = username.toLowerCase() === 'admin' && password === 'admin123';
      
      const userData = {
        id: Date.now().toString(),
        username: username,
        email: `${username}@skwin.com`,
        role: isAdmin ? 'admin' : 'user',
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true, isAdmin };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      // Mock registration - in production, this would call an API
      const userData = {
        id: Date.now().toString(),
        username: username,
        email: email,
        role: 'user', // Regular users are not admins
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true, isAdmin: false };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
