import React, { useState, useMemo } from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { useDeleteConfirmStore } from '../../store/useDeleteConfirmStore';
import { useToday } from '../../hooks/useToday';
import { computeStreaks, formatDateStr, parseDateStr, addDaysStr } from '../../utils/dailyTracking';
import type { Habit } from '../../types';
import {
  FiX, FiCalendar, FiTrendingUp, FiCheck, FiTrash2,
  FiEdit2, FiChevronLeft, FiChevronRight, FiActivity
} from 'react-icons/fi';

interface HabitDetailModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (habit: Habit) => void;
}

export const HabitDetailModal: React.FC<HabitDetailModalProps> = ({
  habit,
  isOpen,
  onClose,
  onEdit
}) => {
  const { habitLogs, deleteHabit, toggleHabitLog } = useHabitStore();
  const { promptDelete } = useDeleteConfirmStore();
  const todayStr = useToday();

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Year heatmap weeks. This hook stays above the early return so hook
  // order is stable across renders; it no-ops when habit is null.
  const yearHeatmap = useMemo(() => {
    if (!habit) return [];
    const jan1 = new Date(selectedYear, 0, 1);
    const dec31 = new Date(selectedYear, 11, 31);
    
    // Find the Monday on or before Jan 1
    const startOffset = (jan1.getDay() + 6) % 7;
    const startDate = new Date(selectedYear, 0, 1 - startOffset);
    
    const weeks: { dateStr: string; isCurrentYear: boolean; isDone: boolean; isFuture: boolean }[][] = [];
    let currentWeek: { dateStr: string; isCurrentYear: boolean; isDone: boolean; isFuture: boolean }[] = [];
    
    let cur = new Date(startDate);
    while (cur <= dec31 || currentWeek.length > 0) {
      const dStr = formatDateStr(cur);
      const isCurrentYear = cur.getFullYear() === selectedYear;
      const isDone = habitLogs[`${habit.id}_${dStr}`] === true;
      const isFuture = dStr > todayStr;
      
      currentWeek.push({ dateStr: dStr, isCurrentYear, isDone, isFuture });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
        if (cur > dec31) break;
      }
      cur = new Date(cur.getTime() + 86400000);
    }
    return weeks;
  }, [selectedYear, habit, habitLogs, todayStr]);

  if (!isOpen || !habit) return null;

  const creationDate = habit.created_at ? habit.created_at.slice(0, 10) : '2026-01-01';
  const streaks = computeStreaks(habit.id, habitLogs, creationDate, todayStr);
  const isDoneToday = habitLogs[`${habit.id}_${todayStr}`] === true;

  // Calculate completions over time periods
  const todayDate = parseDateStr(todayStr);

  // Monday of this week
  const dayOfWeek = (todayDate.getDay() + 6) % 7; // 0=Mon, ..., 6=Sun
  const mondayThisWeek = addDaysStr(todayStr, -dayOfWeek);

  let thisWeekCompletions = 0;
  for (let i = 0; i <= dayOfWeek; i++) {
    const dStr = addDaysStr(mondayThisWeek, i);
    if (habitLogs[`${habit.id}_${dStr}`] === true) thisWeekCompletions++;
  }

  // This month
  const thisMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
  let thisMonthCompletions = 0;
  // This year
  const thisYearPrefix = `${selectedYear}-`;
  let thisYearCompletions = 0;
  // All time
  let allTimeCompletions = 0;

  // Day-of-week frequency breakdown (Mon=0, Tue=1, ..., Sun=6)
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];

  Object.entries(habitLogs).forEach(([key, isDone]) => {
    if (key.startsWith(`${habit.id}_`) && isDone === true) {
      const dateStr = key.replace(`${habit.id}_`, '');
      allTimeCompletions++;

      if (dateStr.startsWith(thisMonthPrefix)) {
        thisMonthCompletions++;
      }
      if (dateStr.startsWith(thisYearPrefix)) {
        thisYearCompletions++;
      }

      try {
        const d = parseDateStr(dateStr);
        const dow = (d.getDay() + 6) % 7;
        dayOfWeekCounts[dow]++;
      } catch {}
    }
  });

  const maxDowCount = Math.max(...dayOfWeekCounts, 1);

  // 90-day consistency
  let last90DaysDone = 0;
  for (let i = 0; i < 90; i++) {
    const dStr = addDaysStr(todayStr, -i);
    if (habitLogs[`${habit.id}_${dStr}`] === true) last90DaysDone++;
  }
  const consistency90 = Math.round((last90DaysDone / 90) * 100);
  const weeklyAverage = (last90DaysDone / (90 / 7)).toFixed(1);

  // Generate Year Heatmap for selectedYear (Jan 1 -> Dec 31)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Build calendar weeks for the year
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-detail-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border/80 rounded-2xl w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[92vh] min-w-0 flex flex-col shadow-2xl overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-border/70 shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center text-xl shrink-0">
              {habit.icon || '📌'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 id="habit-detail-name" className="text-base font-bold text-foreground min-w-0 break-words [overflow-wrap:anywhere] leading-snug">
                  {habit.name}
                </h2>
                {streaks.current > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-ink uppercase tracking-wider shrink-0 whitespace-nowrap">
                    {streaks.current}d Streak
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary-text min-w-0 break-words [overflow-wrap:anywhere] leading-snug">
                {habit.area || habit.frequency || 'General'} • Daily Habit • {allTimeCompletions} total completions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => toggleHabitLog(habit.id, todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDoneToday
                  ? 'bg-accent text-accent-ink shadow-xs'
                  : 'bg-surface-secondary hover:bg-surface-hover text-secondary-text hover:text-foreground border border-border-subtle'
              }`}
            >
              <FiCheck size={14} strokeWidth={3} />
              <span>{isDoneToday ? 'Completed Today' : 'Mark Done'}</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(habit)}
                className="p-2 text-secondary-text hover:text-foreground rounded-lg hover:bg-surface-secondary transition-colors"
                title="Edit Habit"
              >
                <FiEdit2 size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-secondary-text hover:text-foreground rounded-lg hover:bg-surface-secondary transition-colors"
              aria-label="Close"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 min-w-0 w-full max-w-full overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full max-w-full min-w-0">
            <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 min-w-0 max-w-full">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1">
                Current streak
              </span>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {streaks.current} <span className="text-xs font-semibold text-muted">days</span>
              </div>
            </div>

            <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 min-w-0 max-w-full">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1 break-words">
                Best streak
              </span>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {streaks.longest} <span className="text-xs font-semibold text-muted">day{streaks.longest === 1 ? '' : 's'}</span>
              </div>
            </div>

            <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 min-w-0 max-w-full">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1 break-words">
                Completions
              </span>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {allTimeCompletions}
              </div>
              <span className="text-[10px] text-muted font-medium">{weeklyAverage} per week</span>
            </div>

            <div className="bg-surface-secondary/60 border border-border-subtle rounded-xl p-3.5 min-w-0 max-w-full">
              <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block mb-1 break-words">
                Consistency
              </span>
              <div className="text-2xl font-bold text-accent tabular-nums">
                {consistency90}%
              </div>
              <span className="text-[10px] text-muted font-medium">Last 90 days</span>
            </div>
          </div>

          {/* Activity Year Heatmap */}
          <div className="bg-surface-secondary/40 border border-border-subtle rounded-xl p-4 sm:p-5 w-full max-w-full min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <FiCalendar className="text-accent shrink-0" size={15} />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider break-words">
                  Activity
                </h3>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedYear(y => y - 1)}
                  className="p-1 text-secondary-text hover:text-foreground rounded hover:bg-surface-secondary"
                  title="Previous year"
                >
                  <FiChevronLeft size={14} />
                </button>
                <span className="font-mono tabular-nums">{selectedYear}</span>
                <button
                  type="button"
                  onClick={() => setSelectedYear(y => y + 1)}
                  disabled={selectedYear >= new Date().getFullYear()}
                  className="p-1 text-secondary-text hover:text-foreground rounded hover:bg-surface-secondary disabled:opacity-30"
                  title="Next year"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Months row */}
            <div className="overflow-x-auto custom-scrollbar pb-1 w-full max-w-full">
              <div className="min-w-[540px] max-w-full">
                <div className="grid grid-cols-12 text-[10px] font-semibold text-muted mb-1 text-left px-1">
                  {months.map(m => (
                    <span key={m}>{m}</span>
                  ))}
                </div>

                {/* Heatmap Grid (7 rows x N weeks) */}
                <div className="flex gap-[3px]">
                  {yearHeatmap.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.map((day) => {
                        const isApplicable = day.isCurrentYear && day.dateStr >= creationDate && !day.isFuture;
                        return (
                          <div
                            key={day.dateStr}
                            title={`${day.dateStr}: ${day.isDone ? 'Completed' : day.isFuture ? 'Upcoming' : 'Missed'}`}
                            className={`w-[9px] h-[9px] rounded-xs transition-colors ${
                              !day.isCurrentYear
                                ? 'opacity-0 pointer-events-none'
                                : day.isDone
                                ? 'bg-accent shadow-xs'
                                : isApplicable
                                ? 'bg-surface-secondary border border-border-subtle/80'
                                : 'bg-surface-secondary/40'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lower Two-Column Section: Times Completed & Day of Week Consistency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-full min-w-0">
            {/* Times Completed */}
            <div className="bg-surface-secondary/40 border border-border-subtle rounded-xl p-4 min-w-0 max-w-full">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 min-w-0">
                <FiTrendingUp size={14} className="text-accent shrink-0" />
                <span className="min-w-0 break-words">Times completed</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle/60 text-secondary-text">
                  <span>This week</span>
                  <span className="font-bold text-foreground tabular-nums">{thisWeekCompletions}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle/60 text-secondary-text">
                  <span>This month</span>
                  <span className="font-bold text-foreground tabular-nums">{thisMonthCompletions}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle/60 text-secondary-text">
                  <span>This year</span>
                  <span className="font-bold text-foreground tabular-nums">{thisYearCompletions}</span>
                </div>
                <div className="flex items-center justify-between text-secondary-text">
                  <span>All time</span>
                  <span className="font-bold text-foreground tabular-nums">{allTimeCompletions}</span>
                </div>
              </div>
            </div>

            {/* When are you most consistent? */}
            <div className="bg-surface-secondary/40 border border-border-subtle rounded-xl p-4 min-w-0 max-w-full">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 min-w-0">
                <FiActivity size={14} className="text-accent shrink-0" />
                <span className="min-w-0 break-words">When are you most consistent?</span>
              </h3>

              <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-28 pt-2 pb-1 w-full max-w-full min-w-0">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dowLabel, idx) => {
                  const count = dayOfWeekCounts[idx];
                  const heightPercent = maxDowCount > 0 ? Math.round((count / maxDowCount) * 100) : 0;
                  const isTop = count === maxDowCount && count > 0;

                  return (
                    <div key={idx} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5">
                      <span className="text-[9px] font-mono text-muted tabular-nums">
                        {count > 0 ? count : ''}
                      </span>
                      <div className="w-full max-w-[18px] min-w-[12px] bg-surface rounded-xs h-full flex items-end overflow-hidden border border-border-subtle/60">
                        <div
                          className={`w-full rounded-xs transition-all duration-300 ${
                            isTop ? 'bg-accent' : 'bg-accent/40'
                          }`}
                          style={{ height: `${Math.max(heightPercent, count > 0 ? 12 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-secondary-text">
                        {dowLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle min-w-0">
            <span className="text-xs text-muted min-w-0 break-all">Habit ID: {habit.id.slice(0, 8)}</span>
            <button
              type="button"
              onClick={() => promptDelete({
                title: 'Delete Habit?',
                message: `Are you sure you want to delete "${habit.name}" and all its logs? This cannot be undone.`,
                itemName: habit.name,
                onConfirm: async () => {
                  await deleteHabit(habit.id);
                  onClose();
                }
              })}
              className="text-xs text-error/80 hover:text-error flex items-center gap-1 font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <FiTrash2 size={13} />
              <span>Delete habit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
