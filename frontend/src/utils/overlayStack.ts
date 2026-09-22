import { useEffect } from 'react';

/**
 * Registry of "close the topmost overlay" callbacks (modals, dropdowns,
 * popups). The Android back button consults it first so Back dismisses
 * UI instead of killing the app. Web behavior is untouched.
 */

type Closer = () => void;

const stack: Closer[] = [];

export function pushOverlayCloser(fn: Closer): () => void {
  stack.push(fn);
  return () => {
    const i = stack.indexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Run and remove the topmost overlay closer. Returns true if one ran. */
export function closeTopOverlay(): boolean {
  const fn = stack.pop();
  if (!fn) return false;
  try {
    fn();
  } catch {
    /* a broken closer must never break Back */
  }
  return true;
}

/** Register `onClose` while `open` is true (unregisters automatically). */
export function useOverlayClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    return pushOverlayCloser(onClose);
  }, [open, onClose]);
}
