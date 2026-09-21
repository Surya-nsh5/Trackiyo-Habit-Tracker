import type { Habit, HabitLog, WellnessLog } from '../types';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const HABITS_KEY_PREFIX = 'ht_habits_';
const HABIT_LOGS_KEY = 'ht_habit_logs_';
const WELLNESS_LOGS_KEY = 'ht_wellness_logs_';

const DEFAULT_HABITS: Habit[] = [];

export const DataService = {
  // monthId format: 'YYYY-MM'
  async getHabits(monthId: string): Promise<Habit[]> {
    await delay(50);
    const data = localStorage.getItem(`${HABITS_KEY_PREFIX}${monthId}`);
    if (!data) {
      localStorage.setItem(`${HABITS_KEY_PREFIX}${monthId}`, JSON.stringify(DEFAULT_HABITS));
      return DEFAULT_HABITS;
    }
    return JSON.parse(data);
  },

  async saveHabits(monthId: string, habits: Habit[]): Promise<void> {
    localStorage.setItem(`${HABITS_KEY_PREFIX}${monthId}`, JSON.stringify(habits));
  },

  async getHabitLogs(monthId: string): Promise<HabitLog> {
    await delay(50);
    const data = localStorage.getItem(`${HABIT_LOGS_KEY}${monthId}`);
    return data ? JSON.parse(data) : {};
  },

  async saveHabitLogs(monthId: string, logs: HabitLog): Promise<void> {
    localStorage.setItem(`${HABIT_LOGS_KEY}${monthId}`, JSON.stringify(logs));
  },

  async getWellnessLogs(monthId: string): Promise<WellnessLog> {
    await delay(50);
    const data = localStorage.getItem(`${WELLNESS_LOGS_KEY}${monthId}`);
    return data ? JSON.parse(data) : {};
  },

  async saveWellnessLogs(monthId: string, logs: WellnessLog): Promise<void> {
    localStorage.setItem(`${WELLNESS_LOGS_KEY}${monthId}`, JSON.stringify(logs));
  },
};
