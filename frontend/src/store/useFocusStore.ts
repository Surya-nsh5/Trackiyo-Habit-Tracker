import { create } from 'zustand';
import api from '../services/api';
import type { FocusSession, FocusSessionType } from '../types';
import { useTaskStore } from './useTaskStore';

const FOCUS_SESSIONS_CACHE_KEY = 'trackiyo_cached_focus_sessions';

function loadCachedSessions(): FocusSession[] {
  try {
    const raw = localStorage.getItem(FOCUS_SESSIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedSessions(sessions: FocusSession[]) {
  try {
    localStorage.setItem(FOCUS_SESSIONS_CACHE_KEY, JSON.stringify(sessions));
  } catch {}
}

const DEFAULT_DURATIONS: Record<FocusSessionType, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  custom: 30 * 60,
  stopwatch: 0
};

interface FocusState {
  sessionType: FocusSessionType;
  timeLeft: number; // in seconds
  initialDuration: number;
  isRunning: boolean;
  activeTaskId: string | null;
  sessions: FocusSession[];
  todayTotalMinutes: number;

  setSessionType: (type: FocusSessionType, customMinutes?: number) => void;
  setActiveTask: (taskId: string | null) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  completeSession: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  fetchTodayStats: () => Promise<void>;
}

// Audio chime using Web Audio API (zero external assets needed)
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // AudioContext blocked or not supported
  }
}

export const useFocusStore = create<FocusState>((set, get) => ({
  sessionType: 'pomodoro',
  timeLeft: DEFAULT_DURATIONS.pomodoro,
  initialDuration: DEFAULT_DURATIONS.pomodoro,
  isRunning: false,
  activeTaskId: null,
  sessions: loadCachedSessions(),
  todayTotalMinutes: 0,

  setSessionType: (type, customMinutes) => {
    const dur = customMinutes ? customMinutes * 60 : DEFAULT_DURATIONS[type];
    set({
      sessionType: type,
      initialDuration: dur,
      timeLeft: dur,
      isRunning: false
    });
  },

  setActiveTask: (taskId) => set({ activeTaskId: taskId }),

  startTimer: () => set({ isRunning: true }),
  pauseTimer: () => set({ isRunning: false }),

  resetTimer: () => {
    const { initialDuration, sessionType } = get();
    set({
      isRunning: false,
      timeLeft: sessionType === 'stopwatch' ? 0 : initialDuration
    });
  },

  tick: () => {
    const { isRunning, timeLeft, sessionType } = get();
    if (!isRunning) return;

    if (sessionType === 'stopwatch') {
      set({ timeLeft: timeLeft + 1 });
      return;
    }

    if (timeLeft <= 1) {
      playChime();
      if (get().activeTaskId) {
        get().completeSession();
      } else {
        get().resetTimer();
      }
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  completeSession: async () => {
    const { sessionType, initialDuration, timeLeft, activeTaskId, sessions } = get();
    if (!activeTaskId) {
      return;
    }
    set({ isRunning: false });

    const elapsedSeconds = sessionType === 'stopwatch' ? timeLeft : initialDuration - timeLeft;
    if (elapsedSeconds < 10) {
      get().resetTimer();
      return;
    }

    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    const newSession: FocusSession = {
      id: `f-${Date.now()}`,
      task_id: activeTaskId,
      duration: elapsedSeconds,
      session_type: sessionType,
      completed_at: new Date().toISOString()
    };

    const nextSessions = [newSession, ...sessions];
    saveCachedSessions(nextSessions);
    set({
      sessions: nextSessions,
      timeLeft: initialDuration,
      todayTotalMinutes: get().todayTotalMinutes + elapsedMinutes
    });

    // Update actual duration on task if linked
    if (activeTaskId) {
      const taskStore = useTaskStore.getState();
      const task = taskStore.tasks.find(t => t.id === activeTaskId);
      if (task) {
        taskStore.updateTask(activeTaskId, {
          actual_duration: (task.actual_duration || 0) + elapsedMinutes
        });
      }
    }

    try {
      await api.post('/focus', {
        duration: elapsedSeconds,
        task_id: activeTaskId,
        session_type: sessionType
      });
    } catch (err) {
      console.warn('Focus session saved locally', err);
    }
  },

  fetchSessions: async () => {
    try {
      const res = await api.get('/focus');
      if (Array.isArray(res.data)) {
        saveCachedSessions(res.data);
        const todayStr = new Date().toISOString().split('T')[0];
        let todayMins = 0;
        res.data.forEach((s: FocusSession) => {
          if (s.completed_at && s.completed_at.startsWith(todayStr)) {
            todayMins += Math.round((s.duration || 0) / 60);
          }
        });
        set({ sessions: res.data, todayTotalMinutes: todayMins });
      }
    } catch (err) {
      console.warn('Using cached focus sessions', err);
    }
  },

  fetchTodayStats: async () => {
    await get().fetchSessions();
  }
}));
