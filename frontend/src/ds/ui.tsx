import React, { useEffect, useRef, useState } from 'react';
import { useEffectiveMotion } from './dsContext';

/* ==========================================================================
   DS component library — ONE implementation, theme-agnostic.
   Colors come ONLY from --ds-* semantic tokens (active theme provides them).
   Never add hex/rgb literals here.
   ========================================================================== */

/* ---------------- Button ---------------- */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-[0.1em] rounded-[var(--ds-radius-sm)] transition-colors min-h-[44px] px-5 max-w-full min-w-0 text-center [overflow-wrap:anywhere] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)] hover:brightness-110 active:scale-[0.98]',
  secondary: 'bg-[var(--ds-secondary)] text-[var(--ds-secondary-foreground)] border border-[var(--ds-border)] hover:bg-[var(--ds-surface-hover)]',
  outline: 'bg-transparent border border-[var(--ds-border)] text-[var(--ds-foreground)] hover:border-[var(--ds-primary)] hover:text-[var(--ds-primary)]',
  ghost: 'bg-transparent text-[var(--ds-body-text)] hover:text-[var(--ds-foreground)] hover:bg-[var(--ds-surface-hover)]',
  danger: 'bg-[var(--ds-danger)] text-white dark:text-black hover:brightness-110',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', ...rest }) => (
  <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...rest} />
);

export const IconButton: React.FC<ButtonProps & { label: string }> = ({ label, variant = 'ghost', className = '', children, ...rest }) => (
  <button aria-label={label} title={label}
    className={`inline-flex items-center justify-center w-11 h-11 rounded-[var(--ds-radius-sm)] transition-colors ${BUTTON_VARIANTS[variant]} ${className}`} {...rest}>
    {children}
  </button>
);

/* ---------------- Card ---------------- */
type CardVariant = 'default' | 'accent' | 'muted' | 'outline' | 'flat' | 'kinetic';

const CARD_VARIANTS: Record<CardVariant, string> = {
  default: 'bg-[var(--ds-surface)] border border-[var(--ds-border)]',
  accent: 'bg-[var(--ds-surface)] border border-[var(--ds-primary)]',
  muted: 'bg-[var(--ds-muted)] border border-[var(--ds-border-subtle)]',
  outline: 'bg-transparent border-[var(--ds-border-width-default)] border-[var(--ds-border-strong)]',
  flat: 'bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)]',
  kinetic: 'bg-[var(--ds-surface)] border border-[var(--ds-border)] border-l-[var(--ds-border-width-strong)] border-l-[var(--ds-primary)]',
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }> = ({
  variant = 'default', className = '', style, children, ...rest
}) => (
  <div className={`rounded-[var(--ds-radius-md)] p-[var(--ds-pad)] min-w-0 max-w-full ${CARD_VARIANTS[variant]} ${className}`}
    style={{ boxShadow: 'var(--ds-depth-shadow)', ...style }} {...rest}>
    {children}
  </div>
);

/* ---------------- Badge ---------------- */
type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--ds-muted)] text-[var(--ds-body-text)] border border-[var(--ds-border-subtle)]',
  accent: 'bg-[var(--ds-primary)]/10 text-[var(--ds-primary)] border border-[var(--ds-primary)]/30',
  success: 'bg-[var(--ds-success)]/10 text-[var(--ds-success)] border border-[var(--ds-success)]/30',
  warning: 'bg-[var(--ds-warning)]/10 text-[var(--ds-warning)] border border-[var(--ds-warning)]/30',
  danger: 'bg-[var(--ds-danger)]/10 text-[var(--ds-danger)] border border-[var(--ds-danger)]/30',
  info: 'bg-[var(--ds-info)]/10 text-[var(--ds-info)] border border-[var(--ds-info)]/30',
};

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }> = ({
  variant = 'neutral', className = '', children, ...rest
}) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border max-w-full min-w-0 [overflow-wrap:anywhere] ${BADGE_VARIANTS[variant]} ${className}`} {...rest}>
    {children}
  </span>
);

/* ---------------- Typography ---------------- */
type TextLevel = 'display' | 'hero' | 'h1' | 'h2' | 'h3';

const TEXT_CLASS: Record<TextLevel, string> = {
  display: 'ds-display', hero: 'ds-hero', h1: 'ds-h1', h2: 'ds-h2', h3: 'ds-h3',
};
const TEXT_TAG: Record<TextLevel, 'h1' | 'h2' | 'h3' | 'p'> = {
  display: 'h1', hero: 'h1', h1: 'h1', h2: 'h2', h3: 'h3',
};

export const DisplayText: React.FC<{ level?: TextLevel; className?: string; children: React.ReactNode }> = ({
  level = 'h1', className = '', children,
}) => {
  const Tag = TEXT_TAG[level] as 'h1';
  return <Tag className={`${TEXT_CLASS[level]} text-[var(--ds-foreground)] break-words max-w-full ${className}`}>{children}</Tag>;
};

export const Kicker: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <p className={`ds-kicker ${className}`}>{children}</p>
);

export const SectionHeader: React.FC<{ kicker?: string; title: string; action?: React.ReactNode; className?: string }> = ({
  kicker, title, action, className = '',
}) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      {kicker && <Kicker>{kicker}</Kicker>}
      <h2 className="ds-h2 text-[var(--ds-foreground)] truncate">{title}</h2>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const PageHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({
  title, description, actions,
}) => (
  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 max-w-full">
    <div className="min-w-0">
      <h1 className="ds-h1 text-[var(--ds-foreground)] break-words">{title}</h1>
      {description && <p className="ds-body text-[var(--ds-body-text)] mt-1 break-words">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </header>
);

/* ---------------- Divider / Progress ---------------- */
export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <hr className={`border-0 border-t border-[var(--ds-border-subtle)] ${className}`} />
);

export const Progress: React.FC<{ value: number; max?: number; label: string; className?: string }> = ({
  value, max = 100, label, className = '',
}) => (
  <div className={className}>
    <div className="h-2 rounded-full overflow-hidden bg-[var(--ds-muted)]" role="progressbar"
      aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="h-full rounded-full bg-[var(--ds-primary)] transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
    </div>
  </div>
);

/* ---------------- Marquee ---------------- */
interface MarqueeProps {
  speed?: 'slow' | 'medium' | 'fast';
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  label: string;
  className?: string;
  children: React.ReactNode;
}

const MARQUEE_SPEED: Record<string, string> = { slow: '45s', medium: '30s', fast: '18s' };

export const Marquee: React.FC<MarqueeProps> = ({
  speed = 'medium', direction = 'left', pauseOnHover = false, label, className = '', children,
}) => {
  const motion = useEffectiveMotion();
  if (motion === 'none') {
    return <div aria-label={label} className={className}>{children}</div>;
  }
  return (
    <div aria-label={label} role="marquee" data-direction={direction} data-pause-hover={String(pauseOnHover)}
      className={`ds-marquee ${className}`}>
      <div className="ds-marquee-track" style={{ ['--ds-marquee-duration' as string]: MARQUEE_SPEED[speed] }}>
        {children}
        <span aria-hidden="true" className="inline-flex items-center gap-8">{children}</span>
      </div>
    </div>
  );
};

/* ---------------- AnimatedNumber (rAF, reduced-motion aware) ---------------- */
export const AnimatedNumber: React.FC<{ value: number; format?: (n: number) => string; durationMs?: number; className?: string }> = ({
  value, format = (n) => Math.round(n).toString(), durationMs = 600, className = '',
}) => {
  const motion = useEffectiveMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    if (motion === 'none') { setDisplay(value); fromRef.current = value; return; }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      setDisplay(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, motion]);
  return <span className={`tabular-nums ${className}`}>{format(display)}</span>;
};

/* ---------------- Layout primitives ---------------- */
export const Container: React.FC<React.HTMLAttributes<HTMLDivElement> & { wide?: boolean }> = ({
  wide, className = '', children, ...rest
}) => (
  <div className={`${wide ? 'max-w-[1600px]' : 'max-w-3xl'} w-full mx-auto px-4 sm:px-6 ${className}`} {...rest}>
    {children}
  </div>
);

export const Stack: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`flex flex-col gap-[var(--ds-gap)] ${className}`} {...rest}>{children}</div>
);

export const Cluster: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`flex flex-wrap items-center gap-[var(--ds-gap)] ${className}`} {...rest}>{children}</div>
);

export const Section: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className = '', children, ...rest }) => (
  <section className={`flex flex-col gap-[var(--ds-gap)] ${className}`} {...rest}>{children}</section>
);
