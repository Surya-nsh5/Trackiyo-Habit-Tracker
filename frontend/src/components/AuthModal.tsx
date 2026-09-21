import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { AuthScreen } from './AuthScreen';

/**
 * Login / signup popup over the landing page.
 * Reuses AuthScreen's card and logic; adds backdrop dismiss,
 * Escape-to-close, and background scroll lock. No routing changes.
 */
export const AuthModal: React.FC = () => {
  const { resetOnboarding } = useAuthStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetOnboarding();
    };
    document.addEventListener('keydown', onKeyDown);
    // Lock background scroll without shifting layout: compensate for the
    // disappearing scrollbar so the page doesn't jump when the popup opens.
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [resetOnboarding]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Log in or sign up"
    >
      <button
        type="button"
        aria-label="Close login dialog"
        onClick={resetOnboarding}
        className="fixed inset-0 bg-black/60 cursor-default"
      />
      <div className="relative min-h-full flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[420px]">
          <AuthScreen modal />
        </div>
      </div>
    </div>
  );
};
