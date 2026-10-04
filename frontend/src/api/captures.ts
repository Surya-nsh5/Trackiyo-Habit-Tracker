import api from '../services/api';
import type { Capture } from '../types';

// Thin API helper for Quick Capture (used by stores and components).
export async function fetchCaptures(limit = 100): Promise<Capture[]> {
  const res = await api.get('/captures', { params: { limit } });
  return res.data || [];
}

export async function createCapture(content: string, tags: string[] = [], source = 'manual'): Promise<Capture> {
  const res = await api.post('/captures', { content, tags, source });
  return res.data;
}

export async function deleteCapture(id: string): Promise<void> {
  await api.delete(`/captures/${id}`);
}

export async function convertCapture(id: string, title: string, priority = 'Medium', dueDate: string | null = null) {
  const res = await api.post(`/captures/${id}/convert`, { title, priority, due_date: dueDate });
  return res.data;
}

// Natural-language parse (Phase 3): free text -> structured task fields
export async function parseNaturalLanguage(text: string) {
  const res = await api.post('/ai/parse', { text });
  return res.data;
}
