import React, { useEffect, useMemo, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useThemeTokens } from '../store/useThemeStore';
import { useToday } from '../hooks/useToday';
import { getDateStatus } from '../utils/dailyTracking';
import { getDaysInMonth, parseISO, startOfMonth, addDays, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const WellnessTracker: React.FC = () => {
  const { wellnessLogs, currentMonthId, updateWellnessLog } = useHabitStore();
  const t = useThemeTokens();
  const todayStr = useToday();
  const containerRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { opacity: 0, x: 15, scale: 0.99 });
    
    const tl = gsap.timeline();
    tl.to(containerRef.current, { opacity: 1, x: 0, scale: 1, duration: 0.8, ease: 'power3.out' });
    tl.fromTo('.gsap-wellness-header', 
      { y: -20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', overwrite: 'auto' },
      "-=0.4"
    )
    .fromTo('.gsap-wellness-inputs', 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }, 
      '-=0.4'
    )
    .fromTo('.gsap-wellness-chart', 
      { scale: 0.95, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out', overwrite: 'auto' }, 
      '-=0.6'
    );
  }, { dependencies: [currentMonthId], scope: containerRef });

  const daysInMonth = useMemo(() => {
    if (!currentMonthId) return [];
    try {
      const date = parseISO(`${currentMonthId}-01`);
      const daysCount = getDaysInMonth(date);
      const start = startOfMonth(date);
      const days = [];
      for (let i = 0; i < daysCount; i++) {
        days.push(format(addDays(start, i), 'yyyy-MM-dd'));
      }
      return days;
    } catch {
      return [];
    }
  }, [currentMonthId]);

  const chartData = useMemo(() => {
    return daysInMonth.map(dateStr => {
      const log = wellnessLogs[dateStr];
      return {
        date: format(parseISO(dateStr), 'dd'),
        mood: log?.mood || 0,
        sleep: log?.sleep || 0,
      };
    });
  }, [daysInMonth, wellnessLogs]);

  // Always bring today's column into view (open, month change, day rollover).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      todayColRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
    });
    return () => cancelAnimationFrame(raf);
  }, [daysInMonth, todayStr, currentMonthId]);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-surface rounded-md overflow-hidden transition-colors duration-200">
      <div className="gsap-wellness-header bg-elevated border-b border-border/70 font-semibold tracking-[0.14em] text-[11px] py-3.5 px-6 flex justify-between items-center transition-colors duration-200">
        <span className="text-foreground transition-colors duration-200">OVERALL WELLNESS</span>
        <div className="flex gap-6 text-[10px] text-muted uppercase tracking-[0.14em] transition-colors duration-200">
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent transition-colors duration-200" /> Mood</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted transition-colors duration-200" /> Sleep</span>
        </div>
      </div>
      
      {/* Inputs */}
      <div className="gsap-wellness-inputs flex bg-surface text-xs border-b border-border/70 flex-shrink-0 overflow-x-auto custom-scrollbar relative transition-colors duration-200">
        <div className="w-[104px] md:w-[128px] flex flex-col font-semibold border-r border-border/70 justify-center pl-3 md:pl-4 text-muted z-20 bg-surface sticky left-0 flex-shrink-0 transition-colors duration-200">
          <div className="h-11 min-h-[44px] flex items-center">Mood (1-10)</div>
          <div className="h-11 min-h-[44px] flex items-center border-t border-border/50 transition-colors duration-200">Hours of Sleep</div>
        </div>
        <div className="flex bg-transparent">
          {daysInMonth.map(dateStr => {
            const status = getDateStatus(dateStr, todayStr);
            const editable = status === 'today';
            const isToday = dateStr === todayStr;
            const dayTitle = editable
              ? `Log wellness for today (${dateStr})`
              : status === 'past'
                ? `Historical record for ${dateStr} (read-only)`
                : `Upcoming date ${dateStr} (not available yet)`;
            return (
            <div key={dateStr} ref={isToday ? todayColRef : undefined} className={`flex flex-col border-r border-border/40 last:border-r-0 w-11 shrink-0 transition-colors duration-200 ${isToday ? 'bg-accent/10' : ''}`}>
              <input 
                type="text" 
                aria-label={`Mood for ${dateStr}`}
                title={dayTitle}
                disabled={!editable}
                className="w-full h-11 min-h-[44px] bg-transparent text-center text-accent font-semibold tabular-nums focus:outline-none focus:bg-elevated disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-200"
                value={wellnessLogs[dateStr]?.mood || ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw === '') {
                    updateWellnessLog(dateStr, 'mood', null);
                    return;
                  }
                  const val = parseInt(raw);
                  if (val >= 1 && val <= 10) {
                    updateWellnessLog(dateStr, 'mood', val);
                  }
                }}
                maxLength={2}
              />
              <input 
                type="text" 
                aria-label={`Sleep hours for ${dateStr}`}
                title={dayTitle}
                disabled={!editable}
                className="w-full h-11 min-h-[44px] bg-transparent text-center text-muted tabular-nums border-t border-border/40 focus:outline-none focus:bg-elevated disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-200"
                value={wellnessLogs[dateStr]?.sleep || ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw === '') {
                    updateWellnessLog(dateStr, 'sleep', null);
                    return;
                  }
                  const val = parseInt(raw);
                  if (val >= 0 && val <= 24) {
                    updateWellnessLog(dateStr, 'sleep', val);
                  }
                }}
                maxLength={2}
              />
            </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="gsap-wellness-chart flex-1 min-h-[180px] px-3 md:px-4 pt-4 pb-2 bg-background transition-colors duration-200 outline-none [&_svg]:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none">
        <style>{`.recharts-wrapper:focus, .recharts-wrapper:focus-visible, .recharts-surface:focus { outline: none !important; }`}</style>
        <ResponsiveContainer width="99%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%" barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: t.muted, fontSize: 10, fontWeight: 600 }}
              interval={4}
            />
            <YAxis
              stroke="transparent"
              tick={false}
              axisLine={false}
              tickLine={false}
              domain={[0, 12]}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: t.border, opacity: 0.15 }}
              wrapperStyle={{ pointerEvents: 'none', outline: 'none' }}
              contentStyle={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
                color: t.fg,
                fontSize: '12px',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
            <Bar dataKey="mood" name="Mood" fill={t.accent} radius={[3, 3, 0, 0]} maxBarSize={12}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`mood-${index}`}
                  fill={entry.mood > 0 ? t.accent : t.border}
                  opacity={entry.mood > 0 ? 1 : 0.2}
                />
              ))}
            </Bar>
            <Bar dataKey="sleep" name="Sleep" fill={t.muted} radius={[3, 3, 0, 0]} maxBarSize={12}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`sleep-${index}`}
                  fill={entry.sleep > 0 ? t.muted : t.border}
                  opacity={entry.sleep > 0 ? 0.7 : 0.2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
