const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET journal entries
router.get('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { date, search, tag } = req.query;

    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', req.user.id)
      .order('entry_date', { ascending: false });

    if (date) {
      query = query.eq('entry_date', date);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return res.status(200).json([]);
      }
      throw error;
    }

    let results = data || [];
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(e => 
        (e.title && e.title.toLowerCase().includes(q)) || 
        (e.content && e.content.toLowerCase().includes(q))
      );
    }

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE or UPSERT journal entry
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { entry_date, title, content, mood, tags } = req.body;

    if (!entry_date || !title) {
      return res.status(400).json({ error: 'Entry date and title are required.' });
    }

    const payload = {
      user_id: req.user.id,
      entry_date,
      title: title.trim(),
      content: content || '',
      mood: mood !== undefined ? mood : null,
      tags: tags || []
    };

    const { data, error } = await supabase
      .from('journal_entries')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      if (error.code === '42P01') {
        return res.status(201).json({ id: `local-${Date.now()}`, ...payload });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE journal entry
router.put('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.user_id;

    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE journal entry
router.delete('/:id', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { id } = req.params;

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(200).json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
