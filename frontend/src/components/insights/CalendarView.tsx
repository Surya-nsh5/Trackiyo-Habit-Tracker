import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useFocusStore } from '../../store/useFocusStore';
import { useToday } from '../../hooks/useToday';
import { addDaysStr, formatDateDisplay, getWeekDates } from '../../utils/dailyTracking';
import { parseISO, startOfMonth, getDaysInMonth, format, addDays, addMonths, subMonths } from 'date-fns';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type CalendarMode = 'MONTH' | 'WEEK' | 'DAY';

export const CalendarView: React.FC = () => {
  const todayStr = useToday();
  const { tasks, toggleTask } = useTaskStore();
  const { habits, habitLogs, wellnessLogs } = useHabitStore();
  const { sessions } = useFocusStore();

  const [calMode, setCalMode] = useState<CalendarMode>('MONTH');
  const [currentDateStr, setCurrentDateStr] = useState<string>(todayStr);

  // Filter toggles
  const [showTasks, setShowTasks] = useState(true);
  const [showHabits, setShowHabits] = useState(true);
  const [showWellness, setShowWellness] = useState(true);

  // Month dates calculation
  const monthData = useMemo(() => {
    try {
      const parsed = parseISO(currentDateStr);
      const start = startOfMonth(parsed);
      const totalDays = getDaysInMonth(parsed);
      const days = [];
      for (let i = 0; i < totalDays; i++) {
        days.push(format(addDays(start, i), 'yyyy-MM-dd'));
      }
      return {
        monthLabel: format(parsed, 'MMMM yyyy').toUpperCase(),
        days
      };
    } catch {
      return { monthLabel: '', days: [] };
    }
  }, [currentDateStr]);

  // Navigate dates safely without 31st-of-month overflow bugs
  const handlePrev = () => {
    if (calMode === 'MONTH') {
      const d = subMonths(parseISO(currentDateStr), 1);
      setCurrentDateStr(format(d, 'yyyy-MM-dd'));
    } else if (calMode === 'WEEK') {
      setCurrentDateStr(addDaysStr(currentDateStr, -7));
    } else {
      setCurrentDateStr(addDaysStr(currentDateStr, -1));
    }
  };

  const handleNext = () => {
    if (calMode === 'MONTH') {
      const d = addMonths(parseISO(currentDateStr), 1);
      setCurrentDateStr(format(d, 'yyyy-MM-dd'));
    } else if (calMode === 'WEEK') {
      setCurrentDateStr(addDaysStr(currentDateStr, 7));
    } else {
      setCurrentDateStr(addDaysStr(currentDateStr, 1));
    }
  };

  // Get items for a given dateStr
  const getDayItems = (dateStr: string) => {
    const items: Array<{ id: string; type: 'task' | 'habit' | 'wellness' | 'goal' | 'focus'; title: string; completed?: boolean; color?: string }> = [];

    if (showTasks) {
      tasks.forEach(t => {
        if (t.due_date && t.due_date.slice(0, 10) === dateStr) {
          items.push({ id: t.id, type: 'task', title: t.title, completed: t.is_completed });
        }
      });
    }


    if (showHabits) {
      habits.forEach(h => {
        if (habitLogs[`${h.id}_${dateStr}`]) {
          items.push({ id: `${h.id}-${dateStr}`, type: 'habit', title: `${h.icon} ${h.name}`, completed: true });
        }
      });
    }

    if (showWellness) {
      const w = wellnessLogs[dateStr];
      if (w && (w.mood || w.sleep)) {
        items.push({
          id: `well-${dateStr}`,
          type: 'wellness',
          title: `Mood: ${w.mood || '-'}/10 • Sleep: ${w.sleep || '-'}h`
        });
      }
    }

    // Focus sessions
    sessions.forEach(s => {
      if (s.completed_at && s.completed_at.slice(0, 10) === dateStr) {
        items.push({
          id: s.id,
          type: 'focus',
          title: `Focus: ${Math.round(s.duration / 60)}m`
        });
      }
    });

    return items;
  };

  return (
    <div className="flex flex-col h-full min-h-0 p-3 md:p-4 lg:p-5 w-full max-w-full min-w-0 gap-3 md:gap-4 relative overflow-y-auto custom-scrollbar">

      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0 bg-surface border border-border/80 rounded-xl p-3.5 shadow-xs w-full max-w-full min-w-0">

        {/* Navigation */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
          <button
            onClick={handlePrev}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-secondary-text hover:text-foreground hover:bg-surface-secondary transition-colors cursor-pointer shrink-0"
          >
            <FiChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <span className="text-sm font-bold tracking-[0.1em] text-foreground break-words min-w-0">
              {calMode === 'MONTH' ? monthData.monthLabel : formatDateDisplay(currentDateStr)}
            </span>
            {currentDateStr !== todayStr && (
              <button
                onClick={() => setCurrentDateStr(todayStr)}
                className="px-2.5 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase text-accent bg-accent/15 rounded-md cursor-pointer shrink-0 whitespace-nowrap"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-secondary-text hover:text-foreground hover:bg-surface-secondary transition-colors cursor-pointer shrink-0"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
          <div className="flex items-center flex-wrap max-w-full min-w-0 bg-surface-secondary rounded-lg border border-border-subtle p-0.5 gap-0.5">
            <button
              onClick={() => setCalMode('MONTH')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-[0.1em] transition-all cursor-pointer ${calMode === 'MONTH' ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs' : 'text-secondary-text hover:text-foreground'}`}
            >
              MONTH
            </button>
            <button
              onClick={() => setCalMode('WEEK')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-[0.1em] transition-all cursor-pointer ${calMode === 'WEEK' ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs' : 'text-secondary-text hover:text-foreground'}`}
            >
              WEEK
            </button>
            <button
              onClick={() => setCalMode('DAY')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-[0.1em] transition-all cursor-pointer ${calMode === 'DAY' ? 'bg-surface text-foreground font-bold border border-border/80 shadow-xs' : 'text-secondary-text hover:text-foreground'}`}
            >
              DAY
            </button>
          </div>

          {/* Type filters */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-semibold text-secondary-text pl-2 border-l border-border-subtle">
            <button
              onClick={() => setShowTasks(!showTasks)}
              className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${showTasks ? 'bg-accent/15 border-accent text-accent font-bold' : 'border-border-subtle bg-surface-secondary/40 text-secondary-text'}`}
            >
              Tasks
            </button>
            <button
              onClick={() => setShowHabits(!showHabits)}
              className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${showHabits ? 'bg-success/15 border-success text-success font-bold' : 'border-border-subtle bg-surface-secondary/40 text-secondary-text'}`}
            >
              Habits
            </button>
            <button
              onClick={() => setShowWellness(!showWellness)}
              className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${showWellness ? 'bg-info/15 border-info text-info font-bold' : 'border-border-subtle bg-surface-secondary/40 text-secondary-text'}`}
            >
              Wellness
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. MONTH VIEW */}
      {/* ------------------------------------------------------------- */}
      {calMode === 'MONTH' && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="bg-surface border border-border/80 rounded-xl p-3 sm:p-4 flex flex-col min-h-0 w-full max-w-full min-w-0 overflow-y-auto custom-scrollbar shadow-xs">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 min-w-0 pb-2 border-b border-border-subtle text-[10px] font-bold tracking-[0.14em] uppercase text-secondary-text text-center [&>span]:min-w-0 [&>span]:truncate">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 pt-2 flex-1 auto-rows-fr min-w-0">
              {monthData.days.map((d) => {
                const items = getDayItems(d);
                const isToday = d === todayStr;
                const isSelected = d === currentDateStr;
                const dayNum = d.slice(8);

                return (
                  <div
                    key={d}
                    onClick={() => {
                      setCurrentDateStr(d);
                    }}
                    onDoubleClick={() => {
                      setCurrentDateStr(d);
                      setCalMode('DAY');
                    }}
                    className={`min-w-0 min-h-[46px] sm:min-h-[90px] p-1 sm:p-1.5 rounded-lg border flex flex-col justify-between transition-all cursor-pointer ${isSelected
                        ? 'border-accent bg-surface-secondary ring-1 ring-accent shadow-xs'
                        : isToday
                          ? 'border-accent/70 bg-surface-secondary/80'
                          : 'border-border-subtle bg-surface-secondary/30 hover:border-border hover:bg-surface-secondary'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] sm:text-xs font-bold tabular-nums ${isToday || isSelected ? 'text-accent' : 'text-foreground'}`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="hidden sm:inline-block text-[8px] font-bold text-accent-ink bg-accent px-1.5 py-0.5 rounded-xs">
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Mobile: Compact Colored Indicator Dots (< sm) */}
                    <div className="flex sm:hidden items-center justify-center gap-0.5 mt-1">
                      {items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className={`w-1.5 h-1.5 rounded-full ${item.type === 'task' ? 'bg-accent' :
                              item.type === 'habit' ? 'bg-success' :
                                item.type === 'wellness' ? 'bg-info' : 'bg-warning'
                            }`}
                        />
                      ))}
                      {items.length > 3 && (
                        <span className="w-1 h-1 rounded-full bg-muted" />
                      )}
                    </div>

                    {/* Desktop/Tablet: Detailed Chips (>= sm) */}
                    <div className="hidden sm:block space-y-1 my-1 overflow-hidden">
                      {items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${item.type === 'task' ? (item.completed ? 'line-through text-muted bg-elevated' : 'bg-accent/15 text-accent font-semibold') :
                              item.type === 'habit' ? 'bg-success/15 text-success' :
                                item.type === 'wellness' ? 'bg-info/15 text-info' :
                                  'bg-warning/15 text-warning font-semibold'
                            }`}
                        >
                          {item.title}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <span className="text-[8px] font-bold text-muted">+{items.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Selected Date Agenda Strip (< sm) */}
          <div className="sm:hidden bg-surface border border-border/80 rounded-xl p-4 flex flex-col gap-2.5 shadow-xs w-full max-w-full min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0 pb-2 border-b border-border-subtle">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase text-secondary-text tracking-[0.1em]">SELECTED AGENDA</span>
                <h4 className="text-xs font-bold text-foreground break-words">{formatDateDisplay(currentDateStr)}</h4>
              </div>
              <button
                onClick={() => setCalMode('DAY')}
                className="text-[10px] font-bold text-accent uppercase tracking-[0.1em] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                OPEN DAY VIEW →
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {getDayItems(currentDateStr).length === 0 ? (
                <p className="text-xs text-secondary-text italic py-3 text-center">No tasks, habits, or milestones for this date.</p>
              ) : (
                getDayItems(currentDateStr).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 min-w-0 p-2.5 rounded-lg bg-surface-secondary border border-border-subtle text-xs">
                    <div className="flex items-center gap-2 truncate mr-2 flex-1 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'task' ? 'bg-accent' :
                          item.type === 'habit' ? 'bg-success' :
                            item.type === 'wellness' ? 'bg-info' : 'bg-warning'
                        }`} />
                      <span className={`truncate font-medium flex-1 min-w-0 [overflow-wrap:anywhere] ${item.completed ? 'line-through text-muted' : 'text-foreground'}`}>
                        {item.title}
                      </span>
                    </div>
                    {item.type === 'task' && (
                      <button
                        onClick={() => toggleTask(item.id)}
                        className={`px-2.5 py-1 text-[9px] font-bold rounded-md shrink-0 cursor-pointer ${item.completed ? 'bg-success text-white dark:text-black shadow-xs' : 'bg-surface border border-border-subtle text-secondary-text'
                          }`}
                      >
                        {item.completed ? 'DONE' : 'CHECK'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. WEEK VIEW */}
      {/* ------------------------------------------------------------- */}
      {calMode === 'WEEK' && (
        <div className="bg-surface border border-border/80 rounded-xl p-4 flex-1 flex flex-col w-full max-w-full min-w-0 overflow-y-auto custom-scrollbar shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-w-0">
            {getWeekDates(0, currentDateStr).map((d) => {
              const items = getDayItems(d.dateStr);
              const isToday = d.dateStr === todayStr;

              return (
                <div key={d.dateStr} className={`bg-surface-secondary/40 rounded-xl border p-3 min-h-[300px] flex flex-col min-w-0 ${isToday ? 'border-accent bg-surface-secondary shadow-xs' : 'border-border-subtle'}`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
                    <span className="text-xs font-bold text-secondary-text uppercase">{d.weekday}</span>
                    <span className={`text-base font-bold tabular-nums ${isToday ? 'text-accent' : 'text-foreground'}`}>{d.dayNum}</span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                    {items.length === 0 ? (
                      <p className="text-[10px] text-secondary-text italic pt-4 text-center">No items</p>
                    ) : (
                      items.map(item => (
                        <div key={item.id} className="p-2 rounded-lg bg-surface border border-border-subtle text-xs shadow-xs">
                          <span className={`font-semibold block break-words [overflow-wrap:anywhere] ${item.completed ? 'line-through text-muted' : 'text-foreground'}`}>
                            {item.title}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-secondary-text">{item.type}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. DAY VIEW */}
      {/* ------------------------------------------------------------- */}
      {calMode === 'DAY' && (
        <div className="bg-surface border border-border/80 rounded-xl p-5 flex-1 flex flex-col w-full max-w-full min-w-0 overflow-y-auto custom-scrollbar shadow-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap min-w-0 pb-4 mb-4 border-b border-border-subtle">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-secondary-text uppercase tracking-[0.14em]">SCHEDULE FOR</span>
              <h3 className="text-lg sm:text-xl font-bold text-foreground break-words">{formatDateDisplay(currentDateStr)}</h3>
            </div>
            <button onClick={() => setCalMode('MONTH')} className="text-xs text-accent font-bold hover:underline cursor-pointer shrink-0 whitespace-nowrap">
              ← Return to Month
            </button>
          </div>

          <div className="space-y-3">
            {getDayItems(currentDateStr).length === 0 ? (
              <p className="text-sm text-secondary-text italic py-12 text-center">No tasks, habits, or milestones scheduled for this day.</p>
            ) : (
              getDayItems(currentDateStr).map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 min-w-0 p-3.5 bg-surface-secondary rounded-xl border border-border-subtle shadow-xs">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${item.type === 'task' ? 'bg-accent' :
                        item.type === 'habit' ? 'bg-success' :
                          item.type === 'wellness' ? 'bg-info' : 'bg-warning'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold break-words [overflow-wrap:anywhere] ${item.completed ? 'line-through text-muted' : 'text-foreground'}`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-secondary-text uppercase font-bold tracking-[0.1em]">{item.type}</span>
                    </div>
                  </div>

                  {item.type === 'task' && (
                    <button
                      onClick={() => toggleTask(item.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border-subtle text-secondary-text hover:text-foreground hover:border-border cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                    >
                      {item.completed ? 'REOPEN' : 'COMPLETE'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
