import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import type { PublicChallengeData } from '../../types/friendsChallenges';
import { FiCheck, FiArrowRight } from 'react-icons/fi';
import { TrackiyoLogo } from '../layout/TrackiyoLogo';

interface PublicChallengeViewProps {
  token: string;
}

export const PublicChallengeView: React.FC<PublicChallengeViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/challenges/public/${token}`);
        if (res.data) {
          setData(res.data);
        } else {
          setError('Challenge result not found');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'This challenge result is private or no longer available.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-xs text-muted font-mono tracking-widest uppercase animate-pulse">
          Loading challenge result...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-[min(28rem,calc(100vw-2rem))] min-w-0 text-center space-y-4 bg-[#18181b] border border-[#27272a] rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto text-xl shrink-0">
            🔒
          </div>
          <h2 className="text-base font-bold text-balance break-words">Challenge Unavailable</h2>
          <p className="text-xs text-[#a1a1aa] leading-relaxed break-words [overflow-wrap:anywhere]">
            {error || 'This challenge record is private, expired, or was revoked.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 max-w-full rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 transition-colors"
          >
            Go to Trackiyo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full box-border bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center p-4 sm:p-6 font-sans min-w-0">
      <div className="w-full max-w-[min(28rem,calc(100vw-2rem))] min-w-0 bg-[#121215] border border-[#27272a] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden box-border">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-4 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <TrackiyoLogo size={28} variant="gradient" />
            <span className="text-xs font-bold tracking-[0.2em] text-[#a1a1aa] uppercase break-words min-w-0">
              TRACKIYO CHALLENGE
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa] uppercase shrink-0 whitespace-nowrap">
            {data.durationDays} Days
          </span>
        </div>

        {/* Challenge Headline */}
        <div className="text-center space-y-1 min-w-0">
          <span className="text-3xl">🎯</span>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight text-balance break-words [overflow-wrap:anywhere]">{data.title}</h1>
          <p className="text-xs text-[#a1a1aa] break-words [overflow-wrap:anywhere]">
            Target: {data.targetMetric} {data.targetUnit.replace(/_/g, ' ')}
          </p>
        </div>

        {/* Score Board */}
        <div className="grid grid-cols-2 gap-3 text-center min-w-0">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 min-w-0">
            <span className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider block mb-1 break-words [overflow-wrap:anywhere] min-w-0">
              {data.creatorName}
            </span>
            <div className="text-3xl font-bold text-indigo-400 tabular-nums break-words">
              {data.creatorScore}
            </div>
            <span className="text-[10px] text-[#71717a]">points</span>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 min-w-0">
            <span className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider block mb-1 break-words [overflow-wrap:anywhere] min-w-0">
              {data.opponentName}
            </span>
            <div className="text-3xl font-bold text-white tabular-nums break-words">
              {data.opponentScore}
            </div>
            <span className="text-[10px] text-[#71717a]">points</span>
          </div>
        </div>

        {/* Outcome Message */}
        <div className="bg-[#18181b]/70 border border-[#27272a] rounded-2xl p-4 text-center space-y-1 min-w-0">
          <div className="text-xs font-bold text-white flex flex-wrap items-center justify-center gap-1.5 break-words">
            <FiCheck className="text-emerald-400 shrink-0" />
            <span className="break-words [overflow-wrap:anywhere] min-w-0">
            {data.isDraw
              ? 'Result: Draw'
              : data.winnerName
                ? `${data.winnerName} Finished Ahead`
                : 'Mutual Consistency Target Reached'}
            </span>
          </div>
          <p className="text-[11px] text-[#a1a1aa] leading-relaxed break-words [overflow-wrap:anywhere]">
            {data.isDraw
              ? 'Both participants maintained equal dedication and finished with identical scores.'
              : `${data.creatorName} and ${data.opponentName} pushed each other to stay consistent.`}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <a
            href="/"
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <span>Start Your Own Challenge</span>
            <FiArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};
