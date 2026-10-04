import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Design system context and hooks for presentation configuration (Layer A):
 * motion level, density, typography intensity, and depth mode.
 */

export type DSMotion = 'none' | 'subtle' | 'standard' | 'kinetic';
export type DSDensity = 'compact' | 'comfortable' | 'spacious';
export type DSIntensity = 'minimal' | 'balanced' | 'bold' | 'kinetic';
export type DSDepth = 'flat' | 'hard-shadow' | 'soft-shadow';

export interface DSConfig {
  motion: DSMotion;
  density: DSDensity;
  intensity: DSIntensity;
  depth: DSDepth;
}

export const DEFAULTS: DSConfig = {
  motion: 'standard',
  density: 'comfortable',
  intensity: 'balanced',
  depth: 'flat',
};

export const DSContext = createContext<DSConfig>(DEFAULTS);

export function useDS(): DSConfig {
  return useContext(DSContext);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Effective motion: OS reduced-motion always wins (forces 'none'). */
export function useEffectiveMotion(): DSMotion {
  const { motion } = useDS();
  const reduced = usePrefersReducedMotion();
  return reduced ? 'none' : motion;
}
