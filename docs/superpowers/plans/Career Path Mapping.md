# MY PATHS — Career & Education Journey Mapper
### System Design · Architecture · Structured Backlog
**Version 1.1** · High School (14–18) · React Native + Supabase · Max 3 Simulations

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [System Architecture](#2-system-architecture)
3. [Data Model](#3-data-model)
4. [Scoring Engine](#4-scoring-engine)
5. [Viability Agent](#5-viability-agent-apify)
6. [UX Flows](#6-ux-flows)
7. [Structured Backlog](#7-structured-backlog)
8. [Release Plan](#8-release-plan)
9. [Open Questions](#9-open-questions)

---

## 1. Product Vision

### 1.1 The Core Insight

High schoolers don't lack career information — they're drowning in it. What they lack is a mechanism to connect lived experience to a concrete forward decision.

**PathLab** gives them that lived experience: 3–5 day quest-based sprints where they actually *do* the work of a career field — interviewing a business owner, building a business model, running a market analysis. The Journey Mapper takes that evidence and projects it forward into a plausible future: here's what university program you'd target, here's the job waiting at the end, here's how aligned you actually are based on your behaviour — not your self-report.

The key design constraint for 14–18 year olds: **maximum 3 simulations**. Not unlimited. Scarcity makes each simulation feel like a real commitment, not a wishlist. A student who has to choose between 3 futures takes the exercise more seriously than one managing 10.

---

### 1.2 PathLab as the Signal Engine

PathLab quests generate richer signal than any survey. Each completed quest produces three types of data that feed the scoring engine:

| Signal Type | Examples | Used For |
|---|---|---|
| **Completion evidence** | Tasks finished, abandoned, or stalled | Aptitude baseline |
| **Reflection data** | Voice AI transcripts, psych-student session notes, slider responses | Passion score |
| **Implicit behaviour** | Session depth, re-engagement, voluntary quest extension | Passion modifier |

---

### 1.3 The Three-Factor Score

Every simulated path carries a live **Journey Score** made of three factors:

| Factor | What It Measures | Primary Source | Range |
|---|---|---|---|
| 🔥 **Passion** | Genuine enjoyment & intrinsic drive | Voice AI reflections, psych-session summaries, slider check-ins, re-engagement rate | 0–100, decays if inactive |
| 🧠 **Aptitude** | Demonstrated skill & learning velocity | Quest task completions, project submission rubric scores (AI-graded), first-attempt success rate | 0–100, updates per submission |
| 📈 **Viability** | Real-world demand & career sustainability | Apify agent: job postings volume, salary trends, automation risk index, demand trend | 0–100, refreshed on-demand + 24h cron |

---

### 1.4 Stacked Cards (not a node graph)

Each simulation is a **vertical stack of three card types** — readable like a story:

```
┌─────────────────────────────────┐
│  📈 JOB CARD                    │  ← destination
│  Strategy Consultant            │
│  Viability: 82  ↑ Growing       │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  🎓 UNIVERSITY CARD             │  ← pathway
│  B.Commerce — UNSW              │
│  ATAR 88+  ·  3 yrs             │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  ⚡ PATHLAB CARD                 │  ← foundation (now)
│  Business PathLab               │
│  🔥 74  🧠 61  ✓ Completed      │
└─────────────────────────────────┘
```

- Students manage **up to 3 simulations** side by side
- Cards animate in sequentially as the student builds their stack
- The live Journey Score (🔥 / 🧠 / 📈) floats at the top of each simulation
- A **Pivot Card** inserts itself when Passion drops below 35 — suggesting alternative jobs that share the same core skills

---

## 2. System Architecture

Four layers with clean separation of concerns:

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT (React Native / Expo)                                │
│  Journey Board · Stacked Cards · Score Display · Pivot UI   │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST + Realtime (Supabase JS SDK)
┌────────────────────────▼─────────────────────────────────────┐
│  API (Supabase Edge Functions — Deno)                        │
│  Score calculation · Path CRUD · Reflection ingestion        │
│  Simulation branching · Pivot detection                      │
└──────────┬──────────────────────────────┬────────────────────┘
           │ Claude API                   │ Apify REST API
┌──────────▼───────────┐      ┌───────────▼────────────────────┐
│  INTELLIGENCE        │      │  DATA AGENT (Apify Actor)      │
│  claude-sonnet-4     │      │  Job postings · Salary trends  │
│  Reflection scoring  │      │  Automation risk · Prereq tree │
│  Rubric grading      │      │  Cron sweep · Novel job build  │
│  Pivot suggestions   │      └────────────────────────────────┘
└──────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  DATABASE (Supabase / Postgres)                              │
│  Existing: paths · reflections · path_completions           │
│  New: jobs · universities · journey_simulations              │
│       score_events · viability_cache                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

New tables slot into the existing PathLab ecosystem. The Journey Mapper **reads** existing PathLab data — it never writes to it.

### 3.1 New Tables

#### `jobs`
Canonical career profiles. Shared across all students. Owned by the Apify agent.

```sql
id              uuid PRIMARY KEY
title           text NOT NULL
industry        text
required_degrees text[]          -- e.g. ['Bachelor of Commerce', 'Business Admin']
required_skills  text[]          -- links to PathLab skill tags
viability_score  int             -- 0-100, maintained by agent
viability_updated_at timestamptz
demand_trend    text             -- 'growing' | 'stable' | 'declining'
automation_risk float           -- 0.0–1.0 from WEF index
median_salary   int             -- USD/AUD
top_hiring_regions text[]
created_at      timestamptz
```

#### `universities`
University and degree program catalog.

```sql
id              uuid PRIMARY KEY
name            text NOT NULL
country         text
programs        jsonb[]          -- [{name, duration_yrs, majors[], admission_band}]
linked_job_ids  uuid[]           -- jobs this uni commonly feeds into
website_url     text
created_at      timestamptz
```

#### `journey_simulations`
One row per simulated path. Max 3 per student — enforced at DB level.

```sql
id              uuid PRIMARY KEY
student_id      uuid REFERENCES auth.users
label           text             -- student-named, e.g. "Plan A: Design"
pathlab_ids     uuid[]           -- PathLabs included in this simulation
university_ids  uuid[]           -- target university programs (1–3)
job_id          uuid REFERENCES jobs
passion_score   int              -- 0–100, null if insufficient data
aptitude_score  int              -- 0–100, null if insufficient data
journey_score   int              -- weighted composite
passion_confidence text          -- 'low' | 'medium' | 'high'
aptitude_confidence text
pivot_triggered bool DEFAULT false
pivot_snoozed_until timestamptz
created_at      timestamptz
updated_at      timestamptz

CONSTRAINT max_simulations CHECK (
  (SELECT COUNT(*) FROM journey_simulations
   WHERE student_id = student_id) <= 3
)
```

#### `score_events`
Immutable audit log. Every score change produces a row. Powers the "why did my score change?" timeline.

```sql
id              uuid PRIMARY KEY
simulation_id   uuid REFERENCES journey_simulations
student_id      uuid
event_type      text    -- 'reflection_submitted' | 'quest_completed' | 'decay' | 'rubric_graded'
factor          text    -- 'passion' | 'aptitude' | 'viability'
delta           int     -- signed change, e.g. +8 or -5
new_value       int
reason_string   text    -- human-readable: "Passion +8 after Customer Interview reflection"
source_id       uuid    -- reflection_id or completion_id
created_at      timestamptz
-- RLS: INSERT only for service role. No UPDATE, no DELETE ever.
```

#### `viability_cache`
Agent output cache. Checked before any live Apify call.

```sql
job_id          uuid PRIMARY KEY REFERENCES jobs
raw_data        jsonb            -- full agent response
score           int
fetched_at      timestamptz
expires_at      timestamptz      -- fetched_at + 24h
```

---

### 3.2 Existing Tables (read-only)

| Table | Used For |
|---|---|
| `path_completions` | Quest task finish events → Aptitude signal |
| `reflections` | Voice/text/slider responses → Passion signal |
| `path_enrollments` | Which PathLabs a student is active in |

---

## 4. Scoring Engine

The scoring engine runs as a **Supabase Edge Function**, triggered by:
1. A new reflection or quest completion lands in the DB (reactive)
2. A student opens the Journey Board (on-demand recalculation)

---

### 4.1 Passion Score

```
Base score = weighted average of last 5 reflections
  - Voice AI reflection → Claude returns sentiment polarity + energy_level (0–4)
  - Slider check-in → engagement (1–5) + energy (1–5), no LLM call needed
  - Psych-session summary → Claude extracts sentiment, highest confidence weight (1.5x)

Modifiers:
  + 10 pts  voluntary re-enrollment in a PathLab (student chose to go back)
  + 5 pts   session time in top 80th percentile for that quest
  - 5 pts   per 14 days of no engagement with this career domain (decay)

Output: rolling weighted average, capped 0–100
Confidence: 'low' if < 2 reflections, 'medium' if 2–4, 'high' if 5+
```

Language for 14–18: Passion score displays as **"Your vibe with this path"** in UI. Raw number only shown in score timeline detail.

---

### 4.2 Aptitude Score

```
Base score = completion rate of PathLab tasks in linked domain
  (tasks_completed / tasks_assigned) × 100

Modifiers:
  + AI rubric score on project submissions
    → Claude grades against domain-specific rubric (stored in DB, not hardcoded)
    → Returns 0–10 + 2-sentence rationale stored in submissions table
  + 5 pts   first-attempt success on knowledge checks
  - 10 pts  task started but abandoned (not timed out, actively left)

Output: exponential moving average, weighted toward recent performance
Confidence: 'low' if no submissions yet (completion-only mode)
```

---

### 4.3 Viability Score (Agent-sourced)

```
Sub-signals (all normalized 0–100):
  - Job postings volume (LinkedIn, 30d)        weight: 30%
  - Salary median + YoY growth                 weight: 25%
  - Automation risk (WEF index, inverted)      weight: 25%
  - Demand trend (growing=100, stable=60, declining=20)  weight: 20%

Output: weighted average → viability_score on jobs row
Staleness: score flagged 'estimated' if fetched_at > 24h
           re-fetched on next student request for that job
```

---

### 4.4 Sparse Data Handling

Not every student reflects consistently. The engine never shows a misleading score.

| Data State | Behaviour |
|---|---|
| < 2 reflections | Passion = null, confidence = 'low'. UI shows "Still getting to know you…" with slider check-in prompt |
| No project submissions | Aptitude runs in completion-only mode, confidence = 'low' |
| Score shown | Always accompanied by a confidence tier. Half-filled circle = low, full = high. |

---

### 4.5 Pivot Detection

Background job runs every 6h across all active simulations:

```
IF passion_score < 35 AND confidence = 'medium' OR 'high':
  SET pivot_triggered = true
  
Pivot suggestions query:
  SELECT jobs
  WHERE required_skills && [current_job.required_skills]  -- overlapping skills
    AND id != current_job.id
  ORDER BY viability_score DESC
  LIMIT 2
```

---

## 5. Viability Agent (Apify)

### 5.1 Trigger Modes

**On-demand** — student opens a simulation for a job with expired or missing cache:
- Edge Function calls Apify API to run actor
- 8s timeout — if exceeded, returns stale cache with `"Data from [date]"` label
- Student never sees a blank viability card

**Cron sweep** — nightly at 02:00 UTC via `pg_cron`:
- Re-fetches viability for all jobs where `COUNT(simulations) > 0` and `expires_at < NOW()`
- Failures logged, retried once. Alert if > 10 failures per run.

**Novel job discovery** — job title not in `jobs` table:
- Agent builds full profile: prerequisite degrees, required skills, viability score
- First student waits up to 12s (friendly loading state, not a spinner)
- All subsequent students load instantly from cache
- Uses Exa/Perplexity for prerequisite tree extraction from web sources

---

### 5.2 Agent Output Schema

```json
{
  "job_title": "UX Designer",
  "industry": "Technology",
  "posting_volume_30d": 4820,
  "median_salary": 95000,
  "salary_growth_yoy": 0.06,
  "automation_risk": 0.21,
  "demand_trend": "growing",
  "top_hiring_regions": ["Sydney", "Melbourne", "Remote"],
  "prerequisite_degrees": ["Bachelor of Design", "Bachelor of IT"],
  "required_skills": ["user research", "prototyping", "systems thinking"],
  "source_urls": ["linkedin.com/jobs/...", "seek.com.au/..."],
  "viability_score": 81,
  "fetched_at": "2026-03-08T02:00:00Z"
}
```

---

### 5.3 Cost Control

Estimated monthly Apify cost: ~$12–18 for 300–500 active jobs at standard actor pricing. Monitoring required:
- Alert if on-demand call cost exceeds $0.05 per call (indicates runaway actor)
- Cron sweep should never re-fetch a job with `expires_at > NOW()` — add DB-level guard

---

## 6. UX Flows

### 6.1 First-Time Journey Board Entry

Student opens Journey Board tab for the first time. Empty state — **not** sterile. Copy reads: *"What do you want to be? Let's work backwards."* Single CTA: **"Build a Path"**.

Tapping opens a search modal:
1. Student types a job title — type-ahead searches `jobs` table
2. **Known job**: loads viability card instantly
3. **Novel job**: "Building your path…" animation (12s max). Agent runs in background.
4. System returns: Job Card + 1–3 recommended university programs + which PathLabs to do now
5. Student names the simulation (*"Plan A"*, *"Backup plan"*, etc.)
6. Stack animates in, card by card

Maximum 3 simulations. On the 3rd creation, a gentle nudge: *"This is your last slot — make it count. You can delete one anytime."*

---

### 6.2 Daily Use Loop

```
Complete PathLab quest
       ↓
Post-quest slider check-in appears (10 seconds, 3 interactions)
       ↓
Score updates via Supabase Realtime (within 5s)
       ↓
Push nudge: "Your vibe with Strategy Consulting went up 🔥"
       ↓
Student opens Journey Board, sees updated score on their stack
```

---

### 6.3 Pivot Flow

Passion drops below 35 (medium+ confidence). Pivot Card appears at top of stack:

> *"Your energy for this path has dropped. That's useful data — not failure. Here are 2 careers that use the same skills but might suit you better:"*

- Card is **dismissible** (snooze 7 days)
- "Explore this instead" → creates a new simulation from the pivot job
- Original simulation preserved — student chooses whether to delete it

Tone is always: **curious, not corrective**. This is for 16-year-olds who need permission to change direction.

---

### 6.4 Score Timeline (Explainability)

Tapping any score circle opens a bottom sheet showing score history:

```
🔥 Passion — Your vibe with this path

  ↑ +8   Jun 12  "You had high energy in your Customer
                  Interview reflection"
  ↑ +5   Jun 8   "You re-enrolled in the Business PathLab
                  after finishing it"
  ↓ -5   Jun 1   "No activity for 14 days"
  ↑ +12  May 28  "Strong project submission — rubric score 8/10"
```

Reason strings are template-generated (not LLM) — fast, cheap, and consistent.

---

## 7. Structured Backlog

> Priority: **P0** = ship-blocker · **P1** = core feature · **P2** = enhancement  
> Effort: **S** = 1–2 days · **M** = 3–5 days · **L** = 1–2 weeks

---

### Epic 1 — Data Foundation

| ID | Ticket | Acceptance Criteria | Effort | Priority |
|---|---|---|---|---|
| DB-01 | Create `jobs` table with all fields, full-text search index on `title` | Migration clean, RLS read-all / write-service-only, 50 seed jobs across 10 industries | S | P0 |
| DB-02 | Create `universities` table, link programs to jobs via `linked_job_ids[]` | Query "unis that feed into job X" returns in <100ms. 30 seed unis (AU/US/UK). | S | P0 |
| DB-03 | Create `journey_simulations` with max-3 DB constraint | Insert fails gracefully at 4th simulation with clear error code (not a 500) | S | P0 |
| DB-04 | Create `score_events` append-only table, Postgres trigger auto-inserts on score column changes | Every score change produces a `score_event` row. No UPDATE/DELETE RLS. | M | P0 |
| DB-05 | Create `viability_cache`, add `pg_cron` nightly sweep job | Cron runs 02:00 UTC, only re-fetches expired active jobs, logs outcomes to `cron_log` | M | P0 |

---

### Epic 2 — Scoring Engine

| ID | Ticket | Acceptance Criteria | Effort | Priority |
|---|---|---|---|---|
| SC-01 | Edge Function: ingest reflection (voice/slider/psych), call Claude API for sentiment + energy extraction, write to `reflections.ai_analysis` | Completes <3s p95. Slider reflections skip Claude call — direct field mapping only. | M | P0 |
| SC-02 | Passion score calculator with rolling weighted average, engagement modifiers, and 14-day decay | Score updates within 5s of new reflection. Unit test: 2 high + 1 low passion reflections → score 55–70. | M | P0 |
| SC-03 | Aptitude score calculator: completion rate + AI rubric scoring on project submissions | Domain rubrics stored as DB rows (not hardcoded in prompt). Rubric returns 0–10 + 2-sentence rationale. | L | P0 |
| SC-04 | Sparse data handling: return `null` score + confidence tier when data insufficient | API never returns a score without a `confidence` field. UI "Still getting to know you…" state implemented. | S | P0 |
| SC-05 | Score explainability endpoint: `GET /simulations/:id/score-timeline` returns `score_events` with reason strings | Reason strings are template-generated (not LLM). Example: "Passion +8 after Customer Interview reflection on Jun 12" | M | P1 |
| SC-06 | Pivot detection: background job every 6h, flags `passion_score < 35` with `pivot_triggered = true`, generates 2 alternative job suggestions | Suggestions use skill-overlap query. Push notification sent if student has notifications enabled. | M | P1 |

---

### Epic 3 — Viability Agent (Apify)

| ID | Ticket | Acceptance Criteria | Effort | Priority |
|---|---|---|---|---|
| AG-01 | Build Apify actor: LinkedIn job postings volume (30d) + median salary for given job title | Returns JSON matching `viability_cache` schema within 6s p90 | L | P0 |
| AG-02 | Extend agent: WEF automation risk score + demand trend classification | Automation risk normalized 0–1. Trend derived from 12m posting delta. | M | P0 |
| AG-03 | Edge Function: on-demand agent trigger with cache-check-first, 8s timeout, stale-cache fallback | Student never sees blank viability card. Stale data shows "Data from [date]" label. Timeouts logged. | M | P0 |
| AG-04 | Novel job discovery: if title not in `jobs` table, agent builds full profile + creates row | First student waits ≤12s. All subsequent students load from cache instantly. Uses Exa for prereq tree. | L | P1 |
| AG-05 | Cron sweep: nightly refresh of expired viability for all active jobs | Actor failures retried once. Alert if >10 failures per run. Cost monitored per-run. | M | P1 |

---

### Epic 4 — Journey Board UI (React Native)

| ID | Ticket | Acceptance Criteria | Effort | Priority |
|---|---|---|---|---|
| UI-01 | Journey Board tab: horizontal scroll of simulation stacks, empty state with "Build a Path" CTA, max 3 stacks | Swipe between simulations feels native (Reanimated 3). Empty state is motivating. 3rd simulation shows "last slot" nudge. | L | P0 |
| UI-02 | Job search modal: type-ahead against `jobs` table, novel job loading animation, job card preview before confirm | Known jobs: results <200ms. Novel job: friendly "Building your path…" animation, not a blank spinner. | M | P0 |
| UI-03 | Stacked card components: PathLab card, University card, Job card — distinct visual treatment, sequential stagger animation | Cards animate in one by one on load. Status badges clear. Tap-to-expand detail sheets on all cards. | L | P0 |
| UI-04 | Live Journey Score widget at top of each stack, Supabase Realtime subscription, "Still getting to know you…" low-confidence state | Score updates visible within 5s of completing a PathLab task. Confidence shown as circle fill level. | M | P0 |
| UI-05 | Pivot card: inserts at top of stack when `pivot_triggered = true`. Shows 2 alternatives. Dismissible (snooze 7d). "Explore this instead" creates new simulation. | Tone is curious, not corrective. "Explore instead" respects remaining simulation slots (blocks if at max 3). | M | P1 |
| UI-06 | Score timeline bottom sheet: tap score circle → shows `score_events` history with reason strings and timestamps | Shows last 10 events. Scrollable. Each entry: delta, factor, date, reason string. | M | P1 |
| UI-07 | University card expansion: program list, admission band (ATAR/GPA), key majors, cost estimate, external link | External link opens in SafariView. Does not navigate away from app. | S | P2 |
| UI-08 | Side-by-side comparison: select any 2 of 3 simulations, see score diffs (+/- delta per factor) | Useful once students have 2+ simulations. P2 — core flow works without it. | L | P2 |

---

### Epic 5 — Reflection UX

| ID | Ticket | Acceptance Criteria | Effort | Priority |
|---|---|---|---|---|
| RF-01 | Post-quest slider check-in: 3 interactions (Engagement / Energy / Would revisit) shown auto on quest completion | Completes in <10s if engaged. Target: >70% completion rate of quest completions. Dismissible after 3s. | S | P0 |
| RF-02 | Voice AI reflection: 90-second prompted voice note after quest, Whisper transcription, student sees + can edit transcript before saving | Transcription completes within 5s of recording end. Prompt questions vary per PathLab domain. | M | P0 |
| RF-03 | Psych student session handoff: counsellor web form (separate lightweight web UI) submits structured reflection summary linked to student + PathLab | Form creates `reflections` row with `source = 'psych_session'`. Student notified score updated. Human-authored data gets 1.5x confidence weight. | M | P1 |
| RF-04 | "Your vibe went up" push notification: sent when Journey Score changes >5 pts. Deep-links to score timeline. | Rate-limited: max once per 24h per student. Not sent between 10pm–8am. | S | P2 |

---

## 8. Release Plan

### Phase 1 — MVP (Weeks 1–5)
**Tickets:** DB-01–05, SC-01–04, AG-01–03, UI-01–04, RF-01–02

**What ships:** The complete core loop. Student creates a simulation → sees stacked cards with PathLab, university, and job → completes PathLab quests → scores update live. Viability is fresh. Reflections feed Passion.

**Success metric:** 80% of test students create at least 1 simulation within their first session.

---

### Phase 2 — Engagement (Weeks 6–9)
**Tickets:** SC-05–06, AG-04–05, UI-05–06, RF-03

**What ships:** Pivot flow, score explainability timeline, novel job discovery, psych student session integration.

**Success metric:** Passion score shows statistically significant correlation with PathLab re-enrollment rate (r > 0.5).

---

### Phase 3 — Polish (Weeks 10–13)
**Tickets:** UI-07–08, RF-04

**What ships:** University detail expansion, simulation comparison mode, score change notifications.

**Success metric:** Journey Board NPS from 14–18 users > 40.

---

## 9. Open Questions

These need answers before Phase 1 kicks off. Each one blocks at least one ticket.

| # | Question | Blocks | Owner |
|---|---|---|---|
| 1 | **University data sourcing**: manual seed vs. scraping vs. structured API (e.g. QILT for AU, College Scorecard for US)? Manual is fastest to ship but doesn't scale. | DB-02 | Product |
| 2 | **Psych student program structure**: how are counsellors onboarded, matched to students, and compensated? The RF-03 counsellor web form can't be scoped until this is defined. | RF-03 | Ops |
| 3 | **Viability sub-signal weights**: current model weights all signals equally. Should automation risk be weighted higher for a 16-year-old planning a 10-year horizon? | AG-02 | Product |
| 4 | **Hard cap at 3 simulations**: is this a firm product decision or a starting hypothesis? If students consistently hit the cap and want more, we need to know in Phase 1. Add a "wanted to add more" event to analytics. | UI-01 | Product |
| 5 | **Apify cost ownership**: who sets the cost alert threshold and owns the monthly bill? At scale this could grow quickly. Needs a clear owner before AG-05 goes live. | AG-05 | Engineering Lead |
| 6 | **Language & tone review**: all in-app copy touching 14–18 year olds (especially the Pivot Card and score displays) needs a pass from someone with youth UX experience before UI-05 ships. "Pivot" itself might be too corporate — what word resonates with a 16-year-old? | UI-05 | Design |

---

*My Paths — Career & Education Journey Mapper · v1.1 · Internal Product Document*
