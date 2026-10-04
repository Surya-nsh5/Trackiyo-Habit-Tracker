-- ==============================================================================
-- TRACKIYO STREAKS, ACHIEVEMENTS & SHARING SCHEMA MIGRATION
-- Adds public_shares, streak_grace_logs, custom_streaks, and profile extensions
-- ==============================================================================

-- 1. PUBLIC SHARES TABLE (Secure tokens, sanitized public achievement & streak cards)
CREATE TABLE IF NOT EXISTS public.public_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  metric_value TEXT,
  metric_label TEXT,
  streak_count INTEGER DEFAULT 0,
  achievement_id TEXT,
  tier TEXT DEFAULT 'bronze', -- bronze | silver | gold | platinum
  theme TEXT DEFAULT 'dark',   -- dark | minimal | focus | gold
  custom_message TEXT,
  include_username BOOLEAN DEFAULT true,
  username TEXT,
  include_avatar BOOLEAN DEFAULT false,
  avatar_url TEXT,
  format TEXT DEFAULT 'square', -- story | square | landscape
  is_revoked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view active unrevoked shares' AND tablename = 'public_shares') THEN
    CREATE POLICY "Public can view active unrevoked shares" ON public.public_shares
      FOR SELECT USING (is_revoked = false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own public shares' AND tablename = 'public_shares') THEN
    CREATE POLICY "Users can manage own public shares" ON public.public_shares
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_public_shares_token ON public.public_shares(token);
CREATE INDEX IF NOT EXISTS idx_public_shares_user_id ON public.public_shares(user_id, created_at DESC);

-- 2. CUSTOM STREAKS TABLE (Allow users to track custom consistency goals)
CREATE TABLE IF NOT EXISTS public.custom_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🔥',
  category TEXT DEFAULT 'general',
  target_frequency TEXT DEFAULT 'daily', -- daily | weekly
  weekly_target_days INTEGER DEFAULT 7,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.custom_streaks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own custom streaks' AND tablename = 'custom_streaks') THEN
    CREATE POLICY "Users can manage own custom streaks" ON public.custom_streaks
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_custom_streaks_user ON public.custom_streaks(user_id);

-- 3. CUSTOM STREAK LOGS
CREATE TABLE IF NOT EXISTS public.custom_streak_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  custom_streak_id UUID REFERENCES public.custom_streaks(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(custom_streak_id, log_date)
);

ALTER TABLE public.custom_streak_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own custom streak logs' AND tablename = 'custom_streak_logs') THEN
    CREATE POLICY "Users can manage own custom streak logs" ON public.custom_streak_logs
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_custom_streak_logs_date ON public.custom_streak_logs(user_id, log_date DESC);

-- 4. GRACE DAY AUDIT LOG
CREATE TABLE IF NOT EXISTS public.streak_grace_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  streak_type TEXT NOT NULL, -- habit | focus | task | custom
  entity_id TEXT NOT NULL,   -- habit_id or streak_id
  missed_date DATE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type, entity_id, missed_date)
);

ALTER TABLE public.streak_grace_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own grace day logs' AND tablename = 'streak_grace_logs') THEN
    CREATE POLICY "Users can manage own grace day logs" ON public.streak_grace_logs
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grace_logs_user ON public.streak_grace_logs(user_id, missed_date DESC);

-- 5. EXTEND USER PROFILES for Streak & Sharing Preferences
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS streak_preferences JSONB DEFAULT '{"graceDaysAvailable": 2, "timezone": "UTC", "enableNotifications": true, "showOnProfile": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS shared_progress_tokens JSONB DEFAULT '[]'::jsonb;
