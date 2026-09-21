import React from 'react';

interface HabitLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const STEPS = [0, 1, 2, 3];
const STEP_DELAY_S = 0.22;

/**
 * Progressive habit/check loading animation (CSS only, GPU-friendly).
 * Four indicators activate in sequence — empty → accent fill → check —
 * then reset smoothly. No logo, no spinner, no JS timers.
 */
export const HabitLoader: React.FC<HabitLoaderProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  const box =
    size === 'sm'
      ? 'w-3.5 h-3.5'
      : size === 'lg'
        ? 'w-[22px] h-[22px]'
        : 'w-[18px] h-[18px]';
  const gap = size === 'sm' ? 'gap-1.5' : 'gap-2';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`flex ${gap}`} aria-hidden="true">
        {STEPS.map((i) => (
          <div
            key={i}
            className={`${box} rounded border-2 border-border relative`}
          >
            <div
              className="habit-loader-fill absolute inset-[2px] rounded-[2px] bg-accent"
              style={{ animationDelay: `${i * STEP_DELAY_S}s` }}
            />
            <svg
              className="habit-loader-check absolute inset-0 m-auto w-3/5 h-3/5 text-accent-ink"
              style={{ animationDelay: `${i * STEP_DELAY_S}s` }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
      </div>
      {label && (
        <p className="mt-4 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">
          {label}
        </p>
      )}
    </div>
  );
};
