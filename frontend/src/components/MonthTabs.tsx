import React, { useEffect, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export const MonthTabs: React.FC = () => {
  const { currentMonthId, setCurrentMonth } = useHabitStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useGSAP(() => {
    gsap.fromTo('.gsap-month-tab',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, stagger: 0.03, duration: 0.5, ease: 'back.out(1.5)' }
    );
  }, { scope: containerRef });

  // Always bring the active (running) month into view — on mobile the
  // strip scrolls horizontally and the current month would otherwise sit
  // off-screen, clipped.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
    });
    return () => cancelAnimationFrame(raf);
  }, [currentMonthId]);
  
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
            ref={isActive ? activeRef : undefined}
            onClick={() => setCurrentMonth(m)}
            className={clsx(
              "gsap-month-tab flex-1 min-w-[60px] sm:min-w-[70px] md:min-w-0 shrink-0 md:shrink py-2.5 min-h-[44px] text-[11px] font-semibold rounded-t transition-colors duration-200 border border-b-0 uppercase tracking-[0.12em] origin-bottom",
              isActive 
                ? "bg-accent border-accent text-accent-ink pb-4 z-10" 
                : "bg-elevated border-border/60 text-muted hover:bg-elevated hover:text-foreground pb-2"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
