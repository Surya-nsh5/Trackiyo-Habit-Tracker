import React, { useEffect, useState, useMemo } from 'react';
import { useStreakStore } from '../../store/useStreakStore';
import { useShareStore } from '../../store/useShareStore';
import {
  FiShare2, FiShield, FiCalendar, FiAward,
  FiCheck, FiRefreshCw, FiTrendingUp, FiChevronLeft
} from 'react-icons/fi';

export const ConsistencyView: React.FC = () => {
  const {
    overall,
    habits,
    focus,
    tasks,
    wellness,
    graceDays,
    activeStreakDetail,
    isLoading,
    fetchStreaks,
    fetchStreakDetail,
    applyGraceDay
  } = useStreakStore();

  const { openShareModal } = useShareStore();

  const [selectedKey, setSelectedKey] = useState<string>('');
  const [isApplyingGrace, setIsApplyingGrace] = useState(false);
  const [graceSuccess, setGraceSuccess] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Grouped list of all trackable streak entities
  const allStreaks = useMemo(() => [
    ...(tasks ? [tasks] : []),
    ...(focus ? [focus] : []),
    ...(wellness ? [wellness] : []),
    ...habits
  ], [tasks, focus, wellness, habits]);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  // Default to selecting the first streak item
  useEffect(() => {
    if (allStreaks.length > 0 && !selectedKey) {
      const first = allStreaks[0];
      const key = `${first.type}-${first.id}`;
      setSelectedKey(key);
      fetchStreakDetail(first.type, first.id);
    }
  }, [allStreaks, selectedKey, fetchStreakDetail]);

  const handleSelectStreak = (type: string, id: string) => {
    setSelectedKey(`${type}-${id}`);
    fetchStreakDetail(type, id);
    setMobileDetailOpen(true);
  };

  const currentStreak = activeStreakDetail?.currentStreak ?? 0;
  const longestStreak = activeStreakDetail?.longestStreak ?? 0;
  const isPersonalBest = currentStreak >= longestStreak && currentStreak > 0;

  // Determine share tier
  let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
  if (currentStreak >= 100) tier = 'platinum';
  else if (currentStreak >= 30) tier = 'gold';
  else if (currentStreak >= 14) tier = 'silver';

  const handleShare = () => {
    if (!activeStreakDetail) return;
    openShareModal({
      title: activeStreakDetail.name,
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
  const yesterdayDay = activeStreakDetail?.calendarDays?.find(d => d.date === yesterday);
  const canApplyGrace = yesterdayDay?.status === 'missed' && (graceDays?.available || 0) > 0;

  const handleUseGraceDay = async () => {
    if (!activeStreakDetail) return;
    setIsApplyingGrace(true);
    setGraceSuccess(null);
    const success = await applyGraceDay(activeStreakDetail.type, activeStreakDetail.id, yesterday);
    setIsApplyingGrace(false);
    if (success) {
      setGraceSuccess('Grace Day applied! Streak successfully preserved.');
      setTimeout(() => setGraceSuccess(null), 3500);
    }
  };

  return (
    <div className="h-full w-full max-w-full min-w-0 flex flex-col min-h-0 space-y-3">
      {/* Master-Detail Layout */}
      <div className="flex-1 min-h-0 w-full max-w-full min-w-0 flex flex-col lg:flex-row gap-3.5 sm:gap-4 overflow-hidden">

        {/* ========================================================= */}
        {/* LEFT PANEL: TABBED CONSISTENCY STREAKS SELECTOR           */}
        {/* ========================================================= */}
        <div className={`w-full max-w-full lg:w-80 xl:w-96 flex flex-col min-h-0 bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden ${mobileDetailOpen ? 'hidden lg:flex' : 'flex'
          }`}>
          {/* Panel Header */}
          <div className="p-4 border-b border-border/70 shrink-0 bg-surface">
            <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-sm font-bold shrink-0">
                  🔥
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Consistency Streaks
                  </h2>
                  <p className="text-[11px] text-secondary-text">
                    Select a routine or habit to view detailed timeline
                  </p>
                </div>
              </div>

              {overall.currentStreak > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-accent text-accent-ink uppercase shrink-0">
                  {overall.currentStreak}d Active
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted font-medium mt-3 pt-2.5 border-t border-border-subtle">
              <span>Overall Rhythm</span>
              <span className="flex items-center gap-1 font-bold text-foreground text-[11px]">
                <FiTrendingUp className="text-accent" size={13} />
                <span>Best: {overall.longestStreak}d</span>
              </span>
            </div>
          </div>

          {/* Streaks Tab List */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {allStreaks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                No active routines tracked yet.
              </div>
            ) : (
              allStreaks.map(item => {
                const key = `${item.type}-${item.id}`;
                const isSelected = selectedKey === key;
                const isPB = item.currentStreak >= item.longestStreak && item.currentStreak > 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectStreak(item.type, item.id)}
                    className={`w-full max-w-full min-w-0 p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${isSelected
                        ? 'bg-accent/10 border-accent shadow-xs'
                        : 'border-border-subtle hover:bg-surface-hover hover:border-border text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-lg shrink-0">
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-xs font-bold truncate max-w-full flex-1 min-w-0 ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                            {item.name}
                          </span>
                          {item.completedToday && (
                            <span className="w-2 h-2 rounded-full bg-success shrink-0" title="Completed today" />
                          )}
                        </div>
                        <span className="text-[10px] text-secondary-text uppercase tracking-wider block capitalize">
                          {item.type} • {isPB ? 'Best Record' : `PB: ${item.longestStreak}d`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span className="text-base font-black text-foreground tabular-nums">
                          {item.currentStreak}
                        </span>
                        <span className="text-[10px] text-muted font-bold">d</span>
                      </div>
                      <span className="text-[9px] text-muted block uppercase tracking-wider">
                        Streak
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: EXPANDED STREAK DETAIL (IMAGE 1)             */}
        {/* ========================================================= */}
        <div className={`flex-1 min-h-0 w-full max-w-full min-w-0 bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden flex-col ${mobileDetailOpen ? 'flex' : 'hidden lg:flex'
          }`}>
          {isLoading && !activeStreakDetail ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-2 text-xs text-muted">
                <FiRefreshCw className="animate-spin text-accent" size={24} />
                <span>Loading consistency history...</span>
              </div>
            </div>
          ) : !activeStreakDetail ? (
            <div className="h-full flex items-center justify-center p-8 text-center text-xs text-muted">
              Select a streak item on the left to expand full consistency timeline and details.
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-0">
              {/* Header with Mobile Back Button */}
              <div className="flex items-center justify-between gap-3 min-w-0 max-w-full px-5 py-4 border-b border-border/70 shrink-0 bg-surface">
                <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="lg:hidden p-1.5 rounded-lg border border-border-subtle text-secondary-text hover:text-foreground shrink-0"
                    title="Back to streaks list"
                  >
                    <FiChevronLeft size={18} />
                  </button>

                  <span className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-2xl shadow-xs shrink-0">
                    {activeStreakDetail.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <h2 className="text-base font-bold text-foreground truncate min-w-0 max-w-full">
                        {activeStreakDetail.name}
                      </h2>
                      {isPersonalBest && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-accent text-accent-ink uppercase tracking-wider shrink-0">
                          Personal Best
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary-text capitalize truncate max-w-full">
                      {activeStreakDetail.type} Consistency History • {activeStreakDetail.totalCompletions} Total Completions
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Detail Body */}
              <div className="flex-1 min-h-0 w-full max-w-full min-w-0 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">

                {/* 1. Key Metrics 3-Card Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-0">
                  <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 min-w-0">
                    <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
                      Current Streak
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-accent tabular-nums">
                        {activeStreakDetail.currentStreak}
                      </span>
                      <span className="text-xs text-muted font-bold">days</span>
                    </div>
                  </div>

                  <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 min-w-0">
                    <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
                      Longest Streak
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-foreground tabular-nums">
                        {activeStreakDetail.longestStreak}
                      </span>
                      <span className="text-xs text-muted font-bold">days</span>
                    </div>
                  </div>

                  <div className="bg-surface-secondary/70 border border-border-subtle rounded-xl p-3.5 min-w-0 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
                      Total Logs
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-foreground tabular-nums">
                        {activeStreakDetail.totalCompletions}
                      </span>
                      <span className="text-xs text-muted font-bold">completed</span>
                    </div>
                  </div>
                </div>

                {/* 2. 60-Day Consistency Heatmap Timeline */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-accent" size={15} />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Consistency Timeline (Last 60 Days)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-accent inline-block" /> Done
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-surface-secondary border border-border-subtle inline-block" /> Missed
                      </span>
                    </div>
                  </div>

                  {/* Grid of 60 days */}
                  <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-15 gap-1.5 pt-1 min-w-0">
                    {activeStreakDetail.calendarDays.map(day => (
                      <div
                        key={day.date}
                        title={`${day.date}: ${day.status.toUpperCase()}`}
                        className={`h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${day.isCompleted
                            ? 'bg-accent text-accent-ink shadow-xs font-black'
                            : day.isGrace
                              ? 'bg-warning/20 text-warning border border-warning/40'
                              : 'bg-surface-secondary text-muted/40 border border-border-subtle/50'
                          }`}
                      >
                        {day.isCompleted ? '✓' : day.isGrace ? '🛡️' : ''}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Grace Day Recovery Panel */}
                <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
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
                      className="px-4 py-2 bg-surface border border-accent/40 text-accent font-bold text-xs rounded-lg hover:bg-accent/10 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer w-full sm:w-auto"
                    >
                      {isApplyingGrace ? <FiRefreshCw className="animate-spin" size={13} /> : <FiShield size={13} />}
                      <span>Apply for Yesterday</span>
                    </button>
                  )}
                </div>

                {/* 4. Milestone Progression */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
                    <FiAward size={14} className="text-accent" />
                    <span>Milestone Progress</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-0">
                    {activeStreakDetail.milestoneProgress.map(m => (
                      <div
                        key={m.days}
                        className={`p-3 rounded-xl border text-xs min-w-0 break-words ${m.isCurrent
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
                            className="h-full bg-accent rounded-full transition-all duration-500"
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

              {/* 5. Footer Share Actions */}
              <div className="p-4 border-t border-border/70 flex items-center justify-between gap-3 flex-wrap min-w-0 bg-surface shrink-0">
                <div className="text-xs text-muted font-medium hidden sm:block">
                  Share your progress card on social stories or with friends.
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full sm:w-auto px-6 h-11 bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <FiShare2 size={15} />
                  <span>Generate Share Card</span>
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ConsistencyView;
