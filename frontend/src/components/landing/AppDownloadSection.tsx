import React, { useEffect, useState } from 'react';
import { FiDownload, FiCheck, FiSmartphone, FiMonitor, FiCheckCircle, FiExternalLink } from 'react-icons/fi';
import { TrackiyoLogo } from '../layout/TrackiyoLogo';
import { usePWAInstall } from '@/hooks/usePWAInstall';

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

export const AppDownloadSection: React.FC = () => {
  const [release, setRelease] = useState<AppRelease>(FALLBACK);
  const { canInstall, isInstalled, isWindows, promptInstall } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'windows' | 'android'>(() => {
    if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
      return 'android';
    }
    return 'windows';
  });

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

  const handleInstallWindows = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) {
        setInstallSuccess(true);
      }
    }
  };

  return (
    <section className="relative z-10 px-6 w-full max-w-full pb-12 min-w-0 box-border" aria-labelledby="apps-download-heading">
      <div className="bg-surface border border-border/70 rounded-md p-6 sm:p-10 transition-colors duration-200 min-w-0">
        
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border/50 pb-6 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase mb-2 break-words">
              {isWindows ? 'Optimized for Windows & Android' : 'Cross-Platform Apps'}
            </p>
            <h2
              id="apps-download-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance break-words max-w-full"
            >
              Get Trackiyo on Your Devices
            </h2>
            <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl mt-2 text-pretty break-words">
              Experience zero-friction habit tracking on your Windows PC with our native Progressive Web App, or take it on the go with Android.
            </p>
          </div>

          {/* Platform Switcher Tabs */}
          <div className="flex items-center gap-2 p-1 bg-elevated border border-border/70 rounded shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('windows')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-[0.08em] rounded transition-all duration-200 ${
                activeTab === 'windows'
                  ? 'bg-accent text-accent-ink shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FiMonitor size={15} />
              WINDOWS (PWA)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-[0.08em] rounded transition-all duration-200 ${
                activeTab === 'android'
                  ? 'bg-accent text-accent-ink shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FiSmartphone size={15} />
              ANDROID (APK)
            </button>
          </div>
        </div>

        {/* WINDOWS PWA TAB */}
        {activeTab === 'windows' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start min-w-0 animate-fadeIn">
            <div className="flex-1 w-full min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded text-accent text-xs font-semibold uppercase tracking-wider mb-4">
                <FiMonitor size={14} />
                Windows Desktop Progressive Web App
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 break-words">
                Install Trackiyo for Windows
              </h3>
              <p className="text-sm md:text-base text-muted leading-relaxed max-w-xl mb-6 break-words">
                Runs in its own distraction-free desktop window, docks to your Windows Taskbar, supports Windows Jump Lists, and starts instantly with full offline support.
              </p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 mb-6 min-w-0">
                {isInstalled || installSuccess ? (
                  <div className="h-14 px-6 bg-success/15 border border-success/30 text-success font-bold text-xs tracking-[0.14em] rounded inline-flex items-center gap-2.5">
                    <FiCheckCircle size={18} />
                    INSTALLED AS WINDOWS DESKTOP APP
                  </div>
                ) : canInstall ? (
                  <button
                    type="button"
                    onClick={handleInstallWindows}
                    className="h-14 min-h-[44px] px-8 w-full sm:w-auto max-w-full box-border bg-accent text-accent-ink font-bold text-xs tracking-[0.16em] rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200 inline-flex flex-wrap items-center justify-center gap-3 text-center"
                  >
                    <FiDownload size={16} aria-hidden="true" className="shrink-0" />
                    INSTALL FOR WINDOWS
                  </button>
                ) : (
                  <div className="h-14 px-6 bg-elevated border border-border/80 text-foreground font-semibold text-xs tracking-wider rounded inline-flex items-center gap-2.5">
                    <FiExternalLink size={16} className="text-accent" />
                    <span>Click <strong>Install</strong> or <strong>App Available</strong> in your browser's address bar</span>
                  </div>
                )}
                <div className="text-xs text-muted leading-relaxed min-w-0 break-words">
                  <p>Microsoft Edge & Google Chrome supported</p>
                  <p className="mt-0.5">Zero installation overhead · Offline capable</p>
                </div>
              </div>

              {/* Windows Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 min-w-0">
                <div className="p-3.5 bg-elevated border border-border/50 rounded flex items-start gap-3">
                  <FiCheck size={16} className="text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-foreground block">Taskbar Jump Lists</strong>
                    <span className="text-muted">Right-click the icon to jump directly to Today, Focus, Habits, or Coach.</span>
                  </div>
                </div>
                <div className="p-3.5 bg-elevated border border-border/50 rounded flex items-start gap-3">
                  <FiCheck size={16} className="text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-foreground block">Distraction-Free Window</strong>
                    <span className="text-muted">No browser tabs, URL bars, or clutter—just your habits and productivity.</span>
                  </div>
                </div>
                <div className="p-3.5 bg-elevated border border-border/50 rounded flex items-start gap-3">
                  <FiCheck size={16} className="text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-foreground block">Instant Offline Launch</strong>
                    <span className="text-muted">Service Worker caches the complete app shell for immediate bootup.</span>
                  </div>
                </div>
                <div className="p-3.5 bg-elevated border border-border/50 rounded flex items-start gap-3">
                  <FiCheck size={16} className="text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-foreground block">Automatic Background Updates</strong>
                    <span className="text-muted">New versions update seamlessly in the background without installer files.</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-5 min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase mb-3 break-words">
                  How to install in Edge or Chrome on Windows
                </p>
                <ol className="space-y-2 text-sm text-muted list-decimal list-inside min-w-0">
                  <li className="break-words">
                    Look for the <span className="text-foreground font-medium">Install App</span> icon (<span className="text-accent">⊕</span>) on the right side of the address bar.
                  </li>
                  <li className="break-words">
                    Click <span className="text-foreground font-medium">Install</span>. Windows will register Trackiyo in your Start Menu and Taskbar.
                  </li>
                  <li className="break-words">
                    Pin Trackiyo to your Windows Taskbar for 1-click access anytime!
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex flex-wrap lg:flex-col items-center gap-4 shrink-0 min-w-0">
              <TrackiyoLogo size={56} variant="gradient" />
              <div className="flex items-center gap-2 text-muted">
                <FiMonitor size={18} aria-hidden="true" />
                <span className="text-xs font-semibold tracking-[0.08em]">TRACKIYO FOR WINDOWS</span>
              </div>
            </div>
          </div>
        )}

        {/* ANDROID TAB */}
        {activeTab === 'android' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start min-w-0 animate-fadeIn">
            <div className="flex-1 w-full min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded text-accent text-xs font-semibold uppercase tracking-wider mb-4">
                <FiSmartphone size={14} />
                Android Native APK Wrapper
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 break-words">
                Get the Android App
              </h3>
              <p className="text-sm md:text-base text-muted leading-relaxed max-w-xl mb-6 break-words">
                Take Trackiyo anywhere with our native Android wrapper — featuring hardware-backed Keystore security, persistent "remember me", and automatic web updates.
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
                <div className="text-xs text-muted leading-relaxed min-w-0 break-words">
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
                        <span className="min-w-0 flex-1 break-words">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-border/50 pt-5 min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase mb-3 break-words">
                  How to install on Android
                </p>
                <ol className="space-y-2 text-sm text-muted list-decimal list-inside min-w-0">
                  <li className="break-words">Tap Download and wait for the APK to finish.</li>
                  <li className="break-words">
                    When prompted, allow installs from this source (Settings → <span className="text-foreground">Install unknown apps</span>).
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
        )}

      </div>
    </section>
  );
};
