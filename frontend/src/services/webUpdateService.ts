import { hasOpenOverlays } from '../utils/overlayStack';

export interface VersionInfo {
  version: string;
  build: string;
  timestamp?: number;
}

type UpdateListener = (available: boolean, info: VersionInfo | null) => void;

class WebUpdateService {
  private currentBuild: string = typeof __TRACKIYO_BUILD__ !== 'undefined' ? __TRACKIYO_BUILD__ : 'dev';
  private currentVersion: string = typeof __TRACKIYO_VERSION__ !== 'undefined' ? __TRACKIYO_VERSION__ : '1.0.0';
  private latestInfo: VersionInfo | null = null;
  private isAvailable: boolean = false;
  private lastCheckTime: number = 0;
  private checkIntervalMs: number = 10 * 60 * 1000; // 10 minutes throttle
  private listeners: Set<UpdateListener> = new Set();
  private initialized: boolean = false;

  public getCurrentBuild(): string {
    return this.currentBuild;
  }

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  public isUpdateAvailable(): boolean {
    return this.isAvailable;
  }

  public getLatestInfo(): VersionInfo | null {
    return this.latestInfo;
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.isAvailable, this.latestInfo);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.isAvailable, this.latestInfo);
      } catch (err) {
        console.error('Error notifying update listener:', err);
      }
    }
  }

  /**
   * Initializes update checks on startup and on resume.
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Initial check delayed by 3s to let the app mount and render first
    setTimeout(() => {
      this.checkForUpdates();
    }, 3000);

    // Listen for tab focus / app visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdates();
        }
      });
    }

    // Listen for Capacitor resume event
    if (typeof window !== 'undefined') {
      import('@capacitor/core')
        .then(({ Capacitor }) => {
          if (Capacitor.isNativePlatform()) {
            import('@capacitor/app').then(({ App }) => {
              App.addListener('appStateChange', (state) => {
                if (state.isActive) {
                  this.checkForUpdates();
                }
              });
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    // Periodic check every 15 minutes
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates();
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Checks /version.json with cache: 'no-store'.
   */
  public async checkForUpdates(force: boolean = false): Promise<boolean> {
    const now = Date.now();
    if (!force && now - this.lastCheckTime < this.checkIntervalMs) {
      return this.isAvailable;
    }
    this.lastCheckTime = now;

    try {
      // Bust cache via query string & fetch options
      const res = await fetch(`/version.json?t=${now}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) return this.isAvailable;

      const data: VersionInfo = await res.json();
      if (!data || !data.build) return this.isAvailable;

      // Check against current build
      // In local development ("dev"), don't trigger reloads unless explicitly different
      const isNew = this.currentBuild !== 'dev' && data.build !== this.currentBuild;

      // Prevent update loop if we already reloaded for this build in this browser session
      const alreadyApplied = sessionStorage.getItem('trackiyo_last_applied_build') === data.build;

      if (isNew && !alreadyApplied) {
        this.isAvailable = true;
        this.latestInfo = data;
        this.notify();
        return true;
      } else if (!isNew) {
        this.isAvailable = false;
        this.notify();
      }
    } catch {
      // Network error or offline - silently keep existing state
    }

    return this.isAvailable;
  }

  /**
   * Inspects whether the user is in the middle of active input or open dialogs.
   */
  public isSafeToReload(): boolean {
    if (typeof document === 'undefined') return true;

    // Check if an overlay/modal/dropdown is currently open
    if (hasOpenOverlays()) return false;

    // Check if the user is typing into any input or textarea
    const activeEl = document.activeElement;
    if (activeEl) {
      const tag = activeEl.tagName.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
      if (activeEl.hasAttribute('contenteditable') && activeEl.getAttribute('contenteditable') !== 'false') return false;
    }

    return true;
  }

  /**
   * Applies the update by recording the build and performing a cache-clearing reload.
   */
  public applyUpdate(): void {
    if (this.latestInfo?.build) {
      try {
        sessionStorage.setItem('trackiyo_last_applied_build', this.latestInfo.build);
      } catch {}
    }

    // Invalidate service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.update();
        }
      }).catch(() => {});
    }

    // Force reload from server
    window.location.reload();
  }
}

export const webUpdateService = new WebUpdateService();
