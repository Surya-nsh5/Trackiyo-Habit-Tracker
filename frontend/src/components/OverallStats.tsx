import React, { useMemo, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useTaskStore } from '../store/useTaskStore';
import { useThemeStore } from '../store/useThemeStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getDaysInMonth, parseISO } from 'date-fns';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const OverallStats: React.FC = () => {
  const { habits, habitLogs, currentMonthId } = useHabitStore();
  const { tasks } = useTaskStore();
  const { isDarkMode } = useThemeStore();
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
    const daysInMonth = currentMonthId ? getDaysInMonth(parseISO(`${currentMonthId}-01`)) : 30;
    let goal = habits.length * daysInMonth;
    let comp = 0;
    habits.forEach(h => {
      Object.keys(habitLogs).forEach(key => {
        if (key.startsWith(`${h.id}_`) && habitLogs[key]) {
          comp++;
        }
      });
    });
    return { totalGoal: goal, totalCompleted: comp };
  }, [habits, habitLogs, currentMonthId]);

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
  
  const COLORS = isDarkMode ? ['#ffffff', '#27272a'] : ['#000000', '#e4e4e7'];
  const TASK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 min-h-[300px] mb-6 flex-shrink-0 transition-colors duration-300">
      
      {/* Habit Completion Card */}
      <div className="gsap-pie-chart bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 md:p-6 shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-xl relative overflow-hidden flex flex-col group transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/[0.02] to-transparent pointer-events-none transition-colors duration-300" />
        
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Monthly Progress</h3>
            <div className="text-lg md:text-xl font-black text-zinc-900 dark:text-white transition-colors duration-300">Habit Completion</div>
          </div>
        </div>

        <div className="flex-1 flex flex-row items-center justify-center gap-6 relative z-10 mt-2">
          {/* Pie Chart */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative">
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', 
                    backdropFilter: 'blur(10px)', 
                    border: isDarkMode ? '1px solid #3f3f46' : '1px solid #e4e4e7', 
                    color: isDarkMode ? '#ffffff' : '#000000', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    boxShadow: '0 4px 30px rgba(0,0,0,0.1)' 
                  }} 
                  itemStyle={{ color: isDarkMode ? '#ffffff' : '#000000', fontWeight: 'bold' }}
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
              <span className="text-2xl font-black text-zinc-900 dark:text-white transition-colors duration-300">{percentage}%</span>
            </div>
          </div>

          {/* Stats Text */}
          <div className="flex flex-col gap-3 justify-center">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Done</span>
              <span className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white transition-colors duration-300">{totalCompleted}</span>
            </div>
            <div className="w-8 border-b-2 border-zinc-200 dark:border-zinc-800 transition-colors duration-300"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Goal</span>
              <span className="text-xl md:text-2xl font-bold text-zinc-600 dark:text-zinc-400 transition-colors duration-300">{totalGoal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Categories Card */}
      <div className="gsap-pie-chart bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-4 md:p-6 shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-xl relative overflow-hidden flex flex-col group transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/[0.02] to-transparent pointer-events-none transition-colors duration-300" />
        
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Distribution</h3>
            <div className="text-lg md:text-xl font-black text-zinc-900 dark:text-white transition-colors duration-300">Task Categories</div>
          </div>
        </div>

        <div className="flex-1 relative z-10 flex items-center justify-center min-h-[160px] mt-2">
          {taskCategoryData.length === 0 ? (
            <div className="flex items-center justify-center text-xs font-bold tracking-widest text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl w-full h-full p-4 transition-colors duration-300">NO TASKS</div>
          ) : (
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', 
                    backdropFilter: 'blur(10px)', 
                    border: isDarkMode ? '1px solid #3f3f46' : '1px solid #e4e4e7', 
                    color: isDarkMode ? '#ffffff' : '#000000', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    boxShadow: '0 4px 30px rgba(0,0,0,0.1)' 
                  }} 
                  itemStyle={{ color: isDarkMode ? '#ffffff' : '#000000', fontWeight: 'bold' }}
                  cursor={false}
                />
                <Pie
                  data={taskCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="80%"
                  dataKey="value"
                  stroke={isDarkMode ? '#0a0a0a' : '#ffffff'}
                  strokeWidth={3}
                  paddingAngle={2}
                  cornerRadius={4}
                >
                  {taskCategoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={TASK_COLORS[index % TASK_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
};
