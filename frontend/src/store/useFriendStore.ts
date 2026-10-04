import { create } from 'zustand';
import api from '../services/api';
import type { Friend, FriendRequest, UserSearchResult } from '../types/friendsChallenges';

interface FriendState {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  searchResults: UserSearchResult[];
  isLoading: boolean;
  isSearching: boolean;
  selectedFriendProfile: {
    id: string;
    name: string;
    avatar: string | null;
    focusHoursThisMonth: number;
    allowChallenges: boolean;
    showStreaks: boolean;
    showAchievements: boolean;
  } | null;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  sendFriendRequest: (friendId: string) => Promise<boolean>;
  respondToRequest: (requestId: string, action: 'accept' | 'decline') => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  viewFriendProfile: (friendId: string) => Promise<void>;
  closeFriendProfile: () => void;
  clearSearch: () => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  selectedFriendProfile: null,

  fetchFriends: async () => {
    if (get().friends.length === 0) {
      set({ isLoading: true });
    }
    try {
      const res = await api.get('/friends');
      if (Array.isArray(res.data)) {
        set({ friends: res.data });
      }
    } catch (err) {
      console.warn('Failed to load friends:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRequests: async () => {
    try {
      const res = await api.get('/friends/requests');
      if (res.data) {
        set({
          incomingRequests: res.data.incoming || [],
          outgoingRequests: res.data.outgoing || []
        });
      }
    } catch (err) {
      console.warn('Failed to load friend requests:', err);
    }
  },

  searchUsers: async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await api.get(`/friends/search?q=${encodeURIComponent(q)}`);
      set({ searchResults: Array.isArray(res.data) ? res.data : [] });
    } catch (err) {
      console.warn('Search error:', err);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  sendFriendRequest: async (friendId: string) => {
    try {
      await api.post('/friends/request', { friendId });
      get().fetchRequests();
      // Update relationship in search results locally
      set(state => ({
        searchResults: state.searchResults.map(u => 
          u.id === friendId ? { ...u, relationship: 'pending', isPendingSender: true } : u
        )
      }));
      return true;
    } catch (err) {
      console.error('Failed to send request:', err);
      return false;
    }
  },

  respondToRequest: async (requestId: string, action: 'accept' | 'decline') => {
    try {
      await api.post('/friends/respond', { requestId, action });
      await get().fetchRequests();
      if (action === 'accept') {
        await get().fetchFriends();
      }
      return true;
    } catch (err) {
      console.error('Failed to respond to request:', err);
      return false;
    }
  },

  removeFriend: async (friendId: string) => {
    try {
      await api.delete(`/friends/${friendId}`);
      set(state => ({
        friends: state.friends.filter(f => f.id !== friendId),
        selectedFriendProfile: null
      }));
      return true;
    } catch (err) {
      console.error('Failed to remove friend:', err);
      return false;
    }
  },

  viewFriendProfile: async (friendId: string) => {
    try {
      const res = await api.get(`/friends/${friendId}/profile`);
      if (res.data) {
        set({ selectedFriendProfile: res.data });
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  },

  closeFriendProfile: () => set({ selectedFriendProfile: null }),
  clearSearch: () => set({ searchResults: [] })
}));
