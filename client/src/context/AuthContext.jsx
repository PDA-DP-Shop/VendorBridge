import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vendorbridge_token'));
  // Only show loading spinner when we actually have a token to verify
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem('vendorbridge_token'));

  // Verify token on mount — clear stale tokens immediately
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('vendorbridge_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data && res.data.success) {
          setUser(res.data.user);
        } else {
          // Token invalid — wipe it cleanly
          localStorage.removeItem('vendorbridge_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        // 401/404 = stale/invalid token — clear silently
        console.warn('Session expired or invalid token. Clearing local session.');
        localStorage.removeItem('vendorbridge_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []); // Run ONCE on mount only — not on token change (avoids race conditions)

  // Login action
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data && res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        localStorage.setItem('vendorbridge_token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, message: 'Invalid response from server.' };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message: errMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Register action — does NOT touch isLoading (Register.jsx uses its own `submitting` state)
  const register = async (userData) => {
    try {
      // Always clear any old stale token before registering
      localStorage.removeItem('vendorbridge_token');

      const res = await api.post('/auth/register', userData);
      if (res.data && res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        localStorage.setItem('vendorbridge_token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, message: 'Unexpected response from server. Please try again.' };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message: errMsg };
    }
  };

  // Logout action
  const logout = () => {
    localStorage.removeItem('vendorbridge_token');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
