import { create } from 'zustand';
import api from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  due_date: string | null;
  created_at: string;
  is_completed: boolean;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  realtimeChannel: RealtimeChannel | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'is_completed'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteTasks: (ids: string[]) => Promise<void>;
  completeTasks: (ids: string[]) => Promise<void>;
  setupRealtime: (userId: string) => void;
  cleanupRealtime: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  realtimeChannel: null,

  setupRealtime: (userId: string) => {
    if (!isSupabaseConfigured) return;
    if (get().realtimeChannel) return; // Prevent duplicate subscriptions

    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          set((state) => {
            const currentTasks = [...state.tasks];
            if (eventType === 'INSERT') {
              if (!currentTasks.some(t => t.id === newRecord.id)) {
                return { tasks: [newRecord as Task, ...currentTasks] };
              }
            } else if (eventType === 'UPDATE') {
              return {
                tasks: currentTasks.map(t => t.id === newRecord.id ? (newRecord as Task) : t)
              };
            } else if (eventType === 'DELETE') {
              return {
                tasks: currentTasks.filter(t => t.id !== oldRecord.id)
              };
            }
            return state;
          });
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

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/tasks');
      set({ tasks: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch tasks', error);
      set({ isLoading: false });
    }
  },

  addTask: async (taskData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'Low',
      category: taskData.category || 'General',
      due_date: taskData.due_date || null,
      created_at: new Date().toISOString(),
      is_completed: false,
    };

    set((state) => ({ tasks: [optimisticTask, ...state.tasks] }));

    try {
      const response = await api.post('/tasks', taskData);
      set((state) => {
        // Deduplicate in case realtime event beat the API response
        if (state.tasks.some(t => t.id === response.data.id)) {
           return { tasks: state.tasks.filter(t => t.id !== tempId) };
        }
        return {
          tasks: state.tasks.map(t => t.id === tempId ? response.data : t)
        };
      });
    } catch (error) {
      console.error('Failed to add task', error);
      set((state) => ({ tasks: state.tasks.filter(t => t.id !== tempId) }));
    }
  },

  updateTask: async (id, data) => {
    const originalTask = get().tasks.find(t => t.id === id);
    if (!originalTask) return;

    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t)
    }));

    try {
      await api.put(`/tasks/${id}`, data);
    } catch (error) {
      console.error('Failed to update task', error);
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? originalTask : t)
      }));
    }
  },

  toggleTask: async (id) => {
    const originalTask = get().tasks.find(t => t.id === id);
    if (!originalTask) return;
    
    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t)
    }));

    try {
      await api.put(`/tasks/${id}`, { is_completed: !originalTask.is_completed });
    } catch (error) {
      console.error('Failed to toggle task', error);
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? originalTask : t)
      }));
    }
  },

  deleteTask: async (id) => {
    const originalTask = get().tasks.find(t => t.id === id);
    if (!originalTask) return;

    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== id)
    }));

    try {
      await api.delete(`/tasks/${id}`);
    } catch (error) {
      console.error('Failed to delete task', error);
      set((state) => ({
        tasks: [...state.tasks, originalTask] // Append back
      }));
    }
  },

  deleteTasks: async (ids) => {
    const originalTasks = get().tasks.filter(t => ids.includes(t.id));
    
    set((state) => ({
      tasks: state.tasks.filter(t => !ids.includes(t.id))
    }));

    try {
      await api.post('/tasks/batch-delete', { ids });
    } catch (error) {
      console.error('Failed to delete tasks', error);
      set((state) => ({
        tasks: [...state.tasks, ...originalTasks]
      }));
    }
  },

  completeTasks: async (ids) => {
    const originalTasks = get().tasks.filter(t => ids.includes(t.id));
    
    set((state) => ({
      tasks: state.tasks.map(t => ids.includes(t.id) ? { ...t, is_completed: true } : t)
    }));

    try {
      await api.post('/tasks/batch-complete', { ids });
    } catch (error) {
      console.error('Failed to complete tasks', error);
      set((state) => ({
        tasks: state.tasks.map(t => {
          const original = originalTasks.find(ot => ot.id === t.id);
          return original ? original : t;
        })
      }));
    }
  }
}));
