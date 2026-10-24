import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Load user profile on mount
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getMe();
        setUser(data.user);
        setProfile(data.profile);
      } catch (err) {
        console.error('Failed to load authenticated user:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const signup = async (userData) => {
    const data = await api.signup(userData);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const data = await api.getMe();
        setUser(data.user);
        setProfile(data.profile);
      } catch (err) {
        console.error('Refresh user error:', err);
      }
    }
  };

  // Quick Switch for testing/demo personas
  const switchDemoAccount = async (role) => {
    const credentials = {
      hod: { email: 'hod.cs@college.edu', password: 'HodPass@2026' },
      faculty: { email: 'sarah.jenkins@college.edu', password: 'Password@123' },
      student: { email: 'alex.chen@student.edu', password: 'Password@123' }
    };
    const cred = credentials[role];
    if (cred) {
      await login(cred.email, cred.password);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
        switchDemoAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
