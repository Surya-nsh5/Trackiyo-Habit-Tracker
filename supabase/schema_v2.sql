-- ==============================================================================
-- TRACKIYO 2.0 DATABASE SCHEMA MIGRATION
-- Adds Goals, Projects, Focus Sessions, Journal, Weekly Reviews, User Settings,
-- and enhances Tasks, Habits, and Wellness with RLS and Performance Indexes.
-- ==============================================================================

-- 1. EXTEND PROFILES
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS life_areas TEXT[] DEFAULT '{"Career","Learning","Fitness","Personal","Finance","Projects"}',
  ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'slate',
  ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS unlocked_achievements TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"taskReminders":true,"habitReminders":true,"wellnessReminders":true,"weeklyReview":true}'::jsonb;

-- 2. CREATE PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT CHECK (status IN ('Backlog', 'Planned', 'In Progress', 'Completed', 'Archived')) DEFAULT 'In Progress',
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  deadline DATE,
  area TEXT DEFAULT 'Projects',
  tags TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#0369A1',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXTEND TASKS TABLE
ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_duration INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 5. EXTEND HABITS TABLE
ALTER TABLE IF EXISTS public.habits
  ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'custom')) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS target_days_per_week INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS specific_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'Health';

-- 6. EXTEND WELLNESS TABLE
ALTER TABLE IF EXISTS public.wellness
  ADD COLUMN IF NOT EXISTS energy INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS water INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activities TEXT[] DEFAULT '{}';

-- 7. CREATE FOCUS SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  duration INTEGER NOT NULL, -- Duration in seconds
  session_type TEXT CHECK (session_type IN ('pomodoro', 'short_break', 'long_break', 'custom', 'stopwatch')) DEFAULT 'pomodoro',
  notes TEXT DEFAULT '',
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREATE JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  mood INTEGER,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN

  -- Projects policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own projects' AND tablename = 'projects') THEN
    CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- Focus Sessions policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own focus sessions' AND tablename = 'focus_sessions') THEN
    CREATE POLICY "Users can manage own focus sessions" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- Journal Entries policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own journal entries' AND tablename = 'journal_entries') THEN
    CREATE POLICY "Users can manage own journal entries" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(user_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON public.focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed_at ON public.focus_sessions(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.journal_entries(user_id, entry_date DESC);

