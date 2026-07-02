import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { candidateServerUrls } from '../config/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      const adminStatus = await AsyncStorage.getItem('isAdmin');

      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAdmin(adminStatus === 'true');
      }
    } catch (error) {
      console.error('Failed to restore token:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user, isAdmin } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('isAdmin', String(isAdmin || false));

      setUser(user);
      setIsAdmin(isAdmin || false);
      return { success: true };
    } catch (error) {
      const isNetworkError = error.code === 'ECONNABORTED' || !error.response || error.message.includes('Network');
      const triedUrls = candidateServerUrls.map(url => `${url}/api`).join('\n');
      const serverMessage = error.response?.data?.message || 'Invalid email or password';
      return {
        success: false,
        error: isNetworkError
          ? `Cannot connect to the backend.\n\nTried:\n${triedUrls}\n\nFix:\n1. Start backend: cd backend && npm run dev\n2. Phone + PC on same Wi-Fi\n3. Set EXPO_PUBLIC_API_URL in frontend/.env to your PC IP (ipconfig)\n4. Restart Expo: npx expo start -c`
          : serverMessage,
      };
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return { success: true, message: response.data?.message || 'Reset code sent to your email' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to request reset code',
      };
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { email, code, newPassword });
      return { success: true, message: response.data?.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reset password',
      };
    }
  };

  const signup = async (name, email, password, userType = 'customer') => {
    try {
      const response = await api.post('/auth/signup', {
        name,
        email,
        password,
        userType,
      });
      const { token, user } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('isAdmin', 'false');

      setUser(user);
      setIsAdmin(false);
      return { success: true };
    } catch (error) {
      const isNetworkError = error.code === 'ECONNABORTED' || !error.response;
      return {
        success: false,
        error: isNetworkError
          ? `Cannot connect to server at ${error.config?.baseURL || api.defaults.baseURL}. Make sure the backend is running.`
          : error.response?.data?.message || 'Signup failed',
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isAdmin');
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, signup, logout, requestPasswordReset, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
