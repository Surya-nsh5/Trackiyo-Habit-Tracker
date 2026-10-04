-- ==============================================================================
-- TRACKIYO MIGRATION: REMOVE OBSOLETE ELEMENTS & SYNC DATABASE SCHEMA
-- Clean, safe, idempotent script for PostgreSQL / Supabase
-- ==============================================================================

-- 1. DROP OBSOLETE WEEKLY REVIEWS & REVIEW SUMMARIES TABLES (CASCADE automatically drops policies & indexes)
DROP INDEX IF EXISTS public.idx_reviews_user_week;
DROP TABLE IF EXISTS public.weekly_reviews CASCADE;
DROP TABLE IF EXISTS public.review_summaries CASCADE;

-- 2. UPDATE WELLNESS TABLE
-- Drop deprecated 'stress' column (replaced by 'water')
ALTER TABLE IF EXISTS public.wellness
  DROP COLUMN IF EXISTS stress CASCADE;

-- Add first-class 'water' (glasses per day) and 'energy' (1-10) columns
ALTER TABLE IF EXISTS public.wellness
  ADD COLUMN IF NOT EXISTS water INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energy INTEGER DEFAULT 5;

-- 3. DROP RESIDUAL GOALS TABLE IF EXISTS
DROP TABLE IF EXISTS public.goals CASCADE;

-- ==============================================================================
-- VERIFICATION QUERIES (Optional - run to verify):
-- ==============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wellness';
