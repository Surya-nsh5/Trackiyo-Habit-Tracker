import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({

    onRegisterError(error: Error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed right-4 z-50 bg-surface border border-border/70 rounded-md p-4 w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto text-foreground transition-colors duration-200 min-w-0 box-border bottom-[max(1rem,calc(4.75rem+var(--sab)))] md:bottom-[max(1rem,var(--sab))]">
      <div className="mb-4 min-w-0">
        <p className="text-sm font-medium break-words max-w-full">
          New content available, click on reload button to update.
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-3 min-w-0">
        <button
          onClick={() => close()}
          className="px-4 py-2 min-h-[44px] text-xs font-semibold tracking-[0.12em] text-muted hover:text-foreground transition-colors duration-200"
        >
          CLOSE
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-4 py-2 min-h-[44px] text-xs font-bold tracking-[0.12em] bg-accent text-accent-ink rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200"
        >
          RELOAD
        </button>
      </div>
    </div>
  );
};
