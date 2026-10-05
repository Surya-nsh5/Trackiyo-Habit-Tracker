import React, { useState } from 'react';
import { useStreakStore } from '../../store/useStreakStore';
import { useShareStore } from '../../store/useShareStore';
import {
  FiX, FiShare2, FiShield, FiCalendar, FiAward,
  FiCheck, FiRefreshCw
} from 'react-icons/fi';

export const StreakDetailModal: React.FC = () => {
  const { activeStreakDetail, isModalOpen, closeStreakModal, applyGraceDay, graceDays } = useStreakStore();
  const { openShareModal } = useShareStore();

  const [isApplyingGrace, setIsApplyingGrace] = useState(false);
  const [graceSuccess, setGraceSuccess] = useState<string | null>(null);

  if (!isModalOpen || !activeStreakDetail) return null;

  const {
    id,
    type,
    name,
    icon,
    currentStreak,
    longestStreak,
    calendarDays,
    milestoneProgress,
    totalCompletions
  } = activeStreakDetail;

  const isPersonalBest = currentStreak >= longestStreak && currentStreak > 0;

  // Determine appropriate tier for the current streak
  let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (currentStreak >= 100) tier = 'platinum';
  else if (currentStreak >= 30) tier = 'gold';
  else if (currentStreak >= 14) tier = 'silver';

  const handleShare = () => {
    openShareModal({
      title: name,
      subtitle: `${currentStreak}-Day Consistency Run`,
      metricValue: `${currentStreak} Days`,
      metricLabel: 'Streak Maintained',
      streakCount: currentStreak,
      tier,
      format: 'square',
      theme: tier === 'platinum' ? 'focus' : tier === 'gold' ? 'gold' : 'dark'
    });
  };

  // Find missed yesterday to allow grace day application
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const yesterdayDay = calendarDays.find(d => d.date === yesterday);
  const canApplyGrace = yesterdayDay?.status === 'missed' && (graceDays?.available || 0) > 0;

  const handleUseGraceDay = async () => {
    setIsApplyingGrace(true);
    setGraceSuccess(null);
    const success = await applyGraceDay(type, id, yesterday);
    setIsApplyingGrace(false);
    if (success) {
      setGraceSuccess('Grace Day applied! Streak successfully preserved.');
      setTimeout(() => setGraceSuccess(null), 3500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-fadeIn safe-pt safe-pb safe-px"
      onClick={closeStreakModal}
    >
      <div
        className="bg-surface border border-border/80 rounded-2xl w-full max-w-[min(42rem,calc(100vw-2rem))] min-w-0 max-h-[calc(100dvh-2rem-var(--sat)-var(--sab))] flex flex-col shadow-2xl overflow-hidden box-border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border/70 shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-10 h-10 shrink-0 rounded-xl bg-accent/15 flex items-center justify-center text-2xl shadow-xs">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 id="streak-detail-title" className="text-base font-bold text-foreground break-words [overflow-wrap:anywhere] min-w-0 flex-1">
                  {name}
                </h2>
                {isPersonalBest && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-accent text-accent-ink uppercase tracking-wider shrink-0 whitespace-nowrap">
                    Personal Best
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary-text capitalize break-words">
                {type} consistency history • {totalCompletions} total completions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeStreakModal}
            className="p-1.5 text-muted hover:text-foreground rounded-lg transition-colors shrink-0"
            aria-label="Close streak details"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar p-5 space-y-6">
          
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 min-w-0">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
                Current Streak
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-accent tabular-nums">{currentStreak}</span>
                <span className="text-xs text-muted font-bold">days</span>
              </div>
            </div>

            <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 min-w-0">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
                Longest Streak
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-foreground tabular-nums">{longestStreak}</span>
                <span className="text-xs text-muted font-bold">days</span>
              </div>
            </div>

            <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 min-w-0 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
                Total Logs
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-foreground tabular-nums">{totalCompletions}</span>
                <span className="text-xs text-muted font-bold">completed</span>
              </div>
            </div>
          </div>

          {/* 60-Day Contribution Streak Calendar */}
          <div className="bg-surface border border-border/80 rounded-xl p-4 shadow-xs min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-w-0">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-accent" size={16} />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Consistency Timeline (Last 60 Days)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block"></span> Done
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-surface-secondary border border-border-subtle inline-block"></span> Missed
                </span>
              </div>
            </div>

            {/* Grid of days */}
            <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-15 gap-1.5 pt-1">
              {calendarDays.map(day => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.status.toUpperCase()}`}
                  className={`h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                    day.isCompleted
                      ? 'bg-accent text-accent-ink shadow-xs'
                      : day.isGrace
                      ? 'bg-warning/20 text-warning border border-warning/40'
                      : 'bg-surface-secondary text-muted/50 border border-border-subtle/50'
                  }`}
                >
                  {day.isCompleted ? '✓' : day.isGrace ? '🛡️' : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Grace Day Recovery Panel */}
          <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FiShield size={16} className="text-accent" />
                <h4 className="text-xs font-bold text-foreground">Grace Day Recovery</h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent">
                  {graceDays?.available ?? 2} Available
                </span>
              </div>
              <p className="text-[11px] text-secondary-text mt-1">
                Protect your momentum on accidental missed days without manipulating history.
              </p>
              {graceSuccess && (
                <p className="text-xs text-success font-semibold mt-2">{graceSuccess}</p>
              )}
            </div>

            {canApplyGrace && (
              <button
                type="button"
                onClick={handleUseGraceDay}
                disabled={isApplyingGrace}
                className="px-4 py-2 bg-surface border border-accent/40 text-accent font-bold text-xs rounded-lg hover:bg-accent/10 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isApplyingGrace ? <FiRefreshCw className="animate-spin" size={13} /> : <FiShield size={13} />}
                <span>Apply for Yesterday</span>
              </button>
            )}
          </div>

          {/* Milestone Progression */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
              <FiAward size={14} className="text-accent" />
              <span>Milestone Progress</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {milestoneProgress.map(m => (
                <div
                  key={m.days}
                  className={`p-3 rounded-xl border text-xs ${
                    m.isCurrent
                      ? 'bg-accent/10 border-accent/50'
                      : m.reached
                      ? 'bg-surface-secondary border-border-subtle'
                      : 'bg-surface-secondary/40 border-border-subtle/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-foreground">{m.days} Days</span>
                    {m.reached && <FiCheck className="text-accent" size={13} />}
                  </div>
                  <div className="h-1.5 rounded-full bg-surface border border-border-subtle overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${m.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted mt-1 block">
                    {m.isCurrent ? 'Active Milestone' : m.reached ? 'Completed' : `${m.days - currentStreak}d remaining`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 bg-surface shrink-0 min-w-0">
          <div className="text-xs text-muted font-medium hidden sm:block min-w-0 flex-1 break-words">
            Share your progress card on social stories or with friends.
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="w-full sm:w-auto min-w-0 px-6 h-11 min-h-[44px] bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider rounded-xl flex flex-wrap items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xs text-center"
          >
            <FiShare2 size={16} className="shrink-0" />
            <span>Generate Share Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
