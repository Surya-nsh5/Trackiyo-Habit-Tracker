import { create } from 'zustand';
import api from '../services/api';
import type { CoachAction, CoachingMode, CoachMessage } from '../types';
import { useTaskStore } from './useTaskStore';
import { useHabitStore } from './useHabitStore';
import { useFocusStore } from './useFocusStore';

export interface CoachContextSummary {
  pendingTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  completedToday: number;
  recentCompletionRate: number;
  totalHabits: number;
  bestHabit: { name: string; streak: number; rate7: number } | null;
  strugglingHabit: { name: string; misses7: number; rate7: number } | null;
  avgSleep: string | null;
  avgMood: string | null;
  wellnessLoggedToday: boolean;
  focusMinutesToday: number;
  focusMinutesLast7Days: number;
  peakDay: string | null;
  suggestedNextAction: string;
}

export const INITIAL_COACH_MESSAGE: CoachMessage = {
  id: 'msg-initial',
  role: 'assistant',
  content: 'Hello! I am your **Trackiyo AI Coach & Accountability Partner**.\n\nI have loaded your live task priorities, habit streaks, wellness records, and deep work logs.\n\nHow can I help you optimize your momentum right now?',
  timestamp: new Date().toISOString()
};

const COACH_MODE_KEY = 'trackiyo_coach_mode';

function getStoredMode(): CoachingMode {
  try {
    const saved = localStorage.getItem(COACH_MODE_KEY) as CoachingMode;
    if (['balanced', 'strict', 'supportive', 'minimal', 'focus'].includes(saved)) {
      return saved;
    }
  } catch {}
  return 'balanced';
}

interface CoachState {
  sessionId: string | null;
  messages: CoachMessage[];
  mode: CoachingMode;
  contextSummary: CoachContextSummary | null;
  isLoading: boolean;
  isExecutingAction: boolean;
  setMode: (mode: CoachingMode) => void;
  fetchContextSummary: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  executeAction: (msgId: string, actionId: string) => Promise<boolean>;
  cancelAction: (msgId: string, actionId: string) => void;
  loadSession: (sessionId: string) => Promise<void>;
  clearChat: () => void;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  sessionId: null,
  messages: [INITIAL_COACH_MESSAGE],
  mode: getStoredMode(),
  contextSummary: null,
  isLoading: false,
  isExecutingAction: false,

  setMode: (mode: CoachingMode) => {
    try {
      localStorage.setItem(COACH_MODE_KEY, mode);
    } catch {}
    set({ mode });
  },

  fetchContextSummary: async () => {
    try {
      const res = await api.get('/ai/coach/context');
      if (res.data?.summary) {
        set({ contextSummary: res.data.summary });
      }
    } catch (err) {
      console.warn('Could not fetch coach context summary:', err);
    }
  },

  sendMessage: async (content: string) => {
    const userMsg: CoachMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    set((s) => ({ messages: [...s.messages, userMsg], isLoading: true }));

    try {
      const res = await api.post('/ai/coaching', {
        message: content,
        session_id: get().sessionId,
        mode: get().mode
      });

      const returnedMessages = res.data?.messages;
      const reply = res.data?.reply;
      const returnedActions: CoachAction[] = res.data?.actions || [];

      if (Array.isArray(returnedMessages) && returnedMessages.length > 0) {
        // Ensure actions are retained on the last assistant message
        const nextMsgs = [...returnedMessages];
        const lastMsg = nextMsgs[nextMsgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && returnedActions.length > 0) {
          lastMsg.actions = returnedActions;
          lastMsg.mode = get().mode;
        }

        set({
          messages: nextMsgs,
          sessionId: res.data?.session_id || get().sessionId,
          isLoading: false
        });
      } else if (reply) {
        const assistantMsg: CoachMessage = {
          id: `msg-asst-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
          actions: returnedActions.length > 0 ? returnedActions : undefined,
          mode: get().mode
        };

        set((s) => ({
          messages: [...s.messages, assistantMsg],
          sessionId: res.data?.session_id || get().sessionId,
          isLoading: false
        }));
      } else {
        throw new Error('No reply returned');
      }

      // Refresh context summary in the background
      get().fetchContextSummary();
    } catch (err: any) {
      console.warn('Coach request failed:', err?.message || err);

      let userFriendlyError = 'I had trouble connecting to the coaching engine just now. Your Trackiyo data is safe. Please check your connection and try again in a moment.';
      if (err?.response?.status === 401) {
        userFriendlyError = 'Your session has expired. Please sign in again to continue your coaching session.';
      }

      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: `msg-err-${Date.now()}`,
            role: 'assistant',
            content: userFriendlyError,
            timestamp: new Date().toISOString()
          }
        ],
        isLoading: false
      }));
    }
  },

  executeAction: async (msgId: string, actionId: string) => {
    const { messages } = get();
    let targetAction: CoachAction | null = null;

    // Find the message and action
    for (const msg of messages) {
      if (msg.id === msgId || (!msg.id && msg.role === 'assistant')) {
        const found = msg.actions?.find((a) => a.id === actionId);
        if (found) {
          targetAction = found;
          break;
        }
      }
    }

    if (!targetAction || targetAction.status === 'applied') return false;

    set({ isExecutingAction: true });

    try {
      // Execute on server
      const res = await api.post('/ai/coach/action', {
        type: targetAction.type,
        payload: targetAction.payload
      });

      if (res.data?.success) {
        // Mark action as applied in local state
        set((s) => ({
          messages: s.messages.map((m) => {
            if (m.actions) {
              return {
                ...m,
                actions: m.actions.map((a) => (a.id === actionId ? { ...a, status: 'applied' } : a))
              };
            }
            return m;
          }),
          isExecutingAction: false
        }));

        // Refresh relevant app data stores
        if (['create_task', 'reschedule_task', 'complete_task', 'breakdown_goal'].includes(targetAction.type)) {
          useTaskStore.getState().fetchTasks();
        }
        if (targetAction.type === 'create_habit') {
          useHabitStore.getState().loadData();
        }

        // If focus session action, dispatch navigation to Focus view
        if (targetAction.type === 'start_focus') {
          const focusPayload = targetAction.payload;
          if (focusPayload?.task_id) {
            useFocusStore.getState().setActiveTask(focusPayload.task_id);
          }
          if (focusPayload?.duration) {
            useFocusStore.getState().setSessionType('pomodoro');
          }
          window.dispatchEvent(new CustomEvent('trackiyo:navigate', { detail: { tab: 'FOCUS' } }));
        }

        // Refresh coach context
        get().fetchContextSummary();
        return true;
      } else {
        throw new Error(res.data?.error || 'Failed to apply action');
      }
    } catch (err) {
      console.error('Failed to execute coach action:', err);
      set({ isExecutingAction: false });
      return false;
    }
  },

  cancelAction: (msgId: string, actionId: string) => {
    set((s) => ({
      messages: s.messages.map((m) => {
        if ((m.id === msgId || (!m.id && m.role === 'assistant')) && m.actions) {
          return {
            ...m,
            actions: m.actions.map((a) => (a.id === actionId ? { ...a, status: 'cancelled' } : a))
          };
        }
        return m;
      })
    }));
  },

  loadSession: async (sessionId: string) => {
    try {
      const res = await api.get(`/ai/coaching/${sessionId}`);
      if (res.data?.messages && res.data.messages.length > 0) {
        set({ sessionId, messages: res.data.messages });
      }
    } catch {}
  },

  clearChat: () => {
    set({
      sessionId: null,
      messages: [INITIAL_COACH_MESSAGE]
    });
  }
}));
