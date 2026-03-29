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

-- 3. Planner-oriented search for futures browsing
CREATE OR REPLACE FUNCTION public.search_programs_planner(
  query_text text DEFAULT '',
  user_gpax numeric DEFAULT NULL,
  match_count integer DEFAULT 36
)
RETURNS TABLE (
  program_id text,
  program_name text,
  program_name_en text,
  faculty_name text,
  faculty_name_en text,
  field_name text,
  field_name_en text,
  program_type text,
  program_type_name text,
  university_id text,
  university_name text,
  university_name_en text,
  description_th text,
  total_seats integer,
  cost text,
  degree_level text,
  has_embedding boolean,
  has_requirements boolean,
  round_numbers integer[],
  best_round jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      p.program_id,
      p.program_name,
      p.program_name_en,
      p.faculty_name,
      p.faculty_name_en,
      p.field_name,
      p.field_name_en,
      p.program_type,
      p.program_type_name,
      p.university_id,
      u.university_name,
      u.university_name_en,
      p.search_text AS description_th,
      p.total_seats,
      p.cost,
      NULL::text AS degree_level,
      (p.embedding IS NOT NULL) AS has_embedding
    FROM tcas_programs p
    JOIN tcas_universities u ON u.university_id = p.university_id
    WHERE (
      COALESCE(query_text, '') = ''
      OR p.program_name ILIKE '%' || query_text || '%'
      OR COALESCE(p.program_name_en, '') ILIKE '%' || query_text || '%'
      OR COALESCE(p.faculty_name, '') ILIKE '%' || query_text || '%'
      OR COALESCE(p.faculty_name_en, '') ILIKE '%' || query_text || '%'
      OR COALESCE(p.field_name, '') ILIKE '%' || query_text || '%'
      OR COALESCE(p.field_name_en, '') ILIKE '%' || query_text || '%'
      OR COALESCE(p.program_type_name, '') ILIKE '%' || query_text || '%'
      OR COALESCE(p.search_text, '') ILIKE '%' || query_text || '%'
      OR u.university_name ILIKE '%' || query_text || '%'
      OR COALESCE(u.university_name_en, '') ILIKE '%' || query_text || '%'
    )
    LIMIT match_count * 3
  ),
  round_summary AS (
    SELECT
      ar.program_id,
      ARRAY_AGG(DISTINCT ar.round_number ORDER BY ar.round_number) FILTER (WHERE ar.round_number IS NOT NULL) AS round_numbers,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'round_id', ar.id,
          'round_number', ar.round_number,
          'round_type', ar.round_type,
          'project_name', ar.project_name,
          'receive_seats', ar.receive_seats,
          'min_gpax', ar.min_gpax,
          'folio_closed_date', ar.folio_closed_date,
          'link', ar.link,
          'has_requirements', EXISTS (
            SELECT 1 FROM program_requirements pr WHERE pr.round_id = ar.id
          ),
          'is_eligible', CASE
            WHEN user_gpax IS NULL OR ar.min_gpax IS NULL THEN NULL
            ELSE user_gpax >= ar.min_gpax
          END
        )
        ORDER BY
          CASE
            WHEN user_gpax IS NULL OR ar.min_gpax IS NULL THEN 1
            WHEN user_gpax >= ar.min_gpax THEN 0
            ELSE 2
          END,
          ar.round_number NULLS LAST,
          ar.folio_closed_date NULLS LAST
      ) AS rounds
    FROM tcas_admission_rounds ar
    JOIN base b ON b.program_id = ar.program_id
    GROUP BY ar.program_id
  )
  SELECT
    b.program_id,
    b.program_name,
    b.program_name_en,
    b.faculty_name,
    b.faculty_name_en,
    b.field_name,
    b.field_name_en,
    b.program_type,
    b.program_type_name,
    b.university_id,
    b.university_name,
    b.university_name_en,
    b.description_th,
    b.total_seats,
    b.cost,
    b.degree_level,
    b.has_embedding,
    EXISTS (
      SELECT 1 FROM program_requirements pr WHERE pr.program_id = b.program_id
    ) AS has_requirements,
    COALESCE(rs.round_numbers, ARRAY[]::integer[]) AS round_numbers,
    COALESCE(rs.rounds -> 0, '{}'::jsonb) AS best_round
  FROM base b
  LEFT JOIN round_summary rs ON rs.program_id = b.program_id
  LIMIT match_count;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.search_programs_text TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_programs TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_programs_planner TO authenticated, anon;

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_programs_text', 'search_programs', 'search_programs_planner')
ORDER BY routine_name;
