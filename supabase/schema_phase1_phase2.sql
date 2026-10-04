-- ==============================================================================
-- TRACKIYO PHASE 1 + 2 FEATURE SCHEMA MIGRATION
-- Quick Capture, Time Blocking, Habit Stacking, Achievements, Smart Priority,
-- Task Dependencies, Deep Work, Distraction Log, Templates
-- ==============================================================================

-- 1. QUICK CAPTURE TABLE
CREATE TABLE IF NOT EXISTS public.captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own captures' AND tablename = 'captures') THEN
    CREATE POLICY "Users can manage own captures" ON public.captures FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_captures_user_id ON public.captures(user_id, created_at DESC);

-- 2. TIME BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  block_date DATE GENERATED ALWAYS AS (date(start_time AT TIME ZONE 'UTC')) STORED,
  color TEXT DEFAULT '#4F46E5',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own time blocks' AND tablename = 'time_blocks') THEN
    CREATE POLICY "Users can manage own time blocks" ON public.time_blocks FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON public.time_blocks(user_id, block_date);

-- 3. HABIT STACKS TABLE (Habit Stacking / Routines)
CREATE TABLE IF NOT EXISTS public.habit_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  habit_ids UUID[] DEFAULT '{}',
  trigger TEXT DEFAULT '',
  time_of_day TEXT DEFAULT 'morning',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.habit_stacks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own habit stacks' AND tablename = 'habit_stacks') THEN
    CREATE POLICY "Users can manage own habit stacks" ON public.habit_stacks FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_habit_stacks_user_id ON public.habit_stacks(user_id);

-- 4. TEMPLATES TABLE (Task/Habit/Routine templates)
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'task', -- task | habit | routine | project
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own templates' AND tablename = 'templates') THEN
    CREATE POLICY "Users can manage own templates" ON public.templates FOR ALL USING (auth.uid() = user_id OR is_public = true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);

-- 5. DISTRACTION LOG TABLE (Deep Work / Focus enhancements)
CREATE TABLE IF NOT EXISTS public.distractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  focus_session_id UUID REFERENCES public.focus_sessions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.distractions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own distractions' AND tablename = 'distractions') THEN
    CREATE POLICY "Users can manage own distractions" ON public.distractions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_distractions_user_id ON public.distractions(user_id);
CREATE INDEX IF NOT EXISTS idx_distractions_session ON public.distractions(focus_session_id);

-- 6. EXTEND TASKS TABLE for Phase 1 features
-- Task dependencies (self-referencing)
ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energy_level TEXT DEFAULT 'medium'; -- low | medium | high

-- 7. EXTEND USER PROFILES for energy-based planning and AI toggle
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS energy_profile JSONB DEFAULT '{"morning":"high","afternoon":"medium","evening":"low"}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_assist_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deep_work_mode_enabled BOOLEAN DEFAULT false;

-- 8. EXTENDED ACHIEVEMENTS (Phase 2)
-- Achievements are already tracked in profiles.unlocked_achievements (text[]) from schema_v2.sql
-- We extend here with a more detailed achievements log table
CREATE TABLE IF NOT EXISTS public.achievement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  xp_awarded INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);
ALTER TABLE public.achievement_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own achievement log' AND tablename = 'achievement_log') THEN
    CREATE POLICY "Users can manage own achievement log" ON public.achievement_log FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_achievement_log_user ON public.achievement_log(user_id, earned_at DESC);

-- 9. PERFORMANCE INDEXES for new features
CREATE INDEX IF NOT EXISTS idx_tasks_priority_score ON public.tasks(user_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_dependency ON public.tasks(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_energy_level ON public.tasks(user_id, energy_level);

-- ==============================================================================
-- END OF PHASE 1 + 2 MIGRATION
-- ==============================================================================
