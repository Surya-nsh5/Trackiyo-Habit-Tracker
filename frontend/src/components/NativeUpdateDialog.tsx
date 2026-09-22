import React, { useEffect, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';

interface UpdateInfo {
  version: string;
  versionCode: number;
  minimumVersionCode?: number;
  apkUrl: string;
  releaseNotes?: string[];
}

const DISMISS_KEY = 'trackiyo-update-dismissed';

/**
 * Native Android update check. Compares the installed build number
 * (@capacitor/app) against /app-update.json served by the website.
 * Silent no-op in browsers. Optional updates show once per session;
 * below-minimum builds block with no dismissal.
 */
export const NativeUpdateDialog: React.FC = () => {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const core = await import('@capacitor/core').catch(() => null);
        if (!core || !core.Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const { build } = await App.getInfo();
        const installed = parseInt(build, 10) || 0;
        const res = await fetch('/app-update.json', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as UpdateInfo;
        if (typeof data.versionCode !== 'number' || data.versionCode <= installed) return;
        if ((data.minimumVersionCode ?? 0) > installed) {
          setRequired(true);
          setInfo(data);
        } else if (!sessionStorage.getItem(DISMISS_KEY)) {
          setInfo(data);
        }
      } catch {
        /* update check is best-effort; never block the app on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;

  const handleUpdate = async () => {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: info.apkUrl });
    } catch {
      window.location.href = info.apkUrl;
    }
  };

  const handleLater = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setInfo(null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={required ? 'Update required' : 'Update available'}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative w-full max-w-[420px] bg-surface border border-border/70 rounded-md p-6 flex flex-col items-center text-center">
        <h2 className="text-lg font-bold tracking-[0.08em] text-foreground uppercase">
          {required ? 'Update Required' : 'New Version Available'}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Version {info.version}
          {required
            ? ' is required to continue.'
            : ' is ready to install.'}
        </p>
        {info.releaseNotes && info.releaseNotes.length > 0 && (
          <ul className="mt-4 w-full text-left text-sm text-muted space-y-1.5 list-disc list-inside">
            {info.releaseNotes.slice(0, 5).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={handleUpdate}
          className="mt-6 h-12 min-h-[44px] w-full bg-accent text-accent-ink font-bold text-xs tracking-[0.16em] rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <FiDownload size={16} aria-hidden="true" />
          UPDATE NOW
        </button>
        {!required && (
          <button
            type="button"
            onClick={handleLater}
            className="mt-2 h-11 min-h-[44px] w-full flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-muted hover:text-foreground transition-colors duration-200"
          >
            <FiX size={14} aria-hidden="true" />
            LATER
          </button>
        )}
      </div>
    </div>
  );
};
