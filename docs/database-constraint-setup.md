# Empty Submissions Prevention Constraint

## Status
✅ **Cleanup Complete**: 0 empty submissions in database (verified: 428 total, all have content)
⏳ **Constraint**: Needs manual application via Supabase Dashboard

## Manual Setup Required

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Add validation to prevent empty submissions
-- Empty submissions have no text_answer, no image_url, and no file_urls

-- First, clean up any existing empty submissions (safety check)
DELETE FROM public.hackathon_phase_activity_submissions
WHERE text_answer IS NULL 
  AND image_url IS NULL 
  AND (file_urls IS NULL OR file_urls = '{}');

-- Add check constraint to prevent future empty submissions
ALTER TABLE public.hackathon_phase_activity_submissions
DROP CONSTRAINT IF EXISTS check_not_empty_submission;

ALTER TABLE public.hackathon_phase_activity_submissions
ADD CONSTRAINT check_not_empty_submission
CHECK (
  text_answer IS NOT NULL 
  OR image_url IS NOT NULL 
  OR (file_urls IS NOT NULL AND array_length(file_urls, 1) > 0)
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT check_not_empty_submission ON public.hackathon_phase_activity_submissions 
IS 'Prevents submissions with no content - must have text, image, or files';
```

## What This Does
- Prevents future empty submissions (no text, no image, no files)
- Ensures all submissions have at least one content field populated
- Already verified: all 428 existing submissions have content

## Verification
After applying, test with:
```sql
-- Should fail (empty submission)
INSERT INTO hackathon_phase_activity_submissions 
  (participant_id, activity_id, assessment_id, status)
VALUES 
  ('uuid', 'uuid', 'uuid', 'draft');

-- Should succeed (has text)
INSERT INTO hackathon_phase_activity_submissions 
  (participant_id, activity_id, assessment_id, text_answer, status)
VALUES 
  ('uuid', 'uuid', 'uuid', 'test content', 'draft');
```
