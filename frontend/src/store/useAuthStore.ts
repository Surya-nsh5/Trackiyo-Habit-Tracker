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
  // In-memory only — resets to false on every page load.
  // True only when the user explicitly clicks Login / Sign Up on the landing page.
  showAuth: boolean;
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
  updatePassword: (newPassword: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY   = 'access_token';
const REFRESH_KEY = 'refresh_token';
const EXPIRY_KEY  = 'token_expiry'; // Unix ms

function saveSession(accessToken: string, refreshToken: string, expiresIn: number) {
  localStorage.setItem(TOKEN_KEY,   accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  // Store expiry 60 s early so we refresh before the server rejects it
  localStorage.setItem(EXPIRY_KEY,  String(Date.now() + (expiresIn - 60) * 1000));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

function isTokenExpired(): boolean {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= Number(expiry);
}

/** Silently swap the access token using the stored refresh token.
 *  Returns true on success, false if the refresh token is missing / invalid. */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  try {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    const { session } = response.data;
    if (session?.access_token) {
      saveSession(
        session.access_token,
        session.refresh_token ?? refreshToken,
        session.expires_in ?? 3600
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hasVisited: document.cookie.includes('hasVisited=true'),
  showAuth: false, // always starts false — user must click to open auth
  initialAuthMode: 'login',
  isInitializing: true,
  user: null,

  initializeAuth: async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        set({ isAuthenticated: false, user: null, isInitializing: false });
        return;
      }

      // Silently refresh if the token has expired (or is about to)
      if (isTokenExpired()) {
        const ok = await refreshAccessToken();
        if (!ok) {
          clearSession();
          set({ isAuthenticated: false, user: null, isInitializing: false });
          return;
        }
      }

      const response = await api.get('/auth/me');
      set({ isAuthenticated: true, user: response.data.user, isInitializing: false });

      // Handle 401s that slip through (token revoked server-side)
      window.addEventListener('auth:unauthorized', async () => {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearSession();
          set({ isAuthenticated: false, user: null });
        }
      }, { once: true });

    } catch {
      clearSession();
      set({ isAuthenticated: false, user: null, isInitializing: false });
    }
  },

  setUser: (user) => {
    set({ isAuthenticated: !!user, user });
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    document.cookie = 'hasVisited=true; path=/; max-age=31536000';

    const { session, user } = response.data;
    if (session?.access_token) {
      saveSession(
        session.access_token,
        session.refresh_token ?? '',
        session.expires_in ?? 3600
      );
    }

    set({ isAuthenticated: true, user, hasVisited: true, showAuth: false });
  },

  signup: async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    document.cookie = 'hasVisited=true; path=/; max-age=31536000';

    const { session, user } = response.data;
    if (session?.access_token) {
      saveSession(
        session.access_token,
        session.refresh_token ?? '',
        session.expires_in ?? 3600
      );
    }

    set({ isAuthenticated: true, user, hasVisited: true, showAuth: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API failed, clearing local state anyway', error);
    } finally {
      document.cookie = 'hasVisited=false; path=/; max-age=0';
      clearSession();
      set({ isAuthenticated: false, user: null, hasVisited: false, showAuth: false });
    }
  },

  // Called by landing page buttons — this is the ONLY way showAuth becomes true
  startOnboarding: (mode = 'signup') => {
    document.cookie = 'hasVisited=true; path=/; max-age=31536000';
    set({ hasVisited: true, showAuth: true, initialAuthMode: mode });
  },

  resetOnboarding: () => {
    document.cookie = 'hasVisited=false; path=/; max-age=0';
    set({ hasVisited: false, showAuth: false });
  },

  updateUser: async (data) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    }));
  },

  updatePassword: async (newPassword) => {
    try {
      await api.post('/auth/password', { password: newPassword });
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || 'Could not update password. Please try again.');
    }
  },
}));
