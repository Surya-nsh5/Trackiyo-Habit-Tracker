const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
    res.status(201).json({
      success: true,
      message: 'Signup successful',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { ...data.user, ...profile },
      session: data.session
    });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// Silently refresh an expired access token using the stored refresh token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ success: false, error: 'refresh_token is required' });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
    if (error || !data.session) throw error || new Error('No session returned');
    res.status(200).json({ success: true, session: data.session });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

router.post('/password', requireAuth, async (req, res) => {
  const { password } = req.body;
  try {
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password });
    if (error) throw error;
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    res.status(200).json({
      success: true,
      user: { ...req.user, ...profile }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
