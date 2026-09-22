import React, { useEffect, useMemo, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useThemeStore } from '../store/useThemeStore';
import { useToday } from '../hooks/useToday';
import { useOverlayClose } from '../utils/overlayStack';
import {
  addDaysStr,
  computeStreaks,
  formatDateDisplay,
  getApplicableDaysInMonth,
  getDateStatus,
  getHabitCreationDateStr,
  isHabitApplicableOn,
  type DateStatus,
} from '../utils/dailyTracking';
import { parseISO, getDaysInMonth } from 'date-fns';
import { FiTrash2, FiCheck, FiX, FiChevronLeft, FiChevronRight, FiLock } from 'react-icons/fi';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Habit } from '../types';

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
        aria-label={`Toggle ${habit.name} for ${dateStr}`}
        aria-pressed={isChecked}
        className={`gsap-habit-cell w-6 h-6 min-w-[24px] min-h-[24px] rounded border-2 transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer
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

export const HabitGrid: React.FC = () => {
  const { habits, habitLogs, currentMonthId, isLoading, toggleHabitLog, addHabit, deleteHabit } = useHabitStore();
  const { isDarkMode } = useThemeStore();
  const todayStr = useToday();
  const gridRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('📌');
  const [hasPickedIcon, setHasPickedIcon] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useOverlayClose(showEmojiPicker, () => setShowEmojiPicker(false));
  // Date selector: viewing history is free, editing is today-only (enforced).
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr);

  useGSAP(() => {
    if (!gridRef.current || isLoading) return;
    gsap.set(gridRef.current, { opacity: 0, y: 15, scale: 0.99 });

    const tl = gsap.timeline();
    tl.to(gridRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });

    const habitCells = gridRef.current.querySelectorAll('.gsap-habit-cell');
    if (habitCells.length > 0) {
      tl.fromTo(habitCells,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, stagger: { amount: 0.3, grid: 'auto', from: 'start' }, duration: 0.4, ease: 'back.out(1.5)', overwrite: 'auto' },
        "-=0.4"
      );
    }
  }, { dependencies: [currentMonthId, habits.length, isLoading], scope: gridRef });

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHabitName.trim();
    if (name) {
      // No emoji picked → use the habit's first letter as its mark.
      const icon = hasPickedIcon ? newHabitIcon : (name.charAt(0).toUpperCase() || '📌');
      addHabit(name, icon, 28);
      setNewHabitName('');
      setNewHabitIcon('📌');
      setHasPickedIcon(false);
    }
  };

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

  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    requestAnimationFrame(() => {
      rowRefs.current[dateStr]?.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  };

  const stepSelectedDate = (delta: number) => {
    const idx = daysInMonthArray.findIndex((d) => d.dateStr === selectedDate);
    const base = idx >= 0 ? idx : daysInMonthArray.findIndex((d) => d.dateStr === todayStr);
    const next = daysInMonthArray[Math.min(Math.max(base + delta, 0), daysInMonthArray.length - 1)];
    if (next) selectDate(next.dateStr);
  };

  const selectedStatus = selectedDate ? getDateStatus(selectedDate, todayStr) : 'today';

  // Deterministic streaks from actual records (creation date bounds the run).
  const streakByHabit = useMemo(() => {
    const map: Record<string, { current: number; longest: number }> = {};
    habits.forEach((h) => {
      map[h.id] = computeStreaks(h.id, habitLogs, getHabitCreationDateStr(h), todayStr);
    });
    return map;
  }, [habits, habitLogs, todayStr]);

  return (
    <div ref={gridRef} className="h-full flex flex-col gap-3 bg-transparent min-h-0 transition-colors duration-200">
      
      {/* Top Action Bar: single connected strip, like the wellness header */}
      <div className="flex flex-col md:flex-row flex-shrink-0 bg-surface border border-border/70 rounded-md focus-within:border-accent transition-colors duration-200">
        {/* Date selector: free navigation for viewing; editing stays today-only */}
        <div className="flex items-center gap-1 px-1 py-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => stepSelectedDate(-1)}
            aria-label="Previous day"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200"
          >
            <FiChevronLeft size={16} />
          </button>
          <div className="flex flex-1 md:flex-none flex-col items-center justify-center px-1 md:min-w-[150px]">
            <span className="text-xs font-bold tracking-[0.08em] leading-none text-foreground">
              {selectedStatus === 'today' ? 'TODAY' : formatDateDisplay(selectedDate)}
            </span>
            <span className={`text-[9px] font-semibold uppercase tracking-[0.16em] mt-1 leading-none ${
              selectedStatus === 'today'
                ? 'text-accent'
                : selectedStatus === 'past'
                  ? 'text-muted'
                  : 'text-muted'
            }`}>
              {selectedStatus === 'today'
                ? formatDateDisplay(selectedDate)
                : selectedStatus === 'past'
                  ? 'Historical record'
                  : 'Upcoming'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => stepSelectedDate(1)}
            aria-label="Next day"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
        <div aria-hidden="true" className="h-px md:h-auto md:w-px bg-border/60" />
        <div className="relative flex-1 flex">
          <form onSubmit={handleAddHabit} className="flex flex-1 items-stretch min-h-[56px]">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-14 flex items-center justify-center text-xl border-r border-border/70 hover:bg-elevated transition-colors duration-200 rounded-bl md:rounded-bl-none"
              title="Choose Emoji"
            >
              <span className={`leading-none transform -translate-y-[1px] ${!hasPickedIcon && newHabitName.trim() ? 'text-base font-bold text-muted' : ''}`}>
                {!hasPickedIcon && newHabitName.trim()
                  ? newHabitName.trim().charAt(0).toUpperCase()
                  : newHabitIcon}
              </span>
            </button>
            <input
              type="text"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              className="flex-1 min-w-0 bg-transparent px-3 text-xs font-semibold text-foreground placeholder:text-muted tracking-[0.08em] uppercase outline-none"
              placeholder="NEW HABIT..."
            />
            <button
              type="submit"
              disabled={!newHabitName.trim()}
              className="px-5 flex items-center justify-center text-xs font-bold tracking-[0.14em] uppercase text-accent-ink bg-accent hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-200 rounded-br md:rounded-r"
              title="Add Habit"
            >
              ADD
            </button>
          </form>
          
          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
              <div className="absolute top-[calc(100%+4px)] right-0 z-50 shadow-[var(--t-shadow)] duration-200">
                <EmojiPicker theme={isDarkMode ? Theme.DARK : Theme.LIGHT} onEmojiClick={(e) => { setNewHabitIcon(e.emoji); setHasPickedIcon(true); setShowEmojiPicker(false); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-hidden custom-scrollbar rounded-md">
        <div className="min-w-fit flex flex-col h-full bg-surface border border-border/70 rounded-md overflow-hidden transition-colors duration-200">
          
          {/* Sticky Header: Habits (Columns) */}
          <div className="flex flex-shrink-0 bg-elevated border-b border-border/70 z-20 h-14 sticky top-0 transition-colors duration-200">
            
            {/* Top-Left Empty Corner */}
            <div className="w-20 md:w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase transition-colors duration-200">
              Date
            </div>
            
            {/* Habit Headers */}
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={`skel-h-${i}`} className="w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50 group/info relative px-2 transition-colors duration-200">
                  <div className="w-8 h-8 rounded-full bg-elevated animate-pulse mb-1"></div>
                  <div className="w-12 h-2 rounded bg-elevated animate-pulse"></div>
                </div>
              ))
            ) : habits.map(habit => (
              <div key={`header-${habit.id}`} className="w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50 group/info relative px-2 transition-colors duration-200">
                <div className="text-2xl mb-1 group-hover/info:scale-110 transition-transform">{habit.icon}</div>
                <div className="text-[10px] font-bold text-foreground truncate w-full text-center tracking-[0.06em] transition-colors duration-200">{habit.name}</div>
                
                {/* Delete / Confirm Actions */}
                <div className="absolute top-1 right-1">
                  {confirmDeleteId === habit.id ? (
                    <div className="flex flex-row items-center gap-1 bg-surface border border-border/70 rounded p-1 shadow-[var(--t-shadow)]">
                      <button onClick={() => deleteHabit(habit.id)} aria-label={`Confirm delete ${habit.name}`} title="Confirm delete" className="min-w-[36px] min-h-[36px] flex items-center justify-center text-success hover:bg-success/20 rounded transition-colors duration-200">
                        <FiCheck size={16} strokeWidth={3} />
                      </button>
                      <div aria-hidden="true" className="w-px self-stretch bg-border/60" />
                      <button onClick={() => setConfirmDeleteId(null)} aria-label="Cancel delete" title="Cancel" className="min-w-[36px] min-h-[36px] flex items-center justify-center text-muted hover:text-foreground hover:bg-elevated rounded transition-colors duration-200">
                        <FiX size={16} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(habit.id)} aria-label={`Delete ${habit.name}`} title="Delete habit" className="min-w-[32px] min-h-[32px] flex items-center justify-center text-muted hover:text-error hover:bg-error/10 rounded transition-colors duration-200">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Body: Days (Rows) */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col pb-8">
            {/* Top Analysis Row */}
            {habits.length > 0 && (
              <div className="flex flex-shrink-0 bg-elevated border-b border-border/50 mb-2 transition-colors duration-200">
                <div className="w-20 md:w-24 flex-shrink-0 flex flex-col justify-center px-3 border-r border-border/50 py-3 transition-colors duration-200">
                  <span className="text-[11px] font-semibold text-muted tracking-[0.14em] uppercase mb-1">ANALYSIS</span>
                </div>
                
                {habits.map(habit => {
                  // Honest denominator: only days the habit existed and that are
                  // not in the future. Zero applicable days = no data ("—").
                  const applicableDays = getApplicableDaysInMonth(habit, currentMonthId, todayStr);
                  const actual = applicableDays.filter(ds => habitLogs[`${habit.id}_${ds}`] === true).length;
                  const progress = applicableDays.length > 0 ? (actual / applicableDays.length) * 100 : null;
                  const streak = streakByHabit[habit.id]?.current ?? 0;
                  
                  return (
                    <div key={`analysis-${habit.id}`} className="w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50 py-3 gap-1 transition-colors duration-200">
                      {progress === null ? (
                        <div className="text-[11px] text-muted font-semibold uppercase tracking-[0.1em]" title="No tracking data for this period">—</div>
                      ) : (
                        <>
                          <div className="text-[11px] text-muted font-semibold uppercase tracking-[0.1em]">DONE: <span className="text-accent font-bold tabular-nums">{actual}</span>/{applicableDays.length}</div>
                          <div className="w-16 bg-elevated h-1.5 rounded-full overflow-hidden border border-border/70 transition-colors duration-200">
                            <div className="bg-accent h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                          <div className="text-xs font-bold text-accent tabular-nums transition-colors duration-200">{Math.round(progress)}%</div>
                        </>
                      )}
                      <div
                        className="text-[10px] text-muted font-semibold uppercase tracking-[0.1em]"
                        title={`Current streak: ${streak} day${streak === 1 ? '' : 's'} (from actual records)`}
                      >
                        STREAK <span className="text-accent font-bold tabular-nums">{streak}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {habits.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">NO HABITS YET</p>
                <p className="text-sm text-muted mt-2">Add your first habit above to start tracking today.</p>
              </div>
            )}

            {daysInMonthArray.map((d) => {
              const isSelected = d.dateStr === selectedDate;
              return (
              <div
                key={`day-${d.dateStr}`}
                ref={(el) => { rowRefs.current[d.dateStr] = el; }}
                className={`flex flex-shrink-0 h-11 border-b border-border/30 transition-colors duration-200 ${
                  d.status === 'today'
                    ? 'bg-accent/10'
                    : d.status === 'future'
                      ? 'opacity-70'
                      : 'hover:bg-elevated'
                } ${isSelected ? 'outline outline-1 outline-offset-[-1px] outline-accent/60' : ''}`}
              >
                
                {/* Date Column */}
                <div className="w-20 md:w-24 flex-shrink-0 flex items-center justify-end px-3 border-r border-border/50 transition-colors duration-200">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-[0.1em]">{d.dayOfWeek}</span>
                    <span className="text-sm font-bold text-foreground tabular-nums transition-colors duration-200">{d.dayOfMonth}</span>
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
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
