const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET distractions (optionally filtered by focus session)
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { focus_session_id, limit = 100 } = req.query;
    let query = supabase.from('distractions').select('*').eq('user_id', req.user.id).order('logged_at', { ascending: false }).limit(parseInt(limit));
    if (focus_session_id) query = query.eq('focus_session_id', focus_session_id);
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

// POST log a distraction
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { reason, focus_session_id = null } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Distraction reason is required.' });
    }
    const payload = {
      user_id: req.user.id,
      reason: reason.trim(),
      focus_session_id,
    };
    const { data, error } = await supabase.from('distractions').insert([payload]).select('*').single();
    if (error) {
      if (error.code === '42P01') return res.status(201).json({ id: `local-${Date.now()}`, ...payload, logged_at: new Date().toISOString() });
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE a distraction log entry
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { error } = await supabase.from('distractions').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error && error.code !== '42P01') throw error;
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
