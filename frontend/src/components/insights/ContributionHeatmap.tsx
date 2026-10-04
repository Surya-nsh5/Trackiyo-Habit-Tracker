import React, { useState, useMemo } from 'react';
import { parseDateStr, formatDateStr, addDaysStr } from '../../utils/dailyTracking';
import { format } from 'date-fns';

export interface ContributionDay {
  dateStr: string;
  value: number; // e.g. completion % (0-100) or focus minutes
  count?: number; // e.g. completed count
  total?: number; // e.g. applicable count / total sessions
  detailText?: string;
  isFuture: boolean;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionWeek {
  days: ContributionDay[];
  monthLabel?: string;
}

interface ContributionHeatmapProps {
  title: string;
  subtitle?: string;
  unitLabel?: string;
  todayStr: string;
  dataMap: Record<string, { value: number; count?: number; total?: number; detailText?: string }>;
  calculateLevel: (value: number, count?: number) => 0 | 1 | 2 | 3 | 4;
  formatTooltip: (day: ContributionDay) => string;
  totalSummaryLabel?: string;
  totalSummaryValue?: string | number;
  infoNote?: string;
  colorScheme?: 'theme' | 'accent' | 'green';
  headerRight?: React.ReactNode;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  title,
  subtitle,
  unitLabel,
  todayStr,
  dataMap,
  calculateLevel,
  formatTooltip,
  totalSummaryLabel,
  totalSummaryValue,
  infoNote = 'Learn how we count contributions',
  colorScheme = 'theme',
  headerRight
}) => {
  const [hoveredDay, setHoveredDay] = useState<{ day: ContributionDay; x: number; y: number } | null>(null);

  // Generate 53 weeks ending on the current week
  const { weeks, totalActiveDays } = useMemo(() => {
    const todayDate = parseDateStr(todayStr);
    const dayOfWeek = todayDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysUntilSat = 6 - dayOfWeek;
    
    // Grid end date (Saturday of current week)
    const endGridDate = new Date(todayDate);
    endGridDate.setDate(todayDate.getDate() + daysUntilSat);
    const endGridStr = formatDateStr(endGridDate);

    // 53 weeks total = 371 days
    const totalDays = 53 * 7;
    const startGridStr = addDaysStr(endGridStr, -(totalDays - 1));

    const weeksList: ContributionWeek[] = [];
    let currentWeek: ContributionDay[] = [];
    let lastLabeledMonth = -1;
    let activeDaysCount = 0;

    for (let i = 0; i < totalDays; i++) {
      const dateStr = addDaysStr(startGridStr, i);
      const isFuture = dateStr > todayStr;
      const data = dataMap[dateStr];
      const value = isFuture ? 0 : (data?.value ?? 0);
      const count = isFuture ? 0 : (data?.count ?? 0);
      const total = isFuture ? 0 : (data?.total ?? 0);
      const detailText = data?.detailText;
      const level = isFuture ? 0 : calculateLevel(value, count);

      if (!isFuture && value > 0) {
        activeDaysCount++;
      }

      currentWeek.push({
        dateStr,
        value,
        count,
        total,
        detailText,
        isFuture,
        level
      });

      // End of week (7 days)
      if (currentWeek.length === 7) {
        // Month label detection for the week
        const midDayDate = parseDateStr(currentWeek[3].dateStr);
        const monthNum = midDayDate.getMonth();
        let monthLabel: string | undefined = undefined;

        // Label if this week contains the beginning of a month and at least 2 weeks passed
        if (monthNum !== lastLabeledMonth && (currentWeek.some(d => parseDateStr(d.dateStr).getDate() <= 7) || lastLabeledMonth === -1)) {
          monthLabel = format(midDayDate, 'MMM');
          lastLabeledMonth = monthNum;
        }

        weeksList.push({
          days: currentWeek,
          monthLabel
        });
        currentWeek = [];
      }
    }

    return {
      weeks: weeksList,
      totalActiveDays: activeDaysCount
    };
  }, [todayStr, dataMap, calculateLevel]);

  // Color classes for theme-driven or green scales
  const getCellColor = (level: 0 | 1 | 2 | 3 | 4, isFuture: boolean) => {
    if (isFuture) {
      return 'bg-transparent border border-transparent opacity-0 pointer-events-none';
    }

    if (colorScheme === 'green') {
      switch (level) {
        case 1:
          return 'bg-[#0e4429] border-[#0e4429] hover:border-[#26a641]';
        case 2:
          return 'bg-[#006d32] border-[#006d32] hover:border-[#39d353]';
        case 3:
          return 'bg-[#26a641] border-[#26a641] hover:border-[#39d353] shadow-[0_0_6px_rgba(38,166,65,0.4)]';
        case 4:
          return 'bg-[#39d353] border-[#39d353] hover:brightness-110 shadow-[0_0_8px_rgba(57,211,83,0.6)]';
        case 0:
        default:
          return 'bg-[#161b22] border-[#30363d]/40 hover:border-border';
      }
    }

    // Active Theme / Accent Color Scheme (default)
    switch (level) {
      case 1:
        return 'bg-accent/20 border border-accent/30 hover:border-accent/70';
      case 2:
        return 'bg-accent/45 border border-accent/55 hover:border-accent/90';
      case 3:
        return 'bg-accent/75 border border-accent/85 hover:brightness-110 shadow-[0_0_6px_var(--primary)]';
      case 4:
        return 'bg-accent border border-accent hover:brightness-115 text-accent-ink shadow-[0_0_10px_var(--primary)]';
      case 0:
      default:
        return 'bg-surface-secondary/70 border border-border-subtle/60 hover:border-border';
    }
  };

  return (
    <div className="bg-surface border border-border/80 rounded-xl p-3.5 sm:p-4 md:p-5 shadow-xs w-full max-w-full min-w-0 transition-colors">
      {/* Header - Stack on mobile, row on tablet/desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 mb-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-foreground">
              {title}
            </span>
            {subtitle && (
              <span className="text-[11px] text-secondary-text">
                • {subtitle}
              </span>
            )}
          </div>
          {totalSummaryLabel && (
            <p className="text-[11px] text-muted mt-0.5">
              {totalSummaryValue} {totalSummaryLabel} ({totalActiveDays} active days)
            </p>
          )}
        </div>
        {headerRight ? (
          <div className="w-full sm:w-auto shrink-0">{headerRight}</div>
        ) : unitLabel ? (
          <span className="text-[10px] text-accent font-bold shrink-0 uppercase tracking-wider px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-md self-start sm:self-auto">
            {unitLabel}
          </span>
        ) : null}
      </div>

      {/* Heatmap Grid Container with full-cover width & responsive smooth horizontal scroll */}
      <div className="relative w-full max-w-full min-w-0 overflow-x-auto custom-scrollbar touch-pan-x overscroll-x-contain pb-1.5">
        <div className="w-full min-w-[700px] flex flex-col select-none py-1">

          {/* Month Labels Row - Spanning exact 53 grid columns */}
          <div className="flex items-center mb-1.5 w-full text-[10px] font-semibold text-secondary-text tracking-wide h-4">
            <div className="w-7 sm:w-8 shrink-0" />
            <div className="flex-1 min-w-0 grid grid-cols-[repeat(53,minmax(0,1fr))] gap-[2px] sm:gap-[3px]">
              {weeks.map((week, idx) => (
                <div
                  key={`month-${idx}`}
                  className="relative overflow-visible whitespace-nowrap"
                >
                  {week.monthLabel && (
                    <span className="absolute left-0 top-0 text-[9px] sm:text-[10px] font-bold text-muted/90 uppercase tracking-wider">
                      {week.monthLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Grid: Days of Week Labels (Mon, Wed, Fri) + 53 Weeks Columns covering 100% width */}
          <div className="flex items-stretch w-full">
            {/* Weekday Labels (Mon, Wed, Fri aligned with rows) */}
            <div className="w-7 sm:w-8 shrink-0 flex flex-col justify-between pr-2 text-right">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <div
                  key={d}
                  className="flex-1 flex items-center justify-end text-[9px] font-semibold text-secondary-text leading-none"
                >
                  {(i === 1 || i === 3 || i === 5) ? d : ''}
                </div>
              ))}
            </div>

            {/* Weeks Columns Grid - Stretches across the full card width */}
            <div className="flex-1 min-w-0 grid grid-cols-[repeat(53,minmax(0,1fr))] gap-[2px] sm:gap-[3px]">
              {weeks.map((week, weekIdx) => (
                <div key={`week-${weekIdx}`} className="flex flex-col gap-[2px] sm:gap-[3px]">
                  {week.days.map((day) => {
                    const colorClass = getCellColor(day.level, day.isFuture);
                    return (
                      <div
                        key={day.dateStr}
                        className={`w-full aspect-square rounded-[2px] transition-all cursor-pointer relative ${colorClass}`}
                        onMouseEnter={(e) => {
                          if (day.isFuture) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({ day, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={(e) => {
                          if (day.isFuture) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay(prev => prev?.day.dateStr === day.dateStr ? null : { day, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Bar: Info / Notes on Left, Less -> More Legend on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3 pt-2 text-[10px] text-muted border-t border-border-subtle/40">
            <span className="text-[10px] text-secondary-text hover:text-foreground transition-colors cursor-default">
              {infoNote}
            </span>

            {/* Legend: Less [0] [1] [2] [3] [4] More with Theme Colors */}
            <div className="flex items-center gap-1.5 shrink-0 select-none">
              <span className="text-[10px] text-muted font-medium">Less</span>
              <div className="flex items-center gap-[3px]">
                <div className={`w-[11px] h-[11px] rounded-[2px] ${getCellColor(0, false)}`} />
                <div className={`w-[11px] h-[11px] rounded-[2px] ${getCellColor(1, false)}`} />
                <div className={`w-[11px] h-[11px] rounded-[2px] ${getCellColor(2, false)}`} />
                <div className={`w-[11px] h-[11px] rounded-[2px] ${getCellColor(3, false)}`} />
                <div className={`w-[11px] h-[11px] rounded-[2px] ${getCellColor(4, false)}`} />
              </div>
              <span className="text-[10px] text-muted font-medium">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover & Tap Tooltip with viewport bounds safety */}
      {hoveredDay && (
        <div
          role="tooltip"
          className="fixed z-50 px-2.5 py-1.5 text-[11px] font-semibold text-foreground bg-surface border border-border shadow-xl rounded-lg pointer-events-none -translate-x-1/2 -translate-y-full mb-2 whitespace-nowrap animate-fadeIn max-w-[90vw]"
          style={{
            left: `${Math.max(70, Math.min((typeof window !== 'undefined' ? window.innerWidth : 800) - 70, hoveredDay.x))}px`,
            top: `${Math.max(30, hoveredDay.y - 6)}px`
          }}
        >
          {formatTooltip(hoveredDay.day)}
          <div className="w-2 h-2 bg-surface border-r border-b border-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </div>
      )}
    </div>
  );
};
