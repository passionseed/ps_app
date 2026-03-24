-- Migration: Create search functions for TCAS programs
-- Created: 2026-03-23
--
-- Run this in Supabase Dashboard → SQL Editor
-- Or: psql $DATABASE_URL -f create-search-functions.sql

-- 1. Full-text search for programs (Thai + English)
CREATE OR REPLACE FUNCTION public.search_programs_text(
  query text,
  match_count integer DEFAULT 20
)
RETURNS TABLE (
  program_id text,
  program_name text,
  program_name_en text,
  faculty_name text,
  faculty_name_en text,
  university_name text,
  university_id text,
  rank float4,
  round_numbers integer[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsquery_val tsquery;
BEGIN
  -- Build tsquery from plain text (handles Thai and English)
  tsquery_val := plainto_tsquery('simple', query);

  RETURN QUERY
  SELECT
    p.program_id,
    p.program_name,
    p.program_name_en,
    p.faculty_name,
    p.faculty_name_en,
    u.university_name,
    p.university_id,
    COALESCE(ts_rank(p.search_text, tsquery_val), 0) AS rank,
    (SELECT ARRAY_AGG(DISTINCT ar.round_number) FROM tcas_admission_rounds ar WHERE ar.program_id = p.program_id) AS round_numbers
  FROM tcas_programs p
  JOIN tcas_universities u ON u.university_id = p.university_id
  WHERE p.search_text @@ tsquery_val
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- 2. Vector similarity search using embeddings
CREATE OR REPLACE FUNCTION public.search_programs(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count integer DEFAULT 20
)
RETURNS TABLE (
  program_id text,
  program_name text,
  program_name_en text,
  faculty_name text,
  university_name text,
  university_id text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.program_id,
    p.program_name,
    p.program_name_en,
    p.faculty_name,
    u.university_name,
    p.university_id,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM tcas_programs p
  JOIN tcas_universities u ON u.university_id = p.university_id
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) >= match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.search_programs_text TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_programs TO authenticated, anon;

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_programs_text', 'search_programs')
ORDER BY routine_name;