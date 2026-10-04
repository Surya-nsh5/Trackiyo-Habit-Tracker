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
      .select('*')
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
    const {
      title,
      description,
      priority,
      category,
      due_date,
      start_date,
      goal_id,
      estimated_duration,
      actual_duration,
      tags,
      subtasks,
      recurrence,
      recurrence_parent_id,
      parent_task_id,
      depends_on_task_id,
      priority_score,
      energy_level,
      notes,
      order_index
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const payload = {
      user_id: req.user.id,
      title: title.trim(),
      description: description || '',
      priority: priority || 'Medium',
      category: category || 'General',
      status: 'pending',
      due_date: due_date || null
    };

    // Include extended fields if present
    if (start_date !== undefined) payload.start_date = start_date;
    if (goal_id) payload.goal_id = goal_id;
    if (estimated_duration !== undefined) payload.estimated_duration = estimated_duration;
    if (actual_duration !== undefined) payload.actual_duration = actual_duration;
    if (tags !== undefined) payload.tags = tags;
    if (subtasks !== undefined) payload.subtasks = subtasks;
    if (recurrence !== undefined) payload.recurrence = recurrence;
    if (recurrence_parent_id !== undefined) payload.recurrence_parent_id = recurrence_parent_id;
    if (parent_task_id !== undefined) payload.parent_task_id = parent_task_id;
    if (depends_on_task_id !== undefined) payload.depends_on_task_id = depends_on_task_id;
    if (priority_score !== undefined) payload.priority_score = priority_score;
    if (energy_level !== undefined) payload.energy_level = energy_level;
    if (notes !== undefined) payload.notes = notes;
    if (order_index !== undefined) payload.order_index = order_index;

    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      // If error is due to missing new column (if migration not run yet), retry with core fields
      if (error.message && (error.message.includes('column') || error.code === '42703')) {
        const corePayload = {
          user_id: req.user.id,
          title: title.trim(),
          description: description || '',
          priority: priority || 'Medium',
          category: category || 'General',
          status: 'pending',
          due_date: due_date || null
        };
        const fallbackRes = await supabase
          .from('tasks')
          .insert([corePayload])
          .select('*')
          .single();
        if (fallbackRes.error) throw fallbackRes.error;
        return res.status(201).json({ ...fallbackRes.data, ...payload });
      }
      throw error;
    }
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
    delete updates.id;
    delete updates.user_id;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (error) {
      if (error.message && (error.message.includes('column') || error.code === '42703')) {
        // Strip extended fields for legacy fallback
        const safeUpdates = {
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          category: updates.category,
          due_date: updates.due_date,
          is_completed: updates.is_completed,
          updated_at: updates.updated_at
        };
        Object.keys(safeUpdates).forEach(k => safeUpdates[k] === undefined && delete safeUpdates[k]);
        const fallbackRes = await supabase
          .from('tasks')
          .update(safeUpdates)
          .eq('id', id)
          .eq('user_id', req.user.id)
          .select('*')
          .single();
        if (fallbackRes.error) throw fallbackRes.error;
        return res.status(200).json({ ...fallbackRes.data, ...updates });
      }
      throw error;
    }
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
      .update({ is_completed: true, status: 'completed', updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(200).json({ message: 'Tasks completed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/tasks/reschedule — Smart Rescheduling: move overdue tasks forward by priority
router.post('/reschedule', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: overdue, error } = await supabase
      .from('tasks')
      .select('id, title, priority, priority_score, due_date')
      .eq('user_id', req.user.id)
      .eq('is_completed', false)
      .lt('due_date', todayStr);
    if (error) throw error;
    if (!overdue || overdue.length === 0) return res.status(200).json({ rescheduled: 0, tasks: [] });
    const rank = { High: 3, Medium: 2, Low: 1 };
    // Higher priority first; stagger across today + next days to avoid overload (max 3/day)
    const sorted = [...overdue].sort((a, b) =>
      ((b.priority_score || 0) - (a.priority_score || 0)) || ((rank[b.priority] || 0) - (rank[a.priority] || 0)));
    const results = [];
    for (let i = 0; i < sorted.length; i++) {
      const dayOffset = Math.floor(i / 3);
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const newDate = d.toISOString().split('T')[0];
      const { data, error: upErr } = await supabase
        .from('tasks')
        .update({ due_date: newDate, updated_at: new Date().toISOString() })
        .eq('id', sorted[i].id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();
      if (!upErr && data) results.push(data);
    }
    res.status(200).json({ rescheduled: results.length, tasks: results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/tasks/subtasks/:parentId — list sub-tasks of a parent task
router.get('/subtasks/:parentId', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('parent_task_id', req.params.parentId)
      .order('created_at', { ascending: true });
    if (error) {
      if (error.code === '42703') return res.status(200).json([]);
      throw error;
    }
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
