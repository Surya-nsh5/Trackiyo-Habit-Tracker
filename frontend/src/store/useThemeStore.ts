import { create } from 'zustand';
import api from '../services/api';
import {
  DEFAULT_MODE_SETTING,
  DEFAULT_THEME_ID,
  getThemeTokens,
  isModeSetting,
  isThemeId,
  type ResolvedMode,
  type ThemeId,
  type ThemeModeSetting,
  type ThemeModeTokens,
} from '../theme/themes';

// Storage keys. The inline script in index.html reads these exact keys
// before first paint to prevent a flash of the wrong theme — keep in sync.
export const THEME_ID_KEY = 'trackiyo-theme-id';
export const THEME_MODE_KEY = 'trackiyo-theme-mode';
const LEGACY_COOKIE = 'theme';

function readStoredThemeId(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_ID_KEY);
    if (isThemeId(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_THEME_ID;
}

function readStoredMode(): ThemeModeSetting {
  try {
    const v = localStorage.getItem(THEME_MODE_KEY);
    if (isModeSetting(v)) return v;
    // Migrate the legacy cookie ('light' or anything-else-means-dark).
    const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
    if (match && isModeSetting(decodeURIComponent(match[1]))) {
      return decodeURIComponent(match[1]) as ThemeModeSetting;
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_MODE_SETTING;
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

function resolveDark(mode: ThemeModeSetting): boolean {
  if (mode === 'light') return false;
  if (mode === 'dark') return true;
  return systemPrefersDark();
}

function persist(themeId: ThemeId, mode: ThemeModeSetting): void {
  try {
    localStorage.setItem(THEME_ID_KEY, themeId);
    localStorage.setItem(THEME_MODE_KEY, mode);
    document.cookie = `${LEGACY_COOKIE}=${mode === 'light' ? 'light' : 'dark'}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {
    /* storage unavailable */
  }
}

/** Apply theme + mode to the document. Idempotent. */
function applyToDocument(themeId: ThemeId, dark: boolean): void {
  const root = document.documentElement;
  root.dataset.theme = themeId;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';

  try {
    const mode: ResolvedMode = dark ? 'dark' : 'light';
    const tokens = getThemeTokens(themeId, mode);
    if (tokens) {
      // 1. Centralized Semantic Design Tokens
      root.style.setProperty('--background', tokens.background);
      root.style.setProperty('--surface', tokens.surface);
      root.style.setProperty('--surface-secondary', tokens.surfaceSecondary);
      root.style.setProperty('--surface-elevated', tokens.surfaceElevated);
      root.style.setProperty('--border', tokens.border);
      root.style.setProperty('--border-subtle', tokens.borderSubtle);

      root.style.setProperty('--text-primary', tokens.textPrimary);
      root.style.setProperty('--text-secondary', tokens.textSecondary);
      root.style.setProperty('--text-muted', tokens.textMuted);
      root.style.setProperty('--text-disabled', tokens.textDisabled);

      root.style.setProperty('--primary', tokens.primary);
      root.style.setProperty('--primary-hover', tokens.primaryHover);
      root.style.setProperty('--primary-active', tokens.primaryActive);
      root.style.setProperty('--primary-subtle', tokens.primarySubtle);
      root.style.setProperty('--primary-ink', tokens.primaryInk);

      root.style.setProperty('--success', tokens.success);
      root.style.setProperty('--warning', tokens.warning);
      root.style.setProperty('--danger', tokens.danger);
      root.style.setProperty('--info', tokens.info);

      root.style.setProperty('--focus-ring', tokens.focusRing);

      // 2. Compatibility aliases for existing components and tokens
      root.style.setProperty('--t-bg', tokens.background);
      root.style.setProperty('--t-surface', tokens.surface);
      root.style.setProperty('--t-surface-secondary', tokens.surfaceSecondary);
      root.style.setProperty('--t-elevated', tokens.surfaceElevated);
      root.style.setProperty('--t-surface-hover', tokens.surfaceHover);
      root.style.setProperty('--t-fg', tokens.textPrimary);
      root.style.setProperty('--t-secondary-text', tokens.textSecondary);
      root.style.setProperty('--t-muted', tokens.textMuted);
      root.style.setProperty('--t-border', tokens.border);
      root.style.setProperty('--t-border-subtle', tokens.borderSubtle);
      root.style.setProperty('--t-accent', tokens.primary);
      root.style.setProperty('--t-accent-hover', tokens.primaryHover);
      root.style.setProperty('--t-accent-ink', tokens.primaryInk);
      root.style.setProperty('--t-success', tokens.success);
      root.style.setProperty('--t-warning', tokens.warning);
      root.style.setProperty('--t-error', tokens.danger);
      root.style.setProperty('--t-info', tokens.info);
      root.style.setProperty('--t-shadow', tokens.shadow);

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', tokens.background);
      }

      // Update browser tab favicon icon to match theme color
      const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (favicon && tokens) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${tokens.primaryHover || tokens.primary}"/><stop offset="100%" stop-color="${tokens.primary}"/></linearGradient></defs><rect x="6" y="6" width="108" height="108" rx="30" fill="url(#g)"/><path d="M 27 21 H 73 C 76.8 21 80 24.2 80 28 C 80 31.8 76.8 35 73 35 H 57 V 62 C 57 66.5 60 69.5 64.5 69.5 C 67.5 69.5 70.5 68 72.5 65.5 L 80 73.5 C 75.5 78.5 70 81.5 63 81.5 C 51.5 81.5 43 73 43 62 V 35 H 27 C 23.2 35 20 31.8 20 28 C 20 24.2 23.2 21 27 21 Z" fill="${tokens.primaryInk || '#FFFFFF'}" transform="translate(10, 10)"/></svg>`;
        favicon.href = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      }
    }
  } catch (err) {
    console.error('Failed to apply theme variables:', err);
  }
}

let systemListenerAttached = false;

interface ThemeState {
  /** Active theme. */
  themeId: ThemeId;
  /** Light / dark / follow the OS. */
  modeSetting: ThemeModeSetting;
  /** Resolved mode actually rendered (back-compat with existing consumers). */
  isDarkMode: boolean;
  setThemeId: (id: ThemeId) => void;
  setModeSetting: (mode: ThemeModeSetting) => void;
  /** Back-compat toggle: flips resolved mode explicitly. */
  toggleDarkMode: () => void;
  initializeTheme: () => void;
}

function applyState(themeId: ThemeId, mode: ThemeModeSetting): boolean {
  const dark = resolveDark(mode);
  persist(themeId, mode);
  applyToDocument(themeId, dark);
  return dark;
}

let storageListenerAttached = false;

let syncTimeout: any = null;
function syncThemeToServer(themeId: ThemeId, mode: ThemeModeSetting) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await api.patch('/auth/profile', { theme_id: themeId, theme_mode: mode });
      }
    } catch {}
  }, 350);
}

const initialThemeId = readStoredThemeId();
const initialModeSetting = readStoredMode();
const initialDark = resolveDark(initialModeSetting);

if (typeof document !== 'undefined') {
  applyToDocument(initialThemeId, initialDark);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: initialThemeId,
  modeSetting: initialModeSetting,
  isDarkMode: initialDark,

  setThemeId: (themeId: ThemeId) => {
    if (!isThemeId(themeId)) return;
    const dark = applyState(themeId, get().modeSetting);
    set({ themeId, isDarkMode: dark });
    syncThemeToServer(themeId, get().modeSetting);
  },

  setModeSetting: (mode: ThemeModeSetting) => {
    if (!isModeSetting(mode)) return;
    const dark = applyState(get().themeId, mode);
    set({ modeSetting: mode, isDarkMode: dark });
    syncThemeToServer(get().themeId, mode);
  },

  toggleDarkMode: () => {
    const dark = !get().isDarkMode;
    const mode: ThemeModeSetting = dark ? 'dark' : 'light';
    applyState(get().themeId, mode);
    set({ modeSetting: mode, isDarkMode: dark });
    syncThemeToServer(get().themeId, mode);
  },

  initializeTheme: () => {
    const themeId = readStoredThemeId();
    const modeSetting = readStoredMode();
    const dark = applyState(themeId, modeSetting);
    set({ themeId, modeSetting, isDarkMode: dark });

    // Multi-tab consistency: immediately reflect changes made in another tab
    if (!storageListenerAttached && typeof window !== 'undefined') {
      storageListenerAttached = true;
      window.addEventListener('storage', (e) => {
        if (e.key === THEME_ID_KEY || e.key === THEME_MODE_KEY) {
          const tid = readStoredThemeId();
          const m = readStoredMode();
          const d = applyState(tid, m);
          set({ themeId: tid, modeSetting: m, isDarkMode: d });
        }
      });
    }

    if (!systemListenerAttached && window.matchMedia) {
      systemListenerAttached = true;
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        const { themeId: id, modeSetting: m } = get();
        if (m === 'system') {
          const d = mq.matches;
          applyToDocument(id, d);
          set({ isDarkMode: d });
        }
      };
      mq.addEventListener?.('change', onChange);
    }
  },
}));

/** Design tokens for the active theme + resolved mode (charts, SVG, etc.). */
export function useThemeTokens(): ThemeModeTokens & { mode: ResolvedMode; themeId: ThemeId } {
  const themeId = useThemeStore((s) => s.themeId);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const mode: ResolvedMode = isDarkMode ? 'dark' : 'light';
  return { ...getThemeTokens(themeId, mode), mode, themeId };
}
