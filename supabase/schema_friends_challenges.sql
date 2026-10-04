-- ==============================================================================
-- TRACKIYO FRIENDS & STREAK CHALLENGES SCHEMA MIGRATION
-- Supports: Friend connections, 1-on-1 streak challenges, auto-scoring, reactions
-- ==============================================================================

-- 1. FRIENDSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | accepted | declined | blocked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_different_users CHECK (user_id != friend_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair 
  ON public.friendships (LEAST(user_id, friend_id), GREATEST(user_id, friend_id));

CREATE INDEX IF NOT EXISTS idx_friendships_user_status 
  ON public.friendships (user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status 
  ON public.friendships (friend_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their friendships' AND tablename = 'friendships') THEN
    CREATE POLICY "Users can view their friendships" ON public.friendships
      FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create friend requests' AND tablename = 'friendships') THEN
    CREATE POLICY "Users can create friend requests" ON public.friendships
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can update friendships' AND tablename = 'friendships') THEN
    CREATE POLICY "Participants can update friendships" ON public.friendships
      FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can remove friendships' AND tablename = 'friendships') THEN
    CREATE POLICY "Participants can remove friendships" ON public.friendships
      FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
END $$;


-- 2. CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'focus' | 'habit' | 'task' | 'consistency'
  target_metric NUMERIC NOT NULL,
  target_unit TEXT NOT NULL,     -- 'minutes_per_day' | 'tasks_per_day' | 'habit_per_day' | 'active_days'
  target_habit_id UUID,
  duration_days INTEGER NOT NULL DEFAULT 14,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  scoring_mode TEXT DEFAULT 'binary_daily', -- 'binary_daily' | 'capped_ratio'
  status TEXT DEFAULT 'pending', -- pending | active | completed | declined | cancelled
  creator_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  winner_id UUID,               -- NULL if draw or active
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_challenge_participants CHECK (creator_id != opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_participants 
  ON public.challenges (creator_id, opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates 
  ON public.challenges (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_share_token 
  ON public.challenges (share_token);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can view their challenges' AND tablename = 'challenges') THEN
    CREATE POLICY "Participants can view their challenges" ON public.challenges
      FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = opponent_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Creator can create challenges' AND tablename = 'challenges') THEN
    CREATE POLICY "Creator can create challenges" ON public.challenges
      FOR INSERT WITH CHECK (auth.uid() = creator_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can update challenges' AND tablename = 'challenges') THEN
    CREATE POLICY "Participants can update challenges" ON public.challenges
      FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = opponent_id);
  END IF;
END $$;


-- 3. CHALLENGE DAILY LOGS (Score ledger)
CREATE TABLE IF NOT EXISTS public.challenge_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  actual_value NUMERIC DEFAULT 0,
  target_met BOOLEAN DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_challenge_user_date UNIQUE (challenge_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_challenge_daily_logs_lookup 
  ON public.challenge_daily_logs (challenge_id, user_id, date);

ALTER TABLE public.challenge_daily_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can view daily logs' AND tablename = 'challenge_daily_logs') THEN
    CREATE POLICY "Participants can view daily logs" ON public.challenge_daily_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.challenges c 
          WHERE c.id = challenge_id AND (c.creator_id = auth.uid() OR c.opponent_id = auth.uid())
        )
      );
  END IF;
END $$;


-- 4. CHALLENGE REACTIONS TABLE (Lightweight encouragement)
CREATE TABLE IF NOT EXISTS public.challenge_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.challenge_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can view and add reactions' AND tablename = 'challenge_reactions') THEN
    CREATE POLICY "Participants can view and add reactions" ON public.challenge_reactions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.challenges c 
          WHERE c.id = challenge_id AND (c.creator_id = auth.uid() OR c.opponent_id = auth.uid())
        )
      );
  END IF;
END $$;


-- 5. EXTEND PROFILES WITH FRIEND & PRIVACY PREFERENCES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'friends';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_challenges BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_streaks BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_achievements BOOLEAN DEFAULT true;
