import { create } from 'zustand';
import api from '../services/api';
import type { DailyPlan, DailyPlanBlock } from '../types';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

const CACHE_PREFIX = 'trackiyo_daily_plan_';

interface DailyPlanState {
  planDate: string;
  blocks: DailyPlanBlock[];
  source: string;
  isLoading: boolean;
  isGenerating: boolean;
  energyContext: string;
  fetchPlan: (date?: string) => Promise<void>;
  generatePlan: (date?: string) => Promise<void>;
  updateBlocks: (blocks: DailyPlanBlock[]) => Promise<void>;
  setEnergyContext: (level: string) => void;
}

export const useDailyPlanStore = create<DailyPlanState>((set, get) => ({
  planDate: todayStr(),
  blocks: [],
  source: 'none',
  isLoading: false,
  isGenerating: false,
  energyContext: 'medium',

  fetchPlan: async (date) => {
    const d = date || get().planDate;
    set({ isLoading: true });
    try {
      const res = await api.get('/daily-plans', { params: { date: d } });
      const plan: DailyPlan = res.data;
      set({ planDate: d, blocks: plan?.plan_json || [], isLoading: false });
      try { localStorage.setItem(CACHE_PREFIX + d, JSON.stringify(plan?.plan_json || [])); } catch {}
    } catch {
      try {
        const raw = localStorage.getItem(CACHE_PREFIX + d);
        set({ planDate: d, blocks: raw ? JSON.parse(raw) : [], isLoading: false });
      } catch { set({ isLoading: false }); }
    }
  },

  generatePlan: async (date) => {
    const d = date || get().planDate;
    set({ isGenerating: true });
    try {
      const res = await api.post('/ai/daily-plan', { date: d });
      const blocks = res.data?.plan_json || [];
      set({ planDate: d, blocks, source: res.data?.source || 'heuristic', isGenerating: false });
      try { localStorage.setItem(CACHE_PREFIX + d, JSON.stringify(blocks)); } catch {}
      // Persist first so reloads keep the plan
      try { await api.put('/daily-plans', { date: d, plan_json: blocks }); } catch {}
    } catch {
      set({ isGenerating: false });
    }
  },

  updateBlocks: async (blocks) => {
    const { planDate, energyContext } = get();
    // Persist first, then update UI (cross-phase consistency rule)
    try { await api.put('/daily-plans', { date: planDate, plan_json: blocks, energy_context: energyContext }); } catch {}
    set({ blocks });
    try { localStorage.setItem(CACHE_PREFIX + planDate, JSON.stringify(blocks)); } catch {}
  },

  setEnergyContext: (level) => set({ energyContext: level }),
}));
