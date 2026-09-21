import React, { useMemo, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useThemeStore } from '../store/useThemeStore';
import { getDaysInMonth, parseISO, startOfMonth, addDays, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const WellnessTracker: React.FC = () => {
  const { wellnessLogs, currentMonthId, updateWellnessLog } = useHabitStore();
  const { isDarkMode } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors duration-300">
      <div className="gsap-wellness-header bg-zinc-50 dark:bg-[#0a0a0a] border-b border-zinc-200 dark:border-zinc-800 font-bold tracking-widest text-xs py-3 px-6 flex justify-between items-center transition-colors duration-300">
        <span className="text-zinc-900 dark:text-white transition-colors duration-300">OVERALL WELLNESS</span>
        <div className="flex gap-6 text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest transition-colors duration-300">
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-black dark:bg-white transition-colors duration-300" /> Mood</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-500 transition-colors duration-300" /> Sleep</span>
        </div>
      </div>
      
      {/* Inputs */}
      <div className="gsap-wellness-inputs flex bg-white dark:bg-[#0a0a0a] text-xs border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0 overflow-x-auto custom-scrollbar relative transition-colors duration-300">
        <div className="w-[120px] md:w-[150px] flex flex-col font-bold border-r border-zinc-200 dark:border-zinc-800 justify-center pl-3 md:pl-6 text-zinc-700 dark:text-zinc-300 shadow-[2px_0_10px_rgba(0,0,0,0.02)] dark:shadow-sm z-20 bg-white dark:bg-[#0a0a0a] sticky left-0 flex-shrink-0 transition-colors duration-300">
          <div className="h-10 flex items-center">Mood (1-10)</div>
          <div className="h-10 flex items-center border-t border-zinc-200 dark:border-zinc-800/50 transition-colors duration-300">Hours of Sleep</div>
        </div>
        <div className="flex-1 flex bg-transparent min-w-[600px] md:min-w-[700px]">
          {daysInMonth.map(dateStr => (
            <div key={dateStr} className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-900/50 last:border-r-0 min-w-[28px] transition-colors duration-300">
              <input 
                type="text" 
                className="w-full h-10 bg-transparent text-center text-zinc-900 dark:text-white focus:outline-none focus:bg-zinc-50 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white transition-colors duration-300"
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
                className="w-full h-10 bg-transparent text-center text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-900 focus:outline-none focus:bg-zinc-50 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white transition-colors duration-300"
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
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="gsap-wellness-chart flex-1 p-4 bg-zinc-50 dark:bg-black transition-colors duration-300">
        <ResponsiveContainer width="99%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="date" stroke={isDarkMode ? '#27272a' : '#e5e7eb'} tick={false} axisLine={false} />
            <YAxis stroke={isDarkMode ? '#27272a' : '#e5e7eb'} tick={false} axisLine={false} domain={[0, 12]} />
            <Tooltip 
              cursor={{ stroke: isDarkMode ? '#27272a' : '#e5e7eb', strokeWidth: 1 }} 
              contentStyle={{ 
                backgroundColor: isDarkMode ? '#000000' : '#ffffff', 
                border: isDarkMode ? '1px solid #27272a' : '1px solid #e5e7eb', 
                color: isDarkMode ? '#ffffff' : '#000000', 
                fontSize: '12px', 
                borderRadius: '8px' 
              }} 
            />
            <Line type="monotone" dataKey="mood" stroke={isDarkMode ? '#ffffff' : '#000000'} strokeWidth={3} dot={false} activeDot={{ r: 4, fill: isDarkMode ? '#ffffff' : '#000000', stroke: isDarkMode ? '#000000' : '#ffffff' }} />
            <Line type="monotone" dataKey="sleep" stroke={isDarkMode ? '#525252' : '#a1a1aa'} strokeWidth={3} dot={false} activeDot={{ r: 4, fill: isDarkMode ? '#525252' : '#a1a1aa', stroke: isDarkMode ? '#000000' : '#ffffff' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
