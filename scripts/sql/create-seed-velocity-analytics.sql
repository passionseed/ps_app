-- Seed velocity analytics export for Metabase / Supabase Insights
--
-- Assumption for PS-21:
-- `direction_finder_viewed` is currently logged from the Profile / Ikigai surface
-- because there is no separate shipped Direction Finder screen yet.
--
-- Run in Supabase SQL Editor after the mobile client ships the new events:
-- - seed_started
-- - seed_completed
-- - direction_finder_viewed

create or replace view public.analytics_seed_velocity_events as
select
  ue.id,
  ue.user_id,
  ue.event_type,
  ue.created_at,
  ue.event_data,
  ue.event_data ->> 'seed_id' as seed_id,
  ue.event_data ->> 'path_id' as path_id,
  ue.event_data ->> 'enrollment_id' as enrollment_id,
  nullif(ue.event_data ->> 'seed_category_id', '') as seed_category_id,
  coalesce(
    (
      select array_agg(tag)
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(ue.event_data -> 'seed_tags') = 'array'
            then ue.event_data -> 'seed_tags'
          else '[]'::jsonb
        end
      ) as seed_tags(tag)
    ),
    array[]::text[]
  ) as seed_tags,
  ue.event_data ->> 'source' as source
from public.user_events ue
where ue.event_type in (
  'seed_started',
  'seed_completed',
  'direction_finder_viewed'
);

create or replace view public.analytics_seed_velocity_user_metrics as
with seed_started as (
  select
    user_id,
    seed_id,
    min(created_at) as first_started_at,
    min(seed_category_id) as seed_category_id
  from public.analytics_seed_velocity_events
  where event_type = 'seed_started'
    and seed_id is not null
  group by user_id, seed_id
),
seed_completed as (
  select
    user_id,
    seed_id,
    min(created_at) as first_completed_at,
    min(seed_category_id) as seed_category_id
  from public.analytics_seed_velocity_events
  where event_type = 'seed_completed'
    and seed_id is not null
  group by user_id, seed_id
),
direction_finder as (
  select
    user_id,
    min(created_at) as first_direction_finder_viewed_at,
    count(*) as direction_finder_views
  from public.analytics_seed_velocity_events
  where event_type = 'direction_finder_viewed'
  group by user_id
),
categories as (
  select
    user_id,
    count(distinct seed_category_id) as categories_explored
  from (
    select user_id, seed_category_id from seed_started
    union
    select user_id, seed_category_id from seed_completed
  ) category_events
  where seed_category_id is not null
  group by user_id
),
users as (
  select user_id from seed_started
  union
  select user_id from seed_completed
  union
  select user_id from direction_finder
),
seed_counts as (
  select
    u.user_id,
    count(distinct ss.seed_id) as seeds_started,
    count(distinct sc.seed_id) as seeds_completed
  from users u
  left join seed_started ss
    on ss.user_id = u.user_id
  left join seed_completed sc
    on sc.user_id = u.user_id
  group by u.user_id
),
first_df_completion_counts as (
  select
    df.user_id,
    count(distinct sc.seed_id) as seeds_completed_before_first_df_view
  from direction_finder df
  left join seed_completed sc
    on sc.user_id = df.user_id
   and sc.first_completed_at <= df.first_direction_finder_viewed_at
  group by df.user_id
)
select
  u.user_id,
  coalesce(sc.seeds_started, 0) as seeds_started,
  coalesce(sc.seeds_completed, 0) as seeds_completed,
  coalesce(c.categories_explored, 0) as categories_explored,
  coalesce(df.direction_finder_views, 0) as direction_finder_views,
  df.first_direction_finder_viewed_at,
  coalesce(fdc.seeds_completed_before_first_df_view, 0) as seeds_completed_before_first_df_view,
  (df.first_direction_finder_viewed_at is not null) as has_direction_finder_viewed,
  (coalesce(sc.seeds_completed, 0) >= 1) as milestone_1_completed,
  (coalesce(sc.seeds_completed, 0) >= 2) as milestone_2_completed,
  (coalesce(sc.seeds_completed, 0) >= 3) as milestone_3_completed,
  (coalesce(sc.seeds_completed, 0) >= 5) as milestone_5_completed
from users u
left join seed_counts sc
  on sc.user_id = u.user_id
left join categories c
  on c.user_id = u.user_id
left join direction_finder df
  on df.user_id = u.user_id
left join first_df_completion_counts fdc
  on fdc.user_id = u.user_id;

create or replace view public.analytics_direction_finder_engagement_by_seed_count as
select
  seeds_completed,
  count(*) as users_total,
  count(*) filter (where has_direction_finder_viewed) as users_viewed_direction_finder,
  round(
    (count(*) filter (where has_direction_finder_viewed))::numeric
    / nullif(count(*), 0),
    4
  ) as direction_finder_engagement_rate
from public.analytics_seed_velocity_user_metrics
group by seeds_completed
order by seeds_completed;

create or replace view public.analytics_seed_velocity_aha_summary as
with engagement as (
  select *
  from public.analytics_direction_finder_engagement_by_seed_count
)
select
  (
    select min(seeds_completed)
    from engagement
    where direction_finder_engagement_rate >= 0.5
  ) as aha_seed_count_threshold,
  (
    select round(avg(seeds_completed_before_first_df_view::numeric), 2)
    from public.analytics_seed_velocity_user_metrics
    where has_direction_finder_viewed
  ) as avg_seeds_to_first_direction_finder_view,
  (
    select direction_finder_engagement_rate
    from engagement
    where seeds_completed = 3
  ) as three_seed_engagement_rate,
  coalesce(
    (
      select direction_finder_engagement_rate >= 0.5
      from engagement
      where seeds_completed = 3
    ),
    false
  ) as hypothesis_three_seeds_meaningful_signal;
