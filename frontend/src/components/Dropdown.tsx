import React, { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  /** Borderless variant that blends into a surrounding pill container. */
  bare?: boolean;
  /** Roomier control height for the primary input row. */
  tall?: boolean;
}

/**
 * Themed dropdown (button + popup list) matching the app design system.
 * Used instead of native `<select>` because the OS-drawn option popup
 * cannot be styled. Fully keyboard accessible (listbox pattern).
 */
export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  bare = false,
  tall = false,
}) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const selectedIndex = Math.max(
    options.findIndex((o) => o.value === value),
    0
  );
  const selected = options[selectedIndex] ?? options[0];

  // Close on outside interaction.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open ]);

  // Keep the keyboard-highlighted option visible.
  useEffect(() => {
    if (!open || highlight < 0) return;
    optionRefs.current[options[highlight]?.value]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight, options]);

  const choose = (v: string) => {
    if (v !== value) onChange(v);
    setOpen(false);
  };

  const openList = () => {
    setHighlight(selectedIndex);
    setOpen(true);
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openList();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlight >= 0) choose(options[highlight].value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
        className={
          bare
            ? 'w-full min-h-[36px] bg-transparent border border-transparent rounded-sm px-4 py-2 flex items-center justify-between gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-muted hover:text-foreground focus:outline-none transition-colors duration-200 cursor-pointer'
            : `w-full ${tall ? 'h-16' : 'h-12 md:h-14'} bg-elevated border border-border/70 rounded pl-3 pr-2.5 flex items-center justify-between gap-1.5 text-xs font-semibold leading-none text-foreground focus:outline-none transition-colors duration-200 hover:border-accent/50 cursor-pointer`
        }
      >
        <span className="truncate">{selected?.label}</span>
        <FiChevronDown
          size={12}
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={highlight >= 0 ? `dd-opt-${options[highlight].value}` : undefined}
          onKeyDown={onListKeyDown}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 min-w-full bg-surface border border-border/70 rounded py-1 overflow-hidden shadow-[var(--t-shadow)]"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === highlight;
            return (
              <li key={opt.value} role="presentation">
                <button
                  ref={(el) => {
                    optionRefs.current[opt.value] = el;
                  }}
                  id={`dd-opt-${opt.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(opt.value)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full min-h-[44px] px-3 flex items-center gap-2 text-xs font-semibold text-left whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                    isHighlighted
                      ? 'bg-elevated text-foreground'
                      : 'text-muted'
                  }`}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && (
                    <FiCheck size={14} strokeWidth={3} aria-hidden="true" className="shrink-0 text-accent" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
