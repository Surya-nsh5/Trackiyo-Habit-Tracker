import { create } from 'zustand';
import api from '../services/api';
import type { Template } from '../types';

interface TemplateState {
  templates: Template[];
  isLoading: boolean;
  fetchTemplates: (type?: string) => Promise<void>;
  createTemplate: (name: string, type: Template['type'], template_data: Record<string, unknown>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  applyTemplate: (id: string) => Promise<unknown>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  isLoading: false,

  fetchTemplates: async (type) => {
    set({ isLoading: true });
    try {
      const res = await api.get('/templates', { params: type ? { type } : {} });
      set({ templates: res.data || [], isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  createTemplate: async (name, type, template_data) => {
    try {
      const res = await api.post('/templates', { name, type, template_data });
      set((s) => ({ templates: [res.data, ...s.templates] }));
    } catch {}
  },

  deleteTemplate: async (id) => {
    set((s) => ({ templates: s.templates.filter(t => t.id !== id) }));
    try { await api.delete(`/templates/${id}`); } catch {}
  },

  applyTemplate: async (id) => {
    const res = await api.post(`/templates/${id}/apply`);
    return res.data;
  },
}));
