import { create } from 'zustand';
import api from '../services/api';
import type { ShareCardConfig, PublicShareRecord } from '../types/streaks';

interface ShareState {
  isShareModalOpen: boolean;
  activeConfig: ShareCardConfig | null;
  history: PublicShareRecord[];
  isGeneratingLink: boolean;
  publicShareUrl: string | null;

  openShareModal: (config: ShareCardConfig) => void;
  closeShareModal: () => void;
  createPublicLink: (config: ShareCardConfig) => Promise<string | null>;
  fetchHistory: () => Promise<void>;
  revokeShare: (token: string) => Promise<boolean>;
}

export const useShareStore = create<ShareState>((set, get) => ({
  isShareModalOpen: false,
  activeConfig: null,
  history: [],
  isGeneratingLink: false,
  publicShareUrl: null,

  openShareModal: (config: ShareCardConfig) => {
    set({
      isShareModalOpen: true,
      activeConfig: {
        format: 'square',
        theme: 'dark',
        includeUsername: true,
        includeAvatar: false,
        ...config
      },
      publicShareUrl: null
    });
  },

  closeShareModal: () => {
    set({ isShareModalOpen: false, activeConfig: null, publicShareUrl: null });
  },

  createPublicLink: async (config: ShareCardConfig) => {
    set({ isGeneratingLink: true });
    try {
      const res = await api.post('/share', config);
      if (res.data?.token) {
        const origin = window.location.origin;
        // Supports hash routing or standard path
        const shareUrl = `${origin}/#/share/${res.data.token}`;
        set({ publicShareUrl: shareUrl, isGeneratingLink: false });
        get().fetchHistory();
        return shareUrl;
      }
    } catch (err: any) {
      console.error('Failed to create public share link:', err);
    } finally {
      set({ isGeneratingLink: false });
    }
    return null;
  },

  fetchHistory: async () => {
    try {
      const res = await api.get('/share/my/history');
      if (res.data && Array.isArray(res.data)) {
        set({ history: res.data });
      }
    } catch (err) {
      console.warn('Failed to fetch share history:', err);
    }
  },

  revokeShare: async (token: string) => {
    try {
      await api.delete(`/share/${token}`);
      set(state => ({
        history: state.history.map(item => item.token === token ? { ...item, is_revoked: true } : item)
      }));
      return true;
    } catch (err) {
      console.error('Failed to revoke share:', err);
      return false;
    }
  }
}));
