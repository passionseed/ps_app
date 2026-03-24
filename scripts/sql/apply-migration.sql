-- Migration: Add enrichment columns to jobs table for Exa API data
-- Created: 2026-03-23
--
-- Run this in Supabase Dashboard → SQL Editor
-- Or: psql $DATABASE_URL -f apply-migration.sql

-- Add columns for news, notable people, and companies from Exa API
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS news_items JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS notable_people JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS top_companies_enriched JSONB DEFAULT '[]';

-- Create GIN indexes for JSONB array queries
CREATE INDEX IF NOT EXISTS idx_jobs_news_items ON public.jobs USING GIN(news_items);
CREATE INDEX IF NOT EXISTS idx_jobs_notable_people ON public.jobs USING GIN(notable_people);

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.news_items IS 'Array of news articles about this career from Exa API: [{title, url, published_date, source, summary}]';
COMMENT ON COLUMN public.jobs.notable_people IS 'Array of notable people in this career from Exa API: [{name, url, description}]';
COMMENT ON COLUMN public.jobs.top_companies_enriched IS 'Array of top companies from Exa API: [{name, url, description}]';

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('news_items', 'notable_people', 'top_companies_enriched', 'day_in_life_th', 'day_in_life_en')
ORDER BY column_name;
