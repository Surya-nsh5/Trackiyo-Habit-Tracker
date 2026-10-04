import { create } from 'zustand';
import api from '../services/api';
import { useThemeStore } from './useThemeStore';
import { secureAuthStorage } from '../services/secureAuthStorage';

export interface UserNotificationPreferences {
  taskReminders?: boolean;
  habitReminders?: boolean;
  wellnessReminders?: boolean;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  life_areas?: string[];
  theme_id?: string;
  theme_mode?: string;
  notification_preferences?: UserNotificationPreferences;
  gamification_enabled?: boolean;
  xp?: number;
  level?: number;
  unlocked_achievements?: string[];
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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (name: string, email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  startOnboarding: (mode?: 'login' | 'signup') => void;
  resetOnboarding: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function clearUserCaches() {
  const cacheKeys = [
    'trackiyo_cached_tasks',
    'trackiyo_cached_projects',
    'trackiyo_cached_journal',
    'trackiyo_cached_focus_sessions',
    'trackiyo_cached_gamification',
    'trackiyo_life_areas',
    'trackiyo_cached_captures'
  ];
  cacheKeys.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
}

/** Silently swap the access token using the stored refresh token.
 *  Returns true on success, false if the refresh token is missing / invalid. */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = secureAuthStorage.getRefreshToken() || localStorage.getItem('refresh_token');
  if (!refreshToken) return false;
  try {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    const { session } = response.data;
    if (session?.access_token) {
      await secureAuthStorage.saveSession(
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

let authListenerAttached = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  hasVisited: document.cookie.includes('hasVisited=true'),
  showAuth: false, // always starts false — user must click to open auth
  initialAuthMode: 'login',
  isInitializing: true,
  user: null,

  initializeAuth: async () => {
    try {
      // 1. Check whether a valid secure authentication session exists
      const session = await secureAuthStorage.init();
      if (!session || !session.accessToken) {
        set({ isAuthenticated: false, user: null, isInitializing: false });
        return;
      }

      // 2. Silently refresh if the token has expired (or is about to)
      if (secureAuthStorage.isExpired()) {
        const ok = await refreshAccessToken();
        if (!ok) {
          await secureAuthStorage.clearSession();
          clearUserCaches();
          set({ isAuthenticated: false, user: null, isInitializing: false });
          return;
        }
      }

      // 3. Load user profile with verified session
      const response = await api.get('/auth/me');
      const loadedUser: User = response.data.user;
      set({ isAuthenticated: true, user: loadedUser, isInitializing: false });

      // Hydrate Life Areas cache if returned from database
      if (loadedUser?.life_areas && Array.isArray(loadedUser.life_areas) && loadedUser.life_areas.length > 0) {
        try {
          localStorage.setItem('trackiyo_life_areas', JSON.stringify(loadedUser.life_areas));
        } catch {}
      }

      // Hydrate Theme & Mode from database profile across devices
      if (loadedUser?.theme_id) {
        useThemeStore.getState().setThemeId(loadedUser.theme_id as any);
      }
      if (loadedUser?.theme_mode) {
        useThemeStore.getState().setModeSetting(loadedUser.theme_mode as any);
      }

      // Handle 401s that slip through when refresh fails or session is revoked
      if (!authListenerAttached && typeof window !== 'undefined') {
        authListenerAttached = true;
        window.addEventListener('auth:unauthorized', async () => {
          await secureAuthStorage.clearSession();
          clearUserCaches();
          set({ isAuthenticated: false, user: null, showAuth: false });
        });
      }

    } catch {
      await secureAuthStorage.clearSession();
      clearUserCaches();
      set({ isAuthenticated: false, user: null, isInitializing: false });
    }
  },

  setUser: (user) => {
    set({ isAuthenticated: !!user, user });
  },

  login: async (email, password, rememberMe = true) => {
    // Clear any previous user's cached data to ensure multi-user isolation
    clearUserCaches();

    const response = await api.post('/auth/login', { email, password });
    document.cookie = 'hasVisited=true; path=/; max-age=31536000';

    const { session, user } = response.data;
    if (session?.access_token) {
      await secureAuthStorage.saveSession(
        session.access_token,
        session.refresh_token ?? '',
        session.expires_in ?? 3600,
        rememberMe
      );
    }

    if (user?.life_areas && Array.isArray(user.life_areas) && user.life_areas.length > 0) {
      try {
        localStorage.setItem('trackiyo_life_areas', JSON.stringify(user.life_areas));
      } catch {}
    }

    if (user?.theme_id) {
      useThemeStore.getState().setThemeId(user.theme_id as any);
    }
    if (user?.theme_mode) {
      useThemeStore.getState().setModeSetting(user.theme_mode as any);
    }

    set({ isAuthenticated: true, user, hasVisited: true, showAuth: false });
  },

  signup: async (name, email, password, rememberMe = true) => {
    // Clear any previous user's cached data to ensure multi-user isolation
    clearUserCaches();

    const response = await api.post('/auth/signup', { name, email, password });
    document.cookie = 'hasVisited=true; path=/; max-age=31536000';

    const { session, user } = response.data;
    if (session?.access_token) {
      await secureAuthStorage.saveSession(
        session.access_token,
        session.refresh_token ?? '',
        session.expires_in ?? 3600,
        rememberMe
      );
    }

    set({ isAuthenticated: true, user, hasVisited: true, showAuth: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Offline or network error: still proceed with client-side cleanup
    } finally {
      document.cookie = 'hasVisited=false; path=/; max-age=0';
      await secureAuthStorage.clearSession();
      clearUserCaches();
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
    const prevUser = get().user;
    // Optimistic update
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    }));

    try {
      const response = await api.patch('/auth/profile', data);
      if (response.data?.user) {
        set({ user: response.data.user });
      }
    } catch (error) {
      console.error('Failed to update user profile on server, rolling back', error);
      set({ user: prevUser });
      throw error;
    }
  },

  updatePassword: async (newPassword) => {
    try {
      await api.post('/auth/password', { password: newPassword });
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || 'Could not update password. Please try again.');
    }
  },
}));
