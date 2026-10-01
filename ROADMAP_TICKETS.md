# Passion Seed Mobile - 12-Month Roadmap Tickets

**Generated:** 2026-03-28
**Updated:** 2026-03-28 09:30 (cron — backlog consolidated, 8 new tickets PS-53 to PS-60)
**Team:** PS (Passion Seed) — ID: cf511658-c0c8-408e-85d7-c8f25d357366
**Linear:** https://linear.app/bigf/ps
**Context:** Gap analysis between current app state and 12-month dream state

---

## Current State Summary

✅ **What exists:**
- 3-tab app structure (Discover, My Paths, Profile)
- Seed browsing and enrollment system
- Daily reflection collection
- Journey/Path visualization
- Mock ikigai display (not calculated from real data)
- Onboarding flow
- Push notification infrastructure

✅ **Dream state coverage:** All 7 dream state features have tickets (no gaps)
✅ **Infrastructure gaps identified and filled:** 5 new tickets created (PS-18 to PS-22)

**Linear Status (2026-03-28 06:19):**
- PS team: `ace4cb8d-f6ff-435f-addb-7c72fe45dd48`
- **22 total issues** (all open, all in Backlog)
- **State breakdown:** Backlog: 22, In Progress: 0, Todo: 0, Done: 0
- **Priority breakdown:** P1 (Urgent): 8, P2 (High): 10, P3 (Medium): 4

✅ **Backlog Health:** Clean — no duplicates. Tickets PS-1 through PS-22 are unique and well-scoped.

---

## Priority 1 (Foundation) - Q1 2026

### PS-1: Implement real Ikigai calculation from reflection data
**Priority:** 🔴 High
**Estimate:** 5 days

**Problem:** Profile screen shows MOCK ikigai data. Should be calculated from actual user reflection data.

**Acceptance Criteria:**
- [ ] Query path_reflections table for user's completed reflections
- [ ] Calculate 4 ikigai scores:
  - **Passion:** Average interest_level across all reflections
  - **Mission:** Correlation between energy_level and world-impact seeds
  - **Profession:** Completion rate × skill node progress
  - **Vocation:** Average confusion_level (inverted) + node assessment scores
- [ ] Store calculated scores in user_profiles or ikigai_snapshots table
- [ ] Update profile.tsx to fetch real data instead of MOCK_IKIGAI
- [ ] Show trend arrows (↑↓→) comparing to previous week

**Technical Notes:**
- Use Supabase edge function `career-insights` for heavy calculation
- Cache results, recalculate on new reflection submission
- Fallback to mock data if < 3 reflections exist

---

### PS-2: Add profile affinity scoring to seed ranking
**Priority:** 🔴 High
**Estimate:** 4 days

**Problem:** Discover screen shows seeds in chronological order. Should rank by user's profile affinity.

**Acceptance Criteria:**
- [ ] Create `calculate_seed_affinity(user_id, seed_id)` function
- [ ] Affinity factors:
  - Interest category match (from onboarding)
  - Career goal similarity
  - Past seed completion patterns
  - TCAS program alignment
- [ ] Update getAvailableSeeds() to return sorted by affinity score
- [ ] Add "Why recommended" explainer chip on seed cards
- [ ] A/B test: 50% users get affinity sort, 50% chronological

**Technical Notes:**
- Start with simple rule-based scoring
- Can upgrade to ML model later
- Cache affinity scores, invalidate on new reflection

---

### PS-3: Create seed content localization system (TH/EN)
**Priority:** 🔴 High
**Estimate:** 6 days

**Problem:** Seed content is English-only. Thai students need Thai language support.

**Acceptance Criteria:**
- [ ] Add `title_th`, `description_th`, `slogan_th` columns to seeds table
- [ ] Add `language` preference to user_profiles
- [ ] Update getAvailableSeeds() to return localized content
- [ ] Add language toggle in Settings
- [ ] Create admin interface for Thai content entry
- [ ] Migrate existing seeds with AI translation + human review

**Technical Notes:**
- Use Supabase RLS to serve correct language
- Fallback to English if Thai not available

---

### PS-4: Seed queue personalization algorithm
**Priority:** 🔴 High
**Estimate:** 5 days

**Problem:** No unified ranking system combining affinity, gaps, and social signals.

**Acceptance Criteria:**
- [ ] Create `rank_seeds(user_id)` edge function
- [ ] Ranking formula:
  ```
  score = 
    0.4 × affinity_score +
    0.3 × exploration_gap_bonus +
    0.2 × social_proof_factor +
    0.1 × recency_boost
  ```
- [ ] A/B test different weightings
- [ ] Log ranking decisions for analysis
- [ ] Refresh queue daily via push notification

**Technical Notes:**
- Start with rule-based, upgrade to ML ranking model
- Track CTR on recommended seeds

---

## Priority 2 (Personalization) - Q2 2026

### PS-5: Build exploration gap detection system
**Priority:** 🟡 Medium
**Estimate:** 4 days

**Problem:** Users don't know what careers/paths they're missing.

**Acceptance Criteria:**
- [ ] Analyze user's completed seeds → extract skill/topic tags
- [ ] Compare against career path requirements
- [ ] Identify gaps: "You haven't explored any healthcare paths"
- [ ] Surface in Discover as "Recommended for exploration" section
- [ ] Track exploration diversity score in profile

**Data Model:**
```sql
-- Add to user_profiles
exploration_diversity_score FLOAT
exploration_gaps TEXT[] -- ['healthcare', 'arts', 'trades']
```

---

### PS-6: Build reflection trends dashboard
**Priority:** 🟡 Medium
**Estimate:** 6 days

**Problem:** Reflection data is collected but not visualized.

**Acceptance Criteria:**
- [ ] Create /reflections screen with:
  - Energy level trend (line chart, last 14 days)
  - Interest vs Confusion scatter plot
  - Streak calendar (GitHub-style contribution graph)
  - "Best day" insights (when energy + interest peak)
- [ ] Add "Direction Finder" section:
  - Top 3 career categories by engagement
  - Recommended next seed based on trends
- [ ] Export to PDF for university applications

**Technical Notes:**
- Use react-native-svg-charts or skia

---

### PS-7: Add social proof counters to seed cards
**Priority:** 🟡 Medium
**Estimate:** 3 days

**Problem:** No social validation on paths.

**Acceptance Criteria:**
- [ ] Add `enrollment_count` to seeds (computed column or cache)
- [ ] Add `completion_count` (enrollments with status='explored')
- [ ] Display on seed cards: "🔥 234 students tried this"
- [ ] Add cohort comparison: "85% of completers continued to university"
- [ ] Show trending badge for seeds with >50% enrollment growth MoM

---

### PS-8: University roadmap matching engine
**Priority:** 🟡 Medium
**Estimate:** 7 days

**Problem:** Reflections don't connect to university choices.

**Acceptance Criteria:**
- [ ] Map seeds to TCAS programs (many-to-many)
- [ ] Calculate fit score: user's reflections → program requirements
- [ ] Show "University Match" section in profile
- [ ] Push notification: "New program matches your profile"

---

## Priority 3 (Expert/Social Layer) - Q3-Q4 2026

### PS-9: AI-assisted PathLab seed generator
**Priority:** 🟢 Low
**Estimate:** 10 days

**Problem:** Creating new seeds is manual. Should auto-generate from expert interviews.

**Acceptance Criteria:**
- [ ] Build expert interview form (10-15 questions)
- [ ] Call LLM to generate seed content + 20-30 day path
- [ ] Human review queue before publishing
- [ ] Target: expert interview → published seed in <1 hour

---

### PS-10: Expert conversation layer (chat with expert avatar)
**Priority:** 🟢 Low
**Estimate:** 8 days

**Problem:** Static seed content. Students should ask questions to experts.

**Acceptance Criteria:**
- [ ] Add `expert_persona` field to seeds (LLM system prompt)
- [ ] Build chat UI in seed detail screen
- [ ] Conversation saved to `expert_chats` table
- [ ] NPC avatar speaks with expert's voice

---

## Implementation Order

**Phase 1 (Foundation - 3 weeks):**
1. PS-1: Real Ikigai calculation
2. PS-3: Thai localization
3. PS-2: Affinity scoring

**Phase 2 (Personalization - 3 weeks):**
4. PS-4: Queue ranking algorithm
5. PS-5: Exploration gaps
6. PS-6: Reflection trends

**Phase 3 (Social - 2 weeks):**
7. PS-7: Social proof
8. PS-8: University matching

**Phase 4 (Expert Layer - future):**
9. PS-9: AI seed generator
10. PS-10: Expert chat

---

## Database Changes Required

```sql
-- Ikigai snapshots
CREATE TABLE ikigai_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  passion_score FLOAT,
  mission_score FLOAT,
  profession_score FLOAT,
  vocation_score FLOAT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exploration tracking
ALTER TABLE user_profiles ADD COLUMN exploration_diversity_score FLOAT;
ALTER TABLE user_profiles ADD COLUMN exploration_gaps TEXT[];

-- Social proof cache
ALTER TABLE seeds ADD COLUMN enrollment_count INTEGER DEFAULT 0;
ALTER TABLE seeds ADD COLUMN completion_count INTEGER DEFAULT 0;

-- Localization
ALTER TABLE seeds ADD COLUMN title_th TEXT;
ALTER TABLE seeds ADD COLUMN description_th TEXT;
ALTER TABLE seeds ADD COLUMN slogan_th TEXT;

-- Expert personas
ALTER TABLE seeds ADD COLUMN expert_persona TEXT;
CREATE TABLE expert_chats (
  id UUID PRIMARY KEY,
  seed_id UUID REFERENCES seeds(id),
  user_id UUID REFERENCES auth.users(id),
  messages JSONB,
  created_at TIMESTAMPTZ
);
```

---

## Cron Job Updates

### 2026-03-28: PS Team + Foundation Tickets Created

**Actions completed:**
- Created PS team in Linear (ID: `ace4cb8d-f6ff-435f-addb-7c72fe45dd48`)
- Created 10 tickets (PS-1 through PS-10) covering all 7 dream state gaps
- Updated ROADMAP_TICKETS.md with Linear links and status

**New tickets created:**
| ID | Title | Priority | Phase |
|----|-------|----------|-------|
| PS-1 | Implement real Ikigai calculation from reflection data | P1 | Foundation |
| PS-2 | Add profile affinity scoring to seed ranking | P1 | Foundation |
| PS-3 | Create seed content localization system (TH/EN) | P1 | Foundation |
| PS-4 | Seed queue personalization ranking algorithm | P1 | Foundation |
| PS-5 | Build exploration gap detection system | P2 | Personalization |
| PS-6 | Build reflection trends dashboard | P2 | Personalization |
| PS-7 | Add social proof counters to seed cards | P2 | Personalization |
| PS-8 | Build university roadmap matching engine | P2 | Personalization |
| PS-9 | AI-assisted PathLab seed generator | P3 | Expert Layer |
| PS-10 | Expert conversation layer (chat with expert avatar) | P3 | Expert Layer |
| PS-11 | Database migrations for Phase 1 (ikigai, localization, social proof) | P1 | Foundation |

**Current state summary:**
- **Total PS issues:** 11
- **Done:** 0
- **In Progress:** 0
- **Todo:** 0
- **Backlog:** 11

**Dream state coverage:**
| Feature | Canonical Ticket | Status |
|---------|-----------------|--------|
| Personalized seed queue | PS-4 | ✅ Created |
| AI PathLab generation | PS-9 | ✅ Created |
| Real ikigai calculation | PS-1 | ✅ Created |
| Reflection trends → Direction Finder | PS-6 | ✅ Created |
| Expert conversation layer | PS-10 | ✅ Created |
| Thai/English localization | PS-3 | ✅ Created |
| Social proof counters | PS-7 | ✅ Created |
| Exploration gap detection | PS-5 | ✅ Created |
| University roadmap matching | PS-8 | ✅ Created |
| Database foundation (migrations) | PS-11 | ✅ Created |

**Next actions:**
1. **START HERE: PS-11** — Database migrations (blocks PS-1, PS-2, PS-3, PS-7)
2. PS-1: Ikigai calculation (first personalization feature)
3. PS-3: Thai localization (critical for Thai students)
4. PS-2: Affinity scoring (personalized discover queue)

---

### 2026-03-28 02:54: Foundation Breakdown Tickets Created (PS-12 to PS-17)

**Actions completed:**
- Analyzed codebase: profile.tsx uses MOCK_IKIGAI, discover.tsx has no personalization
- Created 6 actionable tickets breaking down PS-1, PS-2, PS-4, PS-5 into implementable chunks
- All new tickets are P1-P2 priority, focused on foundation for personalization

**New tickets created:**
| ID | Title | Priority | Label | Parent |
|----|-------|----------|-------|--------|
| PS-12 | Create user_profile_signals table for tracking affinity data | P1 | backend | PS-2 |
| PS-13 | Build career-insights edge function for ikigai calculation | P1 | backend | PS-1 |
| PS-14 | Connect profile.tsx to real ikigai edge function | P1 | mobile | PS-1 |
| PS-15 | Implement seed ranking algorithm (affinity + exploration gaps) | P2 | backend | PS-4 |
| PS-16 | Update discover.tsx to use ranked seed endpoint | P2 | mobile | PS-4 |
| PS-17 | Add exploration gap tracking to profile signals | P2 | backend | PS-5 |

**Updated Linear Status:**
- **Total PS issues:** 17
- **Backlog:** 17 (all tickets)
- **P1 (Foundation):** PS-1, PS-2, PS-3, PS-4, PS-11, PS-12, PS-13, PS-14 (8 tickets)
- **P2 (Personalization):** PS-5, PS-6, PS-7, PS-8, PS-15, PS-16, PS-17 (7 tickets)
- **P3 (Expert/Social):** PS-9, PS-10 (2 tickets)

**Critical Path (start here):**
1. **PS-12** → Database table for profile signals (blocks PS-13, PS-15, PS-17)
2. **PS-13** → Ikigai calculation edge function (blocks PS-14)
3. **PS-14** → Connect profile.tsx to real data (first user-visible win)
4. **PS-15** → Seed ranking algorithm (blocks PS-16)
5. **PS-16** → Personalized discover queue (core value prop)

---

## Infrastructure Tickets (Enablers)

### PS-18: Build A/B testing infrastructure for feature experiments
**Priority:** 🟡 High
**Estimate:** 4 days

**Problem:** Multiple tickets mention A/B testing but no infrastructure exists.

**Acceptance Criteria:**
- [ ] Create `ab_experiments` and `user_experiment_assignments` tables
- [ ] Build `get_experiment_variant(user_id, experiment_name)` edge function
- [ ] Admin dashboard for experiment management
- [ ] Analytics: conversion rates, metric comparison by variant

**Initial Experiments:**
1. Seed ranking algorithm (affinity-weighted vs chronological)
2. Profile affinity scoring (enabled vs disabled)
3. Push notification timing (morning vs evening)

---

### PS-19: Implement analytics event tracking system
**Priority:** 🟡 High
**Estimate:** 5 days

**Problem:** No systematic way to measure engagement or recommendation effectiveness.

**Acceptance Criteria:**
- [ ] Create `analytics_events` table with batching support
- [ ] Track core events: `seed_viewed`, `seed_enrolled`, `seed_completed`, `reflection_submitted`, `recommendation_clicked`
- [ ] Analytics dashboard (web admin)
- [ ] Cohort analysis: D1/D7/D30 retention

**Integration:** Feeds PS-4 (ranking CTR), PS-6 (Direction Finder), PS-7 (completion rates)

---

### PS-20: Build push notification scheduler for daily seed queue refresh
**Priority:** 🟢 Medium
**Estimate:** 3 days

**Problem:** PS-4 mentions daily queue refresh but no scheduling system exists.

**Acceptance Criteria:**
- [ ] Create `notification_schedules` table (per-user preferences)
- [ ] Daily cron job: call seed-ranking, send personalized push
- [ ] Settings screen: notification preferences, quiet hours
- [ ] Metrics: open rate, CTR, unsubscribe rate

---

### PS-21: Build Direction Finder recommendation algorithm
**Priority:** 🟡 High
**Estimate:** 4 days

**Problem:** PS-6 mentions Direction Finder but algorithm is not scoped.

**Acceptance Criteria:**
- [ ] Create `direction_finder_recommendations` table
- [ ] Recommendation signals: engagement, exploration gaps, trending, TCAS alignment
- [ ] Generate top 3 recommendations with explanations
- [ ] Weekly refresh or on new reflection

---

### PS-22: Build cohort comparison analytics for social proof
**Priority:** 🟢 Medium
**Estimate:** 3 days

**Problem:** PS-7 mentions cohort comparison but no analytics pipeline exists.

**Acceptance Criteria:**
- [ ] Create `cohort_metrics` materialized view
- [ ] Calculate: completion rate, university continuation, skill mastery, time to completion
- [ ] Display on seed detail: "85% of completers felt more confident"
- [ ] "Students like you" section with similar profile filtering

---

### 2026-03-28 09:30: Backlog Consolidation (PS-53 to PS-60)

**Problem:** 50 tickets in Linear, many duplicates covering the same 7 dream state features.

**Actions completed:**
- Queried Linear API: found 50 issues (PS-1 through PS-52)
- Identified duplicate clusters (e.g., 3 tickets for expert conversation, 3 for localization)
- Created 8 consolidated tickets to reduce fragmentation

**New tickets created:**
| ID | Title | Priority | Consolidates |
|----|-------|----------|--------------|
| PS-53 | [Foundation] Complete profile signals implementation and validation | P0 | PS-48, PS-31 |
| PS-54 | [Data Pipeline] Build reflection → ikigai → Direction Finder flow | P0 | PS-47, PS-46, PS-45, PS-50 |
| PS-55 | [AI] Implement seed ranking algorithm with exploration gap detection | P1 | PS-49, PS-30 |
| PS-56 | [PathLab] Build expert interview → seed generation pipeline | P1 | PS-44, PS-29, PS-34, PS-10, PS-8 |
| PS-57 | [Mobile] Seed queue UI with ranking display | P1 | PS-32, PS-19, PS-12 |
| PS-58 | [Social] Add cohort comparison and social proof | P2 | PS-41, PS-26, PS-14, PS-40, PS-21, PS-13 |
| PS-59 | [Expert] Build expert conversation layer | P2 | PS-42, PS-38, PS-36 |
| PS-60 | [i18n] Thai/English localization system | P2 | PS-43, PS-27, PS-15 |

**Current state:**
- **Total PS issues:** 58 (PS-1 through PS-60)
- **Done:** 3 (PS-33, PS-18, PS-16 — app init, reflection UI, onboarding)
- **In Progress:** 1 (PS-31 — profile signals)
- **Backlog:** 54

**Critical path (updated):**
1. **PS-53** — Complete profile signals (PS-31 already in progress)
2. **PS-54** — Data pipeline (ikigai → Direction Finder)
3. **PS-55** — Seed ranking algorithm
4. **PS-57** — Mobile seed queue UI

**Next cron action:** Close duplicate tickets (PS-34/10/8, PS-42/38/36, PS-43/27/15, etc.) in favor of PS-53 to PS-60.

---

### 2026-03-28: Initial backlog analysis (superseded)

**Note:** This initial analysis was replaced by the PS team creation above. Previous ticket numbers (PS-41 through PS-52) were from a different team/workspace and have been consolidated into PS-1 through PS-10.
