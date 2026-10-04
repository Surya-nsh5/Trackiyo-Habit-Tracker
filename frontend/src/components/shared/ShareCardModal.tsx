import React, { useState, useEffect, useRef, useId } from 'react';
import { useShareStore } from '../../store/useShareStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { THEMES, getThemeTokens, type ResolvedMode } from '../../theme/themes';
import {
  generateShareCardDataUrl,
  generateShareCardBlob,
  downloadBlob
} from '../../utils/shareCardGenerator';
import {
  FiX, FiDownload, FiShare2, FiLink, FiCopy, FiCheck,
  FiRefreshCw, FiShield, FiAward, FiSun, FiMoon
} from 'react-icons/fi';

export const ShareCardModal: React.FC = () => {
  const { isShareModalOpen, activeConfig, closeShareModal, createPublicLink, publicShareUrl, isGeneratingLink } = useShareStore();
  const { user } = useAuthStore();
  const { themeId, isDarkMode } = useThemeStore();

  const [cardMode, setCardMode] = useState<ResolvedMode>(() => isDarkMode ? 'dark' : 'light');
  const [includeUsername, setIncludeUsername] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const previewImgRef = useRef<HTMLImageElement>(null);
  const messageInputId = useId();

  // Active theme definition & tokens resolved from settings
  const activeThemeDef = THEMES[themeId] || THEMES.monochrome;
  const activeTokens = getThemeTokens(themeId, cardMode);

  // Sync mode whenever app settings dark mode changes
  useEffect(() => {
    setCardMode(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Sync state when config changes
  useEffect(() => {
    if (activeConfig) {
      if (activeConfig.themeMode) {
        setCardMode(activeConfig.themeMode);
      } else {
        setCardMode(isDarkMode ? 'dark' : 'light');
      }
      setIncludeUsername(activeConfig.includeUsername ?? true);
      setCustomMessage(activeConfig.customMessage || '');
      setShareError(null);
    }
  }, [activeConfig, isDarkMode]);

  // Generate live preview on changes (strictly 1:1 square format using settings theme)
  useEffect(() => {
    if (!isShareModalOpen || !activeConfig) return;

    let isMounted = true;
    setIsRendering(true);

    const mergedConfig = {
      ...activeConfig,
      format: 'square' as const,
      themeId,
      themeMode: cardMode,
      includeUsername,
      username: user?.name || 'Trackiyo Member',
      customMessage: customMessage.trim() || undefined
    };

    generateShareCardDataUrl(mergedConfig)
      .then(url => {
        if (isMounted) {
          setPreviewUrl(url);
          setIsRendering(false);
        }
      })
      .catch(err => {
        console.error('Preview generation failed:', err);
        if (isMounted) setIsRendering(false);
      });

    return () => { isMounted = false; };
  }, [isShareModalOpen, activeConfig, themeId, cardMode, includeUsername, customMessage, user]);

  if (!isShareModalOpen || !activeConfig) return null;

  const isAchievement =
    activeConfig.type === 'achievement' ||
    Boolean(activeConfig.achievementId) ||
    Boolean(activeConfig.xp) ||
    (typeof activeConfig.metricValue === 'string' &&
      (activeConfig.metricValue.includes('XP') ||
        activeConfig.metricValue.includes('TIER') ||
        activeConfig.metricValue.includes('UNLOCKED')));

  const currentConfig = {
    ...activeConfig,
    format: 'square' as const,
    themeId,
    themeMode: cardMode,
    includeUsername,
    username: user?.name || 'Trackiyo Member',
    customMessage: customMessage.trim() || undefined
  };

  const recordCardShare = () => {
    try {
      localStorage.setItem('trackiyo_card_shared', 'true');
    } catch {}
    useGamificationStore.getState().checkAndUnlock('share_pro');
  };

  const handleDownload = async () => {
    try {
      const blob = await generateShareCardBlob(currentConfig);
      const safeTitle = (activeConfig.title || 'progress').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadBlob(blob, `trackiyo-${safeTitle}-1x1.png`);
      recordCardShare();
    } catch (err: any) {
      setShareError('Failed to generate image download: ' + err.message);
    }
  };

  const handleNativeShare = async () => {
    setShareError(null);
    try {
      const blob = await generateShareCardBlob(currentConfig);
      const file = new File([blob], 'trackiyo-card.png', { type: 'image/png' });
      const shareTitle = isAchievement
        ? `Trackiyo Achievement: ${activeConfig.title}`
        : `Trackiyo: ${activeConfig.title}`;
      const shareText = isAchievement
        ? `🏆 Unlocked "${activeConfig.title}" on Trackiyo! ${customMessage ? `"${customMessage}" ` : ''}#Trackiyo #Achievement`
        : `🔥 Milestone Reached: ${activeConfig.metricValue || activeConfig.title} on Trackiyo! ${customMessage ? `"${customMessage}" ` : ''}#Consistency`;

      const shareData: ShareData = {
        title: shareTitle,
        text: shareText,
      };

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
        recordCardShare();
      } else if (navigator.share) {
        await navigator.share(shareData);
        recordCardShare();
      } else {
        handleDownload();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handleDownload();
      }
    }
  };

  const handleCopyLink = async () => {
    let url = publicShareUrl;
    if (!url) {
      url = await createPublicLink(currentConfig);
    }
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      recordCardShare();
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyText = async () => {
    const text = isAchievement
      ? `🏆 Unlocked "${activeConfig.title}" on Trackiyo! ${activeConfig.subtitle ? `${activeConfig.subtitle}. ` : ''}${customMessage ? `“${customMessage}” ` : ''}#Achievement #Trackiyo`
      : `🔥 ${activeConfig.metricValue || activeConfig.title} on Trackiyo! ${customMessage ? `“${customMessage}” ` : ''}#Productivity #Trackiyo`;
    await navigator.clipboard.writeText(text);
    setCopiedText(true);
    recordCardShare();
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-fadeIn"
      onClick={closeShareModal}
    >
      <div
        className="bg-surface border border-border/80 rounded-2xl w-full max-w-[min(56rem,calc(100vw-2rem))] min-w-0 max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl overflow-hidden box-border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border/70 shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              {isAchievement ? <FiAward size={18} /> : <FiShare2 size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="share-modal-title" className="text-sm font-bold text-foreground uppercase tracking-wider break-words">
                {isAchievement ? 'Share Achievement Card' : 'Share Your Progress'}
              </h2>
              <p className="text-[11px] text-secondary-text break-words">
                {isAchievement
                  ? 'Celebrate your verified achievement with friends & on social stories'
                  : 'Celebrate consistency with friends & on social stories'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeShareModal}
            className="p-1.5 text-muted hover:text-foreground rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close share dialog"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Live 1:1 Square Card Preview */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-surface-secondary/40 border border-border-subtle rounded-2xl p-4 sm:p-6 relative overflow-hidden min-h-[380px] min-w-0 max-w-full">
            {/* Ambient dynamic glow matching settings theme */}
            <div
              className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-300"
              style={{ backgroundColor: activeTokens.primary }}
            />

            {isRendering && (
              <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs flex items-center justify-center z-10 transition-opacity">
                <div className="flex flex-col items-center gap-2">
                  <FiRefreshCw className="animate-spin text-accent" size={24} />
                  <span className="text-[11px] font-semibold text-secondary-text">Rendering 1:1 card...</span>
                </div>
              </div>
            )}
            
            {previewUrl ? (
              <div className="relative aspect-square w-full max-w-[min(400px,100%)] flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden border border-border/80 bg-black/30 min-w-0">
                <img
                  ref={previewImgRef}
                  src={previewUrl}
                  alt="Share card 1:1 preview"
                  className="w-full h-full max-w-full object-contain rounded-2xl select-none"
                />
              </div>
            ) : (
              <div className="aspect-square w-full max-w-[min(400px,100%)] min-w-0 flex flex-col items-center justify-center gap-2 text-muted text-xs border border-border-subtle rounded-2xl p-4 text-center">
                <FiRefreshCw className="animate-spin text-accent" size={22} />
                <span>Rendering 1:1 achievement card...</span>
              </div>
            )}
          </div>

          {/* Right Column: Controls & Actions */}
          <div className="md:col-span-5 space-y-4 min-w-0 max-w-full">
            
            {/* Visual Theme Info from Settings & Appearance Mode Selector */}
            <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase tracking-[0.14em]">
                  Visual Theme (Settings)
                </span>
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                  1:1 Square
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
                {/* Active Theme Badge */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs"
                    style={{
                      backgroundColor: activeTokens.surface,
                      borderColor: activeTokens.border
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full shadow-2xs"
                      style={{ backgroundColor: activeTokens.primary }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0">
                        {activeThemeDef.label}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent/10 text-accent border border-accent/20 uppercase tracking-wider shrink-0 whitespace-nowrap">
                        Active
                      </span>
                    </div>
                    <p className="text-[10px] text-secondary-text break-words min-w-0">
                      {activeThemeDef.blurb}
                    </p>
                  </div>
                </div>

                {/* Dark / Light Toggle Pill */}
                <div className="flex items-center bg-surface border border-border-subtle p-0.5 rounded-lg shrink-0 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCardMode('dark')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      cardMode === 'dark'
                        ? 'bg-surface-secondary text-foreground shadow-xs font-extrabold'
                        : 'text-muted hover:text-foreground'
                    }`}
                    title="Dark card mode"
                  >
                    <FiMoon size={11} />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardMode('light')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      cardMode === 'light'
                        ? 'bg-surface-secondary text-foreground shadow-xs font-extrabold'
                        : 'text-muted hover:text-foreground'
                    }`}
                    title="Light card mode"
                  >
                    <FiSun size={11} />
                    <span>Light</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy & Customization Controls */}
            <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <FiShield size={14} className="text-accent" />
                <span>Card Personalization</span>
              </div>

              {/* Include username toggle */}
              <label className="flex items-center justify-between gap-2 cursor-pointer p-2.5 rounded-lg bg-surface border border-border-subtle/80 hover:border-border transition-colors text-xs select-none min-w-0">
                <div className="flex flex-col min-w-0 flex-1 pr-2">
                  <span className="font-semibold text-foreground break-words">Display username handle</span>
                  <span className="text-[11px] text-muted break-words [overflow-wrap:anywhere] min-w-0">
                    {user?.username ? `@${user.username}` : user?.name || '@member'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeUsername}
                  onChange={e => setIncludeUsername(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-accent cursor-pointer shrink-0"
                />
              </label>

              {/* Custom message input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={messageInputId} className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">
                    Custom Quote (Optional)
                  </label>
                  <span className="text-[10px] text-muted tabular-nums">
                    {customMessage.length}/100
                  </span>
                </div>
                <input
                  id={messageInputId}
                  type="text"
                  maxLength={100}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="e.g. 30 days of discipline and still going."
                  className="w-full max-w-full box-border min-w-0 bg-surface border border-border-subtle rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <p className="text-[10px] text-muted leading-relaxed">
                ✦ High-resolution 1080×1080 canvas formatted for Instagram posts & stories, WhatsApp, X, and LinkedIn.
              </p>
            </div>

            {/* Error notice if any */}
            {shareError && (
              <p className="text-xs text-error font-medium break-words [overflow-wrap:anywhere] min-w-0">{shareError}</p>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* Primary: Native Share */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full h-11 bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-98 transition-all shadow-sm cursor-pointer"
              >
                <FiShare2 size={16} />
                <span>Share with Friends / Story</span>
              </button>

              {/* Secondary: Download 1:1 PNG */}
              <button
                type="button"
                onClick={handleDownload}
                className="w-full h-10 bg-surface border border-border/80 text-foreground font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-surface-hover active:scale-98 transition-all cursor-pointer shadow-2xs"
              >
                <FiDownload size={15} />
                <span>Download High-Res 1:1 PNG</span>
              </button>

              {/* Tertiary: Copy Link & Copy Text */}
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 min-w-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={isGeneratingLink}
                  className="h-9 min-h-[36px] min-w-0 px-3 rounded-lg border border-border-subtle bg-surface-secondary text-[11px] font-bold text-secondary-text hover:text-foreground hover:border-border flex flex-wrap items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer text-center"
                  title="Generate secure public link to share on WhatsApp or Twitter"
                >
                  {copiedLink ? <FiCheck size={13} className="text-success shrink-0" /> : <FiLink size={13} className="shrink-0" />}
                  <span className="break-words">{copiedLink ? 'Link Copied!' : isGeneratingLink ? 'Creating...' : 'Public Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="h-9 min-h-[36px] min-w-0 px-3 rounded-lg border border-border-subtle bg-surface-secondary text-[11px] font-bold text-secondary-text hover:text-foreground hover:border-border flex flex-wrap items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                  title="Copy formatted text to clipboard"
                >
                  {copiedText ? <FiCheck size={13} className="text-success shrink-0" /> : <FiCopy size={13} className="shrink-0" />}
                  <span className="break-words">{copiedText ? 'Text Copied!' : 'Copy Text'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
