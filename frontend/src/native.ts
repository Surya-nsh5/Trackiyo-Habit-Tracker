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
 * - Android back button: close top overlay first, else navigate history, else exit.
 * - External links: open in Custom Chrome Tab / system browser via @capacitor/browser.
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

  // 1. Android Back Button
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

  // 2. Intercept External Links to open in Custom Chrome Tab
  try {
    const { Browser } = await import('@capacitor/browser');
    document.addEventListener(
      'click',
      (e) => {
        const anchor = (e.target as HTMLElement)?.closest('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href) return;

        // If it starts with http:// or https:// and points to an external origin
        if (/^https?:\/\//i.test(href)) {
          try {
            const url = new URL(href, window.location.href);
            if (url.origin !== window.location.origin) {
              e.preventDefault();
              e.stopPropagation();
              Browser.open({ url: href });
            }
          } catch {
            /* fall back to native webview navigation */
          }
        }
      },
      true
    );
  } catch {
    /* fallback to default */
  }

  // 3. Status Bar Theme Synchronization
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

  // 4. Hide Splash Screen
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* auto-hide covers this */
  }
}
