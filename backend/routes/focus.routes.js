const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET all focus sessions for user
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('completed_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      if (error.code === '42P01') {
        return res.status(200).json([]);
      }
      throw error;
    }
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOG a completed focus session
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { duration, task_id, session_type, notes, completed_at } = req.body;

    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Valid focus duration is required.' });
    }

    if (!task_id) {
      return res.status(400).json({ error: 'A task must be selected to log a focus session.' });
    }

    const newSession = {
      user_id: req.user.id,
      duration: parseInt(duration),
      task_id: task_id || null,
      session_type: session_type || 'pomodoro',
      notes: notes || '',
      completed_at: completed_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert([newSession])
      .select('*')
      .single();

    if (error) {
      if (error.code === '42P01') {
        // Table not ready, return optimistic representation
        return res.status(201).json({ id: `local-${Date.now()}`, ...newSession });
      }
      throw error;
    }

    // If task_id was supplied, update actual_duration in tasks
    if (task_id) {
      try {
        const { data: task } = await supabase
          .from('tasks')
          .select('actual_duration')
          .eq('id', task_id)
          .eq('user_id', req.user.id)
          .single();

        if (task) {
          const addedMinutes = Math.round(duration / 60);
          const currentDuration = task.actual_duration || 0;
          await supabase
            .from('tasks')
            .update({ actual_duration: currentDuration + addedMinutes })
            .eq('id', task_id)
            .eq('user_id', req.user.id);
        }
      } catch (err) {
        console.warn('Could not auto-increment task duration:', err.message);
      }
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET focus statistics
router.get('/stats', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('duration, session_type, completed_at')
      .eq('user_id', req.user.id);

    if (error) {
      if (error.code === '42P01') {
        return res.status(200).json({ totalSeconds: 0, sessionCount: 0, todaySeconds: 0 });
      }
      throw error;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let totalSeconds = 0;
    let todaySeconds = 0;

    (data || []).forEach(s => {
      const dur = s.duration || 0;
      totalSeconds += dur;
      if (s.completed_at && s.completed_at.startsWith(todayStr)) {
        todaySeconds += dur;
      }
    });

    res.status(200).json({
      totalSeconds,
      sessionCount: data?.length || 0,
      todaySeconds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET smart-break suggestion (Phase 1 #12 — auto-suggest break after focus)
router.get('/smart-break', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data } = await supabase
      .from('focus_sessions')
      .select('duration, completed_at')
      .eq('user_id', req.user.id)
      .order('completed_at', { ascending: false })
      .limit(3);
    const sessions = data || [];
    const lastFocus = sessions.filter(s => s.duration >= 20 * 60);
    // Suggest a break scaled to recent deep focus: 5 min default, 15 after 2+ long sessions
    const suggestedMinutes = lastFocus.length >= 2 ? 15 : 5;
    const reason = lastFocus.length >= 2
      ? 'You completed multiple deep sessions — take a longer recovery break.'
      : 'A short break will consolidate focus before the next session.';
    res.status(200).json({ suggested_minutes: suggestedMinutes, reason });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST start/end a deep-work session (Phase 1 #13)
router.post('/deep-work', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { task_id = null, end = false, session_id = null, distraction_count = 0 } = req.body;
    if (end && session_id) {
      const { data, error } = await supabase
        .from('deep_work_sessions')
        .update({ end_timestamp: new Date().toISOString(), distraction_count })
        .eq('id', session_id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();
      if (error) throw error;
      if (data && data.start_timestamp && data.end_timestamp) {
        const mins = Math.max(1, Math.round((new Date(data.end_timestamp) - new Date(data.start_timestamp)) / 60000));
        await supabase.from('deep_work_sessions').update({ duration_minutes: mins }).eq('id', data.id);
        data.duration_minutes = mins;
      }
      return res.status(200).json(data);
    }
    const payload = { user_id: req.user.id, task_id, start_timestamp: new Date().toISOString() };
    const { data, error } = await supabase.from('deep_work_sessions').insert([payload]).select('*').single();
    if (error) {
      if (error.code === '42P01') return res.status(201).json({ id: `local-${Date.now()}`, ...payload });
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET deep-work history
router.get('/deep-work', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data, error } = await supabase
      .from('deep_work_sessions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('start_timestamp', { ascending: false })
      .limit(30);
    if (error) {
      if (error.code === '42P01') return res.status(200).json([]);
      throw error;
    }
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
