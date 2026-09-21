import type { Habit, HabitLog } from '../types';

/**
 * Centralized daily-tracking utilities.
 *
 * Single source of truth for everything date-related:
 * - Local-timezone `YYYY-MM-DD` identifiers (never UTC display strings).
 * - Past / today / future classification driving read-only locking.
 * - Streaks + completion aggregates derived from actual stored records.
 */

export type DateStatus = 'past' | 'today' | 'future';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateStr = (s: string): boolean => DATE_RE.test(s || '');

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Parse `YYYY-MM-DD` as a LOCAL date (no UTC shifting). */
export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Format a Date as local `YYYY-MM-DD`. */
export function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Today's date in the user's local timezone. */
export function getLocalTodayStr(now: Date = new Date()): string {
  return formatDateStr(now);
}

/** Add (or subtract) whole days to a `YYYY-MM-DD` string, staying in local time. */
export function addDaysStr(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

/** Whole-day difference: `b - a` in days (both `YYYY-MM-DD`). */
export function diffDaysStr(a: string, b: string): number {
  return Math.round((parseDateStr(b).getTime() - parseDateStr(a).getTime()) / 86400000);
}

/**
 * Classify a date against today. The date itself is the source of truth —
 * no separate `isLocked` boolean is stored anywhere.
 */
export function getDateStatus(dateStr: string, todayStr: string): DateStatus {
  if (dateStr < todayStr) return 'past';
  if (dateStr > todayStr) return 'future';
  return 'today';
}

/** Only today's records are interactive. Past is read-only, future is upcoming. */
export function isEditableDate(dateStr: string, todayStr: string): boolean {
  return dateStr === todayStr;
}

/**
 * Local creation date of a habit (`YYYY-MM-DD`).
 * Habits without a timestamp are treated as always applicable.
 */
export function getHabitCreationDateStr(habit: Habit): string {
  if (!habit.created_at) return '1970-01-01';
  const d = new Date(habit.created_at);
  if (Number.isNaN(d.getTime())) return '1970-01-01';
  return formatDateStr(d);
}

/**
 * A habit only applies on/after its creation date — new habits never
 * backfill previous dates as completed or pending.
 */
export function isHabitApplicableOn(habit: Habit, dateStr: string): boolean {
  return getHabitCreationDateStr(habit) <= dateStr;
}

export interface DayCompletion {
  done: number;
  total: number;
  /** Null = no applicable habits (no data), distinct from 0% completed. */
  percent: number | null;
}

/** Completion for one date across all habits applicable that day. */
export function getDayCompletion(
  dateStr: string,
  habits: Habit[],
  habitLogs: HabitLog
): DayCompletion {
  const applicable = habits.filter((h) => isHabitApplicableOn(h, dateStr));
  const total = applicable.length;
  if (total === 0) return { done: 0, total: 0, percent: null };
  const done = applicable.filter((h) => habitLogs[`${h.id}_${dateStr}`] === true).length;
  return { done, total, percent: Math.round((done / total) * 100) };
}

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * Deterministic streaks from actual consecutive daily records.
 * - Current: consecutive completed days ending today (or yesterday when
 *   today is still pending), never reaching before the creation date.
 * - Longest: best consecutive run since creation.
 * Historical days are immutable, so streaks cannot be manipulated.
 */
export function computeStreaks(
  habitId: string,
  habitLogs: HabitLog,
  creationDateStr: string,
  todayStr: string
): Streaks {
  const isDone = (ds: string): boolean => habitLogs[`${habitId}_${ds}`] === true;

  let cursor = todayStr;
  if (!isDone(cursor)) cursor = addDaysStr(cursor, -1);

  let current = 0;
  while (cursor >= creationDateStr && isDone(cursor)) {
    current += 1;
    cursor = addDaysStr(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let day = creationDateStr;
  while (day <= todayStr) {
    if (isDone(day)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
    day = addDaysStr(day, 1);
  }

  return { current, longest };
}

/**
 * Days of `monthId` (`YYYY-MM`) on which the habit applies and which are
 * not in the future — the honest denominator for monthly percentages.
 */
export function getApplicableDaysInMonth(
  habit: Habit,
  monthId: string,
  todayStr: string
): string[] {
  const [y, m] = monthId.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthStart = `${monthId}-01`;
  const monthEnd = `${monthId}-${pad2(daysInMonth)}`;
  const start = getHabitCreationDateStr(habit) > monthStart
    ? getHabitCreationDateStr(habit)
    : monthStart;
  const end = todayStr < monthEnd ? todayStr : monthEnd;

  const days: string[] = [];
  let day = start;
  while (day <= end) {
    days.push(day);
    day = addDaysStr(day, 1);
  }
  return days;
}

export interface WeekDay {
  dateStr: string;
  dayNum: string;
  weekday: string; // Mon..Sun
  status: DateStatus;
}

/** Monday-first week dates for a week offset (0 = week containing today). */
export function getWeekDates(weekOffset: number, todayStr: string): WeekDay[] {
  const today = parseDateStr(todayStr);
  const mondayDelta = -((today.getDay() + 6) % 7);
  const monday = addDaysStr(todayStr, mondayDelta + weekOffset * 7);
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDaysStr(monday, i);
    return {
      dateStr,
      dayNum: String(parseDateStr(dateStr).getDate()),
      weekday: names[i],
      status: getDateStatus(dateStr, todayStr),
    };
  });
}

/** Human week range label, e.g. "SEP 21 – 27, 2026". */
export function getWeekRangeLabel(weekOffset: number, todayStr: string): string {
  const days = getWeekDates(weekOffset, todayStr);
  const fmt = (ds: string): string => {
    const d = parseDateStr(ds);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  };
  const year = parseDateStr(days[6].dateStr).getFullYear();
  const first = fmt(days[0].dateStr);
  const last = fmt(days[6].dateStr);
  return `${first} – ${last}, ${year}`;
}

/** Full display label for a date, e.g. "SEPTEMBER 20, 2026". */
export function formatDateDisplay(dateStr: string): string {
  return parseDateStr(dateStr)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}
