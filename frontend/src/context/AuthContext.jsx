import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check login status on reload
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('dream_token');
      if (token) {
        try {
          const data = await authAPI.getMe();
          setUser(data.user);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Session verification failed, logging out:', err.message);
          localStorage.removeItem('dream_token');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authAPI.login({ email, password });
      localStorage.setItem('dream_token', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return data.user;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password) => {
    setLoading(true);
    try {
      const data = await authAPI.signup({ username, email, password });
      localStorage.setItem('dream_token', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return data.user;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('dream_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateAvatar: (avatarUrl) => {
      setUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : prev));
    },
    refreshProfile: async () => {
      try {
        const data = await authAPI.getMe();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to refresh user profile:', err.message);
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
