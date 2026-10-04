import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { getLocalTodayStr } from '../../utils/dailyTracking';
import { useOverlayClose } from '../../utils/overlayStack';

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  /** Roomier control height for the primary input row. */
  tall?: boolean;
  align?: 'left' | 'right' | 'auto';
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
  ariaLabel = 'Select date',
  placeholder = 'Deadline',
  className = '',
  tall = false,
  align = 'auto',
}) => {
  const [open, setOpen] = useState(false);
  const initial = toParts(value || getLocalTodayStr());
  const [viewY, setViewY] = useState(initial.y);
  const [viewM, setViewM] = useState(initial.m);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const todayStr = getLocalTodayStr();

  useOverlayClose(open, () => setOpen(false));

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
  // aligns left or right based on available viewport and container space.
  const [openUp, setOpenUp] = useState(false);
  const [computedAlign, setComputedAlign] = useState<'left' | 'right'>('left');

  useEffect(() => {
    if (!open) return;
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const H = 380;
    const M = 12;
    const W = 296;
    setOpenUp(r.bottom + H > window.innerHeight - M && r.top - H > M);

    if (align === 'left') {
      setComputedAlign('left');
    } else if (align === 'right') {
      setComputedAlign('right');
    } else {
      // Auto: prefer left alignment so inputs in columns/modals expand rightward into free space.
      // Only align right if expanding to the right would overflow the screen and there is room to the left.
      const hasSpaceRight = r.left + W <= window.innerWidth - M;
      if (!hasSpaceRight && r.right - W >= M) {
        setComputedAlign('right');
      } else {
        setComputedAlign('left');
      }
    }
  }, [open, align]);

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
      className={`relative min-w-0 max-w-full ${className}`}
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
        className={`w-full max-w-full box-border min-w-0 ${tall ? 'h-14' : 'h-11'} bg-surface-secondary border border-border-subtle rounded-lg px-3.5 flex items-center gap-2 text-xs font-semibold text-foreground focus:outline-none transition-colors duration-150 hover:border-border focus:border-accent/80 cursor-pointer shadow-xs`}
      >
        <FiCalendar size={15} aria-hidden="true" className="shrink-0 text-secondary-text" />
        <span className={`flex-1 min-w-0 truncate text-left leading-none ${value ? 'text-foreground' : 'text-secondary-text font-medium'}`}>
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
            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded text-secondary-text hover:text-error transition-colors duration-150 text-base leading-none cursor-pointer"
          >
            ×
          </span>
        ) : (
          <FiChevronDown
            size={13}
            aria-hidden="true"
            className={`shrink-0 text-secondary-text transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose deadline"
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:translate-x-0 md:translate-y-0 ${
            computedAlign === 'right' ? 'md:right-0 md:left-auto' : 'md:left-0 md:right-auto'
          } ${
            openUp ? 'md:top-auto md:bottom-[calc(100%+6px)]' : 'md:top-[calc(100%+6px)]'
          } z-50 w-[296px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] overflow-y-auto bg-surface border border-border/90 rounded-xl p-3.5 shadow-2xl`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-[0.08em] text-foreground">{monthLabel}</span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                aria-label="Previous month"
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-secondary-text hover:text-foreground hover:bg-surface-secondary transition-colors duration-150"
              >
                <FiChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => stepMonth(1)}
                aria-label="Next month"
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-secondary-text hover:text-foreground hover:bg-surface-secondary transition-colors duration-150"
              >
                <FiChevronRight size={16} aria-hidden="true" />
              </button>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="h-8 flex items-center justify-center text-[10px] font-bold tracking-[0.1em] text-secondary-text uppercase"
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
                  className={`h-9 min-h-[36px] rounded-md text-xs tabular-nums transition-colors duration-150 ${
                    isSelected
                      ? 'bg-accent text-accent-ink font-bold shadow-xs'
                      : isToday
                        ? 'border border-accent text-accent font-bold hover:bg-surface-secondary'
                        : c.inMonth
                          ? 'text-foreground hover:bg-surface-secondary border border-transparent'
                          : 'text-muted/60 hover:bg-surface-secondary/50 border border-transparent'
                  }`}
                >
                  {c.dayNum}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between">
            <button
              type="button"
              onClick={() => choose('')}
              className="px-3 min-h-[36px] text-[11px] font-semibold tracking-[0.12em] uppercase text-secondary-text hover:text-error transition-colors duration-150"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => choose(todayStr)}
              className="px-3 min-h-[36px] text-[11px] font-semibold tracking-[0.12em] uppercase text-secondary-text hover:text-accent transition-colors duration-150"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
