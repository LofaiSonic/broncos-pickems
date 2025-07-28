import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configure axios base URL for API calls
axios.defaults.baseURL = 'http://localhost:5000';

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
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
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
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchUser();
  };

  const loginWithReddit = () => {
    window.location.href = 'http://localhost:5000/api/auth/reddit';
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