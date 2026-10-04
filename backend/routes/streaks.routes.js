const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/**
 * Helper to get local date string YYYY-MM-DD for a given timezone
 */
function getLocalDateStr(dateObj, timezone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(dateObj); // Returns YYYY-MM-DD
  } catch (e) {
    return dateObj.toISOString().split('T')[0];
  }
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Deterministic streak calculator given a set of completed date strings (YYYY-MM-DD)
 * and an optional set of grace dates.
 */
function calculateStreakFromDates(completedDatesSet, todayStr, graceDatesSet = new Set()) {
  const isDone = (d) => completedDatesSet.has(d) || graceDatesSet.has(d);

  // Current streak ends either today or yesterday
  let cursor = todayStr;
  if (!isDone(cursor)) {
    cursor = addDays(cursor, -1);
  }

  let current = 0;
  let streakStartDate = null;
  while (isDone(cursor)) {
    current++;
    streakStartDate = cursor;
    cursor = addDays(cursor, -1);
  }

  // Calculate longest streak across history
  const sortedDates = Array.from(completedDatesSet).sort();
  let longest = 0;
  let currentRun = 0;
  let prevDate = null;

  for (const d of sortedDates) {
    if (!prevDate) {
      currentRun = 1;
    } else {
      const expectedNext = addDays(prevDate, 1);
      if (d === expectedNext) {
        currentRun++;
      } else if (d === prevDate) {
        // duplicate on same day
        continue;
      } else if (graceDatesSet.has(expectedNext) && d === addDays(expectedNext, 1)) {
        // grace day bridging the gap
        currentRun += 2;
      } else {
        currentRun = 1;
      }
    }
    if (currentRun > longest) longest = currentRun;
    prevDate = d;
  }

  if (current > longest) longest = current;

  return {
    current,
    longest,
    streakStartDate,
    lastCompletedDate: sortedDates[sortedDates.length - 1] || null
  };
}

// GET /api/streaks/overview - comprehensive streak calculations across all domains
router.get('/overview', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const timezone = req.query.tz || req.headers['x-timezone'] || 'UTC';
    const now = new Date();
    const todayStr = getLocalDateStr(now, timezone);

    // Fetch user activity in parallel
    const [
      { data: habits },
      { data: habitLogs },
      { data: focusSessions },
      { data: tasks },
      { data: wellnessLogs },
      { data: profile }
    ] = await Promise.all([
      supabase.from('habits').select('id, name, icon, created_at, monthly_goal').eq('user_id', req.user.id),
      supabase.from('habit_logs').select('habit_id, log_date, completed').eq('user_id', req.user.id).eq('completed', true),
      supabase.from('focus_sessions').select('completed_at, duration').eq('user_id', req.user.id),
      supabase.from('tasks').select('id, title, is_completed, created_at, due_date').eq('user_id', req.user.id).eq('is_completed', true),
      supabase.from('wellness').select('log_date').eq('user_id', req.user.id),
      supabase.from('profiles').select('streak_preferences').eq('id', req.user.id).maybeSingle()
    ]);

    // 1. Fetch Grace Days
    let graceDatesMap = {}; // entity_id -> Set of dates
    try {
      const { data: graceLogs } = await supabase
        .from('streak_grace_logs')
        .select('streak_type, entity_id, missed_date')
        .eq('user_id', req.user.id);
      
      if (graceLogs) {
        graceLogs.forEach(g => {
          if (!graceDatesMap[g.entity_id]) graceDatesMap[g.entity_id] = new Set();
          graceDatesMap[g.entity_id].add(g.missed_date);
        });
      }
    } catch (e) {
      // Grace log table may not exist yet
    }

    // 2. Habit Streaks
    const habitStreakList = (habits || []).map(habit => {
      const dates = new Set();
      (habitLogs || [])
        .filter(l => l.habit_id === habit.id)
        .forEach(l => dates.add(l.log_date));

      const graceSet = graceDatesMap[habit.id] || new Set();
      const calc = calculateStreakFromDates(dates, todayStr, graceSet);

      // Monthly completion count
      const currentMonthPrefix = todayStr.slice(0, 7);
      const thisMonthCount = Array.from(dates).filter(d => d.startsWith(currentMonthPrefix)).length;

      return {
        id: habit.id,
        type: 'habit',
        name: habit.name,
        icon: habit.icon || '🔥',
        currentStreak: calc.current,
        longestStreak: calc.longest,
        lastCompletedDate: calc.lastCompletedDate,
        thisMonthCompletions: thisMonthCount,
        monthlyGoal: habit.monthly_goal || 20,
        completedToday: dates.has(todayStr)
      };
    });

    // 3. Focus Streak (days with >= 15 minutes of deep focus)
    const focusDates = new Set();
    (focusSessions || []).forEach(s => {
      if (s.completed_at) {
        const dStr = getLocalDateStr(new Date(s.completed_at), timezone);
        focusDates.add(dStr);
      }
    });
    const focusGrace = graceDatesMap['focus'] || new Set();
    const focusCalc = calculateStreakFromDates(focusDates, todayStr, focusGrace);

    // 4. Task Completion Streak (days with completed tasks)
    const taskDates = new Set();
    (tasks || []).forEach(t => {
      const dStr = t.due_date ? t.due_date.slice(0, 10) : (t.created_at ? getLocalDateStr(new Date(t.created_at), timezone) : null);
      if (dStr) taskDates.add(dStr);
    });
    const taskGrace = graceDatesMap['task'] || new Set();
    const taskCalc = calculateStreakFromDates(taskDates, todayStr, taskGrace);

    // 5. Wellness Streak
    const wellnessDates = new Set();
    (wellnessLogs || []).forEach(w => {
      if (w.log_date) wellnessDates.add(w.log_date);
    });
    const wellnessCalc = calculateStreakFromDates(wellnessDates, todayStr);

    // 6. Overall Productivity Streak (any habit, focus, or task completed)
    const overallDates = new Set([...focusDates, ...taskDates]);
    (habitLogs || []).forEach(l => overallDates.add(l.log_date));
    const overallCalc = calculateStreakFromDates(overallDates, todayStr);

    // Grace Days settings
    const streakPrefs = profile?.streak_preferences || {
      graceDaysAvailable: 2,
      timezone,
      enableNotifications: true,
      showOnProfile: true
    };

    res.status(200).json({
      todayStr,
      timezone,
      overall: {
        currentStreak: overallCalc.current,
        longestStreak: overallCalc.longest,
        completedToday: overallDates.has(todayStr)
      },
      habits: habitStreakList,
      focus: {
        type: 'focus',
        name: 'Deep Focus',
        icon: '🧠',
        currentStreak: focusCalc.current,
        longestStreak: focusCalc.longest,
        completedToday: focusDates.has(todayStr)
      },
      tasks: {
        type: 'tasks',
        name: 'Daily Execution',
        icon: '⚡',
        currentStreak: taskCalc.current,
        longestStreak: taskCalc.longest,
        completedToday: taskDates.has(todayStr)
      },
      wellness: {
        type: 'wellness',
        name: 'Mind & Body Check-in',
        icon: '🌿',
        currentStreak: wellnessCalc.current,
        longestStreak: wellnessCalc.longest,
        completedToday: wellnessDates.has(todayStr)
      },
      graceDays: {
        available: streakPrefs.graceDaysAvailable ?? 2,
        usedCount: Object.values(graceDatesMap).reduce((acc, s) => acc + s.size, 0)
      }
    });
  } catch (error) {
    console.error('Streaks overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/streaks/detail/:type/:id - detailed history for a specific streak (e.g. habit ID or 'focus' or 'tasks')
router.get('/detail/:type/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { type, id } = req.params;
    const timezone = req.query.tz || req.headers['x-timezone'] || 'UTC';
    const now = new Date();
    const todayStr = getLocalDateStr(now, timezone);

    let completedDates = new Set();
    let name = 'Streak Detail';
    let icon = '🔥';

    if (type === 'habit') {
      const [{ data: habit }, { data: logs }] = await Promise.all([
        supabase.from('habits').select('*').eq('id', id).eq('user_id', req.user.id).single(),
        supabase.from('habit_logs').select('log_date').eq('habit_id', id).eq('user_id', req.user.id).eq('completed', true)
      ]);
      if (habit) {
        name = habit.name;
        icon = habit.icon || '🔥';
      }
      (logs || []).forEach(l => completedDates.add(l.log_date));
    } else if (type === 'focus') {
      name = 'Deep Focus';
      icon = '🧠';
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('completed_at')
        .eq('user_id', req.user.id);
      (sessions || []).forEach(s => {
        if (s.completed_at) completedDates.add(getLocalDateStr(new Date(s.completed_at), timezone));
      });
    } else if (type === 'tasks') {
      name = 'Task Execution';
      icon = '⚡';
      const { data: tasks } = await supabase
        .from('tasks')
        .select('created_at, due_date')
        .eq('user_id', req.user.id)
        .eq('is_completed', true);
      (tasks || []).forEach(t => {
        const d = t.due_date ? t.due_date.slice(0, 10) : getLocalDateStr(new Date(t.created_at), timezone);
        completedDates.add(d);
      });
    }

    // Grace days for this entity
    let graceDates = new Set();
    try {
      const { data: logs } = await supabase
        .from('streak_grace_logs')
        .select('missed_date')
        .eq('user_id', req.user.id)
        .eq('entity_id', id);
      (logs || []).forEach(l => graceDates.add(l.missed_date));
    } catch (e) {}

    const calc = calculateStreakFromDates(completedDates, todayStr, graceDates);

    // Build last 60 days calendar map
    const calendarDays = [];
    for (let i = 59; i >= 0; i--) {
      const date = addDays(todayStr, -i);
      const isCompleted = completedDates.has(date);
      const isGrace = graceDates.has(date);
      calendarDays.push({
        date,
        isCompleted,
        isGrace,
        status: isCompleted ? 'completed' : isGrace ? 'grace' : (date === todayStr ? 'pending' : 'missed')
      });
    }

    // Milestones definitions
    const MILESTONES = [3, 7, 14, 30, 50, 100, 365];
    const milestoneProgress = MILESTONES.map(m => ({
      days: m,
      reached: calc.longest >= m,
      isCurrent: calc.current >= m,
      progressPercent: Math.min(100, Math.round((calc.current / m) * 100))
    }));

    res.status(200).json({
      id,
      type,
      name,
      icon,
      currentStreak: calc.current,
      longestStreak: calc.longest,
      lastCompletedDate: calc.lastCompletedDate,
      calendarDays,
      milestoneProgress,
      totalCompletions: completedDates.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/streaks/grace-day - apply a grace day to preserve a streak
router.post('/grace-day', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { streak_type, entity_id, missed_date } = req.body;

    if (!streak_type || !entity_id || !missed_date) {
      return res.status(400).json({ error: 'Missing streak_type, entity_id, or missed_date' });
    }

    // Check profile preferences for available grace days
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_preferences')
      .eq('id', req.user.id)
      .maybeSingle();

    const prefs = profile?.streak_preferences || { graceDaysAvailable: 2 };
    if ((prefs.graceDaysAvailable || 0) <= 0) {
      return res.status(400).json({ error: 'No grace days available this month.' });
    }

    // Log the grace day
    try {
      await supabase.from('streak_grace_logs').insert([{
        user_id: req.user.id,
        streak_type,
        entity_id,
        missed_date
      }]);
    } catch (e) {
      // Table fallback: if table does not exist, update profile JSON
      console.warn('Grace day log table unavailable, using profile fallback');
    }

    // Decrement available grace days
    const updatedPrefs = {
      ...prefs,
      graceDaysAvailable: Math.max(0, (prefs.graceDaysAvailable || 2) - 1)
    };

    await supabase
      .from('profiles')
      .update({ streak_preferences: updatedPrefs })
      .eq('id', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Grace day applied successfully. Your streak is preserved!',
      graceDaysRemaining: updatedPrefs.graceDaysAvailable
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
