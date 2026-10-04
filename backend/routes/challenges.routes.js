const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createSupabaseClient, supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const cache = require('../config/cache');

// Public shared result endpoint (no auth required)
router.get('/public/:token', async (req, res) => {
  const { token } = req.params;
  const supabase = createSupabaseClient(req);

  try {
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('id, title, challenge_type, target_metric, target_unit, duration_days, start_date, end_date, creator_score, opponent_score, winner_id, creator_id, opponent_id, status, share_token')
      .eq('share_token', token)
      .single();

    if (error || !challenge) {
      return res.status(404).json({ error: 'Shared challenge not found or revoked' });
    }

    // Fetch sanitized participant names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', [challenge.creator_id, challenge.opponent_id]);

    const profileMap = new Map((profiles || []).map(p => [p.id, p.name]));

    const creatorName = profileMap.get(challenge.creator_id) || 'Creator';
    const opponentName = profileMap.get(challenge.opponent_id) || 'Opponent';
    const winnerName = challenge.winner_id ? profileMap.get(challenge.winner_id) : null;

    res.json({
      title: challenge.title,
      challengeType: challenge.challenge_type,
      targetMetric: challenge.target_metric,
      targetUnit: challenge.target_unit,
      durationDays: challenge.duration_days,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      creatorName,
      opponentName,
      creatorScore: challenge.creator_score,
      opponentScore: challenge.opponent_score,
      isDraw: challenge.creator_score === challenge.opponent_score,
      winnerName,
      status: challenge.status
    });
  } catch (err) {
    console.error('Public challenge result error:', err);
    res.status(500).json({ error: 'Failed to load challenge result' });
  }
});

// All routes below require authentication
router.use(requireAuth);

/**
 * Helper to compute user activity on a specific date for a challenge rule
 */
async function computeActivityForDate(supabase, userId, challenge, dateStr) {
  const startOfDay = `${dateStr}T00:00:00.000Z`;
  const endOfDay = `${dateStr}T23:59:59.999Z`;

  if (challenge.challenge_type === 'focus') {
    const { data: sessions } = await supabase
      .from('focus_sessions')
      .select('duration')
      .eq('user_id', userId)
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);

    const totalMins = (sessions || []).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
    const met = totalMins >= challenge.target_metric;
    return { actual: Math.round(totalMins), met, points: met ? 1 : 0 };
  }

  if (challenge.challenge_type === 'task') {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);

    const count = (tasks || []).length;
    const met = count >= challenge.target_metric;
    return { actual: count, met, points: met ? 1 : 0 };
  }

  if (challenge.challenge_type === 'habit' && challenge.target_habit_id) {
    const { data: log } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('habit_id', challenge.target_habit_id)
      .eq('date', dateStr)
      .maybeSingle();

    const met = !!log;
    return { actual: met ? 1 : 0, met, points: met ? 1 : 0 };
  }

  // Generic consistency: any habit or focus on date
  const { data: habitLog } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .limit(1);

  const met = (habitLog || []).length > 0;
  return { actual: met ? 1 : 0, met, points: met ? 1 : 0 };
}

/**
 * Recalculate score for an active challenge.
 * Scoring = daily check-ins: each participant ticks once per day, and each
 * checked-in day is worth 1 point to that person's own score. Both sides
 * tick independently.
 */
async function syncChallengeScores(supabase, challenge) {
  if (challenge.status !== 'active') return challenge;

  const todayStr = new Date().toISOString().slice(0, 10);
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  const today = new Date(todayStr);

  const evalEnd = today < end ? today : end;

  let creatorScore = 0;
  let opponentScore = 0;
  const db = supabaseAdmin || supabase;

  try {
    const { data: checkins, error } = await db
      .from('challenge_checkins')
      .select('user_id, check_date')
      .eq('challenge_id', challenge.id)
      .lte('check_date', evalEnd.toISOString().slice(0, 10));
    if (error) throw error;
    const creatorDays = new Set();
    const opponentDays = new Set();
    (checkins || []).forEach(c => {
      if (c.user_id === challenge.creator_id) creatorDays.add(c.check_date);
      else if (c.user_id === challenge.opponent_id) opponentDays.add(c.check_date);
    });
    creatorScore = creatorDays.size;
    opponentScore = opponentDays.size;
  } catch (err) {
    // If table not migrated yet, retain existing scores rather than wiping them
    creatorScore = challenge.creator_score || 0;
    opponentScore = challenge.opponent_score || 0;
  }

  const isCompleted = today > end;
  let winnerId = null;
  if (isCompleted) {
    if (creatorScore > opponentScore) winnerId = challenge.creator_id;
    else if (opponentScore > creatorScore) winnerId = challenge.opponent_id;
  }

  const updates = {
    creator_score: creatorScore,
    opponent_score: opponentScore,
    status: isCompleted ? 'completed' : 'active',
    winner_id: winnerId,
    updated_at: new Date().toISOString()
  };

  await db
    .from('challenges')
    .update(updates)
    .eq('id', challenge.id);

  return { ...challenge, ...updates };
}

/**
 * GET /api/challenges
 * List all challenges for current user with batch checkins
 */
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `challenges:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const supabase = createSupabaseClient(req);
  const db = supabaseAdmin || supabase;

  try {
    const { data: challenges, error } = await db
      .from('challenges')
      .select('*')
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Challenges table query error:', error.message);
      return res.json({ active: [], pending: [], history: [] });
    }

    if (!challenges || challenges.length === 0) {
      return res.json({ active: [], pending: [], history: [] });
    }

    // Query profiles and checkins in parallel to cut latency in half
    const otherUserIds = challenges.map(c => c.creator_id === userId ? c.opponent_id : c.creator_id);
    const challengeIds = challenges.map(c => c.id);
    const todayStr = new Date().toISOString().slice(0, 10);
    const checkinsByChallenge = new Map();

    const [profilesRes, checkinRowsRes] = await Promise.all([
      otherUserIds.length > 0
        ? db.from('profiles').select('id, name, username, avatar').in('id', otherUserIds)
        : Promise.resolve({ data: [] }),
      challengeIds.length > 0
        ? db.from('challenge_checkins').select('challenge_id, user_id, check_date').in('challenge_id', challengeIds)
        : Promise.resolve({ data: [] })
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
    (checkinRowsRes.data || []).forEach(row => {
      if (!checkinsByChallenge.has(row.challenge_id)) {
        checkinsByChallenge.set(row.challenge_id, []);
      }
      checkinsByChallenge.get(row.challenge_id).push(row);
    });

    // Format results into buckets
    const active = [];
    const pending = [];
    const history = [];

    challenges.forEach(c => {
      const isCreator = c.creator_id === userId;
      const opponentId = isCreator ? c.opponent_id : c.creator_id;
      const opponent = profileMap.get(opponentId) || {};

      const checkins = checkinsByChallenge.get(c.id) || [];
      const creatorCheckins = new Set(checkins.filter(ch => ch.user_id === c.creator_id).map(ch => ch.check_date));
      const opponentCheckins = new Set(checkins.filter(ch => ch.user_id === c.opponent_id).map(ch => ch.check_date));

      const myScore = checkins.length > 0 
        ? (isCreator ? creatorCheckins.size : opponentCheckins.size)
        : (isCreator ? (c.creator_score || 0) : (c.opponent_score || 0));
      const theirScore = checkins.length > 0
        ? (isCreator ? opponentCheckins.size : creatorCheckins.size)
        : (isCreator ? (c.opponent_score || 0) : (c.creator_score || 0));

      const myTodayCheckedIn = isCreator ? creatorCheckins.has(todayStr) : opponentCheckins.has(todayStr);
      const theirTodayCheckedIn = isCreator ? opponentCheckins.has(todayStr) : creatorCheckins.has(todayStr);

      const formatted = {
        id: c.id,
        title: c.title,
        challengeType: c.challenge_type,
        targetMetric: c.target_metric,
        targetUnit: c.target_unit,
        durationDays: c.duration_days,
        startDate: c.start_date,
        endDate: c.end_date,
        status: c.status,
        isCreator,
        myScore,
        theirScore,
        myTodayCheckedIn,
        theirTodayCheckedIn,
        opponent: {
          id: opponentId,
          name: opponent.username || opponent.name || 'Friend',
          avatar: opponent.avatar || null
        },
        winnerId: c.winner_id,
        isDraw: c.status === 'completed' && myScore === theirScore,
        shareToken: c.share_token,
        createdAt: c.created_at
      };

      if (c.status === 'active') active.push(formatted);
      else if (c.status === 'pending') pending.push(formatted);
      else history.push(formatted);
    });

    const result = { active, pending, history };
    cache.set(cacheKey, result, 20);
    res.json(result);
  } catch (err) {
    console.error('Fetch challenges error:', err);
    res.json({ active: [], pending: [], history: [] });
  }
});

/**
 * GET /api/challenges/:id
 * Detailed view with day-by-day score breakdown
 */
router.get('/:id', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const cacheKey = `challenge_detail:${id}:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const supabase = createSupabaseClient(req);
  const db = supabaseAdmin || supabase;

  try {
    const { data: rawChallenge, error } = await db
      .from('challenges')
      .select('*')
      .eq('id', id)
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .single();

    if (error || !rawChallenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Sync score if active
    const challenge = await syncChallengeScores(supabase, rawChallenge);

    // Fetch participant profiles, checkins, and reactions concurrently in parallel
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date(todayStr);

    const [profilesRes, allCheckinsRes, reactionsRes] = await Promise.all([
      db.from('profiles').select('id, name, username, avatar').in('id', [challenge.creator_id, challenge.opponent_id]),
      db.from('challenge_checkins').select('user_id, check_date').eq('challenge_id', id),
      db.from('challenge_reactions').select('id, from_user_id, emoji, created_at').eq('challenge_id', id).order('created_at', { ascending: false }).limit(20)
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
    const isCreator = challenge.creator_id === userId;
    const opponentId = isCreator ? challenge.opponent_id : challenge.creator_id;

    const myCheckedSet = new Set();
    const theirCheckedSet = new Set();
    (allCheckinsRes.data || []).forEach(c => {
      if (c.user_id === userId) myCheckedSet.add(c.check_date);
      else if (c.user_id === opponentId) theirCheckedSet.add(c.check_date);
    });

    const myCheckedIn = myCheckedSet.has(todayStr);
    const theirCheckedIn = theirCheckedSet.has(todayStr);

    // Build timeline of days with both user check statuses
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);

    const days = [];
    const curr = new Date(start);
    let dayIndex = 1;

    while (curr <= end) {
      const dStr = curr.toISOString().slice(0, 10);
      const isPast = curr < today;
      const isToday = dStr === todayStr;

      days.push({
        dayNumber: dayIndex++,
        date: dStr,
        isPast,
        isToday,
        isFuture: curr > today,
        myChecked: myCheckedSet.has(dStr),
        theirChecked: theirCheckedSet.has(dStr)
      });
      curr.setDate(curr.getDate() + 1);
    }

    const reactions = reactionsRes.data || [];

    const myScore = isCreator ? challenge.creator_score : challenge.opponent_score;
    const theirScore = isCreator ? challenge.opponent_score : challenge.creator_score;

    const result = {
      id: challenge.id,
      title: challenge.title,
      challengeType: challenge.challenge_type,
      targetMetric: challenge.target_metric,
      targetUnit: challenge.target_unit,
      durationDays: challenge.duration_days,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      status: challenge.status,
      isCreator,
      myScore,
      theirScore,
      myTodayMet: myCheckedIn,
      theirTodayMet: theirCheckedIn,
      myCheckedIn,
      theirCheckedIn,
      myTodayCheckedIn: myCheckedIn,
      theirTodayCheckedIn: theirCheckedIn,
      opponent: {
        id: opponentId,
        name: profileMap.get(opponentId)?.username || profileMap.get(opponentId)?.name || 'Friend',
        avatar: profileMap.get(opponentId)?.avatar || null
      },
      winnerId: challenge.winner_id,
      isDraw: challenge.status === 'completed' && myScore === theirScore,
      shareToken: challenge.share_token,
      days,
      reactions: reactions || []
    };

    cache.set(cacheKey, result, 15);
    res.json(result);
  } catch (err) {
    console.error('Challenge detail error:', err);
    res.status(500).json({ error: 'Failed to load challenge details' });
  }
});

/**
 * POST /api/challenges
 * Create challenge and send invitation to friend
 */
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const supabase = createSupabaseClient(req);
  const {
    opponentId,
    title,
    challengeType,
    targetMetric,
    targetUnit,
    targetHabitId,
    durationDays = 14,
    startDate
  } = req.body;

  if (!opponentId || opponentId === userId) {
    return res.status(400).json({ error: 'Please choose a valid friend to challenge' });
  }
  if (!title || !challengeType || !targetMetric) {
    return res.status(400).json({ error: 'Missing challenge title or target parameters' });
  }

  try {
    const sDate = startDate ? new Date(startDate) : new Date();
    const eDate = new Date(sDate);
    eDate.setDate(eDate.getDate() + parseInt(durationDays, 10));

    const sDateStr = sDate.toISOString().slice(0, 10);
    const eDateStr = eDate.toISOString().slice(0, 10);

    const shareToken = crypto.randomBytes(12).toString('base64url');

    const { data: newChallenge, error } = await supabase
      .from('challenges')
      .insert({
        creator_id: userId,
        opponent_id: opponentId,
        title: title.trim(),
        challenge_type: challengeType,
        target_metric: Number(targetMetric),
        target_unit: targetUnit || 'minutes_per_day',
        target_habit_id: targetHabitId || null,
        duration_days: parseInt(durationDays, 10),
        start_date: sDateStr,
        end_date: eDateStr,
        status: 'pending',
        creator_score: 0,
        opponent_score: 0,
        share_token: shareToken
      })
      .select()
      .single();

    if (error) throw error;

    cache.del(`challenges:${userId}`);
    cache.del(`challenges:${opponentId}`);

    res.status(201).json(newChallenge);
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

/**
 * POST /api/challenges/:id/checkin — tick today (idempotent).
 * One tick per participant per day; each ticked day is 1 point.
 */
router.post('/:id/checkin', async (req, res) => {
  const userId = req.user.id;
  const supabase = createSupabaseClient(req);
  const db = supabaseAdmin || supabase;
  try {
    const { data: challenge, error: chErr } = await db
      .from('challenges')
      .select('id, creator_id, opponent_id, status, start_date, end_date')
      .eq('id', req.params.id)
      .maybeSingle();
    if (chErr || !challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.creator_id !== userId && challenge.opponent_id !== userId) {
      return res.status(403).json({ error: 'Not a participant of this challenge' });
    }
    if (challenge.status !== 'active') {
      return res.status(400).json({ error: 'Challenge is not active' });
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (todayStr < challenge.start_date.slice(0, 10) || todayStr > challenge.end_date.slice(0, 10)) {
      return res.status(400).json({ error: 'Today is outside the challenge dates' });
    }
    const { error: upErr } = await db
      .from('challenge_checkins')
      .upsert(
        { challenge_id: challenge.id, user_id: userId, check_date: todayStr },
        { onConflict: 'challenge_id,user_id,check_date' }
      );
    if (upErr) {
      if (upErr.code === '42P01') {
        return res.status(400).json({ error: 'Check-in unavailable — run supabase/challenge_checkins.sql' });
      }
      throw upErr;
    }
    // Re-sync scores so both cards update immediately
    const full = await db.from('challenges').select('*').eq('id', challenge.id).single();
    const synced = await syncChallengeScores(supabase, full.data);
    const isCreator = synced.creator_id === userId;

    // Check opponent's status today
    const opponentId = isCreator ? synced.opponent_id : synced.creator_id;
    const { data: oppCheck } = await db
      .from('challenge_checkins')
      .select('id')
      .eq('challenge_id', challenge.id)
      .eq('user_id', opponentId)
      .eq('check_date', todayStr)
      .maybeSingle();

    // Invalidate caches so UI sees new score and checkmark immediately
    cache.del(`challenges:${challenge.creator_id}`);
    cache.del(`challenges:${challenge.opponent_id}`);
    cache.delPrefix(`challenge_detail:${challenge.id}`);

    res.json({
      checkedIn: true,
      myCheckedIn: true,
      myTodayCheckedIn: true,
      theirCheckedIn: !!oppCheck,
      theirTodayCheckedIn: !!oppCheck,
      myScore: isCreator ? synced.creator_score : synced.opponent_score,
      theirScore: isCreator ? synced.opponent_score : synced.creator_score
    });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

/**
 * POST /api/challenges/:id/respond
 * Accept or decline challenge invitation
 */
router.post('/:id/respond', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { action } = req.body; // 'accept' | 'decline'
  const supabase = createSupabaseClient(req);

  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'Invalid response action' });
  }

  try {
    const newStatus = action === 'accept' ? 'active' : 'declined';

    const { data, error } = await supabase
      .from('challenges')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('opponent_id', userId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: 'Challenge invitation not found or already processed' });
    }

    cache.delPrefix('challenges:');
    cache.delPrefix(`challenge_detail:${id}`);

    res.json({ message: `Challenge ${action}ed successfully`, challenge: data });
  } catch (err) {
    console.error('Challenge respond error:', err);
    res.status(500).json({ error: 'Failed to update challenge status' });
  }
});

/**
 * POST /api/challenges/:id/react
 * Add emoji encouragement reaction
 */
router.post('/:id/react', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { emoji } = req.body;
  const supabase = createSupabaseClient(req);

  const ALLOWED_EMOJIS = ['🔥', '👏', '💪', '🎯'];
  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return res.status(400).json({ error: 'Invalid reaction emoji' });
  }

  try {
    const { data, error } = await supabase
      .from('challenge_reactions')
      .insert({
        challenge_id: id,
        from_user_id: userId,
        emoji
      })
      .select()
      .single();

    if (error) throw error;

    cache.delPrefix(`challenge_detail:${id}`);

    res.status(201).json(data);
  } catch (err) {
    console.error('Challenge react error:', err);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

/**
 * POST /api/challenges/:id/share
 * Generate/return share token for challenge result
 */
router.post('/:id/share', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const supabase = createSupabaseClient(req);

  try {
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, share_token')
      .eq('id', id)
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .single();

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    let token = challenge.share_token;
    if (!token) {
      token = crypto.randomBytes(12).toString('base64url');
      await supabase
        .from('challenges')
        .update({ share_token: token })
        .eq('id', id);
    }

    const frontendBase = (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:5173');
    res.json({ token, shareUrl: `${frontendBase}/#/challenge/${token}` });
  } catch (err) {
    console.error('Share challenge error:', err);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

/**
 * DELETE /api/challenges/:id
 * Delete a challenge (allowed by creator or opponent)
 */
router.delete('/:id', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const db = supabaseAdmin || createSupabaseClient(req);

  try {
    const { data: challenge, error: fetchErr } = await db
      .from('challenges')
      .select('id, creator_id, opponent_id')
      .eq('id', id)
      .single();

    if (fetchErr || !challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.creator_id !== userId && challenge.opponent_id !== userId) {
      return res.status(403).json({ error: 'You are not a participant of this challenge' });
    }

    // Clean up dependent records explicitly in case foreign key cascade isn't configured in DB
    await Promise.allSettled([
      db.from('challenge_checkins').delete().eq('challenge_id', id),
      db.from('challenge_reactions').delete().eq('challenge_id', id),
      db.from('challenge_daily_logs').delete().eq('challenge_id', id)
    ]);

    const { error: delErr } = await db
      .from('challenges')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    // Invalidate caches
    cache.delPrefix('challenges:');
    cache.delPrefix(`challenge_detail:${id}`);

    res.json({ success: true, message: 'Challenge deleted successfully' });
  } catch (err) {
    console.error('Delete challenge error:', err);
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

module.exports = router;
