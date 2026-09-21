import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { getLocalTodayStr } from '../utils/dailyTracking';

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  /** Roomier control height for the primary input row. */
  tall?: boolean;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function toParts(dateStr: string): { y: number; m: number } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-').map(Number);
    return { y, m: m - 1 };
  }
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() };
}

function toDateStr(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/**
 * Themed calendar popup matching the app design system.
 * Used instead of native `<input type="date">` because the OS-drawn
 * calendar cannot be styled per theme. Monday-first like the rest
 * of the app. Fully keyboard accessible.
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Deadline',
  className = '',
  tall = false,
}) => {
  const [open, setOpen] = useState(false);
  const initial = toParts(value || getLocalTodayStr());
  const [viewY, setViewY] = useState(initial.y);
  const [viewM, setViewM] = useState(initial.m);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const todayStr = getLocalTodayStr();

  // Close on outside interaction.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open ]);

  // Place the popup where it fits: centered dialog on mobile; on desktop
  // always right-aligned to the button (shifts left, never off-screen right),
  // flipping upward when there is no room below.
  const [openUp, setOpenUp] = useState(false);
  useEffect(() => {
    if (!open) return;
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const H = 500;
    const M = 12;
    setOpenUp(r.bottom + H > window.innerHeight - M && r.top - H > M);
  }, [open ]);

  // Follow the value when it changes externally.
  useEffect(() => {
    if (!open && value) {
      const p = toParts(value);
      setViewY(p.y);
      setViewM(p.m);
    }
  }, [open, value]);

  const stepMonth = (delta: number) => {
    const d = new Date(viewY, viewM + delta, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  };

  const cells = useMemo(() => {
    const first = new Date(viewY, viewM, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first offset
    const start = new Date(viewY, viewM, 1 - lead);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return {
        dateStr: toDateStr(d.getFullYear(), d.getMonth(), d.getDate()),
        dayNum: d.getDate(),
        inMonth: d.getMonth() === viewM,
      };
    });
  }, [viewY, viewM]);

  const choose = (dateStr: string) => {
    onChange(dateStr);
    setOpen(false);
  };

  const monthLabel = new Date(viewY, viewM, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full ${tall ? 'h-16' : 'h-12 md:h-14'} bg-elevated border border-border/70 rounded pl-3 pr-2.5 flex items-center gap-2 text-xs font-semibold text-foreground focus:outline-none transition-colors duration-200 hover:border-accent/50 focus:border-accent cursor-pointer`}
      >
        <FiCalendar size={15} aria-hidden="true" className="shrink-0 text-muted" />
        <span className={`flex-1 truncate text-left leading-none ${value ? '' : 'text-muted font-medium'}`}>
          {value ? format(parseISO(value), 'MMM d, yyyy') : placeholder}
        </span>
        {value ? (
          <span
            aria-hidden="true"
            title="Clear deadline"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-muted hover:text-error transition-colors duration-200 text-base leading-none cursor-pointer"
          >
            ×
          </span>
        ) : (
          <FiChevronDown
            size={14}
            aria-hidden="true"
            className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose deadline"
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:translate-x-0 md:translate-y-0 md:right-0 md:left-auto ${
            openUp ? 'md:top-auto md:bottom-[calc(100%+4px)]' : 'md:top-[calc(100%+4px)]'
          } z-50 w-[320px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] overflow-y-auto bg-surface border border-border/70 rounded p-3 shadow-[var(--t-shadow)]`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-[0.08em] text-foreground">{monthLabel}</span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                aria-label="Previous month"
                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-muted hover:text-accent hover:bg-elevated transition-colors duration-200"
              >
                <FiChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => stepMonth(1)}
                aria-label="Next month"
                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-muted hover:text-accent hover:bg-elevated transition-colors duration-200"
              >
                <FiChevronRight size={16} aria-hidden="true" />
              </button>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="h-8 flex items-center justify-center text-[10px] font-semibold tracking-[0.1em] text-muted"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5" role="group" aria-label="Days">
            {cells.map((c) => {
              const isSelected = c.dateStr === value;
              const isToday = c.dateStr === todayStr;
              return (
                <button
                  key={c.dateStr}
                  type="button"
                  onClick={() => choose(c.dateStr)}
                  aria-label={`${c.dateStr}${isToday ? ', today' : ''}`}
                  aria-pressed={isSelected}
                  className={`h-10 min-h-[40px] rounded-sm text-xs tabular-nums transition-colors duration-200 ${
                    isSelected
                      ? 'bg-accent text-accent-ink font-bold'
                      : isToday
                        ? 'border border-accent/70 text-accent font-bold hover:bg-accent/10'
                        : c.inMonth
                          ? 'text-foreground hover:bg-elevated border border-transparent'
                          : 'text-muted/60 hover:bg-elevated border border-transparent'
                  }`}
                >
                  {c.dayNum}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => choose('')}
              className="px-3 min-h-[40px] text-[11px] font-semibold tracking-[0.12em] uppercase text-muted hover:text-error transition-colors duration-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => choose(todayStr)}
              className="px-3 min-h-[40px] text-[11px] font-semibold tracking-[0.12em] uppercase text-muted hover:text-accent transition-colors duration-200"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
