import { create } from 'zustand';
import api from '../services/api';
import type { JournalEntry } from '../types';
import { getLocalTodayStr } from '../utils/dailyTracking';

const JOURNAL_CACHE_KEY = 'trackiyo_cached_journal';

function loadCached(): JournalEntry[] | null {
  try {
    const raw = localStorage.getItem(JOURNAL_CACHE_KEY);
    return raw !== null ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCached(data: JournalEntry[]) {
  try {
    localStorage.setItem(JOURNAL_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

const DEFAULT_ENTRIES: JournalEntry[] = [
  {
    id: 'j-demo-1',
    entry_date: getLocalTodayStr(),
    title: 'Daily Reflection & Clarity',
    content: 'Focused on high-impact work today. Energy remained strong by keeping morning distractions minimal.',
    mood: 8,
    tags: ['Mindset', 'Productivity'],
    created_at: new Date().toISOString()
  }
];

interface JournalState {
  entries: JournalEntry[];
  selectedDate: string;
  isLoading: boolean;
  setSelectedDate: (dateStr: string) => void;
  fetchEntries: () => Promise<void>;
  saveEntry: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryByDate: (dateStr: string) => JournalEntry | undefined;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: loadCached() ?? DEFAULT_ENTRIES,
  selectedDate: getLocalTodayStr(),
  isLoading: false,

  setSelectedDate: (dateStr) => set({ selectedDate: dateStr }),

  fetchEntries: async () => {
    try {
      const res = await api.get('/journal');
      if (Array.isArray(res.data)) {
        saveCached(res.data);
        set({ entries: res.data });
      }
    } catch (err) {
      console.warn('Using cached journal entries', err);
    }
  },

  saveEntry: async (entryData) => {
    const existing = get().entries.find(e => e.entry_date === entryData.entry_date);
    const tempId = existing ? existing.id : `j-${Date.now()}`;
    const newEntry: JournalEntry = {
      id: tempId,
      ...entryData,
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    set((state) => {
      const filtered = state.entries.filter(e => e.id !== tempId);
      const next = [newEntry, ...filtered];
      saveCached(next);
      return { entries: next };
    });

    try {
      const res = await api.post('/journal', entryData);
      set((state) => {
        const next = state.entries.map(e => e.id === tempId ? res.data : e);
        saveCached(next);
        return { entries: next };
      });
    } catch (err) {
      console.warn('Journal saved locally', err);
    }
  },

  deleteEntry: async (id) => {
    set((state) => {
      const next = state.entries.filter(e => e.id !== id);
      saveCached(next);
      return { entries: next };
    });

    try {
      await api.delete(`/journal/${id}`);
    } catch (err) {
      console.warn('Journal deleted locally', err);
    }
  },

  getEntryByDate: (dateStr) => {
    return get().entries.find(e => e.entry_date === dateStr);
  }
}));
