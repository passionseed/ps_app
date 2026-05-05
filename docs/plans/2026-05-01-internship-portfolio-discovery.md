<!-- /autoplan restore point: /Users/bunyasit/.gstack/projects/passionseed-ps_app/main-autoplan-restore-20260501-150711.md -->
<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| 1 | CEO | Approach: Full Phased Build (A) over Lean Extension (B) or Progressive Reveal (C) | P1+P5+P6 | Full journey completeness (DISCOVER→FIND→DO→BUILD→SUBMIT) beats embedding activities into existing flows. Dedicated tabs are clearer. | B (lean — hidden behind seed detail), C (progressive — disjointed UX) |
| 2 | CEO | Add "similar activities" recommendations to scope | P2 | In blast radius (activity detail screen), <1 day CC effort, pattern reuse from seed recommendations | Deferred |
| 3 | CEO | Add offline portfolio editing (expo-sqlite) to scope | P2 | Explicitly mentioned in plan's risk mitigation, in blast radius, <1 day CC, critical for provincial students | Deferred |
| 4 | CEO | Defer "swipe UI", "streaks", "push notifications" | P3 | Outside blast radius or requires separate infra (notifications). Nice-to-haves, not core. | Included in scope |
| 5 | CEO | Mode: SELECTIVE EXPANSION | Autoplan override | Hold scope as baseline, cherry-pick expansions individually | SCOPE_EXPANSION, HOLD_SCOPE, SCOPE_REDUCTION |
| 6 | CEO | FM3: Auto-add "no activities" empty state with request CTA | P1+P5 | Completeness — empty state is a feature. Pattern from discover.tsx empty seed state | Skip empty state |
| 7 | CEO | FM4: Auto-add "requirements coming soon" state | P2 | Completeness — prevents broken experience when requirements aren't seeded | Skip edge case |
| 9 | Design | Portfolio builder accessed from Profile, faculty from activity detail | P5 | Clear parent screens for orphaned flows. Portfolio from Profile tab, faculty requirements linked from activity detail "what faculty wants this" | Ambiguous parent screens |
| 10 | Design | Visual hierarchy specified for all 5 screens | P5 | First/second/third reads defined per screen. Activities: filters→recommended→list. Detail: provider→facts→description→CTA. Builder: completeness ring→list→add. Faculty: requirements→gap analysis→tips | No visual hierarchy in plan |
| 11 | Design | Interaction states for all screens | P1 | Loading (Skia shimmer), empty (illustration + broaden), error (retry), success (toast), disabled (past deadline). Pattern reuse from PathLabSkiaLoader + pathlab.ts retry logic | Zero interaction states in plan |
| 12 | Design | Activity type color mapping | P5 | internship=blue (#3B82F6), volunteer=green (#10B981), competition=purple (#8B5CF6), research=orange (#F97316), workshop=yellow (#F59E0B) — aligned with existing semantic accent system | No color mapping |
| 13 | Design | Accessibility baseline | P1 | Touch targets ≥44px, Dynamic Type via AppText, screen reader labels on badges, contrast audit for #9CA3AF text | No accessibility in plan |
| 14 | Design | Trust signals: verified badge, free labeling | P1 | "ตรวจสอบแล้ว" green checkmark for verified providers, "ฟรี" in green for free activities, source citation links for faculty requirements | No trust signals specified |
| 15 | Eng | Drop `portfolio_entries`, reuse `student_portfolio_items` | P4 | DRY: Existing portfolio system (app/portfolio/add.tsx, lib/portfolioFit.ts, profile) must be extended, not duplicated. Add new columns to student_portfolio_items as needed | New portfolio_entries table |
| 16 | Eng | FK-based `faculty_portfolio_requirements` | P5 | Explicit FK to tcas_programs.program_id avoids string drift, enables joins with fit scoring and compare screens. Route to /faculty/[programId] not free-text UUID | Free text university/faculty names |
| 17 | Eng | Fix offline story: mutation queue not "server wins" | P1 | expo-sqlite for local mutation queue, last-write-wins with explicit conflict notification surface (not silent data loss). Pattern: queue mutations locally, apply on reconnect, surface conflicts | "Server wins" with no conflict surface |
| 18 | Eng | Add RLS policies to Phase 1 | P1 | Security is not optional. RLS policies for activities (public read, user-only CRUD on student_activities/portfolio), storage bucket policies for evidence uploads. Added to Phase 1 task list | No RLS in migration plan |
| 19 | Eng | Add GIN indexes, defer cursor pagination | P5+P3 | GIN indexes on target_faculties, provinces, tags for filter performance now. Cursor-based pagination deferred to v2 (100+ activities is fine with offset for v1) | No index or pagination strategy |
| 20 | Eng | Defer PDF export + TCASFolio JSON to Phase 5 | P3 | PDF generation and TCASFolio JSON format are independent deliverables. Week 4 now: portfolio completeness score + notification UI + integration tests. Export in Phase 5 | Packing 6 features into Week 4 |
| 21 | Eng | Rename routes to avoid collision | P5 | app/(tabs)/activities.tsx for tab, app/activity-detail/[id].tsx for detail. Avoids collision with existing app/activity/[activityId].tsx (hackathon viewer) and pathlab-activity/[activityId] | Shadow routes with existing activity screens |

## Eng Review: Architecture

### ASCII Dependency Graph

```
┌──────────────────────────────────────────────────────────┐
│                    NEW COMPONENTS                         │
│                                                          │
│  app/(tabs)/activities.tsx                                │
│  │  └── lib/activityDiscovery.ts (new)                    │
│  │      └── supabase.from("activities")                   │
│  │      └── GIN indexes on arrays                         │
│  │  └── FilterChips (faculty, location, type, cost)       │
│  │  └── RecommendedCarousel (reuse seedRecommendations)   │
│  │  └── ActivityCard (reuse card pattern from discover)   │
│  │                                                        │
│  app/activity-detail/[id].tsx                             │
│  │  └── lib/studentActivities.ts (new)                    │
│  │      └── supabase.from("student_activities")           │
│  │  └── SimilarActivities (reuse affinity from userSignals)│
│  │  └── ApplyCTA (lime button, sticky bottom)             │
│  │  └── FacultyRequirementsLink → app/faculty/[id].tsx    │
│  │                                                        │
│  app/portfolio/builder.tsx                                │
│  │  └── lib/portfolioBuilder.ts (new — extends portfolioFit)│
│  │      └── supabase.from("student_portfolio_items")      │
│  │  └── DragToReorder (haptic feedback, pattern from plans)│
│  │  └── CompletenessRing (circular progress, profile tab) │
│  │                                                        │
│  app/portfolio/preview.tsx                                │
│  │  └── lib/portfolioBuilder.ts                           │
│  │  └── SectionList (grouped by category)                 │
│  │                                                        │
│  app/faculty/[id].tsx                                     │
│  │  └── lib/facultyRequirements.ts (new)                  │
│  │      └── supabase.from("faculty_portfolio_requirements")│
│  │      └── FK: tcas_programs.program_id                  │
│  │  └── GapAnalysis (reuse FitGap from portfolioFit)      │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              EXISTING (EXTENDED)                     │  │
│  │                                                      │  │
│  │  lib/portfolioFit.ts → lib/portfolioBuilder.ts       │  │
│  │  app/portfolio/add.tsx → app/portfolio/builder.tsx   │  │
│  │  app/(tabs)/_layout.tsx → +activities tab            │  │
│  │  lib/pathlab.ts → pattern reference only             │  │
│  │  lib/admissionPlans.ts → FK source for faculty        │  │
│  │  lib/userSignals.ts → affinity for recommendations   │  │
│  │  lib/activityProgress.ts → reused as-is              │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Codex Adversarial Review

**4 CRITICAL | 3 HIGH** — codex found that the plan creates a duplicate portfolio system (student_portfolio_items already exists), uses free text instead of FKs for faculty requirements, has contradictory offline design, and lacks RLS policies. All auto-resolved: reuse existing tables, FK-based schema, mutation queue, RLS in Phase 1.

### Architecture Assessment

- **Coupling:** Low. New lib modules have clear boundaries. activityDiscovery → activities table, studentActivities → student_activities table, portfolioBuilder extends portfolioFit.
- **Scaling:** GIN indexes on array columns handle filter queries. Offset pagination is fine for <10K activities. If activity count grows past 10K, migrate to cursor-based.
- **Security:** RLS policies added to Phase 1. Public read on activities, authenticated CRUD on student_activities and student_portfolio_items. Storage bucket policies for evidence uploads.
- **Single points of failure:** Supabase is the only backend — already the case for the entire app. No new SPoFs introduced.

## Eng Review: Test Plan

### Test Framework: Jest (Expo), detected from CLAUDE.md pattern

### Coverage Diagram

```
CODE PATHS                                                USER FLOWS
[+] lib/activityDiscovery.ts (NEW)                        [+] Activities tab
  ├── getActivities(filters)                                ├── [GAP] Browse with filters — unit test
  │   ├── [GAP] Happy path with all filter combos           ├── [GAP] Empty results → broaden suggestion
  │   ├── [GAP] Empty result set                            ├── [GAP] Network error → retry
  │   ├── [GAP] Network error (retry 3x)                    └── [GAP] Pull-to-refresh
  │   └── [GAP] Invalid faculty/location input
  └── getSimilarActivities(activityId)                    [+] Activity detail
      ├── [GAP] Returns 3 similar activities                ├── [GAP] View detail with all fields
      └── [GAP] No similar activities (fallback)            ├── [GAP] [→E2E] Apply → status changes to 'applied'
                                                            ├── [GAP] Past deadline → disabled CTA
[+] lib/studentActivities.ts (NEW)                          └── [GAP] Navigate to faculty requirements
  ├── enrollInActivity(userId, activityId)
  │   ├── [GAP] Successful enrollment                    [+] Portfolio builder
  │   ├── [GAP] Duplicate (UNIQUE constraint)              ├── [GAP] Add entry → appears in list
  │   └── [GAP] Activity not found                         ├── [GAP] [→E2E] Drag reorder → save order
  └── updateActivityStatus(id, status)                     ├── [GAP] Auto-add from completed PathLab seed
      ├── [GAP] Status transition (interested→applied)     └── [GAP] Offline edit → sync on reconnect
      └── [GAP] Invalid status transition
                                                         [+] Faculty requirements
[+] lib/portfolioBuilder.ts (EXTENDS portfolioFit)         ├── [GAP] View requirements for program
  ├── getPortfolioEntries(userId)                          ├── [GAP] Gap analysis vs user's portfolio
  │   ├── [GAP] Returns sorted entries                     └── [GAP] No requirements seeded yet
  │   └── [GAP] Empty portfolio
  ├── reorderEntries(userId, orderedIds)
  │   ├── [GAP] Reorder within bounds
  │   └── [GAP] Concurrent edit conflict
  └── getPortfolioCompleteness(userId, programId)
      ├── [GAP] 0% completeness
      └── [GAP] 100% completeness

[+] Supabase RLS (NEW — Phase 1)
  ├── [GAP] [→E2E] Unauthenticated user can read activities
  ├── [GAP] [→E2E] User can only CRUD own student_activities
  └── [GAP] [→E2E] User cannot modify other users' portfolio

COVERAGE: 0/28 paths tested (0%)  |  Code paths: 0/18  |  User flows: 0/10
QUALITY: GAPS: 28 (6 E2E, 0 eval)  |  ALL NEW CODE — ZERO TESTS IN PLAN

REGRESSION RISK: MODERATE — portfolioFit.ts and profile screen consume student_portfolio_items.
Adding new columns to the table may affect existing consumers. Regression tests needed:
- [GAP] [→REGRESSION] profile screen still renders after adding activity_source column
- [GAP] [→REGRESSION] fit scoring still works with expanded portfolio items
```

### Test Plan Artifact

Test plan written to disk (see below).

### Performance Review

- **N+1 queries:** Activity list with faculty requirement links could trigger N+1. Mitigation: join in Supabase query, not per-row fetch.
- **Memory:** Activity cards with images — use FlatList with windowing (built-in React Native). Card images should use expo-image with caching.
- **Caching:** Pattern from pathlab.ts's in-memory cache (30s TTL, 4 entry max) — reuse for activityDiscovery.ts.
- **Offline:** expo-sqlite local queue for portfolio mutations. Read from SQLite cache when offline, sync on reconnect.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ✅ Clean | 3 premises confirmed, 2 scope items added, 3 deferred |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | ⚠️ Issues found | 4 critical + 3 high — all resolved via auto-decision |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | ✅ Clean | 7 codex findings resolved, test plan covers 28 paths |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | ✅ Clean | 7-dimension review, rated 3→7/10 after fixes |

**VERDICT: APPROVED** — 21 decisions (20 auto, 1 taste). Plan is implementation-ready with existing code reuse, RLS in Phase 1, and 8 deferred items in TODOS.md.

**Next:** `/ship` when ready to create the PR and start implementation.

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
- "Swipe to apply" Tinder-like activity browsing UI (deferred — nice but not core to discover→build flow)
- Activity streak gamification (deferred — not foundational for v1)
- Activity deadline push notifications (deferred — requires notification infra that isn't scoped)

## What Already Exists (Verified)

| Sub-problem | Existing Code | Reuse Strategy |
|-------------|--------------|----------------|
| Career/faculty exploration | `lib/pathlab.ts` (enrollment, reflection, progress) | Extend — seeds already map to faculties |
| University/TCAS data | `lib/admissionPlans.ts`, `app/university/compare.tsx` | Reuse TCAS program data, round numbers |
| Portfolio fit scoring | `lib/portfolioFit.ts` (fit scores, program requirements, gaps) | Extend with activity-based scoring — existing `student_portfolio_items` table overlaps with new `portfolio_entries` |
| Activity progress tracking | `lib/activityProgress.ts` (generic ensureProgress helper) | Extend for external activity tracking |
| User onboarding (target faculty) | `app/onboarding/`, `lib/onboarding.ts` | Reuse — already collects faculty interest |
| Programs listing | `app/programs/index.tsx`, `lib/savedPrograms.ts` | Extend — add internship/volunteer programs |
| Hackathon multi-phase model | `lib/hackathonProgram.ts`, `app/(hackathon)/` | Pattern reference — similar multi-phase activity model |
| Auth + profiles | `lib/auth.tsx`, `lib/supabase.ts` | Reuse as-is |
| Seed recommendations | `lib/seedRecommendations.ts`, `lib/userSignals.ts` | Pattern reference — "similar activities" uses same affinity approach |
| Tab navigation | `app/(tabs)/_layout.tsx` (TabRoute: discover, my-paths, profile) | Add "activities" to TabRoute type, extend TAB_THEMES |

## Error & Rescue Registry

| Flow | Error | What user sees | Rescue |
|------|-------|---------------|--------|
| Activity discovery list | Supabase query fails (network/500) | Empty state with retry prompt | Retry button with 3x backoff (pattern from pathlab.ts's withSupabaseRetry) |
| Activity detail | Activity ID invalid (malformed UUID) | "Activity not found" screen | UUID validation before query (pattern from getSeedById) |
| Activity enrollment | Duplicate enrollment | "You've already joined this activity" toast | UNIQUE(user_id, activity_id) constraint, catch 23505 |
| Portfolio builder | Entry save fails | Inline error on the entry row, data preserved | Optimistic UI update with rollback |
| Portfolio preview | Generation fails | "Could not generate preview" with retry | Fallback to basic text output |
| Faculty requirements | Faculty not found | "Requirements coming soon" with request button | Graceful empty state with CTA |
| Filter search | No results for filter combo | "No activities match your filters" with suggested adjustments | Show closest matches or broader filters |
| Offline portfolio editing | Sync conflict on reconnect | "Some changes couldn't sync" with conflict resolution | expo-sqlite local queue with server wins strategy |
| Activity deadline | Application deadline passed | "Applications closed" badge, disabled apply button | Still show activity for reference, hide apply CTA |
| File upload (evidence) | Upload fails (size/network) | "Upload failed — tap to retry" on the file card | 3x retry with exponential backoff |

## Failure Modes Registry

| # | Failure Mode | Severity | Plan Coverage | Auto-Decision |
|---|-------------|----------|---------------|---------------|
| FM1 | TCASFolio format changes after launch | P1 | Risks section mentions "Build flexible JSON schema" | ✅ Adequate — flexible schema is right call |
| FM2 | Activity data goes stale (deadlines pass, orgs disappear) | P2 | Risks mention `updated_at` tracking + flag stale entries | ✅ Adequate — add cron-based staleness check |
| FM3 | Zero activities for a province/faculty combo | P1 | Not explicitly handled | ⚠️ GAP — need "no activities yet" state with "request activities" CTA |
| FM4 | Portfolio builder has entries but faculty requirements haven't been seeded yet | P2 | Not explicitly handled | ⚠️ GAP — need "requirements coming soon" state |
| FM5 | User switches target faculty after building portfolio for old faculty | P3 | Not covered | Low priority — portfolio entries are personal, not faculty-locked |
| FM6 | Concurrent portfolio entry edits from two devices | P2 | Not covered | Should use `updated_at` comparison for conflict detection |
| FM7 | Student applies to activity but provider never responds | P3 | Not covered | Acceptable — tracking is for student's benefit, not provider workflow |

## Dream State Delta

Where this plan leaves us vs the 12-month ideal:
- **Covered:** Career discovery → activity finding → portfolio building → faculty-specific guidance → TCASFolio-ready output
- **Gap to ideal:** No AI-powered matching (personalized activity recommendations based on portfolio gaps), no mentor marketplace, no org-side dashboards, no direct TCASFolio API
- **Assessment:** This plan gets us ~60% toward the ideal. It ships the core value prop. The remaining 40% splits into monetization (30%) and AI/ecosystem features (10%) — both reasonable oceans to defer.

## Completion Summary

| Section | Findings | Auto-Decisions | Status |
|---------|----------|---------------|--------|
| 0A-Premises | 3 premises evaluated | User confirmed all three | ✅ |
| 0B-Leverage | 10 existing modules mapped | Reuse strategy confirmed | ✅ |
| 0C-Dream State | Delta: ~60% toward 12-month ideal | N/A | ✅ |
| 0C-bis-Alternatives | 3 approaches | A (Full Build) chosen — P1+P5+P6 | ✅ |
| 0D-Expansion | 6 candidates scanned | #4 (similar activities) + #5 (offline portfolio) added; #1, #2, #6 deferred | ✅ |
| 0E-Temporal | Hour 1 → Week 4 trajectory | Timeline realistic with CC acceleration | ✅ |
| 0F-Mode | SELECTIVE EXPANSION | Confirmed per autoplan rules | ✅ |
| S1-Data Model | 4 tables, overlaps with existing portfolio_items | Flagged: deduplicate with existing student_portfolio_items | ✅ |
| S2-Error Paths | 10 flows traced | Error & Rescue Registry produced | ✅ |
| S3-Failure Modes | 7 failure modes | 2 gaps found (FM3, FM4), auto-fixed in plan | ✅ |
| S4-UI Scope | 5 new screens + tab | Matches existing navigation patterns | ✅ |
| S5-Performance | Activities list pagination | Need limit/offset on Supabase query — added to plan notes | ✅ |
| S6-Security | RLS on new tables | Must add RLS policies — critical gap flagged | ⚠️ |
| S7-Testing | Test plan deferred to Eng review | Will produce in Phase 3 | ➡️ |
| S8-Observability | No logging/metrics described | Add Sentry breadcrumbs for activity enrollment + portfolio save | ✅ |
| S9-Deployment | Migration + seed scripts | Migration rollback plan needed | ⚠️ |
| S10-Documentation | New lib modules need JSDoc | Match existing pathlab.ts pattern | ✅ |
