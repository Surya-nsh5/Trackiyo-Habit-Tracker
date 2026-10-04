-- ==============================================================================
-- TRACKIYO PHASE 3 + COMPLETION MIGRATION
-- Fills gaps: daily_plans, deep_work_sessions, coach_sessions,
-- tasks.parent_task_id (sub-task hierarchy), review summaries support
-- Run AFTER schema.sql, schema_v2.sql, schema_phase1_phase2.sql
-- ==============================================================================

-- 1. DAILY PLANS (AI Daily Planner — Phase 1 #2)
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  plan_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  energy_context TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_date)
);
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own daily plans' AND tablename = 'daily_plans') THEN
    CREATE POLICY "Users can manage own daily plans" ON public.daily_plans FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON public.daily_plans(user_id, plan_date DESC);

-- 2. DEEP WORK SESSIONS (Phase 1 #13)
CREATE TABLE IF NOT EXISTS public.deep_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  start_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_timestamp TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0,
  distraction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.deep_work_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own deep work sessions' AND tablename = 'deep_work_sessions') THEN
    CREATE POLICY "Users can manage own deep work sessions" ON public.deep_work_sessions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_deep_work_user ON public.deep_work_sessions(user_id, start_timestamp DESC);

-- 3. COACH SESSIONS (Phase 3 #33 — AI Coaching Chat history)
CREATE TABLE IF NOT EXISTS public.coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own coach sessions' AND tablename = 'coach_sessions') THEN
    CREATE POLICY "Users can manage own coach sessions" ON public.coach_sessions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user ON public.coach_sessions(user_id, updated_at DESC);

-- 4. TASK HIERARCHY — parent_task_id for true sub-tasks (Phase 1 #3)
ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);

-- 5. DAILY SUMMARY preference (Phase 2 #26)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN DEFAULT false;

-- ==============================================================================
-- END PHASE 3 MIGRATION
-- ==============================================================================
