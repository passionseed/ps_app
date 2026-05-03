-- Migration: Store storage paths only (not full URLs) for hackathon submissions
-- Run this AFTER deploying the mobile app update so new uploads use paths.
-- Old B2/CDN/Supabase URLs in DB will be transformed client-side, but this
-- backfill ensures the DB is clean for long-term maintainability.
--
-- B2 base:  https://f005.backblazeb2.com/file/pseed-dev
-- CDN base: https://cdn.passionseed.org
-- Supabase: https://{ref}.supabase.co/storage/v1/object/public/hackathon_submissions/
--
-- This migration strips those bases, keeping only the storage path.

BEGIN;

-- Step 1: Backfill hackathon_phase_activity_submissions (individual)
UPDATE hackathon_phase_activity_submissions
SET
  image_url = CASE
    WHEN image_url IS NOT NULL THEN
      REGEXP_REPLACE(
        REGEXP_REPLACE(image_url,
          '^https://f005\.backblazeb2\.com/file/pseed-dev/', ''),
        '^https://cdn\.passionseed\.org/', '')
    ELSE NULL
  END,
  file_urls = CASE
    WHEN file_urls IS NOT NULL THEN
      (SELECT jsonb_agg(
        REGEXP_REPLACE(
          REGEXP_REPLACE(value::text, '^https://f005\.backblazeb2\.com/file/pseed-dev/', ''),
          '^https://cdn\.passionseed\.org/', '')
      ) FROM jsonb_array_elements_text(file_urls) AS arr(value))
    ELSE NULL
  END
WHERE
  image_url LIKE 'https://f005.backblazeb2.com/file/pseed-dev%'
  OR image_url LIKE 'https://cdn.passionseed.org%'
  OR file_urls::text LIKE '%https://f005.backblazeb2.com/file/pseed-dev%'
  OR file_urls::text LIKE '%https://cdn.passionseed.org%';

-- Step 2: Backfill hackathon_phase_activity_team_submissions
UPDATE hackathon_phase_activity_team_submissions
SET
  image_url = CASE
    WHEN image_url IS NOT NULL THEN
      REGEXP_REPLACE(
        REGEXP_REPLACE(image_url,
          '^https://f005\.backblazeb2\.com/file/pseed-dev/', ''),
        '^https://cdn\.passionseed\.org/', '')
    ELSE NULL
  END,
  file_urls = CASE
    WHEN file_urls IS NOT NULL THEN
      (SELECT jsonb_agg(
        REGEXP_REPLACE(
          REGEXP_REPLACE(value::text, '^https://f005\.backblazeb2\.com/file/pseed-dev/', ''),
          '^https://cdn\.passionseed\.org/', '')
      ) FROM jsonb_array_elements_text(file_urls) AS arr(value))
    ELSE NULL
  END
WHERE
  image_url LIKE 'https://f005.backblazeb2.com/file/pseed-dev%'
  OR image_url LIKE 'https://cdn.passionseed.org%'
  OR file_urls::text LIKE '%https://f005.backblazeb2.com/file/pseed-dev%'
  OR file_urls::text LIKE '%https://cdn.passionseed.org%';

COMMIT;

-- Verify: count rows that still have full URLs (should be 0 after migration)
-- SELECT
--   (SELECT COUNT(*) FROM hackathon_phase_activity_submissions
--    WHERE image_url LIKE 'https://%' OR file_urls::text LIKE '%https://%') +
--   (SELECT COUNT(*) FROM hackathon_phase_activity_team_submissions
--    WHERE image_url LIKE 'https://%' OR file_urls::text LIKE '%https://%') AS rows_with_full_urls;
