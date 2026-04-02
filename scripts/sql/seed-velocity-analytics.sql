-- Analytics export for PS-21: seed velocity + Direction Finder readiness.
-- Run in Supabase SQL Editor, then point Metabase / Supabase Insights at the
-- generated views below.

DROP VIEW IF EXISTS public.analytics_seed_velocity_aha_summary_v1;
DROP VIEW IF EXISTS public.analytics_seed_velocity_engagement_by_seed_count_v1;
DROP VIEW IF EXISTS public.analytics_seed_velocity_user_metrics_v1;

CREATE VIEW public.analytics_seed_velocity_user_metrics_v1 AS
WITH users AS (
  SELECT DISTINCT user_id
  FROM public.user_events
  WHERE user_id IS NOT NULL

  UNION

  SELECT DISTINCT user_id
  FROM public.path_enrollments
  WHERE user_id IS NOT NULL
),
seed_start_sources AS (
  SELECT
    pe.user_id,
    pe.path_id,
    p.seed_id,
    pe.enrolled_at AS occurred_at
  FROM public.path_enrollments pe
  JOIN public.paths p ON p.id = pe.path_id

  UNION ALL

  SELECT
    ue.user_id,
    COALESCE(ue.event_data ->> 'path_id', pe.path_id) AS path_id,
    COALESCE(ue.event_data ->> 'seed_id', p.seed_id) AS seed_id,
    ue.created_at AS occurred_at
  FROM public.user_events ue
  LEFT JOIN public.path_enrollments pe
    ON pe.id = ue.event_data ->> 'enrollment_id'
  LEFT JOIN public.paths p
    ON p.id = COALESCE(ue.event_data ->> 'path_id', pe.path_id)
  WHERE ue.event_type = 'seed_started'
    AND ue.user_id IS NOT NULL
),
seed_starts AS (
  SELECT
    user_id,
    path_id,
    seed_id,
    MIN(occurred_at) AS started_at
  FROM seed_start_sources
  WHERE path_id IS NOT NULL
    AND seed_id IS NOT NULL
  GROUP BY user_id, path_id, seed_id
),
seed_completion_sources AS (
  SELECT
    pe.user_id,
    pe.path_id,
    p.seed_id,
    pe.completed_at AS occurred_at
  FROM public.path_enrollments pe
  JOIN public.paths p ON p.id = pe.path_id
  WHERE pe.completed_at IS NOT NULL
     OR pe.status = 'explored'

  UNION ALL

  SELECT
    ue.user_id,
    COALESCE(ue.event_data ->> 'path_id', pe.path_id) AS path_id,
    COALESCE(ue.event_data ->> 'seed_id', p.seed_id) AS seed_id,
    ue.created_at AS occurred_at
  FROM public.user_events ue
  LEFT JOIN public.path_enrollments pe
    ON pe.id = ue.event_data ->> 'enrollment_id'
  LEFT JOIN public.paths p
    ON p.id = COALESCE(ue.event_data ->> 'path_id', pe.path_id)
  WHERE ue.event_type = 'seed_completed'
    AND ue.user_id IS NOT NULL
),
seed_completions AS (
  SELECT
    user_id,
    path_id,
    seed_id,
    MIN(occurred_at) AS completed_at
  FROM seed_completion_sources
  WHERE path_id IS NOT NULL
    AND seed_id IS NOT NULL
    AND occurred_at IS NOT NULL
  GROUP BY user_id, path_id, seed_id
),
first_direction_finder AS (
  SELECT
    user_id,
    MIN(created_at) AS first_direction_finder_viewed_at,
    COUNT(*) AS direction_finder_views
  FROM public.user_events
  WHERE event_type = 'direction_finder_viewed'
    AND user_id IS NOT NULL
  GROUP BY user_id
),
categories_started AS (
  SELECT
    ss.user_id,
    COALESCE(s.category_id, ss.seed_id) AS category_key
  FROM seed_starts ss
  LEFT JOIN public.seeds s ON s.id = ss.seed_id
),
completed_before_first_df AS (
  SELECT
    sc.user_id,
    COUNT(DISTINCT sc.seed_id) AS completed_seeds_before_first_direction_finder
  FROM seed_completions sc
  JOIN first_direction_finder fd
    ON fd.user_id = sc.user_id
   AND sc.completed_at <= fd.first_direction_finder_viewed_at
  GROUP BY sc.user_id
)
SELECT
  u.user_id,
  COUNT(DISTINCT ss.seed_id) AS seeds_started,
  COUNT(DISTINCT sc.seed_id) AS seeds_completed,
  COUNT(DISTINCT cs.category_key) AS categories_explored,
  COALESCE(cbfd.completed_seeds_before_first_direction_finder, 0) AS completed_seeds_before_first_direction_finder,
  fd.first_direction_finder_viewed_at,
  COALESCE(fd.direction_finder_views, 0) AS direction_finder_views,
  (COUNT(DISTINCT sc.seed_id) >= 1) AS milestone_1_completed,
  (COUNT(DISTINCT sc.seed_id) >= 2) AS milestone_2_completed,
  (COUNT(DISTINCT sc.seed_id) >= 3) AS milestone_3_completed,
  (COUNT(DISTINCT sc.seed_id) >= 5) AS milestone_5_completed
FROM users u
LEFT JOIN seed_starts ss
  ON ss.user_id = u.user_id
LEFT JOIN seed_completions sc
  ON sc.user_id = u.user_id
LEFT JOIN categories_started cs
  ON cs.user_id = u.user_id
LEFT JOIN completed_before_first_df cbfd
  ON cbfd.user_id = u.user_id
LEFT JOIN first_direction_finder fd
  ON fd.user_id = u.user_id
GROUP BY
  u.user_id,
  cbfd.completed_seeds_before_first_direction_finder,
  fd.first_direction_finder_viewed_at,
  fd.direction_finder_views;

CREATE VIEW public.analytics_seed_velocity_engagement_by_seed_count_v1 AS
WITH seed_completion_sources AS (
  SELECT
    pe.user_id,
    pe.path_id,
    p.seed_id,
    pe.completed_at AS occurred_at
  FROM public.path_enrollments pe
  JOIN public.paths p ON p.id = pe.path_id
  WHERE pe.completed_at IS NOT NULL
     OR pe.status = 'explored'

  UNION ALL

  SELECT
    ue.user_id,
    COALESCE(ue.event_data ->> 'path_id', pe.path_id) AS path_id,
    COALESCE(ue.event_data ->> 'seed_id', p.seed_id) AS seed_id,
    ue.created_at AS occurred_at
  FROM public.user_events ue
  LEFT JOIN public.path_enrollments pe
    ON pe.id = ue.event_data ->> 'enrollment_id'
  LEFT JOIN public.paths p
    ON p.id = COALESCE(ue.event_data ->> 'path_id', pe.path_id)
  WHERE ue.event_type = 'seed_completed'
    AND ue.user_id IS NOT NULL
),
seed_completions AS (
  SELECT
    user_id,
    path_id,
    seed_id,
    MIN(occurred_at) AS completed_at
  FROM seed_completion_sources
  WHERE path_id IS NOT NULL
    AND seed_id IS NOT NULL
    AND occurred_at IS NOT NULL
  GROUP BY user_id, path_id, seed_id
),
ordered_completions AS (
  SELECT
    user_id,
    seed_id,
    completed_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY completed_at, seed_id
    ) AS seed_count
  FROM seed_completions
),
first_direction_finder AS (
  SELECT
    user_id,
    MIN(created_at) AS first_direction_finder_viewed_at
  FROM public.user_events
  WHERE event_type = 'direction_finder_viewed'
    AND user_id IS NOT NULL
  GROUP BY user_id
)
SELECT
  oc.seed_count,
  COUNT(*) AS users_reaching_seed_count,
  COUNT(*) FILTER (
    WHERE fd.first_direction_finder_viewed_at IS NOT NULL
      AND fd.first_direction_finder_viewed_at <= oc.completed_at
  ) AS users_with_direction_finder_by_seed_count,
  ROUND(
    (
      COUNT(*) FILTER (
        WHERE fd.first_direction_finder_viewed_at IS NOT NULL
          AND fd.first_direction_finder_viewed_at <= oc.completed_at
      )::numeric
      / NULLIF(COUNT(*), 0)
    ),
    4
  ) AS direction_finder_engagement_rate
FROM ordered_completions oc
LEFT JOIN first_direction_finder fd
  ON fd.user_id = oc.user_id
GROUP BY oc.seed_count
ORDER BY oc.seed_count;

CREATE VIEW public.analytics_seed_velocity_aha_summary_v1 AS
WITH seed_completion_sources AS (
  SELECT
    pe.user_id,
    pe.path_id,
    p.seed_id,
    pe.completed_at AS occurred_at
  FROM public.path_enrollments pe
  JOIN public.paths p ON p.id = pe.path_id
  WHERE pe.completed_at IS NOT NULL
     OR pe.status = 'explored'

  UNION ALL

  SELECT
    ue.user_id,
    COALESCE(ue.event_data ->> 'path_id', pe.path_id) AS path_id,
    COALESCE(ue.event_data ->> 'seed_id', p.seed_id) AS seed_id,
    ue.created_at AS occurred_at
  FROM public.user_events ue
  LEFT JOIN public.path_enrollments pe
    ON pe.id = ue.event_data ->> 'enrollment_id'
  LEFT JOIN public.paths p
    ON p.id = COALESCE(ue.event_data ->> 'path_id', pe.path_id)
  WHERE ue.event_type = 'seed_completed'
    AND ue.user_id IS NOT NULL
),
seed_completions AS (
  SELECT
    user_id,
    path_id,
    seed_id,
    MIN(occurred_at) AS completed_at
  FROM seed_completion_sources
  WHERE path_id IS NOT NULL
    AND seed_id IS NOT NULL
    AND occurred_at IS NOT NULL
  GROUP BY user_id, path_id, seed_id
),
first_direction_finder AS (
  SELECT
    user_id,
    MIN(created_at) AS first_direction_finder_viewed_at
  FROM public.user_events
  WHERE event_type = 'direction_finder_viewed'
    AND user_id IS NOT NULL
  GROUP BY user_id
),
completed_before_first_df AS (
  SELECT
    sc.user_id,
    COUNT(*) AS completed_seed_count_before_first_df
  FROM seed_completions sc
  JOIN first_direction_finder fd
    ON fd.user_id = sc.user_id
   AND sc.completed_at <= fd.first_direction_finder_viewed_at
  GROUP BY sc.user_id
),
engagement AS (
  SELECT *
  FROM public.analytics_seed_velocity_engagement_by_seed_count_v1
)
SELECT
  COUNT(DISTINCT sc.user_id) AS users_with_completed_seeds,
  COUNT(DISTINCT cbfd.user_id) AS users_with_direction_finder_views,
  ROUND(AVG(cbfd.completed_seed_count_before_first_df)::numeric, 2) AS avg_completed_seeds_before_first_direction_finder,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cbfd.completed_seed_count_before_first_df) AS median_completed_seeds_before_first_direction_finder,
  (
    SELECT MIN(seed_count)
    FROM engagement
    WHERE direction_finder_engagement_rate >= 0.5
  ) AS seed_count_where_direction_finder_engagement_reaches_50pct,
  MAX(CASE WHEN engagement.seed_count = 1 THEN engagement.direction_finder_engagement_rate END) AS engagement_rate_at_1_seed,
  MAX(CASE WHEN engagement.seed_count = 2 THEN engagement.direction_finder_engagement_rate END) AS engagement_rate_at_2_seeds,
  MAX(CASE WHEN engagement.seed_count = 3 THEN engagement.direction_finder_engagement_rate END) AS engagement_rate_at_3_seeds,
  MAX(CASE WHEN engagement.seed_count = 5 THEN engagement.direction_finder_engagement_rate END) AS engagement_rate_at_5_seeds,
  COALESCE(
    MAX(CASE WHEN engagement.seed_count = 3 THEN engagement.direction_finder_engagement_rate END) >= 0.5,
    FALSE
  ) AS hypothesis_3_seeds_has_meaningful_signal
FROM seed_completions sc
LEFT JOIN completed_before_first_df cbfd
  ON cbfd.user_id = sc.user_id
LEFT JOIN engagement
  ON TRUE;

-- Recommended dashboard entry points:
-- 1. SELECT * FROM public.analytics_seed_velocity_user_metrics_v1 ORDER BY seeds_completed DESC;
-- 2. SELECT * FROM public.analytics_seed_velocity_engagement_by_seed_count_v1 ORDER BY seed_count;
-- 3. SELECT * FROM public.analytics_seed_velocity_aha_summary_v1;
