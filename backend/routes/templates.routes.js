const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const ALLOWED_TYPES = ['task', 'habit', 'routine'];

// GET templates (own + public)
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { type } = req.query;
    let query = supabase.from('templates').select('*').or(`user_id.eq.${req.user.id},is_public.eq.true`).order('created_at', { ascending: false });
    if (type && ALLOWED_TYPES.includes(type)) query = query.eq('type', type);
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

// POST create template
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { name, type = 'task', template_data = {}, is_public = false } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }
    if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid template type.' });
    const payload = { user_id: req.user.id, name: name.trim(), type, template_data, is_public: !!is_public };
    const { data, error } = await supabase.from('templates').insert([payload]).select('*').single();
    if (error) {
      if (error.code === '42P01') return res.status(201).json({ id: `local-${Date.now()}`, ...payload });
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update template
router.put('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const updates = { ...req.body };
    delete updates.id; delete updates.user_id;
    const { data, error } = await supabase.from('templates').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select('*').single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE template
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { error } = await supabase.from('templates').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error && error.code !== '42P01') throw error;
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST apply template -> creates a task (task type) or returns data for client-side creation
router.post('/:id/apply', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', req.params.id)
      .or(`user_id.eq.${req.user.id},is_public.eq.true`)
      .maybeSingle();
    if (error) throw error;
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    if (template.type === 'task') {
      const td = template.template_data || {};
      const taskPayload = {
        user_id: req.user.id,
        title: td.title || template.name,
        description: td.description || '',
        priority: td.priority || 'Medium',
        category: td.category || 'General',
        status: 'pending',
        due_date: td.due_date || null,
        estimated_duration: td.estimated_duration || null,
      };
      const { data: task, error: taskError } = await supabase.from('tasks').insert([taskPayload]).select('*').single();
      if (taskError) throw taskError;
      return res.status(201).json({ task, template });
    }
    res.status(200).json({ template, template_data: template.template_data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
