const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET gamification state
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('xp, level, gamification_enabled, unlocked_achievements')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error && error.code !== '42703' && error.code !== '42P01') throw error;

    res.status(200).json({
      xp: profile?.xp || 0,
      level: profile?.level || 1,
      gamification_enabled: profile?.gamification_enabled ?? true,
      unlocked_achievements: profile?.unlocked_achievements || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD XP / update achievements
router.post('/award', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { xpToAdd, achievementId } = req.body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, unlocked_achievements')
      .eq('id', req.user.id)
      .maybeSingle();

    const currentXp = (profile?.xp || 0) + (parseInt(xpToAdd) || 0);
    // Formula: level = floor(sqrt(xp / 100)) + 1
    const newLevel = Math.max(1, Math.floor(Math.sqrt(currentXp / 100)) + 1);

    const currentBadges = profile?.unlocked_achievements || [];
    let updatedBadges = [...currentBadges];
    if (achievementId && !updatedBadges.includes(achievementId)) {
      updatedBadges.push(achievementId);
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        xp: currentXp,
        level: newLevel,
        unlocked_achievements: updatedBadges
      })
      .eq('id', req.user.id);

    if (updateError && updateError.code !== '42703') throw updateError;

    res.status(200).json({
      xp: currentXp,
      level: newLevel,
      unlocked_achievements: updatedBadges,
      levelUp: newLevel > (profile?.level || 1)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE gamification settings (e.g. toggle enabled)
router.patch('/settings', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { enabled } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .update({ gamification_enabled: !!enabled })
      .eq('id', req.user.id)
      .select('gamification_enabled')
      .single();

    if (error && error.code !== '42703') throw error;
    res.status(200).json({ success: true, gamification_enabled: data?.gamification_enabled ?? !!enabled });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Achievement catalog + rules engine with Tier classifications (Bronze, Silver, Gold, Platinum)
const ACHIEVEMENTS = [
  // Consistency & Streaks
  { id: 'streak_3', title: 'Momentum Builder', description: 'Maintain a 3-day consistency streak', icon: '🌱', xp: 30, tier: 'bronze', category: 'consistency', rule: { type: 'active_days', threshold: 3 } },
  { id: 'habit_streak_7', title: 'Consistency Starter', description: 'Maintain a 7-day streak across any activity', icon: '⚡', xp: 80, tier: 'bronze', category: 'consistency', rule: { type: 'active_days', threshold: 7 } },
  { id: 'streak_14', title: 'Habit Formation', description: 'Sustain consistency for 14 straight days', icon: '🛡️', xp: 150, tier: 'silver', category: 'consistency', rule: { type: 'active_days', threshold: 14 } },
  { id: 'habit_streak_30', title: 'Iron Discipline', description: 'Reach a formidable 30-day streak', icon: '🔥', xp: 300, tier: 'gold', category: 'consistency', rule: { type: 'active_days', threshold: 30 } },
  { id: 'streak_50', title: 'Unstoppable Force', description: 'Persevere for 50 uninterrupted days', icon: '💎', xp: 500, tier: 'gold', category: 'consistency', rule: { type: 'active_days', threshold: 50 } },
  { id: 'streak_100', title: 'Centurion Legend', description: 'Cross 100 days of disciplined execution', icon: '👑', xp: 1000, tier: 'platinum', category: 'consistency', rule: { type: 'active_days', threshold: 100 } },

  // Tasks Execution
  { id: 'first_task', title: 'First Step', description: 'Complete your first task', icon: '🎯', xp: 20, tier: 'bronze', category: 'tasks', rule: { type: 'tasks_completed', threshold: 1 } },
  { id: 'task_10', title: 'Task Crusher', description: 'Complete 10 tasks', icon: '⚡', xp: 50, tier: 'bronze', category: 'tasks', rule: { type: 'tasks_completed', threshold: 10 } },
  { id: 'task_50', title: 'Productivity Machine', description: 'Complete 50 tasks', icon: '🚀', xp: 150, tier: 'silver', category: 'tasks', rule: { type: 'tasks_completed', threshold: 50 } },
  { id: 'century_club', title: 'Century Club', description: 'Complete 100 tasks', icon: '🏆', xp: 300, tier: 'gold', category: 'tasks', rule: { type: 'tasks_completed', threshold: 100 } },
  { id: 'task_500', title: 'Grandmaster Executor', description: 'Complete 500 tasks', icon: '🏛️', xp: 1000, tier: 'platinum', category: 'tasks', rule: { type: 'tasks_completed', threshold: 500 } },
  { id: 'inbox_zero', title: 'Inbox Zero', description: 'Have zero overdue tasks', icon: '✨', xp: 40, tier: 'bronze', category: 'tasks', rule: { type: 'zero_overdue', threshold: 1 } },
  { id: 'week_warrior', title: 'Week Warrior', description: 'Complete 5+ tasks in the last 7 days', icon: '🛡️', xp: 80, tier: 'bronze', category: 'tasks', rule: { type: 'tasks_week', threshold: 5 } },
  { id: 'perfect_day', title: 'Perfect Day', description: 'Finish everything due today', icon: '☀️', xp: 100, tier: 'silver', category: 'tasks', rule: { type: 'perfect_day', threshold: 1 } },

  // Deep Focus
  { id: 'first_focus', title: 'Deep Initiation', description: 'Complete your first deep work session', icon: '🧠', xp: 40, tier: 'bronze', category: 'focus', rule: { type: 'focus_sessions', threshold: 1 } },
  { id: 'deep_worker', title: 'Deep Worker', description: 'Complete 10 focused work sessions', icon: '🧘', xp: 100, tier: 'silver', category: 'focus', rule: { type: 'focus_sessions', threshold: 10 } },
  { id: 'focus_60', title: 'Hour of Flow', description: 'Log 60 minutes of deep focus', icon: '🎧', xp: 50, tier: 'bronze', category: 'focus', rule: { type: 'focus_minutes', threshold: 60 } },
  { id: 'focus_300', title: 'Flow Master', description: 'Log 5 hours of deep focus', icon: '🌊', xp: 150, tier: 'silver', category: 'focus', rule: { type: 'focus_minutes', threshold: 300 } },
  { id: 'focus_1500', title: 'Deep Work Virtuoso', description: 'Accumulate 25 hours of focused work', icon: '🌌', xp: 500, tier: 'gold', category: 'focus', rule: { type: 'focus_minutes', threshold: 1500 } },
  { id: 'focus_3000', title: 'Monk Mode Master', description: 'Surpass 50 hours of deep work', icon: '⭐', xp: 1000, tier: 'platinum', category: 'focus', rule: { type: 'focus_minutes', threshold: 3000 } },

  // Habits & Wellness
  { id: 'first_habit', title: 'Habit Anchor', description: 'Log your first daily habit', icon: '🌱', xp: 20, tier: 'bronze', category: 'habits', rule: { type: 'habit_logs', threshold: 1 } },
  { id: 'habit_100', title: 'Century Habit Club', description: 'Log 100 total habit check-ins', icon: '🏅', xp: 250, tier: 'silver', category: 'habits', rule: { type: 'habit_logs', threshold: 100 } },
  { id: 'wellness_champion', title: 'Mind & Body Harmony', description: 'Log wellness entries for 7 days', icon: '🌿', xp: 80, tier: 'bronze', category: 'habits', rule: { type: 'wellness_days', threshold: 7 } },
  { id: 'hydration_hero', title: 'Hydration Champion', description: 'Log water tracking in wellness', icon: '💧', xp: 40, tier: 'bronze', category: 'habits', rule: { type: 'water_days', threshold: 3 } },

  // Community & Challenges
  { id: 'challenge_pro', title: 'Challenge Accepted', description: 'Create or join a friend habit challenge', icon: '⚔️', xp: 50, tier: 'bronze', category: 'productivity', rule: { type: 'challenges_count', threshold: 1 } },
  { id: 'share_pro', title: 'Milestone Showcase', description: 'Export or share a milestone or challenge card', icon: '📇', xp: 40, tier: 'bronze', category: 'productivity', rule: { type: 'shares_count', threshold: 1 } },
];

// GET achievement catalog with earned state
router.get('/achievements', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data: log } = await supabase.from('achievement_log').select('achievement_id, earned_at').eq('user_id', req.user.id);
    const earned = new Set((log || []).map(l => l.achievement_id));
    res.status(200).json(ACHIEVEMENTS.map(a => ({ ...a, unlocked: earned.has(a.id), unlockedAt: (log || []).find(l => l.achievement_id === a.id)?.earned_at || null })));
  } catch (error) {
    if (error.code === '42P01') return res.status(200).json(ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })));
    res.status(500).json({ error: error.message });
  }
});

// POST evaluate rules and award newly-earned achievements
router.post('/achievements/check', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const todayStr = new Date().toISOString().split('T')[0];
    const [
      { data: tasks },
      { data: focus },
      { data: log },
      { data: habits },
      { data: habitLogs },
      { data: wellness },
      { data: shares },
      { data: challenges }
    ] = await Promise.all([
      supabase.from('tasks').select('id, is_completed, due_date, created_at').eq('user_id', req.user.id),
      supabase.from('focus_sessions').select('duration, completed_at').eq('user_id', req.user.id),
      supabase.from('achievement_log').select('achievement_id').eq('user_id', req.user.id),
      supabase.from('habits').select('id, created_at').eq('user_id', req.user.id),
      supabase.from('habit_logs').select('habit_id, log_date, completed').eq('user_id', req.user.id).eq('completed', true),
      supabase.from('wellness').select('log_date, water').eq('user_id', req.user.id),
      supabase.from('public_shares').select('id').eq('user_id', req.user.id),
      supabase.from('challenges').select('id').or(`creator_id.eq.${req.user.id},opponent_id.eq.${req.user.id}`)
    ]);

    const earned = new Set((log || []).map(l => l.achievement_id));
    const doneCount = (tasks || []).filter(t => t.is_completed).length;
    const focusMins = Math.round(((focus || []).reduce((a, f) => a + (f.duration || 0), 0)) / 60);
    const overdue = (tasks || []).filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr).length;
    const weekAgo = Date.now() - 7 * 86400000;
    const weekCount = (tasks || []).filter(t => t.is_completed && t.created_at && new Date(t.created_at).getTime() >= weekAgo).length;
    const todayTasks = (tasks || []).filter(t => t.due_date && t.due_date.slice(0, 10) === todayStr);
    const perfectDay = (todayTasks.length > 0 && todayTasks.every(t => t.is_completed)) ? 1 : 0;
    const habitLogsCount = (habitLogs || []).length;
    const wellnessDaysCount = (wellness || []).length;
    const waterDaysCount = (wellness || []).filter(w => (w.water || 0) > 0).length;
    const sharesCount = Math.max((shares || []).length, Number(req.body?.shareCount) || 0);
    const challengesCount = Math.max((challenges || []).length, Number(req.body?.challengeCount) || 0);

    // Calculate actual best habit/active streak
    let bestActiveDays = 0;
    (habits || []).forEach(h => {
      const dates = new Set((habitLogs || []).filter(l => l.habit_id === h.id).map(l => l.log_date));
      let streak = 0;
      let d = new Date(todayStr + 'T12:00:00Z');
      // Look back up to 365 days
      for (let i = 0; i < 365; i++) {
        const dStr = d.toISOString().split('T')[0];
        if (dates.has(dStr)) {
          streak++;
        } else if (i === 0) {
          // today may not be logged yet
        } else {
          break;
        }
        d.setUTCDate(d.getUTCDate() - 1);
      }
      if (streak > bestActiveDays) bestActiveDays = streak;
    });

    const stats = {
      tasks_completed: doneCount,
      focus_minutes: focusMins,
      focus_sessions: (focus || []).length,
      active_days: Math.max(bestActiveDays, 1),
      zero_overdue: (overdue === 0 && doneCount > 0) ? 1 : 0,
      tasks_week: weekCount,
      perfect_day: perfectDay,
      habit_logs: habitLogsCount,
      wellness_days: wellnessDaysCount,
      water_days: waterDaysCount,
      shares_count: sharesCount,
      challenges_count: challengesCount
    };
    const newlyEarned = [];
    for (const a of ACHIEVEMENTS) {
      if (earned.has(a.id)) continue;
      if ((stats[a.rule.type] || 0) >= a.rule.threshold) {
        try {
          await supabase.from('achievement_log').insert([{ user_id: req.user.id, achievement_id: a.id, xp_awarded: a.xp }]);
        } catch (e) { /* table may not exist yet */ }
        newlyEarned.push(a);
      }
    }
    if (newlyEarned.length > 0) {
      const totalXp = newlyEarned.reduce((s, a) => s + a.xp, 0);
      try {
        const { data: profile } = await supabase.from('profiles').select('xp, level, unlocked_achievements').eq('id', req.user.id).maybeSingle();
        const newXp = (profile?.xp || 0) + totalXp;
        const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);
        const badges = [...(profile?.unlocked_achievements || [])];
        newlyEarned.forEach(a => { if (!badges.includes(a.id)) badges.push(a.id); });
        await supabase.from('profiles').update({ xp: newXp, level: newLevel, unlocked_achievements: badges }).eq('id', req.user.id);
      } catch (e) { console.warn('XP award failed:', e.message); }
    }
    res.status(200).json({ newlyEarned, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
