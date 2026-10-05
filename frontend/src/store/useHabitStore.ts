import { create } from 'zustand';
import api from '../services/api';
import type { Habit, HabitLog, WellnessLog, WellnessData, HabitFrequency } from '../types';
import { format } from 'date-fns';
import { getLocalTodayStr } from '../utils/dailyTracking';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface HabitState {
  habits: Habit[];
  habitLogs: HabitLog;
  wellnessLogs: WellnessLog;
  currentMonthId: string;
  isLoading: boolean;
  lastFetched: Record<string, number>;
  pendingLogs: Set<string>;
  realtimeChannel: RealtimeChannel | null;
  
  setCurrentMonth: (monthId: string) => Promise<void>;
  loadData: (force?: boolean) => Promise<void>;
  toggleHabitLog: (habitId: string, dateStr: string) => Promise<boolean>;
  updateWellnessLog: (dateStr: string, type: 'mood' | 'sleep' | 'energy' | 'water', value: number | null) => Promise<boolean>;
  updateWellnessEntry: (dateStr: string, fields: Partial<WellnessData>) => Promise<boolean>;
  addHabit: (name: string, icon: string, monthlyGoal: number, frequency?: HabitFrequency, targetDays?: number) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  setupRealtime: (userId: string) => void;
  cleanupRealtime: () => void;
}

const getCurrentMonthId = () => format(new Date(), 'yyyy-MM');

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  habitLogs: {},
  wellnessLogs: {},
  currentMonthId: getCurrentMonthId(),
  isLoading: false,
  lastFetched: {},
  pendingLogs: new Set<string>(),
  realtimeChannel: null,

  setupRealtime: (userId: string) => {
    if (!isSupabaseConfigured) return;
    if (get().realtimeChannel) return;

    const channel = supabase
      .channel('habits_wellness_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          set((state) => {
            const currentHabits = [...state.habits];
            if (eventType === 'INSERT') {
              if (!currentHabits.some(h => h.id === newRecord.id)) {
                return { habits: [...currentHabits, newRecord as Habit] };
              }
            } else if (eventType === 'UPDATE') {
              return {
                habits: currentHabits.map(h => h.id === newRecord.id ? (newRecord as Habit) : h)
              };
            } else if (eventType === 'DELETE') {
              return {
                habits: currentHabits.filter(h => h.id !== oldRecord.id)
              };
            }
            return state;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const key = `${newRecord.habit_id}_${newRecord.log_date}`;
            set((state) => ({
              habitLogs: {
                ...state.habitLogs,
                [key]: newRecord.completed
              }
            }));
          } else if (eventType === 'DELETE') {
            const key = `${oldRecord.habit_id}_${oldRecord.log_date}`;
            set((state) => {
               const nextLogs = { ...state.habitLogs };
               delete nextLogs[key];
               return { habitLogs: nextLogs };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wellness', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const date = newRecord.log_date;
            set((state) => ({
              wellnessLogs: {
                ...state.wellnessLogs,
                [date]: {
                  mood: newRecord.mood ?? null,
                  sleep: newRecord.sleep ?? null,
                  energy: newRecord.energy ?? null,
                  water: newRecord.water ?? null,
                  notes: newRecord.notes ?? '',
                  activities: Array.isArray(newRecord.activities) ? newRecord.activities : []
                }
              }
            }));
          } else if (eventType === 'DELETE') {
            const date = oldRecord.log_date;
            set((state) => {
               const nextLogs = { ...state.wellnessLogs };
               delete nextLogs[date];
               return { wellnessLogs: nextLogs };
            });
          }
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  cleanupRealtime: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  setCurrentMonth: async (monthId: string) => {
    if (get().currentMonthId === monthId && get().habits.length > 0) return;
    set({ currentMonthId: monthId });
    await get().loadData();
  },

  loadData: async (force = false) => {
    const monthId = get().currentMonthId;
    const { lastFetched, habits, isLoading } = get();
    const now = Date.now();

    // Cache freshness: 15s window per monthId
    if (!force && lastFetched[monthId] && (now - lastFetched[monthId] < 15000) && habits.length > 0) {
      return;
    }
    if (isLoading) return;

    const [year, month] = monthId.split('-');
    const requestId = Symbol('loadData');
    (get() as { _loadRequest?: symbol })._loadRequest = requestId;
    
    set({ isLoading: true });
    try {
      const [habitsRes, wellnessRes] = await Promise.all([
        api.get(`/habits?year=${year}&month=${month}`),
        api.get(`/wellness?year=${year}&month=${month}`)
      ]);

      // Drop stale responses from rapid month switches.
      if ((get() as { _loadRequest?: symbol })._loadRequest !== requestId) return;

      const loadedHabits = habitsRes.data.habits || [];
      const logsArray = habitsRes.data.logs || [];
      
      const newHabitLogs: HabitLog = {};
      logsArray.forEach((log: any) => {
        newHabitLogs[`${log.habit_id}_${log.log_date}`] = log.completed;
      });

      const newWellnessLogs: WellnessLog = {};
      (wellnessRes.data || []).forEach((w: any) => {
        newWellnessLogs[w.log_date] = {
          mood: w.mood ?? null,
          sleep: w.sleep ?? null,
          energy: w.energy ?? null,
          water: w.water ?? null,
          notes: w.notes ?? '',
          activities: Array.isArray(w.activities) ? w.activities : []
        };
      });

      set({
        habits: loadedHabits,
        habitLogs: newHabitLogs,
        wellnessLogs: newWellnessLogs,
        isLoading: false,
        lastFetched: { ...get().lastFetched, [monthId]: Date.now() }
      });
    } catch (error) {
      console.error('Failed to load habit data', error);
      if ((get() as { _loadRequest?: symbol })._loadRequest === requestId) {
        set({ isLoading: false });
      }
    }
  },

  toggleHabitLog: async (habitId: string, dateStr: string) => {
    if (dateStr !== getLocalTodayStr()) return false;

    const key = `${habitId}_${dateStr}`;
    const { habitLogs, pendingLogs } = get();

    // Idempotency: skip if mutation is currently in-flight
    if (pendingLogs.has(key)) return false;

    const isCurrentlyChecked = habitLogs[key] || false;
    const newStatus = !isCurrentlyChecked;
    
    const nextPending = new Set(pendingLogs).add(key);
    set({
      habitLogs: {
        ...habitLogs,
        [key]: newStatus
      },
      pendingLogs: nextPending
    });

    try {
      await api.post('/habits/logs', {
        habit_id: habitId,
        log_date: dateStr,
        completed: newStatus,
        client_today: getLocalTodayStr()
      });
      return true;
    } catch (error) {
      console.error('Failed to toggle habit log on backend, rolling back', error);
      set({
        habitLogs: {
          ...get().habitLogs,
          [key]: isCurrentlyChecked
        }
      });
      return false;
    } finally {
      set((state) => {
        const p = new Set(state.pendingLogs);
        p.delete(key);
        return { pendingLogs: p };
      });
    }
  },

  updateWellnessLog: async (dateStr: string, type: 'mood' | 'sleep' | 'energy' | 'water', value: number | null) => {
    if (dateStr !== getLocalTodayStr()) return false;

    const { wellnessLogs } = get();
    const currentData = wellnessLogs[dateStr] || { mood: null, sleep: null, energy: null, water: null, notes: '' };
    const newData = { ...currentData, [type]: value };

    if (type === 'water') {
      try {
        localStorage.setItem(`trackiyo_water_${dateStr}`, String(value ?? 0));
      } catch {}
    }
    
    set({
      wellnessLogs: {
        ...wellnessLogs,
        [dateStr]: newData
      }
    });

    try {
      await api.post('/wellness', {
        log_date: dateStr,
        ...newData,
        client_today: getLocalTodayStr()
      });
      return true;
    } catch (error) {
      console.error('Failed to update wellness log on backend, rolling back', error);
      set({
        wellnessLogs: {
          ...get().wellnessLogs,
          [dateStr]: currentData
        }
      });
      return false;
    }
  },

  updateWellnessEntry: async (dateStr: string, fields: Partial<WellnessData>) => {
    if (dateStr !== getLocalTodayStr()) return false;

    const { wellnessLogs } = get();
    const currentData = wellnessLogs[dateStr] || { mood: null, sleep: null, energy: null, water: null, notes: '' };
    const newData = { ...currentData, ...fields };

    set({
      wellnessLogs: {
        ...wellnessLogs,
        [dateStr]: newData
      }
    });

    try {
      await api.post('/wellness', {
        log_date: dateStr,
        ...newData,
        client_today: getLocalTodayStr()
      });
      return true;
    } catch (error) {
      console.error('Failed to update wellness entry on backend, rolling back', error);
      set({
        wellnessLogs: {
          ...get().wellnessLogs,
          [dateStr]: currentData
        }
      });
      return false;
    }
  },

  addHabit: async (name: string, icon: string, monthlyGoal: number, frequency = 'daily', targetDays = 7) => {
    // Local validation
    if (!name || !name.trim()) return;
    const cleanName = name.trim();

    const tempId = `temp-${Date.now()}`;
    const { habits } = get();
    
    const optimisticHabit: Habit = {
      id: tempId,
      name: cleanName,
      icon: icon || '📌',
      monthly_goal: monthlyGoal || 0,
      frequency,
      target_days_per_week: targetDays,
      order_index: habits.length,
      created_at: new Date().toISOString()
    };
    
    set({ habits: [...habits, optimisticHabit] });
    
    try {
      const response = await api.post('/habits', {
        name: cleanName,
        icon: icon || '📌',
        monthlyGoal,
        frequency,
        target_days_per_week: targetDays,
        order_index: optimisticHabit.order_index
      });
      
      set((state) => {
        if (state.habits.some(h => h.id === response.data.id)) {
           return { habits: state.habits.filter(h => h.id !== tempId) };
        }
        return {
           habits: state.habits.map(h => h.id === tempId ? response.data : h)
        };
      });
    } catch (error) {
      console.error('Failed to add habit on backend, rolling back', error);
      set((state) => ({ habits: state.habits.filter(h => h.id !== tempId) }));
    }
  },

  deleteHabit: async (habitId: string) => {
    const originalHabit = get().habits.find(h => h.id === habitId);
    if (!originalHabit) return;
    
    set((state) => ({ habits: state.habits.filter(h => h.id !== habitId) }));
    
    try {
      await api.delete(`/habits/${habitId}`);
    } catch (error) {
      console.error('Failed to delete habit on backend, rolling back', error);
      set((state) => ({ 
        habits: [...state.habits, originalHabit].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) 
      }));
    }
  }
}));
