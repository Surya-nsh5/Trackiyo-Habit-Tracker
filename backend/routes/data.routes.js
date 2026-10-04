const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// EXPORT ALL DATA AS JSON
router.get('/export/json', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);

    const [tasks, habits, habitLogs, wellness, focus, journal] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', req.user.id),
      supabase.from('habits').select('*').eq('user_id', req.user.id),
      supabase.from('habit_logs').select('*').eq('user_id', req.user.id),
      supabase.from('wellness').select('*').eq('user_id', req.user.id),
      supabase.from('focus_sessions').select('*').eq('user_id', req.user.id),
      supabase.from('journal_entries').select('*').eq('user_id', req.user.id)
    ]);

    const exportBundle = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      user: { id: req.user.id, email: req.user.email },
      data: {
        tasks: tasks.data || [],
        habits: habits.data || [],
        habit_logs: habitLogs.data || [],
        wellness: wellness.data || [],
        focus_sessions: focus.data || [],
        journal_entries: journal.data || []
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="trackiyo-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.status(200).json(exportBundle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EXPORT TASKS OR HABITS AS CSV
router.get('/export/csv', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { type = 'tasks' } = req.query;

    if (type === 'tasks') {
      const { data: tasks, error } = await supabase.from('tasks').select('*').eq('user_id', req.user.id);
      if (error) throw error;

      let csv = 'id,title,category,priority,is_completed,due_date,created_at\n';
      (tasks || []).forEach(t => {
        const safeTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
        csv += `${t.id},${safeTitle},${t.category || ''},${t.priority || ''},${t.is_completed},${t.due_date || ''},${t.created_at || ''}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="trackiyo-tasks.csv"');
      return res.status(200).send(csv);
    }

    if (type === 'habits') {
      const { data: habits, error } = await supabase.from('habits').select('*').eq('user_id', req.user.id);
      if (error) throw error;

      let csv = 'id,name,icon,monthly_goal,created_at\n';
      (habits || []).forEach(h => {
        const safeName = `"${(h.name || '').replace(/"/g, '""')}"`;
        csv += `${h.id},${safeName},${h.icon || ''},${h.monthly_goal || 0},${h.created_at || ''}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="trackiyo-habits.csv"');
      return res.status(200).send(csv);
    }

    res.status(400).json({ error: 'Unsupported CSV export type' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IMPORT VALIDATED DATA FROM JSON
router.post('/import/json', async (req, res) => {
  try {
    const { data: importData } = req.body;
    if (!importData || typeof importData !== 'object') {
      return res.status(400).json({ error: 'Invalid backup format. Must contain a data object.' });
    }

    const supabase = createSupabaseClient(req);
    const summary = { importedTasks: 0, importedHabits: 0 };

    // Import Tasks (avoid duplicate titles)
    if (Array.isArray(importData.tasks) && importData.tasks.length > 0) {
      const { data: existingTasks } = await supabase.from('tasks').select('title').eq('user_id', req.user.id);
      const existingTitles = new Set((existingTasks || []).map(t => t.title.toLowerCase()));

      const toInsert = importData.tasks
        .filter(t => t && t.title && !existingTitles.has(t.title.toLowerCase()))
        .map(t => ({
          user_id: req.user.id,
          title: t.title,
          description: t.description || '',
          priority: t.priority || 'Medium',
          category: t.category || 'General',
          is_completed: !!t.is_completed,
          due_date: t.due_date || null
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('tasks').insert(toInsert);
        if (!error) summary.importedTasks = toInsert.length;
      }
    }

    // Import Habits (avoid duplicate names)
    if (Array.isArray(importData.habits) && importData.habits.length > 0) {
      const { data: existingHabits } = await supabase.from('habits').select('name').eq('user_id', req.user.id);
      const existingNames = new Set((existingHabits || []).map(h => h.name.toLowerCase()));

      const toInsert = importData.habits
        .filter(h => h && h.name && !existingNames.has(h.name.toLowerCase()))
        .map(h => ({
          user_id: req.user.id,
          name: h.name,
          icon: h.icon || '📌',
          monthly_goal: h.monthly_goal || 28
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('habits').insert(toInsert);
        if (!error) summary.importedHabits = toInsert.length;
      }
    }

    // Import Goals (deprecated - ignored)

    res.status(200).json({
      success: true,
      message: 'Data imported successfully',
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
