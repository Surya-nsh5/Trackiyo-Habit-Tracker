import { create } from 'zustand';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  hasVisited: boolean;
  initialAuthMode: 'login' | 'signup';
  isInitializing: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  startOnboarding: (mode?: 'login' | 'signup') => void;
  resetOnboarding: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  // We use cookie for hasVisited to avoid localStorage
  hasVisited: document.cookie.includes('hasVisited=true'),
  initialAuthMode: 'login',
  isInitializing: true,
  user: null,

  initializeAuth: async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        set({ isAuthenticated: false, user: null, isInitializing: false });
        return;
      }
      const response = await api.get('/auth/me');
      set({ isAuthenticated: true, user: response.data.user, isInitializing: false });
      
      // Set up listener for global unauthorized events (e.g. expired token)
      window.addEventListener('auth:unauthorized', () => {
        set({ isAuthenticated: false, user: null });
      });
    } catch (error) {
      localStorage.removeItem('access_token');
      set({ isAuthenticated: false, user: null, isInitializing: false });
    }
  },

  setUser: (user) => {
    set({ isAuthenticated: !!user, user });
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      document.cookie = 'hasVisited=true; path=/; max-age=31536000'; // 1 year
      
      if (response.data.session?.access_token) {
        localStorage.setItem('access_token', response.data.session.access_token);
      }
      
      set({
        isAuthenticated: true,
        user: response.data.user,
        hasVisited: true
      });
    } catch (error) {
      throw error;
    }
  },

  signup: async (name, email, password) => {
    try {
      const response = await api.post('/auth/signup', { name, email, password });
      document.cookie = 'hasVisited=true; path=/; max-age=31536000';
      
      if (response.data.session?.access_token) {
        localStorage.setItem('access_token', response.data.session.access_token);
      }
      
      set({
        isAuthenticated: true,
        user: response.data.user,
        hasVisited: true
      });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API failed, but clearing local state anyway', error);
    } finally {
      document.cookie = 'hasVisited=false; path=/; max-age=0';
      localStorage.removeItem('access_token');
      set({ isAuthenticated: false, user: null, hasVisited: false });
    }
  },

  startOnboarding: (mode = 'signup') => {
    document.cookie = 'hasVisited=true; path=/; max-age=31536000';
    set({ hasVisited: true, initialAuthMode: mode });
  },

  resetOnboarding: () => {
    document.cookie = 'hasVisited=false; path=/; max-age=0';
    set({ hasVisited: false });
  },

  updateUser: async (data) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null
    }));
  }
}));
