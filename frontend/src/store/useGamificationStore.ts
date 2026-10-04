import { create } from 'zustand';
import api from '../services/api';
import type { Achievement } from '../types';

const GAMIFICATION_CACHE_KEY = 'trackiyo_cached_gamification';

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Consistency & Streaks
  {
    id: 'streak_3',
    title: 'Momentum Builder',
    description: 'Maintain a 3-day consistency streak',
    icon: '🌱',
    tier: 'bronze',
    category: 'consistency',
    xp: 30,
    unlocked: false
  },
  {
    id: 'habit_streak_7',
    title: 'Consistency Starter',
    description: 'Maintain a 7-day streak on any habit',
    icon: '⚡',
    tier: 'bronze',
    category: 'consistency',
    xp: 80,
    unlocked: false
  },
  {
    id: 'streak_14',
    title: 'Habit Formation',
    description: 'Sustain consistency for 14 straight days',
    icon: '🛡️',
    tier: 'silver',
    category: 'consistency',
    xp: 150,
    unlocked: false
  },
  {
    id: 'habit_streak_30',
    title: 'Iron Discipline',
    description: 'Achieve a 30-day streak on any habit',
    icon: '🔥',
    tier: 'gold',
    category: 'consistency',
    xp: 300,
    unlocked: false
  },
  {
    id: 'streak_50',
    title: 'Unstoppable Force',
    description: 'Persevere for 50 uninterrupted days',
    icon: '💎',
    tier: 'gold',
    category: 'consistency',
    xp: 500,
    unlocked: false
  },
  {
    id: 'streak_100',
    title: 'Centurion Legend',
    description: 'Cross 100 days of disciplined execution',
    icon: '👑',
    tier: 'platinum',
    category: 'consistency',
    xp: 1000,
    unlocked: false
  },

  // Tasks
  {
    id: 'first_task',
    title: 'First Step',
    description: 'Complete your first task in Trackiyo',
    icon: '🎯',
    tier: 'bronze',
    category: 'tasks',
    xp: 20,
    unlocked: false
  },
  {
    id: 'task_10',
    title: 'Task Crusher',
    description: 'Complete 10 tasks',
    icon: '⚡',
    tier: 'bronze',
    category: 'tasks',
    xp: 50,
    unlocked: false
  },
  {
    id: 'task_50',
    title: 'Productivity Machine',
    description: 'Complete 50 tasks',
    icon: '🚀',
    tier: 'silver',
    category: 'tasks',
    xp: 150,
    unlocked: false
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Complete 100 tasks across all categories',
    icon: '🏆',
    tier: 'gold',
    category: 'tasks',
    xp: 300,
    unlocked: false
  },
  {
    id: 'inbox_zero',
    title: 'Inbox Zero',
    description: 'Have zero overdue tasks',
    icon: '✨',
    tier: 'bronze',
    category: 'tasks',
    xp: 40,
    unlocked: false
  },
  {
    id: 'perfect_day',
    title: 'Perfect Day',
    description: 'Finish everything due today',
    icon: '☀️',
    tier: 'silver',
    category: 'tasks',
    xp: 100,
    unlocked: false
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Complete 5+ tasks in the last 7 days',
    icon: '🛡️',
    tier: 'bronze',
    category: 'tasks',
    xp: 80,
    unlocked: false
  },

  // Focus
  {
    id: 'first_focus',
    title: 'Deep Initiation',
    description: 'Complete your first deep work session',
    icon: '🧠',
    tier: 'bronze',
    category: 'focus',
    xp: 40,
    unlocked: false
  },
  {
    id: 'deep_worker',
    title: 'Deep Worker',
    description: 'Complete 10 focused work sessions',
    icon: '🧘',
    tier: 'silver',
    category: 'focus',
    xp: 100,
    unlocked: false
  },
  {
    id: 'focus_60',
    title: 'Deep Focus',
    description: 'Log 60 minutes of focused work',
    icon: '🎧',
    tier: 'bronze',
    category: 'focus',
    xp: 50,
    unlocked: false
  },
  {
    id: 'focus_300',
    title: 'Flow Master',
    description: 'Log 5 hours of focused work',
    icon: '🌊',
    tier: 'silver',
    category: 'focus',
    xp: 150,
    unlocked: false
  },
  {
    id: 'focus_1500',
    title: 'Deep Work Virtuoso',
    description: 'Accumulate 25 hours of focused work',
    icon: '🌌',
    tier: 'gold',
    category: 'focus',
    xp: 500,
    unlocked: false
  },
  {
    id: 'focus_3000',
    title: 'Monk Mode Master',
    description: 'Surpass 50 hours of deep work',
    icon: '⭐',
    tier: 'platinum',
    category: 'focus',
    xp: 1000,
    unlocked: false
  },

  // Habits & Wellness
  {
    id: 'first_habit',
    title: 'Habit Anchor',
    description: 'Log your first daily habit check-in',
    icon: '🌱',
    tier: 'bronze',
    category: 'habits',
    xp: 20,
    unlocked: false
  },
  {
    id: 'habit_100',
    title: 'Century Habit Club',
    description: 'Log 100 total habit check-ins',
    icon: '🏅',
    tier: 'silver',
    category: 'habits',
    xp: 250,
    unlocked: false
  },
  {
    id: 'wellness_champion',
    title: 'Mind & Body Harmony',
    description: 'Log wellness entries for 7 days',
    icon: '🌿',
    tier: 'bronze',
    category: 'habits',
    xp: 80,
    unlocked: false
  },
  {
    id: 'hydration_hero',
    title: 'Hydration Champion',
    description: 'Log water tracking in wellness',
    icon: '💧',
    tier: 'bronze',
    category: 'habits',
    xp: 40,
    unlocked: false
  },

  // Community & Challenges
  {
    id: 'challenge_pro',
    title: 'Challenge Accepted',
    description: 'Create or join a friend habit challenge',
    icon: '⚔️',
    tier: 'bronze',
    category: 'productivity',
    xp: 50,
    unlocked: false
  },
  {
    id: 'share_pro',
    title: 'Milestone Showcase',
    description: 'Export or share a milestone or challenge card',
    icon: '📇',
    tier: 'bronze',
    category: 'productivity',
    xp: 40,
    unlocked: false
  }
];

interface GamificationState {
  xp: number;
  level: number;
  enabled: boolean;
  unlockedBadgeIds: string[];
  achievements: Achievement[];
  recentUnlock: Achievement | null;

  setEnabled: (enabled: boolean) => void;
  awardXp: (amount: number, reason?: string) => Promise<void>;
  checkAndUnlock: (achievementId: string) => Promise<void>;
  clearRecentUnlock: () => void;
  fetchGamification: () => Promise<void>;
}

function loadCached() {
  try {
    const raw = localStorage.getItem(GAMIFICATION_CACHE_KEY);
    return raw ? JSON.parse(raw) : { xp: 120, level: 2, enabled: true, unlockedBadgeIds: ['first_task'] };
  } catch {
    return { xp: 120, level: 2, enabled: true, unlockedBadgeIds: ['first_task'] };
  }
}

function saveCached(data: any) {
  try {
    localStorage.setItem(GAMIFICATION_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export const useGamificationStore = create<GamificationState>((set, get) => {
  const cached = loadCached();
  const achievements = ALL_ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: cached.unlockedBadgeIds.includes(a.id)
  }));

  return {
    xp: cached.xp,
    level: cached.level,
    enabled: cached.enabled ?? true,
    unlockedBadgeIds: cached.unlockedBadgeIds || [],
    achievements,
    recentUnlock: null,

    setEnabled: (enabled) => {
      set({ enabled });
      const { xp, level, unlockedBadgeIds } = get();
      saveCached({ xp, level, enabled, unlockedBadgeIds });
      api.patch('/gamification/settings', { enabled }).catch((err) => {
        console.warn('Failed to sync gamification toggle to server:', err);
      });
    },

    clearRecentUnlock: () => set({ recentUnlock: null }),

    awardXp: async (amount, _reason) => {
      if (!get().enabled) return;

      const newXp = get().xp + amount;
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);

      set({ xp: newXp, level: newLevel });
      const { enabled, unlockedBadgeIds } = get();
      saveCached({ xp: newXp, level: newLevel, enabled, unlockedBadgeIds });

      try {
        await api.post('/gamification/award', { xpToAdd: amount });
      } catch {
        // offline
      }
    },

    checkAndUnlock: async (achievementId) => {
      if (!get().enabled) return;
      const { unlockedBadgeIds, achievements } = get();
      if (unlockedBadgeIds.includes(achievementId)) return;

      const target = achievements.find(a => a.id === achievementId);
      if (!target) return;

      const nextUnlocked = [...unlockedBadgeIds, achievementId];
      const nextAchievements = achievements.map(a => a.id === achievementId ? { ...a, unlocked: true } : a);

      set({
        unlockedBadgeIds: nextUnlocked,
        achievements: nextAchievements,
        recentUnlock: target
      });

      const { xp, level, enabled } = get();
      saveCached({ xp, level, enabled, unlockedBadgeIds: nextUnlocked });

      try {
        await api.post('/gamification/award', { xpToAdd: 50, achievementId });
      } catch {}
    },

    fetchGamification: async () => {
      try {
        const res = await api.get('/gamification');
        if (res.data) {
          const unlocked = res.data.unlocked_achievements || [];
          const achievements = ALL_ACHIEVEMENTS.map(a => ({
            ...a,
            unlocked: unlocked.includes(a.id)
          }));
          set({
            xp: res.data.xp || 0,
            level: res.data.level || 1,
            enabled: res.data.gamification_enabled ?? true,
            unlockedBadgeIds: unlocked,
            achievements
          });
        }
      } catch (err) {
        console.warn('Using cached gamification', err);
      }
    }
  };
});
