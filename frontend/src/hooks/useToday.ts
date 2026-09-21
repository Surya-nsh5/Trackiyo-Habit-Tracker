import { useCallback, useEffect, useState } from 'react';
import { getLocalTodayStr } from '../utils/dailyTracking';

/**
 * Reactive local-today string (`YYYY-MM-DD`).
 * Refreshes automatically at local midnight and whenever the app
 * regains visibility/focus, so day locking never goes stale while
 * the app is open across a day boundary.
 */
export function useToday(): string {
  const [today, setToday] = useState<string>(() => getLocalTodayStr());

  const refresh = useCallback(() => {
    setToday((prev) => {
      const next = getLocalTodayStr();
      return next === prev ? prev : next;
    });
  }, []);

  useEffect(() => {
    refresh();

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 5, 0);
    const msUntilMidnight = Math.max(nextMidnight.getTime() - now.getTime(), 1000);
    const timer = window.setTimeout(() => refresh(), msUntilMidnight);

    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  // Re-arm the midnight timer after each rollover.
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 5, 0);
    const msUntilMidnight = Math.max(nextMidnight.getTime() - now.getTime(), 1000);
    const timer = window.setTimeout(() => refresh(), msUntilMidnight);
    return () => window.clearTimeout(timer);
  }, [today, refresh]);

  return today;
}
