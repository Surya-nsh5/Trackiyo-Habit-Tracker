import React, { useEffect, useMemo, useState } from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { useToday } from '../../hooks/useToday';
import { useStreakStore } from '../../store/useStreakStore';
import {
  addDaysStr,
  computeStreaks,
  getApplicableDaysInMonth,
  getDateStatus,
  getHabitCreationDateStr,
  isHabitApplicableOn,
  type DateStatus,
} from '../../utils/dailyTracking';
import { parseISO, getDaysInMonth } from 'date-fns';
import { FiTrash2, FiLock, FiPlus } from 'react-icons/fi';
import { useDeleteConfirmStore } from '../../store/useDeleteConfirmStore';
import type { Habit } from '../../types';

const HabitCell = React.memo(({ habit, dateStr, isChecked, status, available, onToggle }: {
  habit: Habit;
  dateStr: string;
  isChecked: boolean;
  status: DateStatus;
  available: boolean;
  onToggle: (id: string, date: string) => void;
}) => {
  const check = (
    <svg aria-hidden="true" className="w-4 h-4 text-accent-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
  );

  // Historical records: read-only, clearly marked but never looking broken.
  // Future / pre-creation cells: upcoming, dimmed and non-interactive.
  if (status !== 'today' || !available) {
    const label = !available
      ? `${habit.name} did not exist on ${dateStr}`
      : status === 'past'
        ? `${habit.name} on ${dateStr} (historical record, read-only)`
        : `${habit.name} on ${dateStr} (upcoming, not available yet)`;
    return (
      <div className="w-24 flex-shrink-0 flex items-center justify-center border-r border-border/50 transition-colors duration-200">
        <div
          role="img"
          aria-label={label}
          title={label}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-default
            ${!available || status === 'future'
              ? 'bg-transparent border-border/40 opacity-30'
              : isChecked
                ? 'bg-muted border-muted'
                : 'bg-transparent border-border/60'}`}
        >
          {isChecked && check}
          {status === 'future' && !isChecked && (
            <FiLock size={10} aria-hidden="true" className="text-muted" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-24 flex-shrink-0 flex items-center justify-center border-r border-border/50 transition-colors duration-200">
      <button
        type="button"
        aria-label={`Toggle ${habit.name} for ${dateStr}`}
        aria-pressed={isChecked}
        className={`gsap-habit-cell relative w-6 h-6 min-w-[24px] min-h-[24px] rounded border-2 transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer before:content-[''] before:absolute before:-inset-2.5
          ${isChecked
            ? 'bg-accent border-accent'
            : 'bg-transparent border-border hover:border-muted dark:hover:border-accent/70'}`}
        onClick={() => onToggle(habit.id, dateStr)}
      >
        {isChecked && check}
      </button>
    </div>
  );
});

interface HabitGridProps {
  onCreateHabit?: () => void;
}

export const HabitGrid: React.FC<HabitGridProps> = ({ onCreateHabit }) => {
  const { habits, habitLogs, currentMonthId, isLoading, toggleHabitLog, deleteHabit } = useHabitStore();
  const { fetchStreakDetail } = useStreakStore();
  const { promptDelete } = useDeleteConfirmStore();
  const todayStr = useToday();
  const gridRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr);

  const daysInMonthArray = useMemo(() => {
    if (!currentMonthId) return [];
    try {
      const date = parseISO(`${currentMonthId}-01`);
      const daysCount = getDaysInMonth(date);
      const monthStartStr = `${currentMonthId}-01`;

      const days = [];
      for (let i = 0; i < daysCount; i++) {
        const dateStr = addDaysStr(monthStartStr, i);
        const d = parseISO(dateStr);
        days.push({
          dateStr,
          dayOfMonth: String(d.getDate()),
          dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
          status: getDateStatus(dateStr, todayStr),
        });
      }
      return days;
    } catch {
      return [];
    }
  }, [currentMonthId, todayStr]);

  // The section always opens on today's checklist: whenever the visible
  // month contains today (mount, tab return, month navigation, midnight
  // rollover), the selection snaps to today and scrolls it into view.
  // Other months keep the user's history position (default: month end).
  useEffect(() => {
    if (daysInMonthArray.length === 0) return;
    const inMonth = daysInMonthArray.some((d) => d.dateStr === todayStr);
    if (inMonth) {
      setSelectedDate(todayStr);
      requestAnimationFrame(() => {
        rowRefs.current[todayStr]?.scrollIntoView({ block: 'center', behavior: 'auto' });
      });
    } else {
      setSelectedDate((prev) => {
        if (prev && daysInMonthArray.some((d) => d.dateStr === prev)) return prev;
        return daysInMonthArray[daysInMonthArray.length - 1].dateStr;
      });
    }
  }, [daysInMonthArray, todayStr, currentMonthId]);

  // Deterministic streaks from actual records (creation date bounds the run).
  const streakByHabit = useMemo(() => {
    const map: Record<string, { current: number; longest: number }> = {};
    habits.forEach((h) => {
      map[h.id] = computeStreaks(h.id, habitLogs, getHabitCreationDateStr(h), todayStr);
    });
    return map;
  }, [habits, habitLogs, todayStr]);

  if (!isLoading && habits.length === 0) {
    return (
      <div className="h-full w-full max-w-full min-w-0 flex flex-col items-center justify-center text-center p-6 bg-surface border border-border/80 rounded-xl shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl mb-3 shrink-0">
          ✨
        </div>
        <h3 className="text-base font-bold text-foreground uppercase tracking-wider mb-1 break-words min-w-0 max-w-full">
          No Habits Yet
        </h3>
        <p className="text-xs text-secondary-text w-full max-w-sm min-w-0 break-words mb-4">
          Create your first habit to start building consistency and tracking streaks.
        </p>
        {onCreateHabit && (
          <button
            type="button"
            onClick={onCreateHabit}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-ink font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <FiPlus size={15} strokeWidth={2.5} />
            <span>Create First Habit</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={gridRef} className="h-full w-full max-w-full min-w-0 flex flex-col bg-transparent min-h-0 transition-colors duration-200">
      {/* Grid Container - Single Unified Scroll Container for Header, Analysis, and Tick Marks */}
      <div className="flex-1 min-h-0 min-w-0 w-full max-w-full overflow-auto custom-scrollbar rounded-xl bg-surface border border-border/80 shadow-xs relative">
        <div className="min-w-full w-max flex flex-col">

          {/* Sticky Header: Habits (Columns) */}
          <div className="flex flex-shrink-0 bg-surface-secondary border-b border-border/80 z-30 h-14 sticky top-0 transition-colors duration-200 min-w-full">

            {/* Top-Left Empty Corner - Sticky Top & Left */}
            <div className="w-20 md:w-24 shrink-0 flex flex-col items-center justify-center border-r border-border-subtle text-[11px] font-bold tracking-[0.14em] text-secondary-text uppercase transition-colors duration-200 px-1 text-center sticky left-0 z-40 bg-surface-secondary">
              Date
            </div>

            {/* Habit Headers */}
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={`skel-h-${i}`} className="w-24 shrink-0 flex flex-col items-center justify-center border-r border-border-subtle group/info relative px-2 transition-colors duration-200">
                  <div className="w-8 h-8 rounded-full bg-surface animate-pulse mb-1"></div>
                  <div className="w-12 h-2 rounded bg-surface animate-pulse"></div>
                </div>
              ))
            ) : habits.map(habit => (
              <div key={`header-${habit.id}`} className="w-24 shrink-0 flex flex-col items-center justify-center border-r border-border-subtle group/info relative px-2 min-w-0 transition-colors duration-200">
                <div className="text-2xl mb-1 group-hover/info:scale-110 transition-transform shrink-0">{habit.icon}</div>
                <div className="text-[10px] font-bold text-foreground truncate w-full max-w-full text-center tracking-[0.06em] transition-colors duration-200">{habit.name}</div>

                {/* Delete / Confirm Actions */}
                <div className="absolute top-1 right-1">
                  <button
                    type="button"
                    onClick={() => promptDelete({
                      title: 'Delete Habit?',
                      message: `Are you sure you want to delete "${habit.name}" and all its logs? This cannot be undone.`,
                      itemName: habit.name,
                      onConfirm: () => deleteHabit(habit.id),
                    })}
                    aria-label={`Delete ${habit.name}`}
                    title="Delete habit"
                    className="w-7 h-7 flex items-center justify-center text-secondary-text hover:text-error hover:bg-error/10 rounded-md transition-colors duration-200 cursor-pointer shrink-0"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Quick Add Habit Slot in Column Header */}
            {!isLoading && onCreateHabit && (
              <div className="w-20 md:w-24 shrink-0 flex flex-col items-center justify-center border-r border-border-subtle/60 group/add relative px-1 transition-colors duration-200">
                <button
                  type="button"
                  onClick={onCreateHabit}
                  className="flex flex-col items-center justify-center text-muted hover:text-accent transition-colors gap-0.5 cursor-pointer w-full h-full py-1"
                  title="Add new habit"
                >
                  <div className="w-6 h-6 rounded-full border border-dashed border-border-subtle group-hover/add:border-accent flex items-center justify-center text-muted group-hover/add:text-accent transition-colors">
                    <FiPlus size={12} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">New</span>
                </button>
              </div>
            )}
            <div className="flex-1 min-w-0" />
          </div>

          {/* Fixed Analysis Row (Pinned below upper column headers) - Sticky Top (h-14 = 56px) & Left */}
          {habits.length > 0 && (
            <div className="flex shrink-0 bg-surface-secondary border-b border-border-subtle sticky top-14 z-20 min-w-full transition-colors duration-200">
              {/* Analysis Corner - Sticky Left */}
              <div className="w-20 md:w-24 shrink-0 flex flex-col items-center justify-center border-r border-border-subtle py-3 transition-colors duration-200 px-1 text-center sticky left-0 z-40 bg-surface-secondary">
                <span className="text-[11px] font-bold text-secondary-text tracking-[0.14em] uppercase break-words">ANALYSIS</span>
              </div>

              {habits.map(habit => {
                const applicableDays = getApplicableDaysInMonth(habit, currentMonthId, todayStr);
                const actual = applicableDays.filter(ds => habitLogs[`${habit.id}_${ds}`] === true).length;
                const progress = applicableDays.length > 0 ? (actual / applicableDays.length) * 100 : null;
                const streak = streakByHabit[habit.id]?.current ?? 0;

                return (
                  <div key={`analysis-${habit.id}`} className="w-24 shrink-0 flex flex-col items-center justify-center border-r border-border-subtle py-3 gap-1 px-1 min-w-0 transition-colors duration-200">
                    {progress === null ? (
                      <div className="text-[11px] text-muted font-semibold uppercase tracking-[0.1em]" title="No tracking data for this period">—</div>
                    ) : (
                      <>
                        <div className="text-[11px] text-secondary-text font-semibold uppercase tracking-[0.1em] whitespace-nowrap tabular-nums">DONE: <span className="text-accent font-bold tabular-nums">{actual}</span>/{applicableDays.length}</div>
                        <div className="w-16 max-w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border-subtle transition-colors duration-200">
                          <div className="bg-accent h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <div className="text-xs font-bold text-accent tabular-nums whitespace-nowrap transition-colors duration-200">{Math.round(progress)}%</div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => fetchStreakDetail('habit', habit.id)}
                      className="text-[10px] text-secondary-text font-semibold uppercase tracking-[0.1em] hover:text-accent transition-colors cursor-pointer whitespace-nowrap"
                      title={`Current streak: ${streak} day${streak === 1 ? '' : 's'} (click for 60-day calendar & sharing)`}
                    >
                      STREAK <span className="text-accent font-bold tabular-nums">{streak}</span>
                    </button>
                  </div>
                );
              })}

              {!isLoading && onCreateHabit && (
                <div className="w-20 md:w-24 shrink-0 border-r border-border-subtle/30" />
              )}
              <div className="flex-1 min-w-0" />
            </div>
          )}

          {/* Days (Rows) */}
          <div className="flex flex-col min-w-full pb-8">
            {habits.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center w-full max-w-full min-w-0">
                <p className="text-xs font-semibold tracking-[0.2em] text-secondary-text uppercase break-words">NO HABITS YET</p>
                <p className="text-sm text-secondary-text mt-2 break-words min-w-0 max-w-full">Click "+ Habit" above to start tracking today.</p>
              </div>
            )}

            {daysInMonthArray.map((d) => {
              const isSelected = d.dateStr === selectedDate;
              return (
                <div
                  key={`day-${d.dateStr}`}
                  ref={(el) => { rowRefs.current[d.dateStr] = el; }}
                  className={`flex shrink-0 h-11 border-b border-border-subtle/50 transition-colors duration-150 min-w-full ${d.status === 'today'
                      ? 'bg-accent/10'
                      : d.status === 'future'
                        ? 'opacity-60'
                        : 'hover:bg-surface-secondary/40'
                    } ${isSelected ? 'outline outline-1 outline-offset-[-1px] outline-accent/60' : ''}`}
                >

                  {/* Date Column - Sticky Left */}
                  <div className={`w-20 md:w-24 shrink-0 flex items-center justify-end px-2 sm:px-3 border-r border-border-subtle min-w-0 sticky left-0 z-10 transition-colors duration-200 ${
                    d.status === 'today'
                      ? 'bg-surface font-bold text-accent'
                      : 'bg-surface'
                  }`}>
                    <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0 whitespace-nowrap">
                      <span className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.1em] shrink-0 ${d.status === 'today' ? 'text-accent font-bold' : 'text-secondary-text'}`}>{d.dayOfWeek}</span>
                      <span className={`text-sm font-bold tabular-nums shrink-0 transition-colors duration-200 ${d.status === 'today' ? 'text-accent' : 'text-foreground'}`}>{d.dayOfMonth}</span>
                    </div>
                  </div>

                  {/* Habit Cells for this Date */}
                  {habits.map((habit) => {
                    const isChecked = habitLogs[`${habit.id}_${d.dateStr}`] === true;
                    return (
                      <HabitCell
                        key={`cell-${habit.id}-${d.dateStr}`}
                        habit={habit}
                        dateStr={d.dateStr}
                        isChecked={isChecked}
                        status={d.status}
                        available={isHabitApplicableOn(habit, d.dateStr)}
                        onToggle={toggleHabitLog}
                      />
                    );
                  })}

                  {!isLoading && onCreateHabit && (
                    <div className="w-20 md:w-24 shrink-0 border-r border-border-subtle/30" />
                  )}
                  <div className="flex-1 min-w-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
