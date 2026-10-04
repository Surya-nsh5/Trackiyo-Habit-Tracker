import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  FiAward, FiShare2, FiDownload, FiCheck, FiArrowRight,
  FiShield, FiAlertCircle
} from 'react-icons/fi';
import { generateShareCardBlob, downloadBlob } from '../../utils/shareCardGenerator';
import { TrackiyoLogo } from '../layout/TrackiyoLogo';

interface PublicShareViewProps {
  token: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ token }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.get(`/share/${token}`);
        if (isMounted) {
          setData(res.data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.error || 'This shared achievement is private or has expired.');
          setIsLoading(false);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [token]);

  const isAchievement =
    Boolean(data?.achievementId) ||
    (typeof data?.metricValue === 'string' &&
      (data.metricValue.includes('XP') ||
        data.metricValue.includes('TIER') ||
        data.metricValue.includes('UNLOCKED') ||
        data.metricValue.includes('AWARDED')));

  const handleDownload = async () => {
    if (!data) return;
    try {
      const blob = await generateShareCardBlob({
        title: data.title,
        subtitle: data.subtitle,
        metricValue: data.metricValue,
        metricLabel: data.metricLabel,
        streakCount: data.streakCount,
        tier: data.tier,
        theme: data.theme,
        customMessage: data.customMessage,
        includeUsername: !!data.username,
        username: data.username,
        format: 'square'
      });
      downloadBlob(blob, `trackiyo-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-1x1.png`);
    } catch (err) {
      console.error('Failed to download card:', err);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <TrackiyoLogo size={44} variant="gradient" className="animate-pulse" />
          <p className="text-xs text-muted font-medium">Loading verified record...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans">
        <div className="w-full max-w-[min(28rem,calc(100vw-2rem))] min-w-0 bg-surface border border-border/80 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto shrink-0">
            <FiAlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-foreground text-balance break-words">Share Unavailable</h2>
          <p className="text-xs text-secondary-text leading-relaxed break-words [overflow-wrap:anywhere]">
            {error || 'This progress card was revoked by the owner or does not exist.'}
          </p>
          <a
            href="/"
            className="inline-flex flex-wrap items-center justify-center gap-2 px-5 py-2.5 max-w-full bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all shadow-xs"
          >
            <span>Go to Trackiyo</span>
            <FiArrowRight size={14} className="shrink-0" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full box-border bg-background text-foreground p-4 sm:p-8 flex flex-col items-center justify-center font-sans relative overflow-hidden min-w-0">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-w-full h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top branding */}
      <div className="flex items-center gap-2.5 mb-8 z-10 min-w-0 max-w-full">
        <TrackiyoLogo size={32} variant="gradient" />
        <span className="font-bold text-sm tracking-[0.16em] uppercase text-foreground truncate">
          TRACKIYO
        </span>
      </div>

      {/* Verified Achievement / Streak Card */}
      <div className="w-full max-w-[min(28rem,calc(100vw-2rem))] min-w-0 bg-surface border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 z-10 text-center relative overflow-hidden box-border">
        {/* Tier badge */}
        <div className="inline-flex flex-wrap justify-center items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 mx-auto max-w-full break-words">
          <FiAward size={13} className="shrink-0" />
          <span className="break-words [overflow-wrap:anywhere]">{data.tier} {isAchievement ? 'Achievement' : 'Milestone'} Verified</span>
        </div>

        {/* Big Icon */}
        <div className="w-24 h-24 shrink-0 rounded-3xl bg-surface-secondary border border-border-subtle flex items-center justify-center text-5xl mx-auto shadow-inner">
          {isAchievement ? '🏆' : '🔥'}
        </div>

        {/* Headline */}
        <div className="min-w-0 max-w-full">
          {isAchievement ? (
            <>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase text-balance break-words [overflow-wrap:anywhere]">
                {data.title}
              </h1>
              <div className="inline-flex flex-wrap justify-center items-center gap-1.5 px-3 py-0.5 mt-2 rounded-full text-xs font-bold bg-accent/15 text-accent border border-accent/30 max-w-full">
                <span className="break-words [overflow-wrap:anywhere]">{data.metricValue}</span>
              </div>
              {data.subtitle && (
                <p className="text-xs text-secondary-text mt-3 break-words [overflow-wrap:anywhere]">{data.subtitle}</p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight text-balance break-words [overflow-wrap:anywhere]">
                {data.metricValue}
              </h1>
              <p className="text-sm font-bold text-accent uppercase tracking-wider mt-1 break-words [overflow-wrap:anywhere]">
                {data.title}
              </p>
              {data.subtitle && (
                <p className="text-xs text-secondary-text mt-1 break-words [overflow-wrap:anywhere]">{data.subtitle}</p>
              )}
            </>
          )}
        </div>

        {/* Custom Quote if any */}
        {data.customMessage && (
          <blockquote className="bg-surface-secondary/60 border-l-2 border-accent p-3 rounded-r-xl text-xs italic text-secondary-text text-left break-words [overflow-wrap:anywhere] min-w-0">
            “{data.customMessage}”
          </blockquote>
        )}

        {/* User signature */}
        <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs text-secondary-text font-medium min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FiShield className="text-accent shrink-0" size={14} />
            <span className="min-w-0 break-words [overflow-wrap:anywhere] text-left">{data.username ? `@${data.username.toLowerCase().replace(/\s+/g, '')}` : 'Verified Trackiyo Achiever'}</span>
          </div>
          <span className="text-[11px] text-muted shrink-0 whitespace-nowrap">
            {new Date(data.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 pt-2 min-w-0">
          <button
            type="button"
            onClick={handleDownload}
            className="h-10 min-h-[44px] min-w-0 bg-surface-secondary border border-border-subtle text-foreground font-bold text-xs rounded-xl flex flex-wrap items-center justify-center gap-1.5 hover:border-border transition-colors px-2 text-center"
          >
            <FiDownload size={14} className="shrink-0" />
            <span className="break-words">Download Image</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="h-10 min-h-[44px] min-w-0 bg-accent text-accent-ink font-bold text-xs rounded-xl flex flex-wrap items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-xs px-2 text-center"
          >
            {copiedLink ? <FiCheck size={14} className="shrink-0" /> : <FiShare2 size={14} className="shrink-0" />}
            <span className="break-words">{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="mt-8 text-center z-10">
        <p className="text-xs text-muted mb-2">Build your own consistency streaks with zero friction.</p>
        <a
          href="/"
          className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1"
        >
          <span>Start tracking with Trackiyo</span>
          <FiArrowRight size={12} />
        </a>
      </div>
    </div>
  );
};
