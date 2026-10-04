const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A prompt is required.' });
    }

    const supabase = createSupabaseClient(req);

    // Fetch user context safely
    const [tasksRes, habitsRes, wellnessRes, focusRes] = await Promise.all([
      supabase.from('tasks').select('id, title, priority, category, is_completed, due_date').eq('user_id', req.user.id),
      supabase.from('habits').select('id, name, monthly_goal').eq('user_id', req.user.id),
      supabase.from('wellness').select('log_date, mood, sleep, notes').eq('user_id', req.user.id).order('log_date', { ascending: false }).limit(7),
      supabase.from('focus_sessions').select('duration, session_type, completed_at').eq('user_id', req.user.id).order('completed_at', { ascending: false }).limit(10)
    ]);

    const tasks = tasksRes.data || [];
    const habits = habitsRes.data || [];
    const wellness = wellnessRes.data || [];
    const focus = focusRes.data || [];
    const goals = [];

    const completedTasks = tasks.filter(t => t.is_completed).length;
    const pendingTasks = tasks.filter(t => !t.is_completed);
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'High');
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = pendingTasks.filter(t => t.due_date && t.due_date.slice(0, 10) < todayStr);

    const totalFocusMinutes = Math.round(focus.reduce((acc, f) => acc + (f.duration || 0), 0) / 60);

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const systemContext = `You are Trackiyo Assistant, a personal productivity and wellness coach.
Here is the user's current live Trackiyo data:
- Tasks: ${tasks.length} total (${completedTasks} completed, ${pendingTasks.length} pending, ${overdueTasks.length} overdue, ${highPriorityTasks.length} high-priority).
- High priority pending: ${highPriorityTasks.map(t => t.title).slice(0, 5).join(', ') || 'None'}.
- Habits tracked: ${habits.map(h => h.name).join(', ') || 'None'}.
- Active goals: ${goals.filter(g => g.status === 'active').map(g => `${g.title} (${g.progress}%)`).join(', ') || 'None'}.
- Total focus time recorded recently: ${totalFocusMinutes} minutes.
- Recent wellness: average mood is ${wellness.length ? (wellness.reduce((a, b) => a + (b.mood || 5), 0) / wellness.length).toFixed(1) : 'N/A'}/10, average sleep is ${wellness.length ? (wellness.reduce((a, b) => a + (b.sleep || 7), 0) / wellness.length).toFixed(1) : 'N/A'} hours.

Answer the user's question directly, concisely, and insightfully based on their data. Keep answers under 3-4 short paragraphs. Do not invent numbers.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemContext}\n\nUser Question: ${prompt}` }] }
            ],
            generationConfig: {
              maxOutputTokens: 2500,
              temperature: 0.7,
              thinkingConfig: { thinkingBudget: 0 }
            }
          })
        });

        if (response.ok) {
          const geminiData = await response.json();
          const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || geminiData?.candidates?.[0]?.parts?.[0]?.text;
          if (reply) {
            return res.status(200).json({ reply, source: 'ai' });
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to heuristic engine:', err.message);
      }
    }

    // Heuristic Smart Assistant Fallback (Always works cleanly without API key)
    const lower = prompt.toLowerCase();
    let reply = '';

    if (lower.includes('productive') || lower.includes('week') || lower.includes('summary')) {
      reply = `**Weekly Productivity Summary**\n\n` +
        `• **Tasks**: You have completed **${completedTasks}** out of ${tasks.length} tasks (${tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0}% completion rate).\n` +
        `• **Deep Work**: Logged **${totalFocusMinutes} minutes** of focused work recently.\n` +
        `• **Habits**: You have **${habits.length} habits** in your routine.\n` +
        (overdueTasks.length ? `⚠️ **Notice**: You have **${overdueTasks.length} overdue task(s)** requiring your attention.` : `🎉 **Great job**: Zero overdue tasks right now!`);
    } else if (lower.includes('focus') || lower.includes('today') || lower.includes('tackle') || lower.includes('what should')) {
      if (highPriorityTasks.length > 0) {
        reply = `**Recommended Focus for Today**\n\n` +
          `Based on your priority queue and deadlines, here is what you should tackle first:\n\n` +
          `1. **${highPriorityTasks[0].title}** (High Priority${highPriorityTasks[0].due_date ? ` — Due ${highPriorityTasks[0].due_date.slice(0, 10)}` : ''})\n` +
          (highPriorityTasks[1] ? `2. **${highPriorityTasks[1].title}**\n` : '') +
          `\n💡 *Tip: Start a 25-minute Pomodoro session in Focus Mode to tackle the first item with zero distractions.*`;
      } else if (pendingTasks.length > 0) {
        reply = `**Recommended Next Step**\n\n` +
          `You have no overdue or high-priority emergencies! You can make strong progress on:\n\n` +
          `• **${pendingTasks[0].title}**\n\n` +
          `Pick this task, set a 25-minute timer, and get momentum going.`;
      } else {
        reply = `**All Caught Up!**\n\n` +
          `You currently have no pending tasks. This is a great time to review your **Goals** or plan your upcoming week in the **Calendar**!`;
      }
    } else if (lower.includes('habit') || lower.includes('consistency') || lower.includes('routine')) {
      reply = `**Habit Consistency Insights**\n\n` +
        `You are currently tracking **${habits.length} habits**.\n\n` +
        `• Best practice: Complete your habits at the same time each day (habit stacking).\n` +
        `• Remember to check off your habits on the **Habits** grid before the day ends.\n` +
        `• Check the **Analytics** view to see your 30-day streak health.`;
    } else if (lower.includes('wellness') || lower.includes('sleep') || lower.includes('mood') || lower.includes('energy')) {
      const avgSleep = wellness.length ? (wellness.reduce((a, b) => a + (b.sleep || 7), 0) / wellness.length).toFixed(1) : '7.0';
      const avgMood = wellness.length ? (wellness.reduce((a, b) => a + (b.mood || 7), 0) / wellness.length).toFixed(1) : '7.0';
      reply = `**Wellness Snapshot**\n\n` +
        `• **Recent Average Sleep**: ${avgSleep} hours/night.\n` +
        `• **Recent Average Mood**: ${avgMood} / 10.\n\n` +
        `Higher sleep consistency directly boosts task completion and focus stamina. Make sure to log today's check-in!`;
    } else {
      reply = `I am your **Trackiyo Productivity Assistant**. You have **${pendingTasks.length} pending tasks** (${highPriorityTasks.length} high priority), **${habits.length} active habits**, and **${goals.filter(g => g.status === 'active').length} active goals**.\n\n` +
        `You can ask me:\n` +
        `• *"How productive was I this week?"*\n` +
        `• *"What should I focus on today?"*\n` +
        `• *"Analyze my habits and routine"*\n` +
        `• *"How is my wellness tracking?"*`;
    }

    res.status(200).json({ reply, source: 'heuristic' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/daily-plan — Generate an AI-powered daily plan
router.post('/daily-plan', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { date } = req.body;
    const planDate = date || new Date().toISOString().split('T')[0];

    // Fetch context
    const [tasksRes, habitsRes, wellnessRes] = await Promise.all([
      supabase.from('tasks').select('id, title, priority, due_date, estimated_duration, is_completed, category').eq('user_id', req.user.id).eq('is_completed', false),
      supabase.from('habits').select('id, name, icon').eq('user_id', req.user.id),
      supabase.from('wellness').select('mood, energy').eq('user_id', req.user.id).order('log_date', { ascending: false }).limit(1),
    ]);

    const tasks = tasksRes.data || [];
    const habits = habitsRes.data || [];
    const energyLevel = wellnessRes.data?.[0]?.energy || 7;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date.slice(0, 10) < todayStr);
    const todayTasks = tasks.filter(t => !t.due_date || t.due_date.slice(0, 10) === planDate);
    const highPriority = tasks.filter(t => t.priority === 'High').slice(0, 5);

    // Build AI plan using Gemini if available, otherwise heuristic
    const apiKey = process.env.GEMINI_API_KEY;
    let planBlocks = [];

    if (apiKey) {
      try {
        const prompt = `You are a productivity coach. Create a realistic daily schedule for ${planDate} in JSON format.
Context:
- Energy level: ${energyLevel}/10
- Overdue tasks: ${overdueTasks.map(t => t.title).join(', ') || 'none'}
- High priority tasks: ${highPriority.map(t => `${t.title} (${t.estimated_duration || 30}m est.)`).join(', ') || 'none'}
- Daily habits: ${habits.map(h => h.name).join(', ') || 'none'}

Return ONLY a JSON array of time blocks, like:
[{"time":"09:00","duration_minutes":25,"title":"Task name","type":"task","is_suggested":true}]
Types: task, habit, break, focus. Include at least one break. Keep it between 6 AM and 10 PM. Max 10 blocks.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 2500,
              temperature: 0.6,
              thinkingConfig: { thinkingBudget: 0 }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.candidates?.[0]?.parts?.[0]?.text || '';
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            planBlocks = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (err) {
        console.warn('Gemini daily plan failed, using heuristic:', err.message);
      }
    }

    // Heuristic fallback plan
    if (planBlocks.length === 0) {
      const isHighEnergy = energyLevel >= 7;
      planBlocks = [
        { time: '09:00', duration_minutes: 10, title: 'Morning Review & Planning', type: 'focus', is_suggested: true },
        ...(habits.slice(0, 2).map((h, i) => ({
          time: `09:${(i + 1) * 15 < 60 ? String((i + 1) * 15).padStart(2, '0') : '30'}`,
          duration_minutes: 10,
          title: h.name,
          type: 'habit',
          habit_id: h.id,
          is_suggested: true
        }))),
        ...(overdueTasks.slice(0, 1).map(t => ({
          time: '10:00',
          duration_minutes: Math.max(30, t.estimated_duration || 30),
          title: `⚠️ ${t.title}`,
          type: 'task',
          task_id: t.id,
          is_suggested: true
        }))),
        ...(highPriority.slice(0, isHighEnergy ? 3 : 2).map((t, i) => ({
          time: `${11 + i}:00`,
          duration_minutes: Math.max(25, t.estimated_duration || 25),
          title: t.title,
          type: 'task',
          task_id: t.id,
          is_suggested: true
        }))),
        { time: '12:30', duration_minutes: 30, title: 'Lunch Break', type: 'break', is_suggested: true },
        { time: '15:00', duration_minutes: 5, title: 'Short Break', type: 'break', is_suggested: true },
        { time: '17:00', duration_minutes: 15, title: 'Daily Review', type: 'focus', is_suggested: true },
      ];
    }

    // Save plan
    const plan = { plan_date: planDate, plan_json: planBlocks };
    try {
      await supabase.from('daily_plans').upsert([{ user_id: req.user.id, ...plan }], { onConflict: 'user_id,plan_date' });
    } catch (saveErr) {
      console.warn('Could not persist daily plan:', saveErr);
    }

    res.status(200).json({ plan_date: planDate, plan_json: planBlocks, source: apiKey ? 'ai' : 'heuristic' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/smart-priority — Re-score task priorities
router.post('/smart-priority', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const today = new Date().toISOString().split('T')[0];

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, priority, due_date, created_at, estimated_duration')
      .eq('user_id', req.user.id)
      .eq('is_completed', false);

    if (!tasks || tasks.length === 0) return res.status(200).json([]);

    const scored = tasks.map(task => {
      let score = 0;
      if (task.priority === 'High') score += 100;
      else if (task.priority === 'Medium') score += 50;
      else score += 10;

      if (task.due_date) {
        const days = Math.floor((new Date(task.due_date).getTime() - Date.now()) / 86400000);
        if (days < 0) score += 200;
        else if (days === 0) score += 150;
        else if (days <= 2) score += 80;
        else if (days <= 7) score += 30;
      }

      // Smaller tasks get a slight boost (quick wins)
      if (task.estimated_duration && task.estimated_duration <= 15) score += 15;

      return { task_id: task.id, score: Math.round(score), title: task.title };
    });

    // Update priority_score in tasks table
    for (const s of scored) {
      await supabase.from('tasks').update({ priority_score: s.score })
        .eq('id', s.task_id).eq('user_id', req.user.id);
    }

    res.status(200).json(scored.sort((a, b) => b.score - a.score));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================================
// ADVANCED AI COACHING & PRODUCTIVITY INTELLIGENCE ENGINE (Phases 1-3)
// ==============================================================================

/**
 * Builds rich, real user context across Tasks, Habits, Wellness, and Focus.
 * Never invents data. Computes real completion metrics, streaks, and patterns.
 */
async function buildUserCoachingContext(supabase, userId) {
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const [tasksRes, habitsRes, habitLogsRes, wellnessRes, focusRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, priority, category, due_date, estimated_duration, is_completed, completed_at, created_at, tags')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('habits')
      .select('id, name, icon, monthly_goal, frequency, target_days_per_week, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('habit_id, log_date, completed')
      .eq('user_id', userId)
      .gte('log_date', thirtyDaysAgo),
    supabase
      .from('wellness')
      .select('log_date, mood, sleep, water, energy, stress, notes')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(7),
    supabase
      .from('focus_sessions')
      .select('duration, completed_at, session_type')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(30)
  ]);

  const allTasks = tasksRes.data || [];
  const habits = habitsRes.data || [];
  const habitLogs = habitLogsRes.data || [];
  const wellness = wellnessRes.data || [];
  const focus = focusRes.data || [];

  // Tasks Analysis
  const pendingTasks = allTasks.filter(t => !t.is_completed);
  const completedTasks = allTasks.filter(t => t.is_completed);
  const overdueTasks = pendingTasks.filter(t => t.due_date && t.due_date.slice(0, 10) < todayStr);
  const dueTodayTasks = pendingTasks.filter(t => t.due_date && t.due_date.slice(0, 10) === todayStr);
  const highPriorityTasks = pendingTasks.filter(t => t.priority === 'High');
  const completedToday = completedTasks.filter(t => t.completed_at && t.completed_at.slice(0, 10) === todayStr);
  const completedLast7Days = completedTasks.filter(t => t.completed_at && t.completed_at.slice(0, 10) >= sevenDaysAgo);
  const completionRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
  const recentCompletionRate = (completedLast7Days.length + pendingTasks.length) > 0
    ? Math.round((completedLast7Days.length / (completedLast7Days.length + pendingTasks.length)) * 100)
    : 0;

  // Habits Analysis
  const habitStats = habits.map(h => {
    const logs7 = habitLogs.filter(l => l.habit_id === h.id && l.log_date >= sevenDaysAgo && l.completed);
    const logs30 = habitLogs.filter(l => l.habit_id === h.id && l.completed);
    const count7 = logs7.length;
    const rate7 = Math.round((count7 / 7) * 100);
    const misses7 = 7 - count7;

    // Calculate streak
    let streak = 0;
    const sortedDates = [...new Set(habitLogs.filter(l => l.habit_id === h.id && l.completed).map(l => l.log_date))].sort().reverse();
    const cursor = new Date();
    // Allow today or yesterday as streak anchor
    const todayLog = sortedDates.includes(todayStr);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayLog = sortedDates.includes(yesterdayStr);

    if (todayLog || yesterdayLog) {
      let checkDate = new Date(todayLog ? cursor : Date.now() - 86400000);
      while (true) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (sortedDates.includes(dStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      id: h.id,
      name: h.name,
      icon: h.icon || '📌',
      monthly_goal: h.monthly_goal,
      completed7: count7,
      rate7,
      misses7,
      completed30: logs30.length,
      currentStreak: streak
    };
  });

  const bestHabit = habitStats.length ? [...habitStats].sort((a, b) => b.rate7 - a.rate7 || b.currentStreak - a.currentStreak)[0] : null;
  const strugglingHabit = habitStats.length ? [...habitStats].sort((a, b) => a.rate7 - b.rate7)[0] : null;

  // Wellness Analysis
  const validSleep = wellness.filter(w => typeof w.sleep === 'number' && !isNaN(w.sleep));
  const validMood = wellness.filter(w => typeof w.mood === 'number' && !isNaN(w.mood));
  const avgSleep = validSleep.length ? (validSleep.reduce((a, b) => a + b.sleep, 0) / validSleep.length).toFixed(1) : null;
  const avgMood = validMood.length ? (validMood.reduce((a, b) => a + b.mood, 0) / validMood.length).toFixed(1) : null;
  const todayWellness = wellness.find(w => w.log_date === todayStr);

  // Focus Analysis
  const focusLast7 = focus.filter(f => f.completed_at && f.completed_at.slice(0, 10) >= sevenDaysAgo);
  const totalFocusMinutes7 = Math.round(focusLast7.reduce((acc, f) => acc + (f.duration || 0), 0) / 60);
  const focusToday = focus.filter(f => f.completed_at && f.completed_at.slice(0, 10) === todayStr);
  const focusMinutesToday = Math.round(focusToday.reduce((acc, f) => acc + (f.duration || 0), 0) / 60);

  // Day of Week Pattern
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  completedTasks.forEach(t => {
    if (t.completed_at) {
      const d = new Date(t.completed_at).getDay();
      dayCounts[d]++;
    }
  });
  let peakDayIndex = 0;
  let maxCompletions = 0;
  dayCounts.forEach((cnt, idx) => {
    if (cnt > maxCompletions) {
      maxCompletions = cnt;
      peakDayIndex = idx;
    }
  });
  const peakDay = maxCompletions >= 2 ? dayNames[peakDayIndex] : null;

  return {
    todayStr,
    tasks: {
      total: allTasks.length,
      pending: pendingTasks,
      pendingCount: pendingTasks.length,
      completed: completedTasks,
      completedCount: completedTasks.length,
      overdue: overdueTasks,
      overdueCount: overdueTasks.length,
      dueToday: dueTodayTasks,
      dueTodayCount: dueTodayTasks.length,
      highPriority: highPriorityTasks,
      highPriorityCount: highPriorityTasks.length,
      completedToday,
      completedTodayCount: completedToday.length,
      completedLast7DaysCount: completedLast7Days.length,
      completionRate,
      recentCompletionRate
    },
    habits: {
      list: habitStats,
      totalCount: habits.length,
      bestHabit,
      strugglingHabit
    },
    wellness: {
      avgSleep,
      avgMood,
      loggedToday: Boolean(todayWellness),
      todayMood: todayWellness?.mood || null,
      todaySleep: todayWellness?.sleep || null
    },
    focus: {
      minutesLast7Days: totalFocusMinutes7,
      minutesToday: focusMinutesToday,
      sessionsCountLast7: focusLast7.length
    },
    patterns: {
      peakDay
    }
  };
}

// GET /api/ai/coach/context — Fetch live contextual coaching metrics for user
router.get('/coach/context', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const ctx = await buildUserCoachingContext(supabase, req.user.id);

    // Build intelligent next action recommendation
    let suggestedNextAction = 'Plan your top 3 tasks for today';
    if (ctx.tasks.overdueCount > 0) {
      suggestedNextAction = `Tackle overdue: "${ctx.tasks.overdue[0].title}" or reschedule`;
    } else if (ctx.tasks.highPriorityCount > 0) {
      suggestedNextAction = `Focus on top priority: "${ctx.tasks.highPriority[0].title}"`;
    } else if (ctx.tasks.dueTodayCount > 0) {
      suggestedNextAction = `Complete today's task: "${ctx.tasks.dueToday[0].title}"`;
    } else if (!ctx.wellness.loggedToday) {
      suggestedNextAction = 'Log your daily wellness check-in';
    } else if (ctx.habits.strugglingHabit && ctx.habits.strugglingHabit.rate7 < 50) {
      suggestedNextAction = `Rebuild momentum on: "${ctx.habits.strugglingHabit.name}"`;
    }

    res.status(200).json({
      summary: {
        pendingTasks: ctx.tasks.pendingCount,
        overdueTasks: ctx.tasks.overdueCount,
        highPriorityTasks: ctx.tasks.highPriorityCount,
        completedToday: ctx.tasks.completedTodayCount,
        recentCompletionRate: ctx.tasks.recentCompletionRate,
        totalHabits: ctx.habits.totalCount,
        bestHabit: ctx.habits.bestHabit ? { name: ctx.habits.bestHabit.name, streak: ctx.habits.bestHabit.currentStreak, rate7: ctx.habits.bestHabit.rate7 } : null,
        strugglingHabit: ctx.habits.strugglingHabit ? { name: ctx.habits.strugglingHabit.name, misses7: ctx.habits.strugglingHabit.misses7, rate7: ctx.habits.strugglingHabit.rate7 } : null,
        avgSleep: ctx.wellness.avgSleep,
        avgMood: ctx.wellness.avgMood,
        wellnessLoggedToday: ctx.wellness.loggedToday,
        focusMinutesToday: ctx.focus.minutesToday,
        focusMinutesLast7Days: ctx.focus.minutesLast7Days,
        peakDay: ctx.patterns.peakDay,
        suggestedNextAction
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch coaching context. Please try again.' });
  }
});

// POST /api/ai/coach/action — Execute interactive actions suggested by the coach
router.post('/coach/action', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { type, payload } = req.body;

    if (!type || !payload) {
      return res.status(400).json({ error: 'Action type and payload are required.' });
    }

    if (type === 'create_task') {
      const { title, priority = 'Medium', due_date = null, estimated_duration = 25, category = 'General' } = payload;
      if (!title || !title.trim()) return res.status(400).json({ error: 'Task title is required.' });

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: req.user.id,
          title: title.trim(),
          priority,
          due_date,
          estimated_duration: Number(estimated_duration) || 25,
          category,
          is_completed: false,
          status: 'pending'
        }])
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, message: `Created task "${title}"`, task: data });
    }

    if (type === 'reschedule_task') {
      const { task_ids, new_due_date } = payload;
      if (!Array.isArray(task_ids) || task_ids.length === 0 || !new_due_date) {
        return res.status(400).json({ error: 'Task IDs and new due date are required.' });
      }

      const { error } = await supabase
        .from('tasks')
        .update({ due_date: new_due_date })
        .in('id', task_ids)
        .eq('user_id', req.user.id);

      if (error) throw error;
      return res.status(200).json({ success: true, message: `Rescheduled ${task_ids.length} task(s) to ${new_due_date}` });
    }

    if (type === 'complete_task') {
      const { task_id } = payload;
      if (!task_id) return res.status(400).json({ error: 'Task ID is required.' });

      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', task_id)
        .eq('user_id', req.user.id);

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Task marked as complete.' });
    }

    if (type === 'create_habit') {
      const { name, icon = '📌', monthly_goal = 20, frequency = 'daily' } = payload;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Habit name is required.' });

      const { data, error } = await supabase
        .from('habits')
        .insert([{
          user_id: req.user.id,
          name: name.trim(),
          icon,
          monthly_goal: Number(monthly_goal) || 20,
          frequency
        }])
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, message: `Created habit "${name}"`, habit: data });
    }

    if (type === 'breakdown_goal') {
      const { subtasks } = payload;
      if (!Array.isArray(subtasks) || subtasks.length === 0) {
        return res.status(400).json({ error: 'Subtasks array is required.' });
      }

      const records = subtasks.map((st, i) => ({
        user_id: req.user.id,
        title: typeof st === 'string' ? st : (st.title || `Subtask ${i + 1}`),
        priority: st.priority || 'Medium',
        estimated_duration: Number(st.estimated_duration) || 25,
        due_date: st.due_date || null,
        is_completed: false,
        status: 'pending'
      }));

      const { data, error } = await supabase.from('tasks').insert(records).select('*');
      if (error) throw error;
      return res.status(200).json({ success: true, message: `Added ${records.length} actionable tasks to your queue.`, tasks: data });
    }

    if (type === 'start_focus') {
      return res.status(200).json({ success: true, message: 'Focus chamber configured.', focusConfig: payload });
    }

    return res.status(400).json({ error: `Unsupported action type: ${type}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute requested action. Please try again.' });
  }
});

// POST /api/ai/coaching — Comprehensive AI Coaching Conversation with Real User Context
router.post('/coaching', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { message, session_id = null, mode = 'balanced' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A coaching prompt or question is required.' });
    }

    // 1. Fetch or create session
    let session = null;
    if (session_id) {
      const { data } = await supabase
        .from('coach_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('user_id', req.user.id)
        .maybeSingle();
      session = data;
    }
    if (!session) {
      try {
        const { data } = await supabase
          .from('coach_sessions')
          .insert([{ user_id: req.user.id, messages: [] }])
          .select('*')
          .single();
        session = data;
      } catch {
        session = { id: `local_${Date.now()}`, messages: [] };
      }
    }
    const history = session?.messages || [];
    const userMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };

    // 2. Build live, verified user context across Trackiyo
    const ctx = await buildUserCoachingContext(supabase, req.user.id);
    const todayStr = ctx.todayStr;
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Helper: mode instructions
    const modePersonas = {
      balanced: 'Maintain a balanced, objective, and constructive coaching tone. Follow the pattern: Observation → Reason → Action. Provide clear reasoning without preaching.',
      strict: 'Adopt a strict, no-nonsense accountability tone. Call out procrastination, overplanning, and accumulated overdue tasks directly. Remind the user that adding tasks is not doing them. Prioritize finishing over starting new ones.',
      supportive: 'Adopt an encouraging, empathetic coaching tone. Acknowledge completed work and small wins. Frame challenges constructively, reducing overwhelm while maintaining accountability.',
      minimal: 'Be ultra-concise and laser-focused. Use bullet points. State only: Observation, Immediate Priority, and Next Action with estimated duration. Maximum 2-3 short sentences.',
      focus: 'Focus solely on the immediate single next task. Timebox strictly to 25 minutes. Eliminate all distractions and suggest immediate execution in the Focus Chamber.'
    };
    const personaInstruction = modePersonas[mode] || modePersonas.balanced;

    // 3. Fallback Heuristic Engine (deterministic, data-driven, highly specific)
    const lower = message.toLowerCase();
    let reply = '';
    let actions = [];

    // --- Briefing / Check-in / Review heuristics ---
    if (lower.includes('morning') || lower.includes('plan my day') || lower.includes('briefing') || lower.includes('start day')) {
      const topPriorities = ctx.tasks.highPriority.length ? ctx.tasks.highPriority.slice(0, 3) : ctx.tasks.pending.slice(0, 3);
      const topOverdue = ctx.tasks.overdue.slice(0, 2);
      const habitFocus = ctx.habits.strugglingHabit || ctx.habits.bestHabit;

      reply = `### 🌅 Morning Coaching Briefing\n\n` +
        `**Observation**: You have **${ctx.tasks.pendingCount} pending tasks**` +
        (ctx.tasks.overdueCount > 0 ? ` with **${ctx.tasks.overdueCount} overdue**.` : ` and zero overdue items. Clean slate.`) +
        (ctx.wellness.avgSleep ? ` Recent average sleep is **${ctx.wellness.avgSleep} hrs**.` : '') + `\n\n` +
        `**Today's Priorities**:\n` +
        (topOverdue.length ? `• ⚠️ **Overdue First**: ${topOverdue.map(t => `"${t.title}"`).join(', ')}\n` : '') +
        (topPriorities.length ? topPriorities.map((t, i) => `• ${i + 1}. **${t.title}** (${t.priority} Priority • ~${t.estimated_duration || 25}m)`).join('\n') : '• No active tasks yet. Add your top objective.') + `\n\n` +
        (habitFocus ? `**Habit Target**: Keep momentum on **${habitFocus.name}** (completed ${habitFocus.completed7}/7 days this week).\n\n` : '') +
        `**Daily Objective**: Complete your top priority before midday. Do not allow low-effort tasks to displace it.`;

      if (topPriorities.length > 0) {
        actions.push({
          id: `act-focus-${Date.now()}`,
          type: 'start_focus',
          label: `Start 25m Focus: ${topPriorities[0].title}`,
          description: `Launch the Focus Chamber for your top task (${topPriorities[0].estimated_duration || 25}m est.)`,
          payload: { task_id: topPriorities[0].id, task_title: topPriorities[0].title, duration: 25 }
        });
      }
      if (ctx.tasks.overdueCount > 0) {
        actions.push({
          id: `act-resched-${Date.now()}`,
          type: 'reschedule_task',
          label: `Move ${ctx.tasks.overdueCount} overdue task(s) to tomorrow`,
          description: `Reset deadlines so today's queue remains realistic and focused`,
          payload: { task_ids: ctx.tasks.overdue.map(t => t.id), new_due_date: tomorrowStr }
        });
      }
    } else if (lower.includes('midday') || lower.includes('check-in') || lower.includes('checkin') || lower.includes('progress so far')) {
      const completedTodayCount = ctx.tasks.completedTodayCount;
      const remainingHigh = ctx.tasks.highPriority.length;

      reply = `### ☀️ Midday Momentum Check-in\n\n` +
        `**Observation**: You have completed **${completedTodayCount} tasks** so far today, with **${ctx.tasks.pendingCount} tasks remaining** (${remainingHigh} high-priority).\n\n` +
        `**Reason**: Afternoon cognitive stamina is typically 20-30% lower than morning. If you carry more than 2 high-priority tasks into late afternoon, completion drops.\n\n` +
        `**Action**: Pick your single most critical remaining item. Shift any non-essential low-priority tasks to tomorrow so your energy stays locked on the main objective.`;

      if (ctx.tasks.highPriority.length > 0) {
        actions.push({
          id: `act-focus-mid-${Date.now()}`,
          type: 'start_focus',
          label: `Lock into: "${ctx.tasks.highPriority[0].title}"`,
          payload: { task_id: ctx.tasks.highPriority[0].id, task_title: ctx.tasks.highPriority[0].title, duration: 25 }
        });
      }
    } else if (lower.includes('evening') || lower.includes('review today') || lower.includes('eod') || lower.includes('daily review')) {
      reply = `### 🌙 Evening Productivity Review\n\n` +
        `**Observation**: Today you completed **${ctx.tasks.completedTodayCount} tasks** and logged **${ctx.focus.minutesToday} minutes** in Focus Mode.\n\n` +
        `**What Went Well**: ${ctx.tasks.completedTodayCount > 0 ? `You cleared ${ctx.tasks.completedToday.map(t => `"${t.title}"`).slice(0, 2).join(', ')}.` : 'You kept your system active and tracked your queue.'}\n\n` +
        `**Unfinished Work**: You still have **${ctx.tasks.pendingCount} open tasks**` + (ctx.tasks.overdueCount ? ` (${ctx.tasks.overdueCount} overdue)` : '') + `.\n\n` +
        `**Tomorrow's Adjustment**: Clear your schedule for the first 45 minutes tomorrow. Do not open email or social feeds until your top priority is underway.`;

      if (ctx.tasks.overdueCount > 0) {
        actions.push({
          id: `act-eve-resched-${Date.now()}`,
          type: 'reschedule_task',
          label: `Reschedule ${ctx.tasks.overdueCount} unfinished task(s) to tomorrow`,
          payload: { task_ids: ctx.tasks.overdue.map(t => t.id), new_due_date: tomorrowStr }
        });
      }
    } else if (lower.includes('prioritize') || lower.includes('priorities') || lower.includes('priority') || lower.includes('what should i do')) {
      const sorted = [...ctx.tasks.pending].sort((a, b) => {
        const aOver = a.due_date && a.due_date.slice(0, 10) < todayStr ? 100 : 0;
        const bOver = b.due_date && b.due_date.slice(0, 10) < todayStr ? 100 : 0;
        const aPri = a.priority === 'High' ? 50 : (a.priority === 'Medium' ? 20 : 0);
        const bPri = b.priority === 'High' ? 50 : (b.priority === 'Medium' ? 20 : 0);
        const aShort = a.estimated_duration && a.estimated_duration <= 25 ? 10 : 0;
        const bShort = b.estimated_duration && b.estimated_duration <= 25 ? 10 : 0;
        return (bOver + bPri + bShort) - (aOver + aPri + aShort);
      });

      if (sorted.length > 0) {
        const top = sorted[0];
        const isOver = top.due_date && top.due_date.slice(0, 10) < todayStr;
        reply = `### 🎯 Smart Task Prioritization\n\n` +
          `**Top Recommendation**: Do **"${top.title}"** first.\n\n` +
          `**Reasoning**: It is ranked #1 because it is **${top.priority} Priority**` +
          (isOver ? `, is **currently overdue** (due ${top.due_date.slice(0, 10)})` : top.due_date ? `, due ${top.due_date.slice(0, 10)}` : '') +
          (top.estimated_duration ? `, and estimated to take **only ${top.estimated_duration} minutes**.` : '.') + ` Quick execution builds immediate momentum.\n\n` +
          `**Priority Order**:\n` +
          sorted.slice(0, 4).map((t, idx) => `${idx + 1}. **${t.title}** (${t.priority} • ${t.estimated_duration || 25}m)`).join('\n');

        actions.push({
          id: `act-focus-prio-${Date.now()}`,
          type: 'start_focus',
          label: `Start Focus on "${top.title}"`,
          payload: { task_id: top.id, task_title: top.title, duration: top.estimated_duration || 25 }
        });
      } else {
        reply = `You have no pending tasks in your queue right now. You are fully caught up! Would you like to set a new goal or plan tomorrow?`;
      }
    } else if (lower.includes('habit') || lower.includes('routine') || lower.includes('consistency') || lower.includes('fix my habits')) {
      if (ctx.habits.list.length > 0) {
        const weak = ctx.habits.strugglingHabit;
        const strong = ctx.habits.bestHabit;

        reply = `### 🔄 Habit Diagnostics & Coaching\n\n` +
          (strong ? `**Strongest Habit**: **${strong.name}** (Streak: **${strong.currentStreak} days**, ${strong.completed7}/7 completed this week). Great consistency.\n\n` : '') +
          (weak && weak.rate7 < 80 ? `**Struggling Habit**: **${weak.name}** (Completed only **${weak.completed7} of the last 7 days**).\n\n` +
            `**Root Cause**: Habits missed >3 times a week typically suffer from either **excessive friction** (target too high) or **vague scheduling** (e.g. pushing to late evening when willpower is depleted).\n\n` +
            `**Action**: For the next 7 days, reduce the target by 50% and anchor it immediately after an established routine (e.g., right after morning coffee or right before lunch).`
            : `All **${ctx.habits.totalCount} tracked habits** are performing reliably above 80% this week. Keep your timing consistent.`);
      } else {
        reply = `You have not created any habits yet. Consistent habits automate 40% of daily productivity. What is one positive routine you want to build?`;
        actions.push({
          id: `act-habit-starter-${Date.now()}`,
          type: 'create_habit',
          label: 'Create starter habit: "Morning Focus Prep" (10m)',
          payload: { name: 'Morning Focus Prep', icon: '⚡', monthly_goal: 25 }
        });
      }
    } else if (lower.includes('break down') || lower.includes('breakdown') || lower.includes('goal') || lower.includes('big task')) {
      reply = `### 🧩 Actionable Goal Breakdown\n\n` +
        `**Observation**: Large, undefined tasks generate friction and chronic postponement.\n\n` +
        `**Coaching Strategy**: Convert the goal into milestones (Phase 1, Phase 2), then into concrete **25-minute actions**.\n\n` +
        `**Suggested 3-Step Milestone Breakdown**:\n` +
        `1. **Research & Requirements** (Draft scope & outline — 25 min)\n` +
        `2. **Core Implementation** (Build MVP components — 45 min)\n` +
        `3. **Validation & Polish** (Test, debug, and review — 30 min)\n\n` +
        `Would you like me to add these as 3 distinct actionable tasks to your board?`;

      actions.push({
        id: `act-goal-breakdown-${Date.now()}`,
        type: 'breakdown_goal',
        label: 'Add 3 milestone tasks to Task Board',
        payload: {
          subtasks: [
            { title: '1. Research & Outline Scope', priority: 'High', estimated_duration: 25, due_date: todayStr },
            { title: '2. Core Implementation (MVP)', priority: 'High', estimated_duration: 45, due_date: tomorrowStr },
            { title: '3. Testing & Review', priority: 'Medium', estimated_duration: 30, due_date: tomorrowStr }
          ]
        }
      });
    } else if (lower.includes('procrastinat') || lower.includes('stuck') || lower.includes('unmotivated') || lower.includes('lazy')) {
      const topTask = ctx.tasks.highPriority[0] || ctx.tasks.pending[0];
      const targetName = topTask ? `"${topTask.title}"` : 'your top task';

      reply = `### ⚡ 3-Step Anti-Procrastination Protocol\n\n` +
        `**Observation**: Procrastination is emotional regulation, not laziness. The starting barrier is simply too high.\n\n` +
        `**Protocol for ${targetName}**:\n` +
        `1. **Shrink the Starter Step**: Commit to working for **ONLY 5 minutes**. You are allowed to stop after 5 minutes if you want.\n` +
        `2. **Single Tab Rule**: Close all unrelated tabs and mute your phone.\n` +
        `3. **Start the Timer**: Inertia breaks the moment the clock starts ticking.\n\n` +
        `Let's start right now.`;

      if (topTask) {
        actions.push({
          id: `act-focus-proc-${Date.now()}`,
          type: 'start_focus',
          label: `Start 15m Micro-Session: ${topTask.title}`,
          payload: { task_id: topTask.id, task_title: topTask.title, duration: 15 }
        });
      }
    } else if (lower.includes('sleep') || lower.includes('wake') || lower.includes('tired') || lower.includes('exhausted') || lower.includes('bedtime')) {
      reply = `### 🌙 Sleep & Circadian Energy Protocol\n\n` +
        `**The Science**: Waking up refreshed depends on sleep cycle alignment and sleep inertia regulation rather than sheer hours.\n\n` +
        `**3 High-Impact Steps**:\n` +
        `1. **Consistent Wake Anchor**: Wake up within the same 30-minute window daily to anchor your biological clock.\n` +
        `2. **Immediate Light & Water**: Get 5–10 minutes of direct natural light and drink a full glass of water within 10 minutes of waking to clear adenosine.\n` +
        `3. **The 10-3-2-1 Rule**: No caffeine 10h before bed, no heavy meals 3h before, no intense work 2h before, no blue screens 1h before.\n\n` +
        `Log your sleep in the **Wellness** tab to see how your sleep trends correlate with your task completion!`;
    } else if (lower.includes('burnout') || lower.includes('overwhelm') || lower.includes('stress') || lower.includes('anxiety')) {
      reply = `### 🛡️ De-escalating Overwhelm & Burnout\n\n` +
        `**Observation**: Cognitive overload happens when your open commitments exceed your short-term working memory capacity.\n\n` +
        `**3-Step Emergency Reset**:\n` +
        `1. **Ruthless Pruning**: Move at least 50% of today's non-critical tasks to next week or Someday.\n` +
        `2. **Micro-Pacing**: Do only ONE 25-minute Pomodoro session today on your absolute essential item, then step away.\n` +
        `3. **Physical Reset**: Take a 15-minute screen-free walk without headphones or podcasts.\n\n` +
        `Remember: Consistency is sustained through sustainable pacing, not unsustainable sprints.`;
    } else if (lower.includes('motivation') || lower.includes('discipline') || lower.includes('how to start') || lower.includes('momentum')) {
      reply = `### 🚀 The Mechanics of Motivation & Action\n\n` +
        `**Crucial Insight**: Action precedes motivation, not the other way around. Waiting until you "feel like it" keeps you trapped in hesitation.\n\n` +
        `**How to Generate Immediate Momentum**:\n` +
        `1. **The 2-Minute Rule**: Shrink the first step down until it feels embarrassingly easy to begin.\n` +
        `2. **Temptation Bundling**: Pair the task with something enjoyable (a favorite instrumental playlist or high-quality tea).\n` +
        `3. **Check-in Accountability**: Mark your habits on the Habits grid as soon as completed for a quick dopamine reinforcement loop.`;
    } else {
      // General comprehensive coach reply
      const topPrio = ctx.tasks.highPriority[0] || ctx.tasks.pending[0];
      reply = `### 🎯 Trackiyo Productivity Guidance\n\n` +
        `**Current Snapshot**: You have **${ctx.tasks.pendingCount} pending tasks**` +
        (ctx.tasks.overdueCount ? ` (${ctx.tasks.overdueCount} overdue)` : '') +
        `, **${ctx.habits.totalCount} active habits** (${ctx.habits.bestHabit ? `best streak: ${ctx.habits.bestHabit.currentStreak}d` : 'none'}), and **${ctx.focus.minutesToday} min** focus logged today.\n\n` +
        `**Core Principle**: Ruthless focus on one high-leverage objective outperforms multitasking across five low-impact tasks.\n\n` +
        `**Recommended Next Step**: ${topPrio ? `Tackle **"${topPrio.title}"** (~${topPrio.estimated_duration || 25}m est.) in the Focus Chamber.` : 'Review your daily plan and set today\'s top objective.'}`;

      if (topPrio) {
        actions.push({
          id: `act-gen-focus-${Date.now()}`,
          type: 'start_focus',
          label: `Start 25m Focus on "${topPrio.title}"`,
          payload: { task_id: topPrio.id, task_title: topPrio.title, duration: 25 }
        });
      }
    }

    // 4. Try Gemini AI if API Key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const liveContextSummary = `
LIVE USER TRACKIYO DATA:
- Today's date: ${todayStr}
- Tasks Summary: ${ctx.tasks.total} total (${ctx.tasks.completedCount} completed, ${ctx.tasks.pendingCount} pending, ${ctx.tasks.overdueCount} overdue, ${ctx.tasks.highPriorityCount} high-priority).
- Overdue tasks: ${ctx.tasks.overdue.map(t => `"${t.title}" (due: ${t.due_date ? t.due_date.slice(0, 10) : 'unknown'}, pri: ${t.priority}, est: ${t.estimated_duration || 25}m)`).join(', ') || 'None'}.
- High Priority Pending: ${ctx.tasks.highPriority.map(t => `"${t.title}" (est: ${t.estimated_duration || 25}m)`).join(', ') || 'None'}.
- Tasks Completed Today: ${ctx.tasks.completedToday.map(t => `"${t.title}"`).join(', ') || 'None yet'}.
- Recent 7-Day Completion Rate: ${ctx.tasks.recentCompletionRate}%.
- Habits Tracked: ${ctx.habits.list.map(h => `"${h.name}" (streak: ${h.currentStreak}d, 7-day rate: ${h.rate7}%, misses: ${h.misses7})`).join('; ') || 'None'}.
- Wellness: Average sleep ${ctx.wellness.avgSleep || 'N/A'} hrs, average mood ${ctx.wellness.avgMood || 'N/A'}/10, logged today: ${ctx.wellness.loggedToday ? 'Yes' : 'No'}.
- Focus Sessions: ${ctx.focus.minutesToday} min today, ${ctx.focus.minutesLast7Days} min in last 7 days.
- Historical Patterns: Peak productivity day is ${ctx.patterns.peakDay || 'insufficient data yet'}.
`;

        const systemPrompt = `You are Trackiyo Coach, an expert personal productivity, habit, wellness, and life coach.
Tone: ${personaInstruction}

HOW TO COACH & ANSWER QUESTIONS:
1. Direct, High-Impact Answers: When the user asks a question, idea, dilemma, or challenge (e.g., how to wake up earlier, study techniques, building routines, beating fatigue, habit psychology), answer it directly, practically, and insightfully. Explain the 'why' (science/behavioral psychology) and give clear, actionable, numbered steps or bullet points.
2. Natural Context Integration:
   - You have access to the user's real live Trackiyo data (tasks, habits, streaks, focus time, wellness).
   - Naturally reference their real habits and tasks when relevant to make the advice feel personal.
   - Do NOT force data references if the user is asking a general question (e.g., sleep science, nutrition, focus techniques, habit ideas). In those cases, provide great direct advice first, and optionally connect it to their Trackiyo routine.
3. Conversational Clarity: Use clean Markdown with bold keywords, bullet points, and numbered steps. Avoid overly verbose walls of text; keep it clear, punchy, and engaging.
4. Accuracy & Integrity: Never fabricate tasks, habits, or statistics that don't exist. If the user asks specifically about their Trackiyo stats and no data exists, answer their core question and politely mention their data is fresh.
5. Interactive Action Blocks: If you recommend starting a focus timer on a specific task or rescheduling overdue tasks, you may append an action block at the very end formatted exactly as:
[ACTION: {"type": "start_focus"|"reschedule_task"|"create_task", "label": "Button Label", "payload": {...}}]

${liveContextSummary}`;

        // Build clean conversation contents for Gemini multi-turn
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I am Trackiyo Coach. I am ready to give direct, actionable, and scientifically grounded guidance tailored to your habits and goals.' }] }
        ];

        // Append recent conversation history
        const recentHistory = (history || []).slice(-8);
        for (const item of recentHistory) {
          if (item.content && typeof item.content === 'string') {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.content }]
            });
          }
        }

        // Append current message
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              maxOutputTokens: 3500,
              temperature: 0.7,
              thinkingConfig: { thinkingBudget: 0 }
            }
          })
        });

        if (response.ok) {
          const geminiData = await response.json();
          const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || geminiData?.candidates?.[0]?.parts?.[0]?.text;
          if (generatedText && generatedText.trim()) {
            let parsedText = generatedText.trim();

            // Extract [ACTION: {...}] blocks if present
            const actionRegex = /\[ACTION:\s*(\{[\s\S]*?\})\s*\]/g;
            let match;
            const extractedActions = [];
            while ((match = actionRegex.exec(parsedText)) !== null) {
              try {
                const act = JSON.parse(match[1]);
                if (act && act.type && act.label) {
                  extractedActions.push({
                    id: `ai-act-${Date.now()}-${extractedActions.length}`,
                    type: act.type,
                    label: act.label,
                    description: act.description,
                    payload: act.payload || {}
                  });
                }
              } catch {}
            }

            // Remove the raw action block from the user-visible text
            parsedText = parsedText.replace(actionRegex, '').trim();

            reply = parsedText;
            if (extractedActions.length > 0) {
              actions = extractedActions;
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini coaching API call failed, fell back to intelligent heuristic engine:', geminiErr.message);
      }
    }

    // 5. Package message with metadata and actions
    const assistantMsg = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      actions: actions.length > 0 ? actions : undefined,
      mode
    };

    const nextMessages = [...history, userMsg, assistantMsg].slice(-50);

    // 6. Persist to coach_sessions table if session exists
    if (session?.id && !String(session.id).startsWith('local')) {
      try {
        await supabase
          .from('coach_sessions')
          .update({ messages: nextMessages, updated_at: new Date().toISOString() })
          .eq('id', session.id);
      } catch (persistErr) {
        console.warn('Could not persist coaching message:', persistErr.message);
      }
    }

    res.status(200).json({
      reply,
      session_id: session?.id || null,
      messages: nextMessages,
      actions: actions.length > 0 ? actions : undefined
    });
  } catch (error) {
    console.error('Coaching endpoint error:', error);
    res.status(500).json({
      error: 'The AI Coach is temporarily unavailable. Your Trackiyo data is safe. Please try again shortly.'
    });
  }
});

// GET /api/ai/coaching/:sessionId — fetch coaching history
router.get('/coaching/:sessionId', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data, error } = await supabase.from('coach_sessions').select('*').eq('id', req.params.sessionId).eq('user_id', req.user.id).maybeSingle();
    if (error && error.code !== '42P01') throw error;
    res.status(200).json(data || { messages: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/parse — Natural-Language Task Entry (Phase 3 #32)
router.post('/parse', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Text is required.' });
    const lower = text.toLowerCase();
    const parsed = { title: text.trim(), priority: 'Medium', due_date: null, estimated_duration: null, energy_level: 'medium', tags: [] };
    if (/\b(urgent|asap|important|critical|high priority)\b/.test(lower)) parsed.priority = 'High';
    else if (/\b(low priority|someday|whenever)\b/.test(lower)) parsed.priority = 'Low';
    if (/\btoday\b/.test(lower)) parsed.due_date = new Date().toISOString().split('T')[0];
    else if (/\btomorrow\b/.test(lower)) { const d = new Date(); d.setDate(d.getDate() + 1); parsed.due_date = d.toISOString().split('T')[0]; }
    else if (/\bnext week\b/.test(lower)) { const d = new Date(); d.setDate(d.getDate() + 7); parsed.due_date = d.toISOString().split('T')[0]; }
    else {
      const md = lower.match(/\b(mon|tue|wed|thu|fri|sat|sun)\b/);
      if (md) { const d = new Date(); d.setDate(d.getDate() + ((['sun','mon','tue','wed','thu','fri','sat'].indexOf(md[1].slice(0,3)) - d.getDay() + 7) % 7 || 7)); parsed.due_date = d.toISOString().split('T')[0]; }
    }
    const minMatch = lower.match(/(\d+)\s?(min|mins|minutes|m)\b/);
    if (minMatch) parsed.estimated_duration = parseInt(minMatch[1]);
    const hrMatch = lower.match(/(\d+)\s?(hour|hours|hr|h)\b/);
    if (hrMatch) parsed.estimated_duration = parseInt(hrMatch[1]) * 60;
    if (/\b(morning|deep|hard|focus)\b/.test(lower)) parsed.energy_level = 'high';
    else if (/\b(easy|quick|evening|tired)\b/.test(lower)) parsed.energy_level = 'low';
    const tagMatches = text.match(/#(\w+)/g);
    if (tagMatches) { parsed.tags = tagMatches.map(t => t.slice(1)); parsed.title = parsed.title.replace(/#\w+/g, '').trim(); }
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

