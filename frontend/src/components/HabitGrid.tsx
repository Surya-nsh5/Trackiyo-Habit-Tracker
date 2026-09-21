import React, { useMemo, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { useThemeStore } from '../store/useThemeStore';
import { parseISO, addDays, format, getDaysInMonth, startOfMonth } from 'date-fns';
import { FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Habit } from '../types';

const HabitCell = React.memo(({ habit, dateStr, isChecked, onToggle }: { habit: Habit; dateStr: string; isChecked: boolean; onToggle: (id: string, date: string) => void }) => {
  return (
    <div className="w-24 flex-shrink-0 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-700/50 transition-colors duration-300">
      <button 
        aria-label={`Toggle ${habit.name} for ${dateStr}`}
        className={`gsap-habit-cell w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95
          ${isChecked 
            ? 'bg-black border-black shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:bg-white dark:border-white dark:shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
            : 'bg-transparent border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500'}`}
        onClick={() => onToggle(habit.id, dateStr)}
      >
        {isChecked && <svg aria-hidden="true" className="w-4 h-4 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </button>
    </div>
  );
});

export const HabitGrid: React.FC = () => {
  const { habits, habitLogs, currentMonthId, isLoading, toggleHabitLog, addHabit, deleteHabit } = useHabitStore();
  const { isDarkMode } = useThemeStore();
  const gridRef = React.useRef<HTMLDivElement>(null);

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('📌');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    if (newHabitName.trim()) {
      addHabit(newHabitName.trim(), newHabitIcon, 28);
      setNewHabitName('');
      setNewHabitIcon('📌');
    }
  };

  const daysInMonthArray = useMemo(() => {
    if (!currentMonthId) return [];
    try {
      const date = parseISO(`${currentMonthId}-01`);
      const daysCount = getDaysInMonth(date);
      const start = startOfMonth(date);

      const days = [];
      for (let i = 0; i < daysCount; i++) {
        const currentDate = addDays(start, i);
        days.push({
          dateStr: format(currentDate, 'yyyy-MM-dd'),
          dayOfMonth: format(currentDate, 'd'),
          dayOfWeek: format(currentDate, 'eee'), // Mon, Tue
        });
      }
      return days;
    } catch {
      return [];
    }
  }, [currentMonthId]);

  return (
    <div ref={gridRef} className="h-full flex flex-col gap-4 bg-transparent min-h-0 transition-colors duration-300">
      
      {/* Top Action Bar */}
      <div className="flex justify-end items-center flex-shrink-0 px-1">
        <div className="w-64 relative z-50">
          <form onSubmit={handleAddHabit} className="flex h-10 w-full items-center bg-white dark:bg-zinc-900/40 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-700/50 focus-within:border-zinc-400 dark:focus-within:border-zinc-400 focus-within:bg-zinc-50 dark:focus-within:bg-zinc-900/80 transition-all group shadow-sm dark:shadow-inner overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-14 h-full flex flex-col items-center justify-center text-xl border-r border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-black/20 hover:bg-zinc-200 dark:hover:bg-white/5 transition-colors"
              title="Choose Emoji"
            >
              <span className="leading-none transform -translate-y-[1px]">{newHabitIcon}</span>
            </button>
            <input
              type="text"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              className="flex-1 min-w-0 h-full bg-transparent px-3 text-[10px] font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 tracking-widest uppercase outline-none"
              placeholder="NEW HABIT..."
            />
            <button
              type="submit"
              disabled={!newHabitName.trim()}
              className="h-full px-4 flex items-center justify-center text-[10px] font-black tracking-widest uppercase text-white bg-black dark:text-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-500 transition-all"
              title="Add Habit"
            >
              ADD
            </button>
          </form>
          
          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
              <div className="absolute top-12 right-0 z-50 shadow-2xl animate-in fade-in zoom-in duration-200">
                <EmojiPicker theme={isDarkMode ? Theme.DARK : Theme.LIGHT} onEmojiClick={(e) => { setNewHabitIcon(e.emoji); setShowEmojiPicker(false); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-hidden custom-scrollbar rounded-xl">
        <div className="min-w-fit flex flex-col h-full bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/50 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden transition-colors duration-300">
          
          {/* Sticky Header: Habits (Columns) */}
          <div className="flex flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700/50 z-20 h-16 sticky top-0 shadow-sm md:shadow-md transition-colors duration-300">
            
            {/* Top-Left Empty Corner */}
            <div className="w-24 md:w-32 flex-shrink-0 flex flex-col items-center justify-center border-r border-zinc-200 dark:border-zinc-700/50 text-[10px] font-bold tracking-widest text-zinc-500 uppercase transition-colors duration-300">
              Date
            </div>
            
            {/* Habit Headers */}
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={`skel-h-${i}`} className="w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-zinc-200 dark:border-zinc-700/50 group/info relative px-2 transition-colors duration-300">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse mb-1"></div>
                  <div className="w-12 h-2 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
                </div>
              ))
            ) : habits.map(habit => (
              <div key={`header-${habit.id}`} className="w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-zinc-200 dark:border-zinc-700/50 group/info relative px-2 transition-colors duration-300">
                <div className="text-2xl mb-1 group-hover/info:scale-110 transition-transform">{habit.icon}</div>
                <div className="text-[10px] font-bold text-zinc-900 dark:text-white truncate w-full text-center tracking-wider transition-colors duration-300">{habit.name}</div>
                
                {/* Delete / Confirm Actions */}
                <div className="absolute top-1 right-1">
                  {confirmDeleteId === habit.id ? (
                    <div className="flex flex-col gap-1 bg-zinc-100 dark:bg-zinc-900/90 rounded p-1 shadow-lg">
                      <button onClick={() => deleteHabit(habit.id)} aria-label={`Confirm delete ${habit.name}`} className="p-1 text-green-500 hover:bg-green-500/20 rounded">
                        <FiCheck size={12} strokeWidth={3} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} aria-label="Cancel delete" className="p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-500/20 dark:hover:text-white rounded">
                        <FiX size={12} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(habit.id)} aria-label={`Delete ${habit.name}`} className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all">
                      <FiTrash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Body: Days (Rows) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-8">
            {/* Top Analysis Row */}
            {habits.length > 0 && (
              <div className="flex flex-shrink-0 bg-zinc-100 dark:bg-black/40 border-b border-zinc-200 dark:border-zinc-700/50 mb-2 transition-colors duration-300">
                <div className="w-24 md:w-32 flex-shrink-0 flex flex-col justify-center px-4 border-r border-zinc-200 dark:border-zinc-700/50 py-4 transition-colors duration-300">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-1">ANALYSIS</span>
                </div>
                
                {habits.map(habit => {
                  let actual = 0;
                  daysInMonthArray.forEach(d => { if (habitLogs[`${habit.id}_${d.dateStr}`]) actual++; });
                  const progress = (actual / daysInMonthArray.length) * 100;
                  
                  return (
                    <div key={`analysis-${habit.id}`} className="w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-zinc-200 dark:border-zinc-700/50 py-4 gap-1 transition-colors duration-300">
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">DONE: <span className="text-zinc-900 dark:text-white">{actual}</span>/{daysInMonthArray.length}</div>
                      <div className="w-16 bg-zinc-200 dark:bg-black h-1.5 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800 transition-colors duration-300">
                        <div className="bg-black dark:bg-white h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                      <div className="text-[10px] font-black text-zinc-900 dark:text-white transition-colors duration-300">{Math.round(progress)}%</div>
                    </div>
                  );
                })}
              </div>
            )}

            {daysInMonthArray.map((d) => (
              <div key={`day-${d.dateStr}`} className="flex flex-shrink-0 h-12 border-b border-zinc-200 dark:border-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                
                {/* Date Column */}
                <div className="w-24 md:w-32 flex-shrink-0 flex items-center justify-end px-4 border-r border-zinc-200 dark:border-zinc-700/50 transition-colors duration-300">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{d.dayOfWeek}</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-white transition-colors duration-300">{d.dayOfMonth}</span>
                  </div>
                </div>
                
                {/* Habit Cells for this Date */}
                {habits.map((habit) => {
                  const isChecked = !!habitLogs[`${habit.id}_${d.dateStr}`];
                  return (
                    <HabitCell
                      key={`cell-${habit.id}-${d.dateStr}`}
                      habit={habit}
                      dateStr={d.dateStr}
                      isChecked={isChecked}
                      onToggle={toggleHabitLog}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
