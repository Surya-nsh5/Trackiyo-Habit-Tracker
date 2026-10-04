import { create } from 'zustand';
import api from '../services/api';
import type { Distraction } from '../types';

interface DistractionState {
  distractions: Distraction[];
  isLoading: boolean;
  fetchDistractions: (focusSessionId?: string) => Promise<void>;
  logDistraction: (reason: string, focusSessionId?: string | null) => Promise<void>;
}

export const useDistractionStore = create<DistractionState>((set) => ({
  distractions: [],
  isLoading: false,

  fetchDistractions: async (focusSessionId) => {
    set({ isLoading: true });
    try {
      const res = await api.get('/distractions', { params: focusSessionId ? { focus_session_id: focusSessionId } : {} });
      set({ distractions: res.data || [], isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  logDistraction: async (reason, focusSessionId = null) => {
    const optimistic: Distraction = { id: `temp-${Date.now()}`, reason, focus_session_id: focusSessionId, logged_at: new Date().toISOString() };
    set((s) => ({ distractions: [optimistic, ...s.distractions] }));
    try {
      const res = await api.post('/distractions', { reason, focus_session_id: focusSessionId });
      set((s) => ({ distractions: s.distractions.map(d => d.id === optimistic.id ? res.data : d) }));
    } catch { /* keep optimistic */ }
  },
}));
