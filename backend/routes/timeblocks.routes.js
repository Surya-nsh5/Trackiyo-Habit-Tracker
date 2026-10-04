const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET time blocks for a specific date (or all)
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { date } = req.query;
    let query = supabase.from('time_blocks').select('*').eq('user_id', req.user.id).order('start_time', { ascending: true });
    if (date) query = query.eq('block_date', date);
    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return res.status(200).json([]);
      throw error;
    }
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create a time block
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { task_id, start_time, end_time, title, color } = req.body;
    if (!start_time || !end_time) return res.status(400).json({ error: 'start_time and end_time are required.' });
    const payload = { user_id: req.user.id, task_id: task_id || null, start_time, end_time, title: title || null, color: color || null };
    const { data, error } = await supabase.from('time_blocks').insert([payload]).select('*').single();
    if (error) {
      if (error.code === '42P01') return res.status(201).json({ id: `local-${Date.now()}`, ...payload });
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update a time block (drag-resize)
router.put('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const updates = { ...req.body };
    delete updates.id; delete updates.user_id;
    const { data, error } = await supabase.from('time_blocks').update(updates)
      .eq('id', req.params.id).eq('user_id', req.user.id).select('*').single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE a time block
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { error } = await supabase.from('time_blocks').delete()
      .eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST suggest predictive time blocks (Phase 3 #34 — based on open tasks + energy)
router.post('/suggest', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const [{ data: tasks }, { data: profile }] = await Promise.all([
      supabase.from('tasks').select('id, title, priority, priority_score, estimated_duration, energy_level').eq('user_id', req.user.id).eq('is_completed', false).order('priority_score', { ascending: false, nullsFirst: false }).limit(5),
      supabase.from('profiles').select('energy_profile').eq('id', req.user.id).maybeSingle(),
    ]);
    const energy = profile?.energy_profile || { morning: 'high', afternoon: 'medium', evening: 'low' };
    const hourFor = (level) => (level === 'high' ? 9 : level === 'medium' ? 13 : 16);
    const suggestions = (tasks || []).map((t, i) => {
      const slot = i < 2 ? energy.morning : i < 4 ? energy.afternoon : energy.evening;
      const hour = hourFor(slot) + i;
      const start = `${targetDate}T${String(Math.min(hour, 19)).padStart(2, '0')}:00:00`;
      const endD = new Date(new Date(start).getTime() + Math.max(25, t.estimated_duration || 25) * 60000);
      return {
        task_id: t.id,
        title: t.title,
        start_time: start,
        end_time: endD.toISOString(),
        is_suggested: true,
        reason: `Matches your ${slot}-energy window`,
      };
    });
    res.status(200).json({ date: targetDate, suggestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST reschedule overdue blocks forward (Phase 1 #10 for time blocks)
router.post('/reschedule', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const nowIso = new Date().toISOString();
    const { data: past, error } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', req.user.id)
      .lt('end_time', nowIso);
    if (error) throw error;
    if (!past || past.length === 0) return res.status(200).json({ rescheduled: 0, blocks: [] });
    const blocks = [];
    for (const b of past) {
      const durMs = new Date(b.end_time) - new Date(b.start_time);
      const newStart = new Date(Date.now() + 60 * 60000);
      const newEnd = new Date(newStart.getTime() + durMs);
      const { data, error: upErr } = await supabase
        .from('time_blocks')
        .update({ start_time: newStart.toISOString(), end_time: newEnd.toISOString() })
        .eq('id', b.id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();
      if (!upErr && data) blocks.push(data);
    }
    res.status(200).json({ rescheduled: blocks.length, blocks });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
