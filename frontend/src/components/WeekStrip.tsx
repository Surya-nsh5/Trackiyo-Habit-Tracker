import React, { useMemo, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useToday } from '../hooks/useToday';
import {
  getDayCompletion,
  getWeekDates,
  getWeekRangeLabel,
} from '../utils/dailyTracking';
import { FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Current-week overview + historical week navigation.
 * Every cell is derived from actual stored daily records.
 * Display-only: previous weeks are inherently read-only, future weeks
 * beyond the current one are marked upcoming and unreachable.
 */
export const WeekStrip: React.FC = () => {
  const { habits, habitLogs, wellnessLogs } = useHabitStore();
  const todayStr = useToday();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, negative = history

  const days = useMemo(() => getWeekDates(weekOffset, todayStr), [weekOffset, todayStr]);

  const dayStats = useMemo(
    () => days.map((d) => ({ ...d, ...getDayCompletion(d.dateStr, habits, habitLogs) })),
    [days, habits, habitLogs]
  );

  const weekTotals = useMemo(() => {
    let done = 0;
    let total = 0;
    let daysWithData = 0;
    dayStats.forEach((d) => {
      if (d.status === 'future' || d.total === 0) return;
      daysWithData += 1;
      done += d.done;
      total += d.total;
    });
    return {
      done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : null,
      daysWithData,
    };
  }, [dayStats]);

  const wellnessDays = useMemo(
    () =>
      dayStats.filter(
        (d) =>
          d.status !== 'future' &&
          (wellnessLogs[d.dateStr]?.mood != null || wellnessLogs[d.dateStr]?.sleep != null)
      ).length,
    [dayStats, wellnessLogs]
  );

  const isCurrentWeek = weekOffset === 0;
  const rangeLabel = getWeekRangeLabel(weekOffset, todayStr);

  const renderDayValue = (d: (typeof dayStats)[number]) => {
    if (d.status === 'future') {
      return (
        <span className="text-sm font-bold text-border" title={`${d.dateStr} — upcoming`}>
          —
        </span>
      );
    }
    if (d.percent === null) {
      return (
        <span className="text-sm font-bold text-muted" title={`${d.dateStr} — no tracking data`}>
          —
        </span>
      );
    }
    if (d.percent === 100) {
      return (
        <span title={`${d.dateStr} — all ${d.total} habits completed`}>
          <FiCheck size={16} strokeWidth={3} className="text-success" aria-label={`${d.dateStr}: all completed`} />
        </span>
      );
    }
    return (
      <span
        className={`text-sm font-bold tabular-nums ${d.percent > 0 ? 'text-accent' : 'text-muted'}`}
        title={`${d.dateStr} — ${d.done}/${d.total} habits (${d.percent}%)`}
      >
        {d.percent}%
      </span>
    );
  };

  return (
    <div className="bg-surface border border-border/70 rounded-md p-4 md:p-5 flex-shrink-0 transition-colors duration-200">
      {/* Header: week navigation */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em]">
            {isCurrentWeek ? 'Current week' : 'Previous week'}
          </h3>
          <div className="text-lg md:text-xl font-bold tracking-tight text-foreground">
            {rangeLabel}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-3 min-h-[44px] hidden sm:flex items-center text-[11px] font-semibold tracking-[0.12em] text-muted hover:text-accent transition-colors duration-200"
            >
              TODAY
            </button>
          )}
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Previous week"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200"
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
            disabled={isCurrentWeek}
            aria-label="Next week"
            title={isCurrentWeek ? 'Current week — future weeks are upcoming' : 'Next week'}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200 disabled:opacity-30 disabled:pointer-events-none"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day cells: horizontally scrollable on small screens, page never overflows */}
      <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[420px]">
          {dayStats.map((d) => {
            const isToday = d.status === 'today';
            return (
              <div
                key={d.dateStr}
                title={
                  d.status === 'today'
                    ? `Today (${d.dateStr}) — editable in the Habits section`
                    : d.status === 'past'
                      ? `${d.dateStr} — historical record, read-only`
                      : `${d.dateStr} — upcoming`
                }
                className={`flex flex-col items-center gap-1 rounded border px-1 py-2.5 transition-colors duration-200 ${
                  isToday
                    ? 'border-accent bg-accent/10'
                    : 'border-border/50'
                } ${d.status === 'future' ? 'opacity-60' : ''}`}
              >
                <span className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                  {d.weekday}
                </span>
                <span className={`text-base font-bold tabular-nums ${isToday ? 'text-accent' : 'text-foreground'}`}>
                  {d.dayNum}
                </span>
                <span className="h-5 flex items-center" aria-hidden={d.percent !== 100}>
                  {renderDayValue(d)}
                </span>
                {isToday && (
                  <span className="text-[8px] font-bold tracking-[0.12em] text-accent-ink bg-accent rounded-sm px-1 py-px">
                    TODAY
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly showcase totals (existing categories only: habits + wellness) */}
      <div className="mt-5 pt-4 border-t border-border/50 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Habits
          </span>
          {weekTotals.percent === null ? (
            <span className="text-sm font-bold text-muted" title="No tracking data this week">—</span>
          ) : (
            <>
              <span className="text-xl font-bold tracking-tight text-accent tabular-nums">
                {weekTotals.percent}%
              </span>
              <span className="text-xs font-semibold text-muted tabular-nums">
                {weekTotals.done} / {weekTotals.total}
              </span>
            </>
          )}
        </div>
        <div className="w-full sm:flex-1 h-2.5 sm:h-1.5 sm:min-w-[80px] bg-border/30 rounded-full overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-200"
            style={{ width: `${weekTotals.percent ?? 0}%` }}
          />
        </div>
        <div className="flex items-baseline gap-2 sm:ml-auto">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Wellness
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums" title="Days with mood or sleep logged this week">
            {wellnessDays} / 7 logged
          </span>
        </div>
      </div>

      {/* Screen-reader + non-color status summary */}
      <p className="sr-only">
        {isCurrentWeek ? 'Current week' : 'Previous week, read-only'}: {weekTotals.percent === null ? 'no tracking data' : `${weekTotals.done} of ${weekTotals.total} habits completed`}.
        Today is editable; all other days are locked.
      </p>
    </div>
  );
};
