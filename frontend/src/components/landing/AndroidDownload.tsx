import React, { useEffect, useState } from 'react';
import { FiDownload, FiCheck, FiSmartphone } from 'react-icons/fi';
import { TrackiyoLogo } from '../layout/TrackiyoLogo';

interface AppRelease {
  version: string;
  versionCode: number;
  apkUrl: string;
  fileSize?: string;
  releasedAt?: string;
  releaseNotes?: string[];
}

const FALLBACK: AppRelease = {
  version: '1.0.0',
  versionCode: 1,
  apkUrl: '/downloads/trackiyo-v1.0.0.apk',
};

/**
 * Android app download section for the landing page.
 * Version metadata comes from /app-update.json (single source of truth);
 * static fallback keeps the section useful if the fetch fails.
 */
export const AndroidDownload: React.FC = () => {
  const [release, setRelease] = useState<AppRelease>(FALLBACK);
  const [isAndroid] = useState(
    () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/app-update.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.version === 'string') {
          setRelease({
            version: data.version,
            versionCode: data.versionCode ?? 0,
            apkUrl: data.apkUrl || FALLBACK.apkUrl,
            fileSize: data.fileSize,
            releasedAt: data.releasedAt,
            releaseNotes: data.releaseNotes,
          });
        }
      })
      .catch(() => {
        /* fallback metadata stays */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative z-10 px-6 w-full max-w-full pb-8 min-w-0 box-border" aria-labelledby="android-download-heading">
      <div className="bg-surface border border-border/70 rounded-md p-6 sm:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start transition-colors duration-200 min-w-0">
        <div className="flex-1 w-full min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase mb-3 break-words">
            {isAndroid ? 'Download for your device' : 'Available for Android'}
          </p>
          <h2
            id="android-download-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4 text-balance break-words max-w-full"
          >
            Get the Android App
          </h2>
          <p className="text-sm md:text-base text-muted leading-relaxed max-w-xl w-full mb-6 text-pretty break-words">
            Take Trackiyo anywhere with the native Android wrapper — the same
            habits, tasks and wellness tracking, with automatic web updates and
            an app icon on your home screen.
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 mb-6 min-w-0">
            <a
              href={release.apkUrl}
              download
              className="h-14 min-h-[44px] px-8 w-full sm:w-auto max-w-full box-border bg-accent text-accent-ink font-bold text-xs tracking-[0.16em] rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200 inline-flex flex-wrap items-center justify-center gap-3 text-center"
            >
              <FiDownload size={16} aria-hidden="true" className="shrink-0" />
              DOWNLOAD FOR ANDROID
            </a>
            <div className="text-xs text-muted leading-relaxed min-w-0 break-words [overflow-wrap:anywhere]">
              <p>
                Version {release.version}
                {release.fileSize && release.fileSize !== 'TBD' && !release.fileSize.startsWith('TBD') ? ` · ${release.fileSize}` : ''}
                {release.releasedAt && !release.releasedAt.startsWith('TBD') ? ` · ${release.releasedAt}` : ''}
              </p>
              <p className="mt-0.5">Free · Direct APK download</p>
            </div>
          </div>

          {release.releaseNotes && release.releaseNotes.length > 0 && (
            <div className="mb-6 min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase mb-2 break-words">
                What's new in {release.version}
              </p>
              <ul className="space-y-1.5 min-w-0">
                {release.releaseNotes.slice(0, 4).map((note) => (
                  <li key={note} className="flex items-start gap-2 text-sm text-muted min-w-0">
                    <FiCheck size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
                    <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-border/50 pt-5 min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase mb-3 break-words">
              How to install
            </p>
            <ol className="space-y-2 text-sm text-muted list-decimal list-inside min-w-0">
              <li className="break-words">Tap Download and wait for the APK to finish.</li>
              <li className="break-words">
                When prompted, allow installs from this source (Settings →{' '}
                <span className="text-foreground">Install unknown apps</span>).
              </li>
              <li className="break-words">Open the downloaded file to install. Web updates arrive automatically.</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-col items-center gap-4 shrink-0 min-w-0">
          <TrackiyoLogo size={56} variant="gradient" />
          <div className="flex items-center gap-2 text-muted">
            <FiSmartphone size={18} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-[0.08em]">TRACKIYO FOR ANDROID</span>
          </div>
        </div>
      </div>
    </section>
  );
};
