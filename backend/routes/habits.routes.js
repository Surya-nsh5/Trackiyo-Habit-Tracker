const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { validateDailyWrite } = require('../middleware/dailyLock');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, icon, monthly_goal, order_index, created_at')
      .eq('user_id', req.user.id)
      .order('order_index', { ascending: true });

    if (habitsError) throw habitsError;

    // Get month/year from query if provided (e.g. ?month=06&year=2026)
    const { month, year } = req.query;
    
    let logsQuery = supabase.from('habit_logs').select('id, habit_id, log_date, completed').eq('user_id', req.user.id);
    if (month && year) {
      // Create date boundaries
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      logsQuery = logsQuery.gte('log_date', startDate).lte('log_date', endDate);
    }

    const { data: logs, error: logsError } = await logsQuery;
    
    if (logsError) throw logsError;

    res.status(200).json({ habits, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { name, icon, monthlyGoal, order_index, frequency, target_days_per_week } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Habit name is required.' });
    }

    const payload = {
      user_id: req.user.id,
      name: name.trim(),
      icon: icon || '📌',
      monthly_goal: parseInt(monthlyGoal) || 0,
      order_index: parseInt(order_index) || 0
    };

    if (frequency !== undefined) payload.frequency = frequency;
    if (target_days_per_week !== undefined) payload.target_days_per_week = target_days_per_week;

    let { data, error } = await supabase
      .from('habits')
      .insert([payload])
      .select('*')
      .single();

    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      delete payload.frequency;
      delete payload.target_days_per_week;
      const retry = await supabase
        .from('habits')
        .insert([payload])
        .select('id, name, icon, monthly_goal, order_index, created_at')
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
      error = null;
    }

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
    const updates = { ...req.body };
    delete updates.id;
    delete updates.user_id;

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || !updates.name.trim()) {
        return res.status(400).json({ error: 'Habit name cannot be empty.' });
      }
      updates.name = updates.name.trim();
    }

    let { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const safeUpdates = {
        name: updates.name,
        icon: updates.icon,
        monthly_goal: updates.monthly_goal || updates.monthlyGoal,
        order_index: updates.order_index
      };
      Object.keys(safeUpdates).forEach(k => safeUpdates[k] === undefined && delete safeUpdates[k]);
      const retry = await supabase
        .from('habits')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
      error = null;
    }

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
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(200).json({ message: 'Habit deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/logs', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    // Server-side daily lock: only today's records are writable.
    const logDate = validateDailyWrite(req, res);
    if (!logDate) return;
    const { habit_id, completed } = req.body;
    
    // Using upsert based on unique constraint (habit_id, log_date)
    const { data, error } = await supabase
      .from('habit_logs')
      .upsert({
        user_id: req.user.id,
        habit_id,
        log_date: logDate,
        completed
      }, { onConflict: 'habit_id,log_date' })
      .select('id, habit_id, log_date, completed')
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
