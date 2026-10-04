import { create } from 'zustand';
import api from '../services/api';
import type { HabitStack } from '../types';

const CACHE_KEY = 'trackiyo_cached_habit_stacks';

function loadCached(): HabitStack[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCached(stacks: HabitStack[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stacks));
  } catch {}
}

interface HabitStackState {
  stacks: HabitStack[];
  isLoading: boolean;
  fetchStacks: () => Promise<void>;
  addStack: (stack: Omit<HabitStack, 'id' | 'created_at' | 'updated_at'>) => Promise<HabitStack | null>;
  updateStack: (id: string, data: Partial<HabitStack>) => Promise<void>;
  deleteStack: (id: string) => Promise<void>;
}

export const useHabitStackStore = create<HabitStackState>((set) => ({
  stacks: loadCached(),
  isLoading: false,

  fetchStacks: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/habit-stacks');
      const data = res.data || [];
      saveCached(data);
      set({ stacks: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addStack: async (stackData) => {
    const tempId = `temp-hs-${Date.now()}`;
    const optimistic: HabitStack = {
      id: tempId,
      ...stackData,
      created_at: new Date().toISOString(),
    };
    set(state => {
      const next = [optimistic, ...state.stacks];
      saveCached(next);
      return { stacks: next };
    });

    try {
      const res = await api.post('/habit-stacks', stackData);
      set(state => {
        const next = state.stacks.map(s => s.id === tempId ? res.data : s);
        saveCached(next);
        return { stacks: next };
      });
      return res.data;
    } catch {
      return optimistic;
    }
  },

  updateStack: async (id, data) => {
    set(state => {
      const next = state.stacks.map(s => s.id === id ? { ...s, ...data } : s);
      saveCached(next);
      return { stacks: next };
    });
    try {
      await api.put(`/habit-stacks/${id}`, data);
    } catch {}
  },

  deleteStack: async (id) => {
    set(state => {
      const next = state.stacks.filter(s => s.id !== id);
      saveCached(next);
      return { stacks: next };
    });
    try {
      await api.delete(`/habit-stacks/${id}`);
    } catch {}
  },
}));
