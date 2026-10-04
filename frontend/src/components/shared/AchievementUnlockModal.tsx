import React from 'react';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useShareStore } from '../../store/useShareStore';
import { FiAward, FiShare2, FiCheck, FiX } from 'react-icons/fi';

const TIER_STYLES: Record<string, { badge: string; border: string; glow: string }> = {
  bronze: { badge: 'bg-[#B45309]/15 text-[#D97706] border-[#B45309]/40', border: 'border-[#B45309]/50', glow: 'shadow-[#B45309]/20' },
  silver: { badge: 'bg-[#94A3B8]/15 text-[#CBD5E1] border-[#94A3B8]/40', border: 'border-[#94A3B8]/50', glow: 'shadow-[#94A3B8]/20' },
  gold: { badge: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/40', border: 'border-[#F59E0B]/50', glow: 'shadow-[#F59E0B]/25' },
  platinum: { badge: 'bg-[#06B6D4]/15 text-[#22D3EE] border-[#06B6D4]/40', border: 'border-[#06B6D4]/50', glow: 'shadow-[#06B6D4]/30' },
};

export const AchievementUnlockModal: React.FC = () => {
  const { recentUnlock, clearRecentUnlock } = useGamificationStore();
  const { openShareModal } = useShareStore();

  if (!recentUnlock) return null;

  const tier = (recentUnlock.tier || 'gold').toLowerCase();
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.gold;

  const handleShare = () => {
    const config = {
      type: 'achievement',
      title: recentUnlock.title,
      subtitle: recentUnlock.description,
      description: recentUnlock.description,
      metricValue: `+${recentUnlock.xp || 50} XP EARNED`,
      metricLabel: 'Milestone Unlocked',
      tier: (recentUnlock.tier as any) || 'gold',
      icon: recentUnlock.icon || '🏆',
      achievementId: recentUnlock.id,
      xp: recentUnlock.xp,
      format: 'square' as const,
      theme: 'dark' as const
    };
    clearRecentUnlock();
    openShareModal(config);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn"
      onClick={clearRecentUnlock}
    >
      <div
        className={`bg-surface border ${tierStyle.border} rounded-2xl w-full max-w-[min(24rem,calc(100vw-2rem))] min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 flex flex-col items-center text-center shadow-2xl ${tierStyle.glow} relative box-border`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={clearRecentUnlock}
          className="absolute top-3.5 right-3.5 p-1 text-muted hover:text-foreground rounded-lg transition-colors"
          aria-label="Dismiss unlock notification"
        >
          <FiX size={16} />
        </button>

        {/* Tier Pill */}
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${tierStyle.badge} mb-4 max-w-full break-words`}>
          {tier} Achievement Unlocked
        </span>

        {/* Icon with glowing ring */}
        <div className="w-20 h-20 shrink-0 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-4xl mb-4 shadow-inner max-w-full">
          <span role="img" aria-label={recentUnlock.title}>
            {recentUnlock.icon}
          </span>
        </div>

        {/* Title */}
        <h3 id="unlock-title" className="text-base sm:text-lg font-bold text-foreground mb-1 text-balance break-words [overflow-wrap:anywhere] max-w-full">
          {recentUnlock.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-secondary-text mb-4 w-full max-w-[260px] break-words [overflow-wrap:anywhere]">
          {recentUnlock.description}
        </p>

        {/* XP badge */}
        <div className="inline-flex flex-wrap justify-center items-center gap-1.5 px-3 py-1 rounded-lg bg-accent/10 border border-accent/30 text-accent font-bold text-xs mb-6 max-w-full">
          <FiAward size={14} className="shrink-0" />
          <span className="break-words">+{recentUnlock.xp || 50} XP Earned</span>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 min-w-0 basis-32 h-10 min-h-[44px] rounded-xl bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-xs px-2 text-center"
          >
            <FiShare2 size={15} className="shrink-0" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={clearRecentUnlock}
            className="flex-1 min-w-0 basis-32 h-10 min-h-[44px] rounded-xl border border-border/80 bg-surface-secondary text-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-surface-hover active:scale-95 transition-all px-2 text-center"
          >
            <FiCheck size={15} className="shrink-0" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
