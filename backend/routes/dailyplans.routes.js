const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET daily plan for a date (default today)
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const planDate = req.query.date || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('plan_date', planDate)
      .maybeSingle();
    if (error && error.code !== '42P01') throw error;
    if (!data) return res.status(200).json({ plan_date: planDate, plan_json: [] });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update plan blocks (persist first, then UI updates)
router.put('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { date, plan_json, energy_context } = req.body;
    const planDate = date || new Date().toISOString().split('T')[0];
    if (!Array.isArray(plan_json)) return res.status(400).json({ error: 'plan_json must be an array.' });
    const payload = {
      user_id: req.user.id,
      plan_date: planDate,
      plan_json,
      updated_at: new Date().toISOString(),
    };
    if (energy_context) payload.energy_context = energy_context;
    const { data, error } = await supabase
      .from('daily_plans')
      .upsert(payload, { onConflict: 'user_id,plan_date' })
      .select('*')
      .single();
    if (error) {
      if (error.code === '42P01') return res.status(200).json({ plan_date: planDate, plan_json });
      throw error;
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE plan for a date
router.delete('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const planDate = req.query.date || new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('daily_plans')
      .delete()
      .eq('user_id', req.user.id)
      .eq('plan_date', planDate);
    if (error && error.code !== '42P01') throw error;
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
