import React, { useMemo, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useThemeStore } from '../store/useThemeStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { parseISO, format, addDays, getDaysInMonth, startOfMonth, getWeekOfMonth } from 'date-fns';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const TopCharts: React.FC = () => {
  const { habits, habitLogs, currentMonthId } = useHabitStore();
  const { isDarkMode } = useThemeStore();
  
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
      
      const data = [];
      const totalHabits = habits.length;

      for (let i = 0; i < daysCount; i++) {
        const currentDate = addDays(start, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Habit progress
        let habitCompleted = 0;
        habits.forEach(h => {
          if (habitLogs[`${h.id}_${dateStr}`]) habitCompleted++;
        });

        data.push({
          dateStr: dateStr,
          habitPercentage: totalHabits > 0 ? (habitCompleted / totalHabits) * 100 : 0
        });
      }
      return data;
    } catch {
      return [];
    }
  }, [habits, habitLogs, currentMonthId]);

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
      const date = addDays(startOfMonth(parseISO(`${currentMonthId}-01`)), i);
      const weekIndex = getWeekOfMonth(date, { weekStartsOn: 1 }) - 1;
      if (weeks[weekIndex]) {
        weeks[weekIndex].value += d.habitPercentage;
        weeks[weekIndex].count += 1;
      }
    });

    return weeks.filter(w => w.count > 0).map(w => ({
      name: w.name,
      percentage: w.count > 0 ? w.value / w.count : 0
    }));
  }, [dailyProgress, currentMonthId]);

  // Shared Tooltip Style for Premium Look
  const tooltipStyle = {
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    color: isDarkMode ? '#fff' : '#000',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
    padding: '8px 12px'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full mb-6 flex-shrink-0 transition-colors duration-300">
      
      {/* Daily Habits Completion Trend (Area Chart) */}
      <div ref={dailyRef} className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 md:p-6 shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-xl relative overflow-hidden group transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/[0.02] to-transparent pointer-events-none transition-colors duration-300" />
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Habits Trend</h3>
            <div className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white transition-colors duration-300">Daily Consistency</div>
          </div>
        </div>
        <div className="h-[180px] w-full relative z-10">
          <ResponsiveContainer width="99%" height="100%">
            <AreaChart data={dailyProgress} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHabit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDarkMode ? "#ffffff" : "#000000"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isDarkMode ? "#ffffff" : "#000000"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#27272a" : "#e5e7eb"} vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="dateStr" 
                tickFormatter={(val) => parseISO(val).getDate().toString()} 
                stroke={isDarkMode ? "#525252" : "#a1a1aa"} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke={isDarkMode ? "#525252" : "#a1a1aa"} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{ stroke: isDarkMode ? '#525252' : '#a1a1aa', strokeWidth: 1, strokeDasharray: '4 4' }} 
                contentStyle={tooltipStyle}
                formatter={(value: any) => [`${Math.round(value)}%`, 'Completion']}
                labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
              />
              <Area 
                type="monotone" 
                dataKey="habitPercentage" 
                stroke={isDarkMode ? "#ffffff" : "#000000"} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorHabit)" 
                activeDot={{ r: 6, fill: isDarkMode ? '#000' : '#fff', stroke: isDarkMode ? '#fff' : '#000', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* Weekly Averages (Bar Chart) */}
      <div ref={weeklyRef} className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 md:p-6 shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-xl relative overflow-hidden group transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/[0.02] to-transparent pointer-events-none transition-colors duration-300" />
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Weekly Summary</h3>
            <div className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white transition-colors duration-300">Average Success</div>
          </div>
        </div>
        <div className="h-[180px] w-full relative z-10">
          <ResponsiveContainer width="99%" height="100%">
            <BarChart data={weeklyProgress} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#27272a" : "#e5e7eb"} vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke={isDarkMode ? "#525252" : "#a1a1aa"} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke={isDarkMode ? "#525252" : "#a1a1aa"} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{ fill: isDarkMode ? '#27272a' : '#f4f4f5', opacity: 0.4 }} 
                contentStyle={tooltipStyle}
                formatter={(value: any) => [`${Math.round(value)}%`, 'Weekly Avg']}
              />
              <Bar 
                dataKey="percentage" 
                fill={isDarkMode ? "#525252" : "#a1a1aa"} 
                radius={[4, 4, 0, 0]} 
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
