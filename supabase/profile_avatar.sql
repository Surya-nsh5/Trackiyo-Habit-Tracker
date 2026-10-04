-- ==============================================================================
-- TRACKIYO PROFILE AVATAR MIGRATION (standalone — run on its own)
-- Adds avatar persistence to profiles + a public Supabase Storage bucket.
-- Uploads go through POST /api/profiles/avatar (service_role, no RLS issue),
-- but this file is still required for: the avatar column, the bucket itself
-- (backend also creates it idempotently), and the public-read policy so
-- <img> tags can load pictures without authentication.
-- Run this file in: Supabase Dashboard → SQL editor. Safe to re-run.
-- ==============================================================================

-- 1. Avatar column on profiles (present in base schema.sql, guarded here
--    so this file works standalone on any database state)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;

-- 2. Public storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: public read, users manage only their own folder
--    (upload path convention: avatars/<user_id>/<filename>)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view avatars' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload own avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- ==============================================================================
-- VERIFY (optional): run after applying
--   SELECT id, name FROM storage.buckets WHERE id = 'avatars';
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar';
-- ==============================================================================
