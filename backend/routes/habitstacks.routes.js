const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET habit stacks for user
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data, error } = await supabase.from('habit_stacks').select('*')
      .eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) {
      if (error.code === '42P01') return res.status(200).json([]);
      throw error;
    }
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create a habit stack
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { name, habit_ids = [], trigger = '', time_of_day = 'morning' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Stack name is required.' });
    const payload = { user_id: req.user.id, name: name.trim(), habit_ids, trigger, time_of_day };
    const { data, error } = await supabase.from('habit_stacks').insert([payload]).select('*').single();
    if (error) {
      if (error.code === '42P01') return res.status(201).json({ id: `local-${Date.now()}`, ...payload, created_at: new Date().toISOString() });
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update a habit stack
router.put('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.user_id;
    const { data, error } = await supabase.from('habit_stacks').update(updates)
      .eq('id', req.params.id).eq('user_id', req.user.id).select('*').single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE a habit stack
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { error } = await supabase.from('habit_stacks').delete()
      .eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
