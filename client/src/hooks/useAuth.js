import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configure axios base URL for API calls
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      console.log('fetchUser: Starting user fetch');
      console.log('fetchUser: Authorization header:', axios.defaults.headers.common['Authorization']);
      const response = await axios.get('/api/auth/me');
      console.log('fetchUser: User data received:', response.data);
      setUser(response.data);
    } catch (error) {
      console.error('fetchUser: Error fetching user:', error.response?.data || error.message);
      logout(); // Clear invalid token
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set default axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = (token) => {
    try {
      console.log('useAuth: Attempting to save token');
      localStorage.setItem('token', token);
      const savedToken = localStorage.getItem('token');
      console.log('useAuth: Token saved?', savedToken === token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('useAuth: Fetching user data');
      fetchUser();
    } catch (error) {
      console.error('useAuth: Error during login:', error);
    }
  };

  const loginWithReddit = () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/api/auth/reddit`;
  };

  const value = {
    user,
    login,
    logout,
    loginWithReddit,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};