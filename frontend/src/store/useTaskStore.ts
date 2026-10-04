import { create } from 'zustand';
import api from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Task, TaskPriority, TaskStatus, Subtask, RecurrenceRule } from '../types';
import { addDaysStr, getLocalTodayStr } from '../utils/dailyTracking';

const TASKS_CACHE_KEY = 'trackiyo_cached_tasks';

function loadCachedTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedTasks(tasks: Task[]) {
  try {
    localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
  } catch {
    // quota exceeded or blocked
  }
}

// Calculate the next due date for a recurring task
export function getNextRecurringDate(currentDueDate: string | null, rule: RecurrenceRule): string {
  const base = currentDueDate ? currentDueDate.slice(0, 10) : getLocalTodayStr();
  const interval = rule.interval || 1;

  if (rule.frequency === 'daily') {
    return addDaysStr(base, interval);
  }
  if (rule.frequency === 'weekdays') {
    let next = addDaysStr(base, 1);
    const dayOfWeek = new Date(next).getDay();
    if (dayOfWeek === 6) next = addDaysStr(next, 2); // Sat -> Mon
    else if (dayOfWeek === 0) next = addDaysStr(next, 1); // Sun -> Mon
    return next;
  }
  if (rule.frequency === 'weekly') {
    return addDaysStr(base, 7 * interval);
  }
  if (rule.frequency === 'monthly') {
    const d = new Date(base);
    d.setMonth(d.getMonth() + interval);
    return d.toISOString().split('T')[0];
  }
  return addDaysStr(base, interval);
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  realtimeChannel: RealtimeChannel | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'is_completed'>) => Promise<string | null>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteTasks: (ids: string[]) => Promise<void>;
  completeTasks: (ids: string[]) => Promise<void>;
  setupRealtime: (userId: string) => void;
  cleanupRealtime: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: loadCachedTasks(),
  isLoading: false,
  realtimeChannel: null,

  setupRealtime: (userId: string) => {
    if (!isSupabaseConfigured) return;
    if (get().realtimeChannel) return;

    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          set((state) => {
            let nextTasks = [...state.tasks];
            if (eventType === 'INSERT') {
              if (!nextTasks.some(t => t.id === newRecord.id)) {
                nextTasks = [newRecord as Task, ...nextTasks];
              }
            } else if (eventType === 'UPDATE') {
              nextTasks = nextTasks.map(t => t.id === newRecord.id ? (newRecord as Task) : t);
            } else if (eventType === 'DELETE') {
              nextTasks = nextTasks.filter(t => t.id !== oldRecord.id);
            }
            saveCachedTasks(nextTasks);
            return { tasks: nextTasks };
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
      const loaded = response.data || [];
      saveCachedTasks(loaded);
      set({ tasks: loaded, isLoading: false });
    } catch (error) {
      console.warn('Failed to fetch tasks from server, relying on local cache', error);
      set({ isLoading: false });
    }
  },

  addTask: async (taskData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'Medium',
      category: taskData.category || 'General',
      status: taskData.status || 'pending',
      due_date: taskData.due_date || null,
      start_date: taskData.start_date || null,
      goal_id: taskData.goal_id || null,
      estimated_duration: taskData.estimated_duration || 0,
      actual_duration: taskData.actual_duration || 0,
      tags: taskData.tags || [],
      subtasks: taskData.subtasks || [],
      recurrence: taskData.recurrence || null,
      notes: taskData.notes || '',
      created_at: new Date().toISOString(),
      is_completed: false,
    };

    set((state) => {
      const next = [optimisticTask, ...state.tasks];
      saveCachedTasks(next);
      return { tasks: next };
    });

    try {
      const response = await api.post('/tasks', taskData);
      set((state) => {
        const next = state.tasks.some(t => t.id === response.data.id)
          ? state.tasks.filter(t => t.id !== tempId)
          : state.tasks.map(t => t.id === tempId ? response.data : t);
        saveCachedTasks(next);
        return { tasks: next };
      });
      return null;
    } catch (error: any) {
      console.warn('Backend task create failed, keeping local task', error);
      // Keep optimistic task in local storage so no data is lost
      return null;
    }
  },

  updateTask: async (id, data) => {
    const originalTask = get().tasks.find(t => t.id === id);
    if (!originalTask) return;

    set((state) => {
      const next = state.tasks.map(t => t.id === id ? { ...t, ...data } : t);
      saveCachedTasks(next);
      return { tasks: next };
    });

    try {
      await api.put(`/tasks/${id}`, data);
    } catch (error) {
      console.warn('Failed to update task on backend', error);
    }
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;

    const willBeCompleted = !task.is_completed;
    const newStatus: TaskStatus = willBeCompleted ? 'completed' : 'pending';

    set((state) => {
      const next = state.tasks.map(t => t.id === id ? { ...t, is_completed: willBeCompleted, status: newStatus } : t);
      saveCachedTasks(next);
      return { tasks: next };
    });

    // If recurring task was completed, automatically create the next occurrence!
    if (willBeCompleted && task.recurrence) {
      const nextDueDate = getNextRecurringDate(task.due_date, task.recurrence);
      setTimeout(() => {
        get().addTask({
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          status: 'pending',
          due_date: nextDueDate,
          goal_id: task.goal_id,
          estimated_duration: task.estimated_duration,
          actual_duration: 0,
          tags: task.tags,
          subtasks: task.subtasks ? task.subtasks.map(s => ({ ...s, completed: false })) : [],
          recurrence: task.recurrence,
          notes: task.notes
        });
      }, 500);
    }

    try {
      await api.put(`/tasks/${id}`, { is_completed: willBeCompleted, status: newStatus });
    } catch (error) {
      console.warn('Failed to toggle task on backend', error);
    }
  },

  updateTaskStatus: async (id, status) => {
    const isCompleted = status === 'completed';
    set((state) => {
      const next = state.tasks.map(t => t.id === id ? { ...t, status, is_completed: isCompleted } : t);
      saveCachedTasks(next);
      return { tasks: next };
    });

    try {
      await api.put(`/tasks/${id}`, { status, is_completed: isCompleted });
    } catch (error) {
      console.warn('Failed to update task status on backend', error);
    }
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const nextSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    await get().updateTask(taskId, { subtasks: nextSubtasks });
  },

  addSubtask: async (taskId, title) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task || !title.trim()) return;

    const newSubtask: Subtask = {
      id: `sub-${Date.now()}`,
      title: title.trim(),
      completed: false
    };
    const nextSubtasks = [...(task.subtasks || []), newSubtask];
    await get().updateTask(taskId, { subtasks: nextSubtasks });
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const nextSubtasks = task.subtasks.filter(s => s.id !== subtaskId);
    await get().updateTask(taskId, { subtasks: nextSubtasks });
  },

  deleteTask: async (id) => {
    set((state) => {
      const next = state.tasks.filter(t => t.id !== id);
      saveCachedTasks(next);
      return { tasks: next };
    });

    try {
      await api.delete(`/tasks/${id}`);
    } catch (error) {
      console.warn('Failed to delete task on backend', error);
    }
  },

  deleteTasks: async (ids) => {
    set((state) => {
      const next = state.tasks.filter(t => !ids.includes(t.id));
      saveCachedTasks(next);
      return { tasks: next };
    });

    try {
      await api.post('/tasks/batch-delete', { ids });
    } catch (error) {
      console.warn('Failed to batch delete tasks on backend', error);
    }
  },

  completeTasks: async (ids) => {
    set((state) => {
      const next = state.tasks.map(t => ids.includes(t.id) ? { ...t, is_completed: true, status: 'completed' as TaskStatus } : t);
      saveCachedTasks(next);
      return { tasks: next };
    });

    try {
      await api.post('/tasks/batch-complete', { ids });
    } catch (error) {
      console.warn('Failed to batch complete tasks on backend', error);
    }
  }
}));

// Re-export type helpers for existing components
export type { Task, TaskPriority };
