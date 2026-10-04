import React, { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { useOverlayClose } from '../../utils/overlayStack';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
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
  ariaLabel = 'Select option',
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

  useOverlayClose(open, () => setOpen(false));

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
      className={`relative min-w-0 max-w-full ${className}`}
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
            ? 'w-full max-w-full box-border min-h-[36px] bg-transparent border border-transparent rounded-md px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-secondary-text hover:text-foreground focus:outline-none transition-colors duration-150 cursor-pointer min-w-0'
            : `w-full max-w-full box-border min-w-0 ${tall ? 'h-14' : 'h-11'} bg-surface-secondary border border-border-subtle rounded-lg px-3.5 flex items-center justify-between gap-2 text-xs font-semibold leading-none text-foreground focus:outline-none focus:border-accent/80 hover:border-border transition-colors duration-150 cursor-pointer shadow-xs`
        }
      >
        <span className="truncate min-w-0 flex-1 text-left">{selected?.label}</span>
        <FiChevronDown
          size={13}
          aria-hidden="true"
          className={`shrink-0 text-secondary-text transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={highlight >= 0 ? `dd-opt-${options[highlight].value}` : undefined}
          onKeyDown={onListKeyDown}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 min-w-full max-w-[calc(100vw-2rem)] max-h-[min(16rem,calc(100dvh-4rem))] overflow-y-auto bg-surface border border-border/90 rounded-lg py-1.5 shadow-xl custom-scrollbar"
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
                  className={`w-full min-w-0 min-h-[38px] px-3.5 flex items-center gap-2 text-xs font-medium text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-surface-secondary text-foreground font-semibold'
                      : isHighlighted
                      ? 'bg-surface-hover text-foreground'
                      : 'text-secondary-text hover:text-foreground'
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                  {isSelected && (
                    <FiCheck size={14} strokeWidth={2.5} aria-hidden="true" className="shrink-0 text-accent" />
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
