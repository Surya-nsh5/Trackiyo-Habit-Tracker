const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/overview', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { days = 30 } = req.query;
    const daysNum = parseInt(days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    const startStr = startDate.toISOString().split('T')[0];

    // Fetch tasks, habits, habit_logs, wellness, focus_sessions concurrently
    const [tasksRes, habitsRes, logsRes, wellnessRes, focusRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', req.user.id),
      supabase.from('habits').select('*').eq('user_id', req.user.id),
      supabase.from('habit_logs').select('*').eq('user_id', req.user.id).gte('log_date', startStr),
      supabase.from('wellness').select('*').eq('user_id', req.user.id).gte('log_date', startStr),
      supabase.from('focus_sessions').select('*').eq('user_id', req.user.id).gte('completed_at', startDate.toISOString())
    ]);

    const tasks = tasksRes.data || [];
    const habits = habitsRes.data || [];
    const habitLogs = logsRes.data || [];
    const wellness = wellnessRes.data || [];
    const focusSessions = focusRes.data || [];

    // Task Analytics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.is_completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr).length;

    // Habit Analytics
    const totalPossibleLogs = habitLogs.length;
    const completedLogs = habitLogs.filter(l => l.completed).length;
    const habitAdherence = totalPossibleLogs > 0 ? Math.round((completedLogs / totalPossibleLogs) * 100) : 0;

    // Focus Analytics
    const totalFocusSeconds = focusSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalFocusMinutes = Math.round(totalFocusSeconds / 60);

    // Wellness Analytics
    let totalMood = 0, moodCount = 0;
    let totalSleep = 0, sleepCount = 0;
    let totalEnergy = 0, energyCount = 0;
    let totalWater = 0, waterCount = 0;

    wellness.forEach(w => {
      if (w.mood != null) { totalMood += w.mood; moodCount++; }
      if (w.sleep != null) { totalSleep += w.sleep; sleepCount++; }
      if (w.energy != null) { totalEnergy += w.energy; energyCount++; }
      if (w.water != null) { totalWater += w.water; waterCount++; }
    });

    const avgMood = moodCount > 0 ? +(totalMood / moodCount).toFixed(1) : null;
    const avgSleep = sleepCount > 0 ? +(totalSleep / sleepCount).toFixed(1) : null;
    const avgEnergy = energyCount > 0 ? +(totalEnergy / energyCount).toFixed(1) : null;
    const avgWater = waterCount > 0 ? +(totalWater / waterCount).toFixed(1) : null;

    // Daily / Overall Productivity Score (0 - 100)
    // 35% task completion rate, 35% habit adherence, 15% focus, 15% wellness check-in consistency
    const taskRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0.5;
    const habitRate = totalPossibleLogs > 0 ? (completedLogs / totalPossibleLogs) : 0.5;
    const focusRate = Math.min(totalFocusMinutes / (daysNum * 45), 1); // 45m daily goal
    const wellnessRate = Math.min(wellness.length / daysNum, 1);

    const productivityScore = Math.min(100, Math.round(
      (taskRate * 35) +
      (habitRate * 35) +
      (focusRate * 15) +
      (wellnessRate * 15)
    ));

    res.status(200).json({
      periodDays: daysNum,
      productivityScore,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      habits: {
        totalHabits: habits.length,
        loggedCount: completedLogs,
        adherence: habitAdherence
      },
      focus: {
        totalMinutes: totalFocusMinutes,
        totalHours: +(totalFocusMinutes / 60).toFixed(1),
        sessionCount: focusSessions.length
      },
      wellness: {
        avgMood,
        avgSleep,
        avgEnergy,
        avgWater,
        loggedDays: wellness.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET procrastination insights (Phase 2 #22)
router.get('/insights', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const todayStr = new Date().toISOString().split('T')[0];
    const [{ data: tasks }, { data: focus }, { data: distractions }] = await Promise.all([
      supabase.from('tasks').select('id, title, priority, due_date, created_at, is_completed').eq('user_id', req.user.id),
      supabase.from('focus_sessions').select('duration, completed_at').eq('user_id', req.user.id).order('completed_at', { ascending: false }).limit(20),
      supabase.from('distractions').select('reason, logged_at').eq('user_id', req.user.id).order('logged_at', { ascending: false }).limit(50),
    ]);
    const all = tasks || [];
    const overdue = all.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr);
    // Repeat offenders: tasks created >7 days ago still pending
    const stale = all.filter(t => {
      if (t.is_completed || !t.created_at) return false;
      return (Date.now() - new Date(t.created_at).getTime()) > 7 * 86400000;
    });
    const distCount = {};
    (distractions || []).forEach(d => { distCount[d.reason] = (distCount[d.reason] || 0) + 1; });
    const topDistractions = Object.entries(distCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([reason, count]) => ({ reason, count }));
    const focusMins = Math.round((focus || []).reduce((a, f) => a + (f.duration || 0), 0) / 60);
    const insights = [];
    if (overdue.length > 0) insights.push({ type: 'overdue', title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`, detail: overdue.slice(0, 3).map(t => t.title).join(', '), action: 'reschedule' });
    if (stale.length > 0) insights.push({ type: 'stale', title: `${stale.length} task${stale.length > 1 ? 's' : ''} aging over a week`, detail: 'Break them into smaller steps or lower the bar to start.', action: 'breakdown' });
    if (topDistractions.length > 0) insights.push({ type: 'distraction', title: `Top distraction: ${topDistractions[0].reason}`, detail: `${topDistractions[0].count} occurrences recently.`, action: 'deep-work' });
    if (focusMins < 60) insights.push({ type: 'focus', title: 'Low focus volume', detail: `Only ${focusMins} min in recent sessions. Aim for one 25-min block today.`, action: 'focus' });
    if (insights.length === 0) insights.push({ type: 'healthy', title: 'On track', detail: 'No procrastination signals detected. Keep momentum.', action: null });
    res.status(200).json({ insights, stats: { overdue: overdue.length, stale: stale.length, focusMins, topDistractions } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET productivity profile (Phase 2 #28)
router.get('/profile', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const [{ data: tasks }, { data: focus }, { data: wellness }, { data: gam }] = await Promise.all([
      supabase.from('tasks').select('is_completed, category, created_at').eq('user_id', req.user.id),
      supabase.from('focus_sessions').select('duration').eq('user_id', req.user.id),
      supabase.from('wellness').select('mood, sleep').eq('user_id', req.user.id).order('log_date', { ascending: false }).limit(14),
      supabase.from('profiles').select('xp, level').eq('id', req.user.id).maybeSingle(),
    ]);
    const all = tasks || [];
    const done = all.filter(t => t.is_completed).length;
    const catCount = {};
    all.forEach(t => { if (t.category) catCount[t.category] = (catCount[t.category] || 0) + 1; });
    const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
    const focusMins = Math.round((focus || []).reduce((a, f) => a + (f.duration || 0), 0) / 60);
    const avgMood = wellness?.length ? +(wellness.reduce((a, w) => a + (w.mood || 5), 0) / wellness.length).toFixed(1) : 0;
    const avgSleep = wellness?.length ? +(wellness.reduce((a, w) => a + (w.sleep || 7), 0) / wellness.length).toFixed(1) : 0;
    // Weekly completion buckets (last 4 weeks)
    const weeklyTaskCompletion = [0, 0, 0, 0];
    all.forEach(t => {
      if (!t.is_completed || !t.created_at) return;
      const weeksAgo = Math.floor((Date.now() - new Date(t.created_at).getTime()) / (7 * 86400000));
      if (weeksAgo >= 0 && weeksAgo < 4) weeklyTaskCompletion[3 - weeksAgo] += 1;
    });
    const productivityScore = Math.min(100, Math.round((all.length ? (done / all.length) * 60 : 30) + Math.min(focusMins / 10, 25) + (wellness?.length ? 15 : 5)));
    res.status(200).json({
      totalTasksCompleted: done, totalFocusMinutes: focusMins, avgMood, avgSleep,
      productivityScore, level: gam?.level || 1, xp: gam?.xp || 0,
      topCategory, weeklyTaskCompletion, currentHabitStreaks: {},
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
