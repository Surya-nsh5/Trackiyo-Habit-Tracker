const express = require('express');
const router = express.Router();
const { supabaseAdmin, createAuthClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// Username rules: 3–20 chars, lowercase letters/numbers, _ . -
// Display fallback chain everywhere: username → full name → 'Trackiyo User'
function normalizeUsername(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,20}$/.test(clean)) return null;
  return clean;
}

async function isUsernameTaken(username, excludeUserId = null) {
  let query = supabaseAdmin.from('profiles').select('id').ilike('username', username).limit(2);
  const { data, error } = await query;
  if (error) {
    // Column not migrated yet — treat as available, DB trigger backfills
    if (error.code === '42703' || error.message?.includes('column')) return false;
    throw error;
  }
  return (data || []).some(r => r.id !== excludeUserId);
}

router.post('/signup', async (req, res) => {
  const { name, email, password, username } = req.body;
  try {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanUsername = username !== undefined ? normalizeUsername(username) : undefined;
    if (username !== undefined && !cleanUsername) {
      return res.status(400).json({ success: false, error: 'Username must be 3–20 chars: letters, numbers, _ . -' });
    }
    if (cleanUsername && await isUsernameTaken(cleanUsername)) {
      return res.status(400).json({ success: false, error: 'Username is already taken.' });
    }
    const { data, error } = await createAuthClient().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name ? String(name).trim() : undefined } }
    });
    if (error) throw error;
    // Best-effort: claim the username immediately (DB trigger backfills otherwise)
    if (cleanUsername && data.user) {
      try {
        await supabaseAdmin.from('profiles').update({ username: cleanUsername }).eq('id', data.user.id);
      } catch {}
    }
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
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    const { data, error } = await createAuthClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
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
    const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token });
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

// Update user profile, life areas, theme, and preferences
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { name, username, avatar, life_areas, theme_id, theme_mode, notification_preferences, gamification_enabled } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = typeof name === 'string' ? name.trim() : name;
    if (username !== undefined) {
      const cleanUsername = normalizeUsername(username);
      if (!cleanUsername) {
        return res.status(400).json({ success: false, error: 'Username must be 3–20 chars: letters, numbers, _ . -' });
      }
      if (await isUsernameTaken(cleanUsername, req.user.id)) {
        return res.status(400).json({ success: false, error: 'Username is already taken.' });
      }
      updates.username = cleanUsername;
    }
    if (avatar !== undefined) updates.avatar = typeof avatar === 'string' ? avatar.trim() : avatar;
    if (life_areas !== undefined && Array.isArray(life_areas)) updates.life_areas = life_areas;
    if (theme_id !== undefined) updates.theme_id = theme_id;
    if (theme_mode !== undefined) updates.theme_mode = theme_mode;
    if (notification_preferences !== undefined) updates.notification_preferences = notification_preferences;
    if (gamification_enabled !== undefined) updates.gamification_enabled = !!gamification_enabled;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid profile fields provided for update.' });
    }

    // Try full update first
    let { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select('*')
      .single();

    // Graceful fallback if optional columns (like theme_id/theme_mode/avatar/username) do not exist yet in table schema
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const coreUpdates = { ...updates };
      delete coreUpdates.theme_id;
      delete coreUpdates.theme_mode;
      delete coreUpdates.avatar;
      delete coreUpdates.username;
      const retry = await supabaseAdmin
        .from('profiles')
        .update(coreUpdates)
        .eq('id', req.user.id)
        .select('*')
        .single();
      if (!retry.error) {
        updatedProfile = { ...retry.data, ...updates };
        error = null;
      }
    }

    if (error) throw error;

    // If name was updated, also sync auth user metadata
    if (updates.name) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
          user_metadata: { name: updates.name }
        });
      } catch (authErr) {
        console.warn('Could not sync name to auth metadata:', authErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: { ...req.user, ...updatedProfile }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
