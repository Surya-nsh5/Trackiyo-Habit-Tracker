import { useThemeStore } from './store/useThemeStore';
import { getThemeTokens } from './theme/themes';
import { closeTopOverlay } from './utils/overlayStack';

let initialized = false;

/**
 * Native-only bootstrap (Android shell). Everything here is lazy-imported
 * so the web bundle stays untouched, and every step is guarded — on a
 * normal browser this is a silent no-op.
 *
 * Handled natively:
 * - Android back button: close top overlay first, else exit at root.
 * - Status bar: non-overlay, themed background + icon style, kept in sync
 *   with the app's theme/mode.
 * - Splash screen: hidden once the app is up (auto-hide is also configured).
 */
export async function initNative(): Promise<void> {
  if (initialized) return;
  initialized = true;

  let core: typeof import('@capacitor/core');
  try {
    core = await import('@capacitor/core');
  } catch {
    return;
  }
  if (!core.Capacitor.isNativePlatform()) return;

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (closeTopOverlay()) return;
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    /* back button stays default */
  }

  const syncStatusBar = async (): Promise<void> => {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      const s = useThemeStore.getState();
      const t = getThemeTokens(s.themeId, s.isDarkMode ? 'dark' : 'light');
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: t.bg });
      await StatusBar.setStyle({ style: s.isDarkMode ? Style.Dark : Style.Light });
    } catch {
      /* status bar stays default */
    }
  };
  await syncStatusBar();
  useThemeStore.subscribe(syncStatusBar);

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* auto-hide covers this */
  }
}
