import { create } from 'zustand';
import { useTaskStore } from './useTaskStore';
import { useHabitStore } from './useHabitStore';
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
}

const READ_KEY = 'trackiyo_read_notifications';
const DISMISSED_KEY = 'trackiyo_dismissed_notifications';

// Stored as "notifId:YYYY-MM-DD" so a cleared alert stays gone for the day
// but can legitimately return tomorrow if the condition is still true.
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
    // Prune entries older than 7 days to bound growth
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

  markAllAsRead: () => {
    const todayStr = getLocalTodayStr();
    const read = loadKeyedSet(READ_KEY);
    get().notifications.forEach(n => read.add(`${n.id}:${todayStr}`));
    saveKeyedSet(READ_KEY, read);
    // Read notifications disappear immediately — they don't come back
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
    const todayStr = getLocalTodayStr();
    const tasks = useTaskStore.getState().tasks;
    const { habits, habitLogs, wellnessLogs } = useHabitStore.getState();

    const notifs: AppNotification[] = [];

    // Overdue tasks
    const overdue = tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr);
    if (overdue.length > 0) {
      notifs.push({
        id: 'notif-overdue',
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
    if (pendingHabits.length > 0) {
      notifs.push({
        id: 'notif-habits',
        type: 'habit',
        title: 'Daily Habits Pending',
        message: `You have ${pendingHabits.length} habit(s) to check off today.`,
        timestamp: todayStr,
        read: false,
        linkTab: 'GRID'
      });
    }

    // Wellness check-in
    if (!wellnessLogs[todayStr]?.mood && !wellnessLogs[todayStr]?.sleep) {
      notifs.push({
        id: 'notif-wellness',
        type: 'wellness',
        title: 'Daily Wellness Check-in',
        message: 'Take 30 seconds to log your mood, energy, and sleep.',
        timestamp: todayStr,
        read: false,
        linkTab: 'WELLNESS'
      });
    }

    // Drop anything already read today or explicitly dismissed —
    // once cleared, an alert never reappears (until a new day, for reads)
    const read = loadKeyedSet(READ_KEY);
    const dismissed = loadKeyedSet(DISMISSED_KEY);
    const visible = notifs.filter(
      n => !dismissed.has(n.id) && !read.has(`${n.id}:${todayStr}`)
    );

    set({ notifications: visible });
  }
}));
