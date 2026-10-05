import React, { useEffect, useState } from 'react';
import { HiArrowDownTray, HiXMark } from 'react-icons/hi2';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return localStorage.getItem('trackiyo_pwa_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if already running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent standard browser bar automatic infobar so we can show custom banner & enable address bar icon
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser install prompt
    await deferredPrompt.prompt();

    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('trackiyo_pwa_banner_dismissed', 'true');
  };

  if (isInstalled || !deferredPrompt || dismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Install app banner"
      className="fixed bottom-4 left-4 z-[9998] max-w-sm w-[calc(100vw-2rem)] bg-surface/95 backdrop-blur-xl border border-accent/30 text-foreground p-4 rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 box-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <HiArrowDownTray className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Install Trackiyo App
            </h4>
            <p className="text-xs text-muted mt-0.5 leading-snug">
              Install as a desktop/mobile app for quick launching, offline support, and desktop shortcuts.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted hover:text-foreground p-1 rounded-lg transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <HiXMark className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-4 py-1.5 text-xs font-bold bg-accent text-accent-ink rounded-lg hover:brightness-110 active:scale-[0.97] transition-all flex items-center gap-1.5 shadow-md shadow-accent/10 cursor-pointer"
        >
          <HiArrowDownTray className="w-4 h-4" />
          Install App
        </button>
      </div>
    </div>
  );
};
