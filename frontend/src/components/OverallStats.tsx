import React, { useMemo, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useTaskStore } from '../store/useTaskStore';
import { useThemeTokens } from '../store/useThemeStore';
import { useToday } from '../hooks/useToday';
import { getApplicableDaysInMonth } from '../utils/dailyTracking';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const OverallStats: React.FC = () => {
  const { habits, habitLogs, currentMonthId } = useHabitStore();
  const { tasks } = useTaskStore();
  const t = useThemeTokens();
  const todayStr = useToday();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.set(containerRef.current, { opacity: 0, y: 15, scale: 0.99 });

    
    const tl = gsap.timeline();
    tl.to(containerRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
    tl.fromTo('.gsap-pie-chart', 
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, stagger: 0.2, ease: 'expo.out', overwrite: 'auto' }, 
      '-=0.4'
    );
  }, { dependencies: [currentMonthId], scope: containerRef });

  const { totalGoal, totalCompleted } = useMemo(() => {
    // Goal counts only days each habit actually existed and that are not in
    // the future — consistent with the Habits section analysis row.
    if (!currentMonthId) return { totalGoal: 0, totalCompleted: 0 };
    let goal = 0;
    let comp = 0;
    habits.forEach(h => {
      const applicable = getApplicableDaysInMonth(h, currentMonthId, todayStr);
      goal += applicable.length;
      applicable.forEach(ds => {
        if (habitLogs[`${h.id}_${ds}`] === true) comp++;
      });
    });
    return { totalGoal: goal, totalCompleted: comp };
  }, [habits, habitLogs, currentMonthId, todayStr]);

  // Compute Task Categories
  const taskCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const percentage = totalGoal === 0 ? 0 : Math.round((totalCompleted / totalGoal) * 100);
  const data = [
    { name: 'Completed', value: totalCompleted },
    { name: 'Left', value: Math.max(totalGoal - totalCompleted, 0) }
  ];
  
  const COLORS = [t.accent, t.elevated];

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 flex-shrink-0 transition-colors duration-200">
      
      {/* Habit Completion Card */}
      <div className="gsap-pie-chart bg-surface border border-border/70 rounded-md p-4 md:p-5 relative overflow-hidden flex flex-col group transition-colors duration-200">
        
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] mb-1">Monthly Progress</h3>
            <div className="text-lg md:text-xl font-bold tracking-tight text-foreground transition-colors duration-200">Habit Completion</div>
          </div>
        </div>

        <div className="flex-1 flex flex-row items-center justify-center gap-6 relative z-10 mt-2">
          {/* Pie Chart */}
          <div className="w-28 h-28 md:w-36 md:h-36 relative">
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: t.surface, 
                    border: `1px solid ${t.border}`, 
                    color: t.fg, 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    boxShadow: t.shadow === 'none' ? undefined : t.shadow 
                  }} 
                  itemStyle={{ color: t.fg, fontWeight: 600 }}
                  cursor={false}
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="85%"
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={6}
                >
                  {data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {totalGoal === 0 ? (
                <span className="text-2xl font-bold tracking-tight text-muted" title="No tracking data for this period">—</span>
              ) : (
                <span className="text-2xl font-bold tracking-tight text-accent tabular-nums transition-colors duration-200">{percentage}%</span>
              )}
            </div>
          </div>

          {/* Stats Text */}
          <div className="flex flex-col gap-2 justify-center">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase font-semibold tracking-[0.14em] text-muted">Done</span>
              <span className="text-2xl md:text-3xl font-bold tracking-tight text-accent tabular-nums transition-colors duration-200">{totalCompleted}</span>
            </div>
            <div className="w-8 border-b-2 border-border transition-colors duration-200"></div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase font-semibold tracking-[0.14em] text-muted">Goal</span>
              <span className="text-xl md:text-2xl font-semibold tracking-tight text-muted tabular-nums transition-colors duration-200">{totalGoal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Categories Card */}
      <div className="gsap-pie-chart bg-surface border border-border/70 rounded-md p-4 md:p-5 relative overflow-hidden flex flex-col group transition-colors duration-200">
        
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] mb-1">Distribution</h3>
            <div className="text-lg md:text-xl font-bold tracking-tight text-foreground transition-colors duration-200">Task Categories</div>
          </div>
        </div>

        <div className="flex-1 relative z-10 flex items-center justify-center min-h-[140px] mt-2">
          {taskCategoryData.length === 0 ? (
            <div className="flex items-center justify-center text-xs font-semibold tracking-[0.14em] uppercase text-muted border border-dashed border-border rounded w-full h-full p-4 transition-colors duration-200">NO TASKS</div>
          ) : (
            <ResponsiveContainer width="99%" height="100%">
              <LineChart data={taskCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="name"
                  stroke={t.muted}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  dy={10}
                />
                <YAxis
                  stroke={t.muted}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: t.surface,
                    border: `1px solid ${t.border}`,
                    color: t.fg,
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: t.shadow === 'none' ? undefined : t.shadow
                  }}
                  itemStyle={{ color: t.fg, fontWeight: 600 }}
                  cursor={{ stroke: t.border, strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(value: any) => [value, 'Tasks']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={t.accent}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: t.accent, stroke: t.bg, strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: t.accent, stroke: t.bg, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
};
