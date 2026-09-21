const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, priority, category, due_date, created_at, is_completed')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { title, description, priority, category, due_date } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: req.user.id,
        title: title.trim(),
        description,
        priority: priority || 'Low',
        category: category || 'General',
        status: 'pending',
        due_date
      }])
      .select('id, title, description, priority, category, due_date, created_at, is_completed')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('id, title, description, priority, category, due_date, created_at, is_completed')
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { id } = req.params;
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/batch-delete', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { ids } = req.body;
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(200).json({ message: 'Tasks deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/batch-complete', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { ids } = req.body;
    
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: true })
      .in('id', ids)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(200).json({ message: 'Tasks completed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
