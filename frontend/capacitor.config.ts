import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Trackiyo Android shell (Capacitor, remote-URL architecture).
 *
 * The APK is a thin native wrapper that loads the DEPLOYED website, so
 * ordinary web changes (UI, CSS, React code, bug fixes) go live the moment
 * the site redeploys — no APK reinstall needed. Only changes to the native
 * layer (plugins, permissions, manifest, icons, this file) require a new
 * native build. See ANDROID.md for the full release workflow.
 *
 * PRODUCTION_URL: set to the deployed frontend origin (https, no trailing
 * slash). This is a PUBLIC URL, not a secret — it is visible to anyone who
 * opens the site and ends up inside the built app anyway — so keeping it in
 * source control is correct. Do NOT put secrets here; backend keys stay in
 * backend/.env (gitignored). It can also be injected at sync time via the
 * CAP_SERVER_URL env variable, which takes precedence (useful for staging).
 */
const PRODUCTION_URL = 'https://trackiyo.vercel.app/';

const config: CapacitorConfig = {
  appId: 'com.trackiyo.app',
  appName: 'Trackiyo',
  webDir: 'dist',
  server: {
    url: process.env.CAP_SERVER_URL || PRODUCTION_URL,
    // Never load the app over cleartext HTTP.
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchFadeOutDuration: 200,
      backgroundColor: '#09090B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
