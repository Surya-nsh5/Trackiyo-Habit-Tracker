import React, { useEffect, useState, useCallback } from 'react';
import { FiWifiOff, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    try {
      // Fast probe to verify genuine internet access
      const res = await fetch('/favicon.svg?probe=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
      });
      if (res.ok) {
        setIsOffline(false);
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 3000);
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      checkConnectivity();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen to custom network error events from api.ts
    const handleApiNetworkError = () => {
      setIsOffline(true);
    };
    window.addEventListener('trackiyo:network-offline', handleApiNetworkError);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('trackiyo:network-offline', handleApiNetworkError);
    };
  }, [checkConnectivity]);

  if (justReconnected) {
    return (
      <aside
        aria-label="Network status"
        className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+12px)] z-[9999] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 box-border overflow-hidden bg-success/90 backdrop-blur-md text-foreground rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold shadow-md transition-all duration-300 animate-in fade-in slide-in-from-top"
      >
        <FiCheckCircle size={14} className="text-foreground shrink-0" />
        <span className="min-w-0 break-words">Connection restored. You&apos;re back online.</span>
      </aside>
    );
  }

  if (!isOffline) return null;

  return (
    <aside
      aria-label="Network status"
      className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+12px)] z-[9999] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 box-border overflow-hidden bg-warning/90 backdrop-blur-md text-zinc-950 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-medium shadow-md transition-all duration-300 animate-in fade-in slide-in-from-top"
    >
      <div className="flex items-center gap-2 min-w-0">
        <FiWifiOff size={15} className="shrink-0 text-zinc-950" />
        <span className="min-w-0 break-words">
          You&apos;re offline. Reconnect to continue using the latest Trackiyo data.
        </span>
      </div>
      <button
        onClick={checkConnectivity}
        disabled={isChecking}
        className="shrink-0 px-2.5 py-1 bg-zinc-950 text-white rounded text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
      >
        <FiRefreshCw size={11} className={isChecking ? 'animate-spin' : ''} />
        {isChecking ? 'Checking...' : 'Retry'}
      </button>
    </aside>
  );
};
