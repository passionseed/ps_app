# Internship & Portfolio Discovery Feature

**Source:** `docs/market-research-highschool-internship-thailand.md`
**Date:** 2026-05-01
**Branch:** main (feature branch TBD)

---

## Problem Statement

Thai ม.ปลาย students (400K+ annually) need portfolio-worthy activities for TCAS Round 1 admission but face:
- No central Thai-language platform to discover internships, volunteer work, competitions
- Massive Bangkok vs. provincial inequality in access
- No tool that maps activities to specific faculty requirements
- Expensive consulting (฿10K–100K+) with no affordable middle tier
- Government launching TCASFolio + TCAS Verified (July 2026) — creating urgency and format standard

PassionSeed already helps students explore careers via PathLab seeds. This plan extends the app to cover the full DISCOVER → FIND → DO → BUILD → SUBMIT journey.

## Goal

Add an **Activity Discovery & Portfolio Builder** feature to PassionSeed that:
1. Lets students discover internships, volunteer, competition, and research opportunities filtered by faculty, location, time, budget, duration
2. Provides faculty-specific portfolio content strategy (what to put in, not just how to design)
3. Tracks activity completion with verification-ready credentials
4. Generates TCASFolio-compatible portfolio output

## What Already Exists (Leverage Map)

| Sub-problem | Existing Code | Reuse? |
|-------------|--------------|--------|
| Career/faculty exploration | `lib/pathlab.ts`, PathLab seeds, `app/seed/[id].tsx` | ✅ Extend — seeds already map to faculties |
| University data | `lib/admissionPlans.ts`, `app/university/compare.tsx` | ✅ Reuse — already has TCAS round data |
| Portfolio fit scoring | `lib/portfolioFit.ts`, `app/fit/index.tsx` | ✅ Extend — add activity-based scoring |
| Activity tracking | `lib/activityProgress.ts`, `app/activity/[activityId].tsx` | ✅ Extend — add external activity tracking |
| User onboarding (target faculty) | `app/onboarding/`, `lib/onboarding.ts` | ✅ Reuse — already collects faculty interest |
| Programs listing | `app/programs/index.tsx`, `lib/savedPrograms.ts` | ✅ Extend — add internship/volunteer programs |
| Hackathon system | `lib/hackathonProgram.ts`, `app/(hackathon)/` | 🔄 Pattern reference — similar multi-phase activity model |
| Auth + profiles | `lib/auth.tsx`, `lib/supabase.ts` | ✅ Reuse as-is |

## Architecture

### New Supabase Tables

```sql
-- External activities/opportunities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_th TEXT NOT NULL,
  description TEXT,
  description_th TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('internship', 'volunteer', 'competition', 'research', 'workshop', 'online_course')),
  provider_name TEXT NOT NULL,
  provider_verified BOOLEAN DEFAULT false,
  -- Filters
  target_faculties TEXT[] DEFAULT '{}',
  provinces TEXT[] DEFAULT '{}',
  is_remote BOOLEAN DEFAULT false,
  min_duration_days INTEGER,
  max_duration_days INTEGER,
  schedule_type TEXT CHECK (schedule_type IN ('full_time', 'part_time', 'weekend', 'flexible', 'holiday')),
  cost_thb INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  min_age INTEGER DEFAULT 15,
  language TEXT DEFAULT 'th',
  -- Dates
  application_deadline TIMESTAMPTZ,
  start_date DATE,
  end_date DATE,
  -- Meta
  url TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  portfolio_value_score INTEGER DEFAULT 0 CHECK (portfolio_value_score BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Student activity enrollments/tracking
CREATE TABLE student_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_id UUID REFERENCES activities(id) NOT NULL,
  status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'applied', 'accepted', 'in_progress', 'completed', 'dropped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Evidence
  evidence_urls TEXT[] DEFAULT '{}',
  reflection TEXT,
  hours_logged INTEGER DEFAULT 0,
  -- Verification
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'self_reported', 'peer_verified', 'org_verified')),
  verification_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_id)
);

-- Faculty-specific portfolio requirements
CREATE TABLE faculty_portfolio_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_name TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  tcas_round INTEGER DEFAULT 1,
  required_categories TEXT[] DEFAULT '{}',
  recommended_activities TEXT,
  min_activities INTEGER DEFAULT 3,
  portfolio_tips_th TEXT,
  example_portfolio_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Portfolio builder entries
CREATE TABLE portfolio_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  student_activity_id UUID REFERENCES student_activities(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('academic', 'leadership', 'volunteer', 'competition', 'research', 'creative', 'internship', 'other')),
  description_th TEXT,
  date_range TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  skills_gained TEXT[] DEFAULT '{}',
  reflection_th TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New App Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Activity Discovery | `app/(tabs)/activities.tsx` | Browse/filter activities — main new tab |
| Activity Detail | `app/activity-detail/[id].tsx` | View activity, apply, track |
| Portfolio Builder | `app/portfolio/builder.tsx` | Assemble portfolio entries |
| Portfolio Preview | `app/portfolio/preview.tsx` | Preview TCASFolio-format output |
| Faculty Requirements | `app/faculty/[id].tsx` | What a specific faculty wants |

### New Lib Modules

| Module | Purpose |
|--------|---------|
| `lib/activityDiscovery.ts` | Fetch/filter activities from Supabase |
| `lib/studentActivities.ts` | Track enrollment, status, evidence |
| `lib/portfolioBuilder.ts` | CRUD portfolio entries, generate output |
| `lib/facultyRequirements.ts` | Faculty-specific portfolio guidance |

## Implementation Tasks

### Phase 1: Data Foundation (Week 1)
1. Create Supabase migration for new tables
2. Seed initial activity data (scrape/curate 50+ Thai-language opportunities)
3. Seed faculty portfolio requirements for top 10 universities
4. Create `lib/activityDiscovery.ts` with filter/search functions
5. Create `lib/studentActivities.ts` for enrollment tracking
6. Write tests for data layer

### Phase 2: Activity Discovery UI (Week 2)
7. Add Activities tab to `(tabs)/_layout.tsx`
8. Build `app/(tabs)/activities.tsx` — filterable list with faculty, location, type, duration, cost filters
9. Build `app/activity-detail/[id].tsx` — detail view with apply/track CTA
10. Connect onboarding faculty selection to personalized activity recommendations
11. Add "Recommended for you" section based on user's target faculty

### Phase 3: Portfolio Builder (Week 3)
12. Create `lib/portfolioBuilder.ts` and `lib/facultyRequirements.ts`
13. Build `app/portfolio/builder.tsx` — drag-to-reorder entries, category tags
14. Build `app/portfolio/preview.tsx` — TCASFolio-compatible preview
15. Build `app/faculty/[id].tsx` — faculty requirements + gap analysis
16. Connect completed PathLab seeds as auto-portfolio entries
17. Connect hackathon completions as auto-portfolio entries

### Phase 4: Verification & Polish (Week 4)
18. Add verification flow (self-report → peer → org)
19. Add portfolio export (PDF + TCASFolio JSON format)
20. Add portfolio completeness score on profile
21. Add activity reminders/notifications
22. Integration tests for full flow

## Risks

| Risk | Mitigation |
|------|------------|
| TCASFolio format not yet published | Build flexible JSON schema, adapt when spec drops |
| Activity data goes stale | Add `updated_at` tracking, flag stale entries, admin curation tools |
| Low initial activity supply | Start with curated list + allow user submissions with moderation |
| Provincial students may not have internet | Offline-first for portfolio builder (expo-sqlite cache) |

## Success Metrics

- 100+ activities seeded at launch
- 30% of users who complete onboarding visit Activities tab within 7 days
- 10% of users create at least 1 portfolio entry within 30 days
- Faculty requirement coverage for top 20 TCAS Round 1 programs

## Not In Scope (Deferred)

- Payment/subscription for premium guidance (future monetization)
- Organization-side dashboard for activity providers
- AI-powered portfolio writing assistant
- Direct TCASFolio API integration (pending government API availability)
- Mentor matching marketplace
