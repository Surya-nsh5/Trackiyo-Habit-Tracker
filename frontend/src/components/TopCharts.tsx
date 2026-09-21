import React, { useMemo, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useThemeTokens } from '../store/useThemeStore';
import { useToday } from '../hooks/useToday';
import { isHabitApplicableOn } from '../utils/dailyTracking';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { parseISO, format, addDays, getDaysInMonth, startOfMonth, getWeekOfMonth } from 'date-fns';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const TopCharts: React.FC = () => {
  const { habits, habitLogs, currentMonthId } = useHabitStore();
  const t = useThemeTokens();
  const todayStr = useToday();
  
  const dailyRef = useRef<HTMLDivElement>(null);
  const weeklyRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const targets = [dailyRef.current, weeklyRef.current].filter(Boolean);
    if (targets.length > 0) {
      gsap.fromTo(targets, 
        { opacity: 0, x: 15, y: 30, scale: 0.99 },
        { opacity: 1, x: 0, y: 0, scale: 1, stagger: 0.15, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, { dependencies: [currentMonthId] });

  const dailyProgress = useMemo(() => {
    if (!currentMonthId) return [];
    try {
      const date = parseISO(`${currentMonthId}-01`);
      const daysCount = getDaysInMonth(date);
      const start = startOfMonth(date);
      
      const data: { dateStr: string; habitPercentage: number | null }[] = [];

      for (let i = 0; i < daysCount; i++) {
        const currentDate = addDays(start, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Only habits that existed that day count; future days and days
        // with no applicable habits are null (no data), not 0%.
        const applicable = habits.filter(h => isHabitApplicableOn(h, dateStr));
        if (applicable.length === 0 || dateStr > todayStr) {
          data.push({ dateStr, habitPercentage: null });
          continue;
        }

        let habitCompleted = 0;
        applicable.forEach(h => {
          if (habitLogs[`${h.id}_${dateStr}`] === true) habitCompleted++;
        });

        data.push({
          dateStr: dateStr,
          habitPercentage: (habitCompleted / applicable.length) * 100
        });
      }
      return data;
    } catch {
      return [];
    }
  }, [habits, habitLogs, currentMonthId, todayStr]);

  const weeklyProgress = useMemo(() => {
    const weeks = [
      { name: 'W1', value: 0, count: 0 },
      { name: 'W2', value: 0, count: 0 },
      { name: 'W3', value: 0, count: 0 },
      { name: 'W4', value: 0, count: 0 },
      { name: 'W5', value: 0, count: 0 },
      { name: 'W6', value: 0, count: 0 }
    ];
    
    dailyProgress.forEach((d, i) => {
      if (d.habitPercentage === null) return;
      const date = addDays(startOfMonth(parseISO(`${currentMonthId}-01`)), i);
      const weekIndex = getWeekOfMonth(date, { weekStartsOn: 1 }) - 1;
      if (weeks[weekIndex]) {
        weeks[weekIndex].value += d.habitPercentage;
        weeks[weekIndex].count += 1;
      }
    });

    return weeks
      .filter(w => w.count > 0)
      .map(w => ({
        name: w.name,
        percentage: w.count > 0 ? w.value / w.count : 0
      }));
  }, [dailyProgress, currentMonthId]);

  // Shared Tooltip Style for Premium Look
  const tooltipStyle = {
    backgroundColor: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    color: t.fg,
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: t.shadow === 'none' ? undefined : t.shadow,
    padding: '8px 12px'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full flex-shrink-0 transition-colors duration-200">
      
      {/* Daily Habits Completion Trend (Area Chart) */}
      <div ref={dailyRef} className="bg-surface border border-border/70 rounded-md p-4 md:p-5 relative overflow-hidden group transition-colors duration-200">
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] mb-1">Habits Trend</h3>
            <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground transition-colors duration-200">Daily Consistency</div>
          </div>
        </div>
        <div className="h-[160px] w-full relative z-10">
          <ResponsiveContainer width="99%" height="100%">
            <AreaChart data={dailyProgress} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHabit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={t.accent} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={t.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="dateStr" 
                tickFormatter={(val) => parseISO(val).getDate().toString()} 
                stroke={t.muted} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke={t.muted} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{ stroke: t.border, strokeWidth: 1, strokeDasharray: '4 4' }} 
                contentStyle={tooltipStyle}
                formatter={(value: any) => [`${Math.round(value)}%`, 'Completion']}
                labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
              />
              <Area 
                type="monotone" 
                dataKey="habitPercentage" 
                stroke={t.accent} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorHabit)" 
                activeDot={{ r: 5, fill: t.accent, stroke: t.bg, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* Weekly Averages (Bar Chart) */}
      <div ref={weeklyRef} className="bg-surface border border-border/70 rounded-md p-4 md:p-5 relative overflow-hidden group transition-colors duration-200">
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] mb-1">Weekly Summary</h3>
            <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground transition-colors duration-200">Average Success</div>
          </div>
        </div>
        <div className="h-[160px] w-full relative z-10">
          <ResponsiveContainer width="99%" height="100%">
            <BarChart data={weeklyProgress} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke={t.muted} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke={t.muted} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{ fill: t.elevated, opacity: 0.4 }} 
                contentStyle={tooltipStyle}
                formatter={(value: any) => [`${Math.round(value)}%`, 'Weekly Avg']}
              />
              <Bar 
                dataKey="percentage" 
                fill={t.accent} 
                radius={[3, 3, 0, 0]} 
                maxBarSize={40}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
