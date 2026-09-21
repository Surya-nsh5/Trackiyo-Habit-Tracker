export interface Habit {
  id: string;
  name: string;
  icon: string;
  monthly_goal: number;
  order_index?: number;
  created_at?: string;
}

// Key format for HabitLog: `${habitId}_${year}-${month}-${day}` (e.g. 'h1_2026-06-01')
export type HabitLog = Record<string, boolean>;

export interface WellnessData {
  mood: number | null;
  sleep: number | null;
}

// Key format for WellnessLog: `${year}-${month}-${day}`
export type WellnessLog = Record<string, WellnessData>;

export interface MonthData {
  year: number;
  month: number; // 0-11
  habitLogs: HabitLog;
  wellnessLogs: WellnessLog;
}
