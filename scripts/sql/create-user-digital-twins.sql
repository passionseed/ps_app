-- Migration: Create user_digital_twins table for the Digital Twin architecture
-- Created: 2026-05-05
--
-- Purpose: Stores a lightweight LLM-readable "digital twin" per user,
-- built incrementally from signals the user generates (reflections, path
-- activity, quiz answers, etc.). The twin is read by edge functions to
-- personalise conversations, recommendations, and learning paths.
--
-- Run in Supabase Dashboard → SQL Editor
-- Or: psql $DATABASE_URL -f create-user-digital-twins.sql

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.user_digital_twins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  twin_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  signal_count INT DEFAULT 0,
  last_signal_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stale_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 2. Table and column comments
COMMENT ON TABLE public.user_digital_twins IS
  'Lightweight per-user digital twin built from behavioural signals. Consumed by edge functions for personalisation.';

COMMENT ON COLUMN public.user_digital_twins.user_id IS
  'FK to auth.users. One twin per user (1:1).';

COMMENT ON COLUMN public.user_digital_twins.twin_data IS
  'Structured JSON twin payload (interests, strengths, confusion areas, reflection themes, etc.). Schema is owned by the twin edge function.';

COMMENT ON COLUMN public.user_digital_twins.signal_count IS
  'Running count of signals that have been merged into this twin. Used to decide when the twin is "warm" enough for recommendations.';

COMMENT ON COLUMN public.user_digital_twins.last_signal_at IS
  'Timestamp of the most recent signal that updated the twin.';

COMMENT ON COLUMN public.user_digital_twins.updated_at IS
  'Auto-managed by trigger (update_digital_twin_timestamp). Set to NOW() on every UPDATE.';

COMMENT ON COLUMN public.user_digital_twins.stale_after IS
  'Absolute expiry timestamp. Twins that are not refreshed before this date are considered stale and should be rebuilt by the edge function.';

-- 3. Index for stale-twin sweeps
CREATE INDEX IF NOT EXISTS idx_user_digital_twins_stale_after
  ON public.user_digital_twins (stale_after)
  WHERE twin_data IS NOT NULL AND twin_data <> '{}'::jsonb;

-- 4. Enable Row Level Security
ALTER TABLE public.user_digital_twins ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Users can read their own twin (the mobile client fetches it to show personalised UI)
DROP POLICY IF EXISTS "Users can read their own digital twin"
  ON public.user_digital_twins;
CREATE POLICY "Users can read their own digital twin"
  ON public.user_digital_twins
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS entirely, so no explicit INSERT / UPDATE policy is
-- needed for edge functions. End users are intentionally blocked from writing
-- their own twin — all writes go through the twin edge function.

-- 6. Trigger: keep updated_at accurate on every UPDATE
CREATE OR REPLACE FUNCTION public.update_digital_twin_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_digital_twin_timestamp() IS
  'Trigger function that sets updated_at = NOW() before every UPDATE on user_digital_twins.';

DROP TRIGGER IF EXISTS trg_update_digital_twin_timestamp
  ON public.user_digital_twins;
CREATE TRIGGER trg_update_digital_twin_timestamp
  BEFORE UPDATE ON public.user_digital_twins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_digital_twin_timestamp();

-- 7. Verify
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_digital_twins'
ORDER BY ordinal_position;

SELECT
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_digital_twins';

-- =============================================================================
-- DOWN MIGRATION (run only when rolling back)
-- =============================================================================
--
-- DROP TRIGGER IF EXISTS trg_update_digital_twin_timestamp ON public.user_digital_twins;
-- DROP FUNCTION IF EXISTS public.update_digital_twin_timestamp();
-- DROP POLICY IF EXISTS "Users can read their own digital twin" ON public.user_digital_twins;
-- DROP TABLE IF EXISTS public.user_digital_twins;
