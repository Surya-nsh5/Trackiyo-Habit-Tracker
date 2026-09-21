import React, { useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const MonthTabs: React.FC = () => {
  const { currentMonthId, setCurrentMonth } = useHabitStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.gsap-month-tab',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, stagger: 0.03, duration: 0.5, ease: 'back.out(1.5)' }
    );
  }, { scope: containerRef });
  
  if (!currentMonthId) return null;

  const currentYear = currentMonthId.split('-')[0];
  const months = Array.from({ length: 12 }).map((_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return `${currentYear}-${m}`;
  });

  return (
    <div 
      ref={containerRef} 
      className="flex h-full w-full gap-1 items-end pt-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {months.map(m => {
        const isActive = m === currentMonthId;
        const label = format(parseISO(`${m}-01`), 'MMM'); // Short month name
        return (
          <button
            key={m}
            onClick={() => setCurrentMonth(m)}
            className={clsx(
              "gsap-month-tab flex-1 min-w-[60px] sm:min-w-[70px] md:min-w-0 shrink-0 md:shrink py-2 text-xs font-bold rounded-t-lg transition-all duration-300 border border-b-0 uppercase tracking-widest origin-bottom",
              isActive 
                ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black shadow-[0_-4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_15px_rgba(255,255,255,0.2)] pb-4 z-10 scale-105" 
                : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-black dark:border-zinc-800/50 dark:hover:bg-zinc-900 dark:hover:text-white pb-2 hover:scale-105 hover:-translate-y-1"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
