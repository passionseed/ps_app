---
name: jobs-research-updater
description: Research and update the jobs table with current market data (salary, growth, AI risk, evolution). Use when the user wants to refresh job market data, add new jobs, or update existing job research for the top 100 jobs list.
---

# Jobs Research Updater

## Overview

Research job market data and upsert it into the `jobs` table in Supabase. Covers salary (global + Thailand), growth projections, AI automation risk, job security, and how each role evolves by 2030–2035.

## DB Schema — `public.jobs`

```
id                   uuid        PK, default gen_random_uuid()
title                text        NOT NULL — exact title as stored (case-sensitive)
industry             text        e.g. "Technology", "Healthcare"
category             text        one of the 10 categories below
subcategory          text        optional sub-grouping
rank                 integer     1–100 position in the top 100 list
required_degrees     text[]      e.g. '{"Bachelor of CS"}'
required_skills      text[]      e.g. '{"python","sql"}'
viability_score      integer     1–100 overall career viability
demand_trend         text        "growing" | "stable" | "declining"
automation_risk      float       0.0–1.0 (0 = no risk, 1 = fully automatable)
median_salary        integer     USD annual median
salary_range_thb     jsonb       {"min_monthly": int, "max_monthly": int, "currency": "THB"}
growth_rate          text        e.g. "+33.5% (BLS 2024-2034)" or "WEF Top 15"
evolution_2035       text        how the role changes with AI by 2030–2035
description_en       text        English description
description_th       text        Thai description
day_in_life_en       text        English day-in-life
day_in_life_th       text        Thai day-in-life
stress_level         integer     1–10
work_life_balance    integer     1–10
work_environment     text        "office" | "remote" | "hybrid" | "field" | "lab"
top_companies        text[]      company names
education_requirements text[]    degree/cert requirements
certifications       text[]      relevant certifications
top_hiring_regions   text[]      e.g. '{"Bangkok","Singapore","Remote"}'
news_items           jsonb       []  (populated by career-insights edge function)
notable_people       jsonb       []  (populated by career-insights edge function)
top_companies_enriched jsonb     []  (populated by career-insights edge function)
source               text        data source name
source_url           text        source URL
```

## 10 Job Categories

1. Technology & Engineering
2. Healthcare & Medical
3. Business & Finance
4. Creative & Design
5. Skilled Trades & Infrastructure
6. Education & Training
7. Legal & Compliance
8. Science & Research
9. Sales & Marketing
10. Emerging & New Roles

## Key Research Sources

| Source | What to use it for |
|--------|-------------------|
| BLS Occupational Outlook (bls.gov/ooh) | US salary medians, 2024–2034 growth % |
| WEF Future of Jobs Report 2025 | Fastest growing/declining globally, macro trends |
| McKinsey Global Institute | Automation potential, workforce transitions |
| Anthropic Economic Index 2026 | Real-world AI task automation rates by occupation |
| LinkedIn Jobs on the Rise 2026 | Fastest growing roles, hiring trends |
| Adecco Thailand Salary Guide 2026 | Thai monthly salary ranges |
| Robert Walters Thailand 2026 | Thai hiring outlook, skills gaps |
| Michael Page Thailand 2025 | Thai executive salary benchmarks |

## Workflow

### 1. Identify what to update

Ask the user:
- Specific job titles to update, OR
- A category to refresh, OR
- "all" to refresh the full top 100

### 2. Check existing data

```sql
SELECT title, rank, growth_rate, automation_risk, evolution_2035, updated_at
FROM jobs
WHERE title = '{title}'
   OR category = '{category}'
ORDER BY rank;
```

Run via:
```bash
npx supabase db query --linked "SELECT ..."
```

### 3. Research current data

For each job, research and collect:

| Field | How to find it |
|-------|---------------|
| `median_salary` | BLS May 2024 OES data — search "bls.gov/oes [job title]" |
| `growth_rate` | BLS Employment Projections 2024-2034 — format: "+X% (BLS 2024-2034)" |
| `automation_risk` | Frey & Osborne probability + Anthropic Economic Index — float 0.0–1.0 |
| `salary_range_thb` | Adecco Thailand / Robert Walters — min/max monthly THB |
| `evolution_2035` | McKinsey + WEF + Anthropic — 1–2 sentences on how AI changes the role |
| `demand_trend` | "growing" if BLS growth > 5% or WEF top growing; "declining" if WEF top declining |
| `viability_score` | Composite: growth rate + automation resistance + salary + demand (1–100) |

### 4. Write the SQL

**For existing jobs (UPDATE by title):**
```sql
UPDATE public.jobs SET
  rank = {n},
  category = '{category}',
  demand_trend = '{growing|stable|declining}',
  automation_risk = {0.0-1.0},
  median_salary = {usd_annual},
  salary_range_thb = '{{"min_monthly": {min}, "max_monthly": {max}, "currency": "THB"}}'::jsonb,
  growth_rate = '{rate_string}',
  evolution_2035 = '{evolution_text}',
  viability_score = {1-100},
  stress_level = {1-10},
  work_life_balance = {1-10},
  updated_at = now()
WHERE title = '{exact_title}';
```

**For new jobs (INSERT):**
```sql
INSERT INTO public.jobs (
  id, title, category, industry, demand_trend, automation_risk,
  median_salary, salary_range_thb, growth_rate, evolution_2035,
  viability_score, stress_level, work_life_balance, rank,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), '{title}', '{category}', '{industry}',
  '{demand_trend}', {automation_risk}, {median_salary},
  '{{"min_monthly": {min}, "max_monthly": {max}, "currency": "THB"}}'::jsonb,
  '{growth_rate}', '{evolution_2035}',
  {viability_score}, {stress_level}, {work_life_balance}, {rank},
  now(), now()
) ON CONFLICT DO NOTHING;
```

### 5. Save to seed file

Always append/update `supabase/seed/top_100_jobs_research.sql` so changes are reproducible.

### 6. Apply to DB

```bash
npx supabase db query --linked --file supabase/seed/top_100_jobs_research.sql
```

Or for a single statement:
```bash
npx supabase db query --linked "UPDATE public.jobs SET ..."
```

### 7. Verify

```bash
npx supabase db query --linked "
  SELECT rank, title, category, growth_rate, automation_risk, evolution_2035 IS NOT NULL as has_evolution
  FROM jobs
  WHERE rank IS NOT NULL
  ORDER BY rank
  LIMIT 20;
"
```

## Schema Changes

If new research dimensions are needed, add columns via migration first:

```bash
npx supabase db query --linked "
  ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS {column_name} {data_type};
"
```

Then update `supabase/migrations/` with a new migration file:
```
supabase/migrations/YYYYMMDDHHMMSS_jobs_{description}.sql
```

## Automation Risk Scale

| Range | Label | Meaning |
|-------|-------|---------|
| 0.00–0.10 | Very Low | Physical presence, empathy, complex judgment |
| 0.11–0.25 | Low | AI augments but doesn't replace |
| 0.26–0.45 | Medium | Significant task automation, role evolves |
| 0.46–0.65 | High | Most tasks automatable, role shrinks |
| 0.66–1.00 | Very High | Near-full automation, role likely disappears |

## Viability Score Guide

| Score | Meaning |
|-------|---------|
| 90–100 | Exceptional — high growth, low AI risk, strong demand |
| 75–89 | Strong — good growth or high AI resistance |
| 60–74 | Moderate — stable but some disruption risk |
| 40–59 | At risk — declining or high automation exposure |
| < 40 | Declining — WEF fastest declining or near-full automation |

## Failure Modes

- **Title mismatch**: Always check exact title with `SELECT title FROM jobs WHERE title ILIKE '%{keyword}%'` before updating
- **Duplicate titles**: Some jobs have near-duplicates (e.g. "Doctor" and "Medical Doctor") — update both
- **Missing rank**: New inserts may conflict on `ON CONFLICT DO NOTHING` if title already exists — use UPDATE instead
- **Stale Thai salary data**: Adecco Thailand releases new salary guide each January — note the year in `source`
