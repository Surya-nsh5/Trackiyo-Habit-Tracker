import { create } from 'zustand';
import { useTaskStore } from './useTaskStore';
import { useHabitStore } from './useHabitStore';
import { useAuthStore } from './useAuthStore';
import { getLocalTodayStr } from '../utils/dailyTracking';

export interface AppNotification {
  id: string;
  type: 'task' | 'habit' | 'wellness' | 'milestone';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => Promise<void> | void;
  refreshNotifications: () => void;
  reset: () => void;
}

const READ_KEY = 'trackiyo_read_notifications';
const DISMISSED_KEY = 'trackiyo_dismissed_notifications';

function loadKeyedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveKeyedSet(key: string, set: Set<string>) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const fresh = [...set].filter(entry => {
      const day = entry.split(':').pop() || '';
      return day >= cutoffStr;
    });
    localStorage.setItem(key, JSON.stringify(fresh));
  } catch {}
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isOpen: false,

  setIsOpen: (open) => set({ isOpen: open }),

  reset: () => {
    try {
      localStorage.removeItem(READ_KEY);
      localStorage.removeItem(DISMISSED_KEY);
    } catch {}
    set({ notifications: [], isOpen: false });
  },

  markAllAsRead: () => {
    const todayStr = getLocalTodayStr();
    const read = loadKeyedSet(READ_KEY);
    get().notifications.forEach(n => read.add(`${n.id}:${todayStr}`));
    saveKeyedSet(READ_KEY, read);
    set({ notifications: [] });
  },

  dismissNotification: (id) => {
    const dismissed = loadKeyedSet(DISMISSED_KEY);
    dismissed.add(id);
    saveKeyedSet(DISMISSED_KEY, dismissed);
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  refreshNotifications: () => {
    // 1. Must be authenticated to evaluate user notifications
    const isAuth = useAuthStore.getState().isAuthenticated;
    if (!isAuth) {
      set({ notifications: [] });
      return;
    }

    const todayStr = getLocalTodayStr();
    const taskStore = useTaskStore.getState();
    const habitStore = useHabitStore.getState();

    // 2. Do NOT evaluate notifications while initial store hydration is loading
    if (taskStore.isLoading || habitStore.isLoading) {
      return;
    }

    const tasks = taskStore.tasks || [];
    const { habits = [], habitLogs = {}, wellnessLogs = {} } = habitStore;

    const notifs: AppNotification[] = [];

    // Overdue tasks
    const overdue = tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr);
    if (overdue.length > 0) {
      notifs.push({
        id: `notif-overdue-${todayStr}`,
        type: 'task',
        title: `${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}`,
        message: `Task "${overdue[0].title}" requires your attention.`,
        timestamp: todayStr,
        read: false,
        linkTab: 'TASKS'
      });
    }

    // Pending habits
    const pendingHabits = habits.filter(h => habitLogs[`${h.id}_${todayStr}`] !== true);
    if (habits.length > 0 && pendingHabits.length > 0) {
      notifs.push({
        id: `notif-habits-${todayStr}`,
        type: 'habit',
        title: 'Daily Habits Pending',
        message: `You have ${pendingHabits.length} habit(s) to check off today.`,
        timestamp: todayStr,
        read: false,
        linkTab: 'GRID'
      });
    }

    // Wellness check-in — only if wellness logs have loaded and user hasn't logged mood/sleep
    const hasWellnessLog = Boolean(wellnessLogs[todayStr]?.mood || wellnessLogs[todayStr]?.sleep);
    const ObjectHasLogs = Object.keys(wellnessLogs).length > 0 || habitStore.lastFetched !== null;
    if (ObjectHasLogs && !hasWellnessLog) {
      notifs.push({
        id: `notif-wellness-${todayStr}`,
        type: 'wellness',
        title: 'Daily Wellness Check-in',
        message: 'Take 30 seconds to log your mood, energy, and sleep.',
        timestamp: todayStr,
        read: false,
        linkTab: 'WELLNESS'
      });
    }

    const read = loadKeyedSet(READ_KEY);
    const dismissed = loadKeyedSet(DISMISSED_KEY);
    const visible = notifs.filter(
      n => !dismissed.has(n.id) && !read.has(`${n.id}:${todayStr}`)
    );

    set({ notifications: visible });
  }
}));
