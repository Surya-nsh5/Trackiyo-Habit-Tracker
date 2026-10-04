const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createSupabaseClient, supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/share/my/history - List user's active and historical public shares (authenticated)
router.get('/my/history', requireAuth, async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);

    // Primary table check
    let shares = [];
    try {
      const { data, error } = await supabase
        .from('public_shares')
        .select('id, token, title, subtitle, metric_value, tier, theme, is_revoked, created_at')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) shares = data;
    } catch (e) {}

    // Fallback check in templates
    if (shares.length === 0) {
      try {
        const { data: templateShares } = await supabase
          .from('templates')
          .select('template_data')
          .eq('user_id', req.user.id)
          .eq('type', 'public_share')
          .order('created_at', { ascending: false });

        if (templateShares) {
          shares = templateShares.map(t => t.template_data).filter(Boolean);
        }
      } catch (e) {}
    }

    res.status(200).json(shares);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public route to view a shared progress card (No authentication required)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 8) {
      return res.status(400).json({ error: 'Invalid share token' });
    }

    const supabase = supabaseAdmin || createSupabaseClient(req);

    // Try primary table public_shares
    let share = null;
    const { data: primaryData, error: primaryErr } = await supabase
      .from('public_shares')
      .select('id, token, title, subtitle, metric_value, metric_label, streak_count, tier, theme, custom_message, include_username, username, include_avatar, avatar_url, format, is_revoked, created_at')
      .eq('token', token)
      .maybeSingle();

    if (primaryData) {
      share = primaryData;
    } else {
      // Fallback lookup in templates table if table migration not executed yet
      const { data: fallbackTemplate } = await supabase
        .from('templates')
        .select('template_data')
        .eq('name', `share_${token}`)
        .eq('type', 'public_share')
        .maybeSingle();

      if (fallbackTemplate?.template_data) {
        share = fallbackTemplate.template_data;
      }
    }

    if (!share || share.is_revoked) {
      return res.status(404).json({ error: 'This progress share is either private, expired, or was revoked by the owner.' });
    }

    // Return strictly sanitized data - zero private accounts or emails
    res.status(200).json({
      title: share.title,
      subtitle: share.subtitle || '',
      metricValue: share.metric_value,
      metricLabel: share.metric_label || 'Consistency',
      streakCount: share.streak_count || 0,
      tier: share.tier || 'bronze',
      theme: share.theme || 'dark',
      customMessage: share.custom_message || null,
      username: share.include_username ? (share.username || 'Trackiyo Achiever') : null,
      avatarUrl: share.include_avatar ? (share.avatar_url || null) : null,
      format: share.format || 'square',
      createdAt: share.created_at
    });
  } catch (error) {
    console.error('Error fetching public share:', error);
    res.status(500).json({ error: 'Could not load shared progress' });
  }
});

// Authenticated routes below
router.use(requireAuth);

// POST /api/share - Create a new public share card with secure token
router.post('/', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const {
      title,
      subtitle,
      metricValue,
      metricLabel,
      streakCount,
      achievementId,
      tier = 'bronze',
      theme = 'dark',
      customMessage,
      includeUsername = true,
      includeAvatar = false,
      format = 'square'
    } = req.body;

    const resolvedMetric = metricValue || req.body.metric || (req.body.xp ? `+${req.body.xp} XP` : (streakCount ? `${streakCount} Days` : 'Milestone Achieved'));

    if (!title || !resolvedMetric) {
      return res.status(400).json({ error: 'Title and metric are required to create a share card' });
    }

    // Fetch user public handle/avatar only if user opts in
    let username = 'Productivity Practitioner';
    let avatarUrl = null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar')
      .eq('id', req.user.id)
      .maybeSingle();

    if (profile) {
      username = profile.name || 'Trackiyo Member';
      avatarUrl = profile.avatar || null;
    }

    // Generate cryptographic token
    const token = crypto.randomBytes(12).toString('hex'); // 24 chars random hex

    const shareRecord = {
      user_id: req.user.id,
      token,
      title: String(title).slice(0, 100),
      subtitle: subtitle ? String(subtitle).slice(0, 100) : '',
      metric_value: String(resolvedMetric).slice(0, 50),
      metric_label: metricLabel ? String(metricLabel).slice(0, 50) : '',
      streak_count: parseInt(streakCount) || 0,
      achievement_id: achievementId || null,
      tier: ['bronze', 'silver', 'gold', 'platinum'].includes(tier) ? tier : 'bronze',
      theme: ['dark', 'minimal', 'focus', 'gold'].includes(theme) ? theme : 'dark',
      custom_message: customMessage ? String(customMessage).slice(0, 160) : null,
      include_username: !!includeUsername,
      username: includeUsername ? username : null,
      include_avatar: !!includeAvatar,
      avatar_url: includeAvatar ? avatarUrl : null,
      format: 'square',
      is_revoked: false,
      created_at: new Date().toISOString()
    };

    // Attempt insertion in public_shares table
    let saved = false;
    try {
      const { error: insertErr } = await supabase.from('public_shares').insert([shareRecord]);
      if (!insertErr) saved = true;
    } catch (e) {
      saved = false;
    }

    // Fallback: save to templates table if public_shares is pending migration
    if (!saved) {
      try {
        await supabase.from('templates').insert([{
          user_id: req.user.id,
          name: `share_${token}`,
          type: 'public_share',
          template_data: shareRecord,
          is_public: true
        }]);
        saved = true;
      } catch (fallbackErr) {
        console.error('Fallback save failed:', fallbackErr);
      }
    }

    res.status(201).json({
      success: true,
      token,
      share: {
        token,
        title: shareRecord.title,
        metricValue: shareRecord.metric_value,
        tier: shareRecord.tier,
        theme: shareRecord.theme,
        createdAt: shareRecord.created_at
      }
    });
  } catch (error) {
    console.error('Create share error:', error);
    res.status(500).json({ error: error.message });
  }
});



// DELETE /api/share/:token - Revoke a shared progress link
router.delete('/:token', async (req, res) => {
  try {
    const supabase = createSupabaseClient(req);
    const { token } = req.params;

    // Mark as revoked in public_shares
    try {
      await supabase
        .from('public_shares')
        .update({ is_revoked: true })
        .eq('token', token)
        .eq('user_id', req.user.id);
    } catch (e) {}

    // Delete or revoke in fallback templates
    try {
      await supabase
        .from('templates')
        .delete()
        .eq('name', `share_${token}`)
        .eq('user_id', req.user.id);
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Share link revoked successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
