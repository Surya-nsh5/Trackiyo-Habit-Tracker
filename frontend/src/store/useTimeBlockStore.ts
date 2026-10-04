import { create } from 'zustand';
import api from '../services/api';
import type { TimeBlock } from '../types';

const CACHE_KEY = 'trackiyo_cached_time_blocks';

function loadCached(): TimeBlock[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCached(blocks: TimeBlock[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(blocks));
  } catch {}
}

interface TimeBlockState {
  blocks: TimeBlock[];
  isLoading: boolean;
  fetchBlocks: (date?: string) => Promise<void>;
  addBlock: (block: Omit<TimeBlock, 'id' | 'created_at'>) => Promise<TimeBlock | null>;
  updateBlock: (id: string, data: Partial<TimeBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
}

export const useTimeBlockStore = create<TimeBlockState>((set) => ({
  blocks: loadCached(),
  isLoading: false,

  fetchBlocks: async (date) => {
    set({ isLoading: true });
    try {
      const params = date ? `?date=${date}` : '';
      const res = await api.get(`/time-blocks${params}`);
      const data = res.data || [];
      saveCached(data);
      set({ blocks: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addBlock: async (blockData) => {
    const tempId = `temp-tb-${Date.now()}`;
    const optimistic: TimeBlock = { id: tempId, ...blockData };
    set(state => {
      const next = [...state.blocks, optimistic].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      saveCached(next);
      return { blocks: next };
    });

    try {
      const res = await api.post('/time-blocks', blockData);
      set(state => {
        const next = state.blocks.map(b => b.id === tempId ? res.data : b);
        saveCached(next);
        return { blocks: next };
      });
      return res.data;
    } catch {
      return optimistic;
    }
  },

  updateBlock: async (id, data) => {
    set(state => {
      const next = state.blocks.map(b => b.id === id ? { ...b, ...data } : b);
      saveCached(next);
      return { blocks: next };
    });
    try {
      await api.put(`/time-blocks/${id}`, data);
    } catch {}
  },

  deleteBlock: async (id) => {
    set(state => {
      const next = state.blocks.filter(b => b.id !== id);
      saveCached(next);
      return { blocks: next };
    });
    try {
      await api.delete(`/time-blocks/${id}`);
    } catch {}
  },
}));
