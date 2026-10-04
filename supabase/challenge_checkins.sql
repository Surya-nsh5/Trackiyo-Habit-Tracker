-- ==============================================================================
-- TRACKIYO CHALLENGE DAILY CHECK-INS (standalone — run on its own)
-- One tick per participant per day. Each checked-in day = 1 point toward
-- that person's own score. Both sides tick independently.
-- Run this file in: Supabase Dashboard → SQL editor. Safe to run twice.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.challenge_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  check_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id, check_date)
);

ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;

-- Drop legacy restrictive policy if present
DROP POLICY IF EXISTS "Users manage own checkins" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Participants view challenge checkins" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Users insert own checkins" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Users update own checkins" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Users delete own checkins" ON public.challenge_checkins;

-- Allow both participants of a challenge to view all checkins for that challenge
CREATE POLICY "Participants view challenge checkins"
ON public.challenge_checkins FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_checkins.challenge_id
      AND (c.creator_id = auth.uid() OR c.opponent_id = auth.uid())
  )
);

CREATE POLICY "Users insert own checkins"
ON public.challenge_checkins FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own checkins"
ON public.challenge_checkins FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own checkins"
ON public.challenge_checkins FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_checkins_challenge_day
  ON public.challenge_checkins(challenge_id, check_date);

-- ==============================================================================
-- VERIFY (optional): SELECT * FROM public.challenge_checkins LIMIT 1;
-- ==============================================================================
