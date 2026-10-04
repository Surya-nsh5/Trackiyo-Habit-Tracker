import { create } from 'zustand';
import api from '../services/api';
import type { ChallengeSummary, ChallengeDetail } from '../types/friendsChallenges';

interface ChallengeState {
  activeChallenges: ChallengeSummary[];
  pendingChallenges: ChallengeSummary[];
  historyChallenges: ChallengeSummary[];
  activeDetail: ChallengeDetail | null;
  isCreateModalOpen: boolean;
  selectedOpponentId: string | null;
  prefillTitle: string | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  isCheckingIn: boolean;

  fetchChallenges: () => Promise<void>;
  fetchChallengeDetail: (id: string) => Promise<void>;
  checkinToday: (challengeId: string) => Promise<void>;
  createChallenge: (payload: {
    opponentId: string;
    title: string;
    challengeType: string;
    targetMetric: number;
    targetUnit?: string;
    targetHabitId?: string;
    durationDays?: number;
    startDate?: string;
  }) => Promise<boolean>;
  respondToChallenge: (id: string, action: 'accept' | 'decline') => Promise<boolean>;
  sendReaction: (id: string, emoji: string) => Promise<boolean>;
  generateShareLink: (id: string) => Promise<string | null>;
  deleteChallenge: (id: string) => Promise<boolean>;
  openCreateModal: (opponentId?: string) => void;
  openCreateModalWithTitle: (title: string) => void;
  closeCreateModal: () => void;
  closeDetailModal: () => void;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  activeChallenges: [],
  pendingChallenges: [],
  historyChallenges: [],
  activeDetail: null,
  isCreateModalOpen: false,
  selectedOpponentId: null,
  prefillTitle: null,
  isLoading: false,
  isDetailLoading: false,
  isCheckingIn: false,

  fetchChallenges: async () => {
    // Only show full loading if we have zero challenges in cache
    if (get().activeChallenges.length === 0 && get().pendingChallenges.length === 0 && get().historyChallenges.length === 0) {
      set({ isLoading: true });
    }
    try {
      const res = await api.get('/challenges');
      if (res.data) {
        set({
          activeChallenges: res.data.active || [],
          pendingChallenges: res.data.pending || [],
          historyChallenges: res.data.history || []
        });
      }
    } catch (err) {
      console.warn('Failed to load challenges:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchChallengeDetail: async (id: string) => {
    // If we already have the detail for this challenge, keep showing it without a blank pulse
    if (get().activeDetail?.id !== id) {
      set({ isDetailLoading: true });
    }
    try {
      const res = await api.get(`/challenges/${id}`);
      if (res.data) {
        set({ activeDetail: res.data });
      }
    } catch (err) {
      console.error('Failed to load challenge detail:', err);
    } finally {
      set({ isDetailLoading: false });
    }
  },

  checkinToday: async (challengeId: string) => {
    if (get().isCheckingIn) return;
    set({ isCheckingIn: true });

    // Optimistic update for zero-latency feel
    set(state => ({
      activeChallenges: state.activeChallenges.map(c => 
        c.id === challengeId ? {
          ...c,
          myTodayCheckedIn: true,
          myScore: (c.myScore || 0) + (c.myTodayCheckedIn ? 0 : 1)
        } : c
      ),
      activeDetail: state.activeDetail?.id === challengeId ? {
        ...state.activeDetail,
        myCheckedIn: true,
        myTodayMet: true,
        myTodayCheckedIn: true,
        myScore: (state.activeDetail.myScore || 0) + (state.activeDetail.myCheckedIn ? 0 : 1)
      } : state.activeDetail
    }));

    try {
      const res = await api.post(`/challenges/${challengeId}/checkin`);
      if (res.data) {
        set(state => ({
          activeChallenges: state.activeChallenges.map(c => 
            c.id === challengeId ? {
              ...c,
              myScore: res.data.myScore ?? c.myScore,
              theirScore: res.data.theirScore ?? c.theirScore,
              myTodayCheckedIn: true,
              theirTodayCheckedIn: res.data.theirTodayCheckedIn ?? c.theirTodayCheckedIn
            } : c
          )
        }));
      }
      if (get().activeDetail?.id === challengeId) {
        await get().fetchChallengeDetail(challengeId);
      }
      await get().fetchChallenges();
    } catch (err) {
      console.error('Check-in failed:', err);
      await get().fetchChallenges();
    } finally {
      set({ isCheckingIn: false });
    }
  },

  createChallenge: async (payload) => {
    try {
      const res = await api.post('/challenges', payload);
      if (res.data) {
        get().fetchChallenges();
        set({ isCreateModalOpen: false, selectedOpponentId: null });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Create challenge error:', err);
      return false;
    }
  },

  respondToChallenge: async (id: string, action: 'accept' | 'decline') => {
    try {
      await api.post(`/challenges/${id}/respond`, { action });
      await get().fetchChallenges();
      if (get().activeDetail?.id === id) {
        get().fetchChallengeDetail(id);
      }
      return true;
    } catch (err) {
      console.error('Failed to respond to challenge:', err);
      return false;
    }
  },

  sendReaction: async (id: string, emoji: string) => {
    try {
      const res = await api.post(`/challenges/${id}/react`, { emoji });
      if (res.data && get().activeDetail?.id === id) {
        set(state => ({
          activeDetail: state.activeDetail ? {
            ...state.activeDetail,
            reactions: [res.data, ...state.activeDetail.reactions]
          } : null
        }));
      }
      return true;
    } catch (err) {
      console.error('Failed to send reaction:', err);
      return false;
    }
  },

  generateShareLink: async (id: string) => {
    try {
      const res = await api.post(`/challenges/${id}/share`);
      if (res.data?.token) {
        const origin = window.location.origin;
        const url = `${origin}/#/challenge/${res.data.token}`;
        return url;
      }
      return null;
    } catch (err) {
      console.error('Failed to generate challenge share link:', err);
      return null;
    }
  },

  deleteChallenge: async (id: string) => {
    // Optimistic local removal
    set(state => ({
      activeChallenges: state.activeChallenges.filter(c => c.id !== id),
      pendingChallenges: state.pendingChallenges.filter(c => c.id !== id),
      historyChallenges: state.historyChallenges.filter(c => c.id !== id),
      activeDetail: state.activeDetail?.id === id ? null : state.activeDetail
    }));
    try {
      await api.delete(`/challenges/${id}`);
      await get().fetchChallenges();
      return true;
    } catch (err) {
      console.error('Failed to delete challenge:', err);
      await get().fetchChallenges();
      return false;
    }
  },

  openCreateModal: (opponentId?: string) => set({
    isCreateModalOpen: true,
    selectedOpponentId: opponentId || null
  }),
  openCreateModalWithTitle: (title: string) => set({
    isCreateModalOpen: true,
    selectedOpponentId: null,
    prefillTitle: title
  }),
  closeCreateModal: () => set({ isCreateModalOpen: false, selectedOpponentId: null, prefillTitle: null }),
  closeDetailModal: () => set({ activeDetail: null }),
}));
