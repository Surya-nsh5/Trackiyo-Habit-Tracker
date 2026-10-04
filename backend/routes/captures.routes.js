const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET all captures for user
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { limit = 100 } = req.query;
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (error) {
      if (error.code === '42P01') return res.status(200).json([]);
      throw error;
    }
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create a new capture
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { content, tags = [], source = 'manual' } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Capture content is required.' });
    }
    const payload = { user_id: req.user.id, content: content.trim(), tags, source };
    const { data, error } = await supabase
      .from('captures').insert([payload]).select('*').single();
    if (error) {
      if (error.code === '42P01') return res.status(201).json({ id: `local-${Date.now()}`, ...payload, created_at: new Date().toISOString() });
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE a capture
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { error } = await supabase.from('captures').delete()
      .eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST convert a capture to a task
router.post('/:id/convert', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { title, priority = 'Medium', due_date = null } = req.body;

    // Create task
    const taskPayload = {
      user_id: req.user.id,
      title: title || req.body.content,
      description: '',
      priority,
      category: 'General',
      status: 'pending',
      due_date
    };
    const { data: task, error: taskError } = await supabase
      .from('tasks').insert([taskPayload]).select('*').single();
    if (taskError && taskError.code !== '42P01') throw taskError;

    // Delete capture after successful conversion
    await supabase.from('captures').delete()
      .eq('id', req.params.id).eq('user_id', req.user.id);

    res.status(201).json({ task: task || taskPayload, message: 'Converted to task' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
