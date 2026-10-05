import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { webUpdateService } from '@/services/webUpdateService';

export const PWAReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates every 60 minutes
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: Error) {
      console.warn('SW registration error:', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    if (webUpdateService.isSafeToReload()) {
      updateServiceWorker(true);
    } else {
      setTimeout(() => {
        updateServiceWorker(true);
      }, 2500);
    }
  };

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed right-4 z-[9999] bg-surface/95 backdrop-blur-md border border-accent/40 shadow-2xl rounded-xl p-4 w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto text-foreground transition-all duration-300 min-w-0 box-border bottom-[max(1rem,calc(4.75rem+var(--sab)))] md:bottom-[max(1rem,var(--sab))]"
    >
      <div className="mb-3 min-w-0">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
          App Update Ready
        </h4>
        <p className="text-xs text-muted leading-relaxed break-words">
          A new version of Trackiyo is available. Update now to load the latest improvements.
        </p>
      </div>
      <div className="flex items-center justify-end gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => close()}
          className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors duration-200"
        >
          Later
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          className="px-3.5 py-1.5 text-xs font-bold bg-accent text-accent-ink rounded-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          Update & Reload
        </button>
      </div>
    </div>
  );
};
