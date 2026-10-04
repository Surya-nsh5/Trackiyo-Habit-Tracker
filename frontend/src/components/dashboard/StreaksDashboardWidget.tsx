import React, { useEffect } from 'react';
import { useStreakStore } from '../../store/useStreakStore';
import { useShareStore } from '../../store/useShareStore';
import { FiTrendingUp, FiShare2 } from 'react-icons/fi';

export const StreaksDashboardWidget: React.FC = () => {
  const { overall, habits, focus, tasks, wellness, fetchStreaks, fetchStreakDetail } = useStreakStore();
  const { openShareModal } = useShareStore();

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  const allStreaks = [
    ...(focus ? [focus] : []),
    ...(tasks ? [tasks] : []),
    ...(wellness ? [wellness] : []),
    ...habits
  ];

  if (allStreaks.length === 0) return null;

  const handleCardClick = (type: string, id: string) => {
    fetchStreakDetail(type, id);
  };

  const handleQuickShare = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    openShareModal({
      title: item.name,
      subtitle: `${item.currentStreak}-Day Consistency Streak`,
      metricValue: `${item.currentStreak} Days`,
      metricLabel: 'Streak Maintained',
      streakCount: item.currentStreak,
      tier: item.currentStreak >= 30 ? 'gold' : item.currentStreak >= 14 ? 'silver' : 'bronze'
    });
  };

  return (
    <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 w-full max-w-full min-w-0">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-lg shrink-0">
            🔥
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider break-words">
                Consistency Streaks
              </h2>
              {overall.currentStreak > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-accent text-accent-ink uppercase whitespace-nowrap shrink-0">
                  {overall.currentStreak}d Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-secondary-text break-words min-w-0">
              Real-time daily momentum across habits, deep focus, and tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'CHALLENGES' } }))}
            className="px-2.5 py-1 rounded-lg border border-border-subtle bg-surface-secondary text-secondary-text hover:text-accent hover:border-accent/40 text-[11px] font-bold transition-colors cursor-pointer"
          >
            Challenges
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted font-semibold shrink-0 whitespace-nowrap">
            <FiTrendingUp className="text-accent" size={14} />
            <span>Best: {overall.longestStreak}d</span>
          </div>
        </div>
      </div>

      {/* Streaks Horizontal Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-full min-w-0">
        {allStreaks.slice(0, 8).map(item => {
          const isPB = item.currentStreak >= item.longestStreak && item.currentStreak > 0;
          return (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => handleCardClick(item.type, item.id)}
              className="group p-3.5 rounded-xl bg-surface-secondary/60 border border-border-subtle hover:border-accent/60 hover:bg-surface-secondary cursor-pointer transition-all flex flex-col justify-between relative shadow-xs min-w-0 max-w-full"
            >
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-1 mb-2 min-w-0">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.completedToday && (
                      <span className="w-2 h-2 rounded-full bg-success" title="Completed today"></span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleQuickShare(e, item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-accent rounded transition-all"
                      title="Share streak card"
                    >
                      <FiShare2 size={12} />
                    </button>
                  </div>
                </div>

                <p className="text-xs font-bold text-foreground min-w-0 break-words [overflow-wrap:anywhere] leading-snug line-clamp-2">{item.name}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-border-subtle/50 flex flex-wrap items-baseline justify-between gap-1 min-w-0">
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-base font-black text-accent tabular-nums shrink-0">{item.currentStreak}</span>
                  <span className="text-[10px] text-muted font-bold shrink-0">days</span>
                </div>
                <span className="text-[10px] text-muted font-medium tabular-nums shrink-0 whitespace-nowrap">
                  {isPB ? 'Best' : `PB: ${item.longestStreak}d`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
