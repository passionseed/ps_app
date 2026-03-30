-- Migration: Allow anonymous (guest) users to read seeds and paths
-- Created: 2026-03-31
--
-- Context: The mobile app has a guest/skip mode that lets unauthenticated users
-- browse career paths. Without these policies, the anon role gets 0 rows from
-- seeds/paths due to RLS, causing the app to fall back to hardcoded sample seeds.
--
-- Run this in Supabase Dashboard → SQL Editor
-- Or: psql $DATABASE_URL -f allow-anon-read-seeds.sql

-- Allow anon to read seeds (career paths shown on discover screen)
CREATE POLICY IF NOT EXISTS "anon can read seeds"
ON public.seeds FOR SELECT
TO anon
USING (true);

-- Allow anon to read paths (needed to show total_days, path id, etc.)
CREATE POLICY IF NOT EXISTS "anon can read paths"
ON public.paths FOR SELECT
TO anon
USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('seeds', 'paths')
ORDER BY tablename, policyname;
