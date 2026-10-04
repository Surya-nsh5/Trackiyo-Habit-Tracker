const express = require('express');
const router = express.Router();
const { createSupabaseClient, supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const cache = require('../config/cache');

router.use(requireAuth);

// In-memory fallback cache if Supabase table is pending migration
const memoryFriendships = new Map(); // key: user_id:friend_id

/**
 * GET /api/friends
 * Returns all accepted friends of the authenticated user
 */
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `friends:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const supabase = createSupabaseClient(req);

  try {
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      // Table may not exist yet, fallback to memory
      const list = Array.from(memoryFriendships.values())
        .filter(f => (f.user_id === userId || f.friend_id === userId) && f.status === 'accepted');
      return res.json(list);
    }

    if (!friendships || friendships.length === 0) {
      return res.json([]);
    }

    // Collect friend user IDs
    const friendIds = friendships.map(f => f.user_id === userId ? f.friend_id : f.user_id);

    // Fetch minimal profile information via admin client: the user-scoped
    // client carries the caller's JWT, so profiles RLS would hide everyone
    // else. Output below stays sanitized to public fields only.
    let profiles = null;
    const profileAttempt = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, avatar, timezone, allow_challenges, show_streaks, show_achievements')
      .in('id', friendIds);
    if (profileAttempt.error) {
      if (profileAttempt.error.code === '42703' || profileAttempt.error.message?.includes('column')) {
        const retry = await supabaseAdmin
          .from('profiles')
          .select('id, name, avatar')
          .in('id', friendIds);
        profiles = (retry.data || []).map(p => ({ ...p, username: null }));
      }
    } else {
      profiles = profileAttempt.data;
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Format friends list with safe sanitized fields
    const friends = friendships.map(f => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      const profile = profileMap.get(friendId) || {};
      return {
        friendshipId: f.id,
        id: friendId,
        name: profile.name || profile.username || 'Productive Friend',
        username: profile.username || null,
        avatar: profile.avatar || null,
        allowChallenges: profile.allow_challenges ?? true,
        showStreaks: profile.show_streaks ?? true,
        showAchievements: profile.show_achievements ?? true,
        since: f.created_at
      };
    });

    cache.set(cacheKey, friends, 30);
    res.json(friends);
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.json([]);
  }
});

/**
 * GET /api/friends/requests
 * Returns pending incoming and outgoing friend requests
 */
router.get('/requests', async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `friend_requests:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const supabase = createSupabaseClient(req);

  try {
    const { data: incoming, error: inErr } = await supabase
      .from('friendships')
      .select('id, user_id, created_at')
      .eq('friend_id', userId)
      .eq('status', 'pending');

    const { data: outgoing, error: outErr } = await supabase
      .from('friendships')
      .select('id, friend_id, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (inErr || outErr) {
      return res.json({ incoming: [], outgoing: [] });
    }

    const allUserIds = [
      ...(incoming || []).map(r => r.user_id),
      ...(outgoing || []).map(r => r.friend_id)
    ];

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, avatar')
      .in('id', allUserIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const result = {
      incoming: (incoming || []).map(r => ({
        id: r.id,
        fromUserId: r.user_id,
        name: profileMap.get(r.user_id)?.name || profileMap.get(r.user_id)?.username || 'Trackiyo User',
        avatar: profileMap.get(r.user_id)?.avatar || null,
        createdAt: r.created_at
      })),
      outgoing: (outgoing || []).map(r => ({
        id: r.id,
        toUserId: r.friend_id,
        name: profileMap.get(r.friend_id)?.name || profileMap.get(r.friend_id)?.username || 'Trackiyo User',
        avatar: profileMap.get(r.friend_id)?.avatar || null,
        createdAt: r.created_at
      }))
    };

    cache.set(cacheKey, result, 15);
    res.json(result);
  } catch (err) {
    console.error('Error fetching friend requests:', err);
    res.json({ incoming: [], outgoing: [] });
  }
});

/**
 * GET /api/friends/search?q=...
 * Search users by username or full name. Returns sanitized discovery data
 * only (no emails or private tasks). Display rule: username → name → default.
 */
router.get('/search', async (req, res) => {
  const userId = req.user.id;
  const query = (req.query.q || '').trim();
  const supabase = createSupabaseClient(req);

  if (!query || query.length < 2) {
    return res.json([]);
  }

  // Escape PostgREST OR-pattern special chars in user input
  const safe = query.replace(/[,()]/g, '');

  try {
    let users = null;
    // Admin client: the user-scoped client carries the caller's JWT, so
    // profiles RLS would silently filter out every other user (0 rows,
    // no error). Output stays sanitized to public fields only.
    // Prefer username-aware search; fall back if the column isn't migrated yet
    const attempt = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, avatar, allow_challenges')
      .or(`name.ilike.%${safe}%,username.ilike.%${safe}%`)
      .neq('id', userId)
      .limit(10);

    if (attempt.error) {
      if (attempt.error.code === '42703' || attempt.error.message?.includes('column')) {
        const retry = await supabaseAdmin
          .from('profiles')
          .select('id, name, avatar')
          .ilike('name', `%${safe}%`)
          .neq('id', userId)
          .limit(10);
        if (retry.error) throw retry.error;
        users = (retry.data || []).map(u => ({ ...u, username: null, allow_challenges: true }));
      } else {
        throw attempt.error;
      }
    } else {
      users = attempt.data || [];
    }

    // Check friendship status for each user
    const userIds = (users || []).map(u => u.id);
    const { data: existingFriendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    const statusMap = new Map();
    (existingFriendships || []).forEach(f => {
      const otherId = f.user_id === userId ? f.friend_id : f.user_id;
      statusMap.set(otherId, {
        status: f.status,
        isSender: f.user_id === userId
      });
    });

    console.log(`[friends/search] q="${query}" → ${(users || []).length} profile(s) matched`);
    const results = (users || []).map(u => {
      const rel = statusMap.get(u.id);
      return {
        id: u.id,
        name: u.name || u.username || 'Trackiyo User',
        username: u.username || null,
        avatar: u.avatar || null,
        allowChallenges: u.allow_challenges ?? true,
        relationship: rel ? rel.status : 'none',
        isPendingSender: rel?.isSender && rel.status === 'pending'
      };
    });

    res.json(results);
  } catch (err) {
    console.error('User search error:', err);
    res.json([]);
  }
});

/**
 * POST /api/friends/request
 * Send a friend request
 */
router.post('/request', async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.body;
  const supabase = createSupabaseClient(req);

  if (!friendId || friendId === userId) {
    return res.status(400).json({ error: 'Invalid friend identifier' });
  }

  try {
    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status, user_id, friend_id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Friend request is already pending' });
      }
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // Fallback
      const key = `${userId}:${friendId}`;
      const rec = { id: key, user_id: userId, friend_id: friendId, status: 'pending', created_at: new Date().toISOString() };
      memoryFriendships.set(key, rec);
      cache.delPrefix('friend_requests:');
      return res.status(201).json(rec);
    }

    cache.delPrefix('friend_requests:');
    res.status(201).json(data);
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * POST /api/friends/respond
 * Accept or decline a friend request
 */
router.post('/respond', async (req, res) => {
  const userId = req.user.id;
  const { requestId, action } = req.body; // action: 'accept' | 'decline'
  const supabase = createSupabaseClient(req);

  if (!requestId || !['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'Invalid response action' });
  }

  try {
    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const { data, error } = await supabase
      .from('friendships')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('friend_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: 'Request not found or unauthorized' });
    }

    cache.delPrefix('friends:');
    cache.delPrefix('friend_requests:');

    res.json({ message: `Friend request ${action}ed successfully`, data });
  } catch (err) {
    console.error('Respond to request error:', err);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
});

/**
 * DELETE /api/friends/:friendId
 * Remove friendship
 */
router.delete('/:friendId', async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.params;
  const supabase = createSupabaseClient(req);

  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (error) throw error;

    cache.delPrefix('friends:');

    res.json({ message: 'Friend removed successfully' });
  } catch (err) {
    console.error('Delete friend error:', err);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

/**
 * GET /api/friends/:friendId/profile
 * Minimal sanitized profile for friend accountability view
 */
router.get('/:friendId/profile', async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;

  try {
    // Authorization: User can view their own profile, or an accepted friend's profile
    if (friendId !== userId) {
      const { data: friendship } = await supabaseAdmin
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!friendship) {
        // Check memory fallback if table not migrated yet
        const key1 = `${userId}:${friendId}`;
        const key2 = `${friendId}:${userId}`;
        const mem = memoryFriendships.get(key1) || memoryFriendships.get(key2);
        if (!mem || mem.status !== 'accepted') {
          return res.status(403).json({ error: 'You must have an accepted friendship to view this profile' });
        }
      }
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, avatar, show_streaks, show_achievements, allow_challenges')
      .eq('id', friendId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Calculate approximate focus hours this month only if user allows streak/stat sharing
    let focusHoursThisMonth = 0;
    const canShowStreaks = profile.show_streaks ?? true;

    if (canShowStreaks) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabaseAdmin
        .from('focus_sessions')
        .select('duration')
        .eq('user_id', friendId)
        .gte('completed_at', startOfMonth.toISOString());

      const focusMins = (sessions || []).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
      focusHoursThisMonth = Math.round(focusMins / 60 * 10) / 10;
    }

    res.json({
      id: profile.id,
      name: profile.name || profile.username || 'Friend',
      username: profile.username || null,
      avatar: profile.avatar || null,
      focusHoursThisMonth,
      allowChallenges: profile.allow_challenges ?? true,
      showStreaks: canShowStreaks,
      showAchievements: profile.show_achievements ?? true
    });
  } catch (err) {
    console.error('Error fetching friend profile:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

module.exports = router;
