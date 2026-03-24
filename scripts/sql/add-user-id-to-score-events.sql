-- Migration: Add user_id column to score_events table
-- The table was created without user_id, but both the score-engine edge function
-- and the client scoreEngine.ts filter/insert by user_id.
--
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.score_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill user_id from the related path_enrollments table if enrollment_id exists
-- (skip if the column doesn't exist yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'score_events' AND column_name = 'enrollment_id'
  ) THEN
    UPDATE public.score_events se
    SET user_id = pe.user_id
    FROM public.path_enrollments pe
    WHERE se.enrollment_id = pe.id
      AND se.user_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_score_events_user_id ON public.score_events(user_id);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'score_events'
ORDER BY ordinal_position;
