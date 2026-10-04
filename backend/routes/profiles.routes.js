const express = require('express');
const router = express.Router();
const { createSupabaseClient, supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET energy profile + AI assist + daily summary preferences
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('energy_profile, ai_assist_enabled, deep_work_mode_enabled, daily_summary_enabled')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error && error.code !== '42P01' && error.code !== '42703') throw error;
    res.status(200).json({
      energy_profile: profile?.energy_profile || { morning: 'high', afternoon: 'medium', evening: 'low' },
      ai_assist_enabled: profile?.ai_assist_enabled ?? true,
      deep_work_mode_enabled: profile?.deep_work_mode_enabled ?? false,
      daily_summary_enabled: profile?.daily_summary_enabled ?? false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update preferences (energy profile, AI toggle, deep-work toggle, daily summary toggle)
router.patch('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { energy_profile, ai_assist_enabled, deep_work_mode_enabled, daily_summary_enabled } = req.body;
    const updates = {};
    if (energy_profile !== undefined) updates.energy_profile = energy_profile;
    if (ai_assist_enabled !== undefined) updates.ai_assist_enabled = !!ai_assist_enabled;
    if (deep_work_mode_enabled !== undefined) updates.deep_work_mode_enabled = !!deep_work_mode_enabled;
    if (daily_summary_enabled !== undefined) updates.daily_summary_enabled = !!daily_summary_enabled;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', req.user.id).select('*').maybeSingle();
    if (error && error.code !== '42703') throw error;
    res.status(200).json({ success: true, profile: data || updates });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST avatar upload (server-side via service_role — bypasses storage RLS,
// which the frontend anon client cannot satisfy since auth is backend-issued)
router.post('/avatar', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Storage is not configured.' });
    const { fileName, contentType, dataBase64 } = req.body;
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return res.status(400).json({ error: 'Image data is required.' });
    }
    if (!/^image\//.test(contentType || '')) {
      return res.status(400).json({ error: 'Only image files are allowed.' });
    }
    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be under 2MB.' });
    }
    const ext = String(fileName || 'avatar.jpg').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${req.user.id}/${Date.now()}.${ext}`;

    // Ensure bucket exists (idempotent)
    try {
      await supabaseAdmin.storage.createBucket('avatars', { public: true });
    } catch (e) {
      if (!String(e?.message || '').toLowerCase().includes('already exists')) throw e;
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(path, buffer, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Could not get image URL.');

    // Persist URL on profile (best-effort if column missing)
    try {
      await supabaseAdmin.from('profiles').update({ avatar: data.publicUrl }).eq('id', req.user.id);
    } catch (e) {
      console.warn('Could not persist avatar URL:', e.message);
    }

    res.status(201).json({ avatar: data.publicUrl });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST daily-summary preview (stub for nightly email edge function — returns markdown)
router.post('/daily-summary', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const todayStr = new Date().toISOString().split('T')[0];
    const [tasksRes, focusRes] = await Promise.all([
      supabase.from('tasks').select('id, title, is_completed, due_date').eq('user_id', req.user.id),
      supabase.from('focus_sessions').select('duration, completed_at').eq('user_id', req.user.id),
    ]);
    const tasks = tasksRes.data || [];
    const done = tasks.filter(t => t.is_completed).length;
    const overdue = tasks.filter(t => !t.is_completed && t.due_date && t.due_date.slice(0, 10) < todayStr).length;
    const focusMins = Math.round((focusRes.data || []).reduce((a, f) => a + (f.duration || 0), 0) / 60);
    const markdown = `# Daily Summary — ${todayStr}\n\n- Tasks completed: **${done}/${tasks.length}**\n- Overdue: **${overdue}**\n- Focus time: **${focusMins} min**\n\nKeep the momentum going.`;
    res.status(200).json({ markdown, stats: { done, total: tasks.length, overdue, focusMins } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
