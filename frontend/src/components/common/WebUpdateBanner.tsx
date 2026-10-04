import React, { useEffect, useState, useRef } from 'react';
import { webUpdateService, type VersionInfo } from '../../services/webUpdateService';
import { FiRefreshCw, FiX, FiCheckCircle } from 'react-icons/fi';

export const WebUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    webUpdateService.init();

    const unsubscribe = webUpdateService.subscribe((available, info) => {
      setUpdateAvailable(available);
      setVersionInfo(info);

      if (available && !dismissed) {
        // If safe to reload, start a gentle auto-reload countdown
        if (webUpdateService.isSafeToReload()) {
          setCountdown(5);
        }
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dismissed]);

  useEffect(() => {
    if (countdown === null || dismissed) return;

    if (countdown <= 0) {
      webUpdateService.applyUpdate();
      return;
    }

    timerRef.current = setTimeout(() => {
      // Re-verify that user didn't start typing or opening a modal during countdown
      if (!webUpdateService.isSafeToReload()) {
        setCountdown(null); // Pause auto-reload, wait for user
      } else {
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown, dismissed]);

  if (!updateAvailable || dismissed) return null;

  const handleUpdateNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    webUpdateService.applyUpdate();
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCountdown(null);
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[999] bg-surface/95 backdrop-blur-md border border-accent/40 shadow-2xl rounded-xl p-4 text-foreground transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
          <FiRefreshCw size={16} className={countdown !== null ? 'animate-spin' : ''} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
              New Update Available
            </h4>
            {versionInfo?.version && (
              <span className="text-[10px] bg-accent/20 text-accent font-mono px-1.5 py-0.5 rounded">
                v{versionInfo.version}
              </span>
            )}
          </div>
          <p className="text-xs text-secondary-text mt-1 leading-relaxed">
            {countdown !== null
              ? `A new version of Trackiyo is ready. Updating in ${countdown}s...`
              : 'A new version of Trackiyo is ready with the latest improvements.'}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleUpdateNow}
              className="flex-1 h-8 px-3 bg-accent text-accent-ink rounded-lg text-xs font-bold tracking-wider uppercase hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <FiCheckCircle size={13} />
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              className="h-8 px-3 border border-border-subtle hover:bg-surface-secondary text-muted hover:text-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted hover:text-foreground p-1 rounded-md transition-colors"
          aria-label="Dismiss update notification"
        >
          <FiX size={15} />
        </button>
      </div>
    </div>
  );
};
