import { create } from 'zustand';
import api from '../services/api';
import type { Habit, HabitLog, WellnessLog } from '../types';
import { format } from 'date-fns';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface HabitState {
  habits: Habit[];
  habitLogs: HabitLog;
  wellnessLogs: WellnessLog;
  currentMonthId: string;
  isLoading: boolean;
  realtimeChannel: RealtimeChannel | null;
  
  setCurrentMonth: (monthId: string) => Promise<void>;
  loadData: () => Promise<void>;
  toggleHabitLog: (habitId: string, dateStr: string) => Promise<void>;
  updateWellnessLog: (dateStr: string, type: 'mood' | 'sleep', value: number | null) => Promise<void>;
  addHabit: (name: string, icon: string, monthlyGoal: number) => Promise<void>;
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
                [date]: { mood: newRecord.mood, sleep: newRecord.sleep }
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
    set({ currentMonthId: monthId });
    await get().loadData();
  },

  loadData: async () => {
    const monthId = get().currentMonthId;
    const [year, month] = monthId.split('-');
    
    set({ isLoading: true });
    try {
      const [habitsRes, wellnessRes] = await Promise.all([
        api.get(`/habits?year=${year}&month=${month}`),
        api.get(`/wellness?year=${year}&month=${month}`)
      ]);

      const habits = habitsRes.data.habits || [];
      const logsArray = habitsRes.data.logs || [];
      
      const newHabitLogs: HabitLog = {};
      logsArray.forEach((log: any) => {
        newHabitLogs[`${log.habit_id}_${log.log_date}`] = log.completed;
      });

      const newWellnessLogs: WellnessLog = {};
      (wellnessRes.data || []).forEach((w: any) => {
        newWellnessLogs[w.log_date] = { mood: w.mood, sleep: w.sleep };
      });

      set({
        habits,
        habitLogs: newHabitLogs,
        wellnessLogs: newWellnessLogs,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load habit data', error);
      set({ isLoading: false });
    }
  },

  toggleHabitLog: async (habitId: string, dateStr: string) => {
    const { habitLogs } = get();
    const key = `${habitId}_${dateStr}`;
    const isCurrentlyChecked = habitLogs[key] || false;
    const newStatus = !isCurrentlyChecked;
    
    set({
      habitLogs: {
        ...habitLogs,
        [key]: newStatus
      }
    });

    try {
      await api.post('/habits/logs', {
        habit_id: habitId,
        log_date: dateStr,
        completed: newStatus
      });
    } catch (error) {
      console.error('Failed to toggle habit', error);
      set({
        habitLogs: {
          ...get().habitLogs,
          [key]: isCurrentlyChecked
        }
      });
    }
  },

  updateWellnessLog: async (dateStr: string, type: 'mood' | 'sleep', value: number | null) => {
    const { wellnessLogs } = get();
    const currentData = wellnessLogs[dateStr] || { mood: null, sleep: null };
    const newData = { ...currentData, [type]: value };
    
    set({
      wellnessLogs: {
        ...wellnessLogs,
        [dateStr]: newData
      }
    });

    try {
      await api.post('/wellness', {
        log_date: dateStr,
        ...newData
      });
    } catch (error) {
      console.error('Failed to update wellness log', error);
      set({
        wellnessLogs: {
          ...get().wellnessLogs,
          [dateStr]: currentData
        }
      });
    }
  },

  addHabit: async (name: string, icon: string, monthlyGoal: number) => {
    const tempId = `temp-${Date.now()}`;
    const { habits } = get();
    
    const optimisticHabit: Habit = {
      id: tempId,
      name,
      icon,
      monthly_goal: monthlyGoal,
      order_index: habits.length,
      created_at: new Date().toISOString()
    };
    
    set({ habits: [...habits, optimisticHabit] });
    
    try {
      const response = await api.post('/habits', {
        name,
        icon,
        monthlyGoal,
        order_index: optimisticHabit.order_index
      });
      
      set((state) => {
        // deduplicate
        if (state.habits.some(h => h.id === response.data.id)) {
           return { habits: state.habits.filter(h => h.id !== tempId) };
        }
        return {
           habits: state.habits.map(h => h.id === tempId ? response.data : h)
        };
      });
    } catch (error) {
      console.error('Failed to add habit', error);
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
      console.error('Failed to delete habit', error);
      set((state) => ({ 
        habits: [...state.habits, originalHabit].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) 
      }));
    }
  }
}));
