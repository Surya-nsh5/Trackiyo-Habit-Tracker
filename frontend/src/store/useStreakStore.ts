import { create } from 'zustand';
import api from '../services/api';
import type { StreakSummary, StreakDetailData } from '../types/streaks';

interface StreakState {
  overall: { currentStreak: number; longestStreak: number; completedToday: boolean };
  habits: StreakSummary[];
  focus: StreakSummary | null;
  tasks: StreakSummary | null;
  wellness: StreakSummary | null;
  graceDays: { available: number; usedCount: number };
  activeStreakDetail: StreakDetailData | null;
  isModalOpen: boolean;
  isLoading: boolean;
  error: string | null;

  fetchStreaks: () => Promise<void>;
  fetchStreakDetail: (type: string, id: string, openModal?: boolean) => Promise<StreakDetailData | null>;
  openStreakModal: (type: string, id: string) => Promise<void>;
  closeStreakModal: () => void;
  applyGraceDay: (streakType: string, entityId: string, missedDate: string) => Promise<boolean>;
  clearActiveDetail: () => void;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  overall: { currentStreak: 0, longestStreak: 0, completedToday: false },
  habits: [],
  focus: null,
  tasks: null,
  wellness: null,
  graceDays: { available: 2, usedCount: 0 },
  activeStreakDetail: null,
  isModalOpen: false,
  isLoading: false,
  error: null,

  fetchStreaks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await api.get(`/streaks/overview?tz=${encodeURIComponent(tz)}`);
      if (res.data) {
        set({
          overall: res.data.overall || { currentStreak: 0, longestStreak: 0, completedToday: false },
          habits: res.data.habits || [],
          focus: res.data.focus || null,
          tasks: res.data.tasks || null,
          wellness: res.data.wellness || null,
          graceDays: res.data.graceDays || { available: 2, usedCount: 0 },
          isLoading: false
        });
      }
    } catch (err: any) {
      console.warn('Failed to fetch streaks overview:', err);
      set({ isLoading: false, error: err.message });
    }
  },

  fetchStreakDetail: async (type: string, id: string, openModal: boolean = false) => {
    set({ isLoading: true });
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await api.get(`/streaks/detail/${type}/${id}?tz=${encodeURIComponent(tz)}`);
      if (res.data) {
        set({ activeStreakDetail: res.data, isModalOpen: openModal, isLoading: false });
        return res.data;
      }
    } catch (err: any) {
      console.error('Failed to load streak details:', err);
      set({ isLoading: false });
    }
    return null;
  },

  openStreakModal: async (type: string, id: string) => {
    await get().fetchStreakDetail(type, id, true);
  },

  closeStreakModal: () => set({ isModalOpen: false }),

  applyGraceDay: async (streakType: string, entityId: string, missedDate: string) => {
    try {
      const res = await api.post('/streaks/grace-day', {
        streak_type: streakType,
        entity_id: entityId,
        missed_date: missedDate
      });
      if (res.data?.success) {
        // Refresh streaks and active detail
        await get().fetchStreaks();
        if (get().activeStreakDetail?.id === entityId) {
          await get().fetchStreakDetail(streakType, entityId, get().isModalOpen);
        }
        return true;
      }
    } catch (err: any) {
      console.error('Failed to apply grace day:', err);
    }
    return false;
  },

  clearActiveDetail: () => set({ activeStreakDetail: null, isModalOpen: false })
}));
