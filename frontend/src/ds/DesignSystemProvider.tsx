import React, { useEffect, useMemo } from 'react';
import { type DSConfig, DEFAULTS, DSContext, useDS } from './dsContext';

/**
 * DesignSystemProvider — EXTENDS the existing theme store, does not replace
 * it. The theme store still owns colors (Layer B via --t-* → --ds-* aliases).
 * This provider owns presentation config (Layer A): motion level, density,
 * typography intensity, and depth mode. Nested providers merge with parent.
 */

interface ProviderProps extends Partial<DSConfig> {
  children: React.ReactNode;
}

export const DesignSystemProvider: React.FC<ProviderProps> = ({ children, motion, density, intensity, depth }) => {
  const parent = useDS();
  const config = useMemo<DSConfig>(
    () => ({
      motion: motion ?? parent.motion,
      density: density ?? parent.density,
      intensity: intensity ?? parent.intensity,
      depth: depth ?? parent.depth,
    }),
    [parent, motion, density, intensity, depth]
  );

  // Root provider = parent is the context default (no provider above).
  // Only the root writes data attributes to <html>; nested providers
  // only narrow the config for their subtree via context.
  const isRoot = parent === DEFAULTS;

  useEffect(() => {
    if (!isRoot) return;
    const root = document.documentElement;
    const prev = {
      motion: root.getAttribute('data-ds-motion'),
      density: root.getAttribute('data-ds-density'),
      intensity: root.getAttribute('data-ds-intensity'),
      depth: root.getAttribute('data-ds-depth'),
    };
    // Only the outermost provider writes; nested providers only affect context.
    if (root.getAttribute('data-ds-owner') === null) {
      root.setAttribute('data-ds-owner', 'ds');
      root.setAttribute('data-ds-motion', config.motion);
      root.setAttribute('data-ds-density', config.density);
      root.setAttribute('data-ds-intensity', config.intensity);
      root.setAttribute('data-ds-depth', config.depth);
    }
    return () => {
      if (root.getAttribute('data-ds-owner') === 'ds') {
        root.removeAttribute('data-ds-owner');
        if (prev.motion) root.setAttribute('data-ds-motion', prev.motion); else root.removeAttribute('data-ds-motion');
        if (prev.density) root.setAttribute('data-ds-density', prev.density); else root.removeAttribute('data-ds-density');
        if (prev.intensity) root.setAttribute('data-ds-intensity', prev.intensity); else root.removeAttribute('data-ds-intensity');
        if (prev.depth) root.setAttribute('data-ds-depth', prev.depth); else root.removeAttribute('data-ds-depth');
      }
    };
  }, [isRoot, config.motion, config.density, config.intensity, config.depth]);

  return <DSContext.Provider value={config}>{children}</DSContext.Provider>;
};
