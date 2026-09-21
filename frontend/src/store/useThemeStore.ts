import { create } from 'zustand';
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

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: readStoredThemeId(),
  modeSetting: readStoredMode(),
  // Resolved lazily; initializeTheme() (called on app start) corrects it.
  isDarkMode: true,

  setThemeId: (themeId: ThemeId) => {
    if (!isThemeId(themeId)) return;
    const dark = applyState(themeId, get().modeSetting);
    set({ themeId, isDarkMode: dark });
  },

  setModeSetting: (mode: ThemeModeSetting) => {
    if (!isModeSetting(mode)) return;
    const dark = applyState(get().themeId, mode);
    set({ modeSetting: mode, isDarkMode: dark });
  },

  toggleDarkMode: () => {
    const dark = !get().isDarkMode;
    const mode: ThemeModeSetting = dark ? 'dark' : 'light';
    applyState(get().themeId, mode);
    set({ modeSetting: mode, isDarkMode: dark });
  },

  initializeTheme: () => {
    const themeId = readStoredThemeId();
    const modeSetting = readStoredMode();
    const dark = applyState(themeId, modeSetting);
    set({ themeId, modeSetting, isDarkMode: dark });

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
