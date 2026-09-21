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
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-4 max-w-sm w-full text-zinc-900 dark:text-white transition-colors duration-300">
      <div className="mb-4">
        <p className="text-sm font-medium">
          New content available, click on reload button to update.
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => close()}
          className="px-4 py-2 text-xs font-bold tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          CLOSE
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-4 py-2 text-xs font-bold tracking-widest bg-black text-white dark:bg-white dark:text-black rounded-lg hover:scale-105 active:scale-95 transition-transform"
        >
          RELOAD
        </button>
      </div>
    </div>
  );
};
