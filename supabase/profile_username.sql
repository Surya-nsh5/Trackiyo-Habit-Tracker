-- ==============================================================================
-- TRACKIYO USERNAME MIGRATION (standalone — run on its own)
-- Adds a searchable, unique username to profiles with automatic defaults:
--   1. slug of full name      (e.g. "Surya Bhai" -> "surya_bhai")
--   2. else "user_<id8>"      (e.g. "user_a3f9c1e2") when no name exists
-- Run this file in: Supabase Dashboard → SQL editor. Safe to re-run.
-- ==============================================================================

-- 1. Username column
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT DEFAULT NULL;

-- 2. Backfill existing rows that have no username
--    Display rule everywhere: username → else full name → else 'Trackiyo User'
DO $$ BEGIN
  UPDATE public.profiles p SET username = sub.uname
  FROM (
    SELECT id,
           (COALESCE(
              NULLIF(regexp_replace(lower(COALESCE(name, '')), '[^a-z0-9]+', '_', 'g'), ''),
              'user'
            ) || '_' || substr(id::text, 1, 4)) AS uname
    FROM public.profiles
    WHERE username IS NULL OR username = ''
  ) AS sub
  WHERE p.id = sub.id;
END $$;

-- 3. De-duplicate (append a counter suffix where the same slug repeats)
DO $$
DECLARE
  r RECORD;
  n INTEGER;
  base TEXT;
BEGIN
  FOR r IN
    SELECT id, username, ROW_NUMBER() OVER (PARTITION BY lower(username) ORDER BY id) AS rn
    FROM public.profiles WHERE username IS NOT NULL AND username <> ''
  LOOP
    IF r.rn > 1 THEN
      base := r.username;
      n := r.rn;
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(base || n) AND id <> r.id) LOOP
        n := n + 1;
      END LOOP;
      UPDATE public.profiles SET username = base || n WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 4. Case-insensitive uniqueness for all future usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
  ON public.profiles (lower(username));

-- 5. Auto-default trigger: never allow a NULL/empty username again
CREATE OR REPLACE FUNCTION public.fill_default_username()
RETURNS TRIGGER AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  suffix INTEGER := 0;
BEGIN
  IF NEW.username IS NULL OR btrim(NEW.username) = '' THEN
    base := NULLIF(regexp_replace(lower(COALESCE(NEW.name, '')), '[^a-z0-9]+', '_', 'g'), '');
    base := COALESCE(NULLIF(base, ''), 'user');
    base := substr(base, 1, 16);
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate) AND id <> NEW.id) LOOP
      suffix := suffix + 1;
      candidate := substr(base, 1, 14) || suffix;
    END LOOP;
    NEW.username := candidate;
  ELSE
    NEW.username := lower(btrim(NEW.username));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_default_username ON public.profiles;
CREATE TRIGGER trg_profiles_default_username
  BEFORE INSERT OR UPDATE OF username, name ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.fill_default_username();

-- ==============================================================================
-- VERIFY (optional): run after applying
--   SELECT id, name, username FROM public.profiles ORDER BY created_at DESC LIMIT 10;
--   -- every row must have a non-empty, unique (case-insensitive) username
-- ==============================================================================
