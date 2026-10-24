/**
 * Authentication & Persona State Management for Smart Real-Time Project Team Finder System.
 */

import api from './api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.profile = null;
    this.token = localStorage.getItem('token') || null;
    this.loading = true;
    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach((cb) => cb({
      user: this.user,
      profile: this.profile,
      token: this.token,
      loading: this.loading,
      isAuthenticated: !!this.user
    }));
  }

  async init() {
    this.loading = true;
    this.notify();

    if (!this.token) {
      this.loading = false;
      this.notify();
      return;
    }

    try {
      const data = await api.getMe();
      this.user = data.user;
      this.profile = data.profile;
    } catch (err) {
      console.warn('Failed to restore session token:', err);
      this.token = null;
      this.user = null;
      this.profile = null;
      localStorage.removeItem('token');
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async login(email, password) {
    const data = await api.login(email, password);
    this.token = data.token;
    this.user = data.user;
    this.profile = data.profile;
    localStorage.setItem('token', data.token);
    this.notify();
    return data;
  }

  async signup(userData) {
    const data = await api.signup(userData);
    this.token = data.token;
    this.user = data.user;
    this.profile = data.profile;
    localStorage.setItem('token', data.token);
    this.notify();
    return data;
  }

  logout() {
    this.token = null;
    this.user = null;
    this.profile = null;
    localStorage.removeItem('token');
    this.notify();
  }

  async refreshUser() {
    if (!this.token) return;
    try {
      const data = await api.getMe();
      this.user = data.user;
      this.profile = data.profile;
      this.notify();
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }

  async switchDemoAccount(role) {
    const credentials = {
      hod: { email: 'hod.cs@college.edu', password: 'HodPass@2026' },
      faculty: { email: 'sarah.jenkins@college.edu', password: 'Password@123' },
      student: { email: 'alex.chen@student.edu', password: 'Password@123' }
    };
    const cred = credentials[role];
    if (cred) {
      return await this.login(cred.email, cred.password);
    }
  }
}

export const auth = new AuthService();
export default auth;
