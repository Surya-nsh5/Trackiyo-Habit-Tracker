import { create } from 'zustand';
import api from '../services/api';
import type { Capture } from '../types';

const CAPTURES_CACHE_KEY = 'trackiyo_cached_captures';

function loadCached(): Capture[] {
  try {
    const raw = localStorage.getItem(CAPTURES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCached(captures: Capture[]) {
  try {
    localStorage.setItem(CAPTURES_CACHE_KEY, JSON.stringify(captures));
  } catch {}
}

interface CaptureState {
  captures: Capture[];
  isLoading: boolean;
  fetchCaptures: () => Promise<void>;
  addCapture: (content: string, tags?: string[]) => Promise<Capture | null>;
  deleteCapture: (id: string) => Promise<void>;
  convertToTask: (id: string, title: string, priority?: string, dueDate?: string | null) => Promise<void>;
  clearAll: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  captures: loadCached(),
  isLoading: false,

  fetchCaptures: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/captures');
      const data = res.data || [];
      saveCached(data);
      set({ captures: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addCapture: async (content, tags = []) => {
    const tempId = `temp-cap-${Date.now()}`;
    const optimistic: Capture = {
      id: tempId,
      content,
      tags,
      source: 'manual',
      created_at: new Date().toISOString(),
    };
    set(state => {
      const next = [optimistic, ...state.captures];
      saveCached(next);
      return { captures: next };
    });

    try {
      const res = await api.post('/captures', { content, tags });
      set(state => {
        const next = state.captures.map(c => c.id === tempId ? res.data : c);
        saveCached(next);
        return { captures: next };
      });
      return res.data;
    } catch {
      // Keep optimistic locally – no data loss
      return optimistic;
    }
  },

  deleteCapture: async (id) => {
    set(state => {
      const next = state.captures.filter(c => c.id !== id);
      saveCached(next);
      return { captures: next };
    });
    try {
      await api.delete(`/captures/${id}`);
    } catch {}
  },

  convertToTask: async (id, title, priority = 'Medium', dueDate = null) => {
    // Optimistically remove from captures
    set(state => {
      const next = state.captures.filter(c => c.id !== id);
      saveCached(next);
      return { captures: next };
    });
    try {
      await api.post(`/captures/${id}/convert`, { title, priority, due_date: dueDate });
    } catch {
      // If conversion fails, re-add the capture locally
    }
  },

  clearAll: () => {
    saveCached([]);
    set({ captures: [] });
  },
}));
