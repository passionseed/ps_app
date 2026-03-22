# Seeds (PathLab) — Feature Document

> *"A seed is not a commitment. It's an honest invitation to try."*

**Last updated:** 2026-03-22

---

## What Is a Seed?

A **Seed** is a structured, low-stakes career exploration experience. Students spend 30 minutes a day for 4–5 days doing real tasks inside a career path — not reading about it, not watching an influencer explain it, but *doing it*. Then they reflect. Then they decide.

Seeds are the entry point of Passion Seed's entire value chain. Everything downstream — paths, reflections, profile intelligence, university fit, ikigai scoring — traces back to what a student did and felt inside a Seed.

### The Core Insight

Students don't know what they want because they've never tried anything. Traditional guidance asks "what are you interested in?" before they've had a chance to be interested in anything. Seeds flip the loop:

```
TRY FIRST → FEEL → REFLECT → KNOW
  (seed)   (daily data)  (reflection)  (profile)
```

This generates *revealed preference* data — what students actually respond to when doing real work — rather than *stated preference* data, which is noisy and socially constructed.

---

## Goal

| Dimension | Goal |
|-----------|------|
| **Student** | Discover what career paths genuinely resonate, without committing to anything |
| **Product** | Collect high-quality behavioral + emotional data to build a student's career profile |
| **Platform** | Be the infrastructure layer that connects real-world career exploration to university roadmaps |

**The deeper north star:** Every data point a student generates inside a Seed — energy, confusion, interest, how long they stayed, when they quit, what they wrote — becomes a signal that the profile system uses to understand who this student is and what life will suit them.

---

## Feature Breakdown

### 1. Seed Discovery (`discover.tsx`)

Students browse available PathLab seeds, organized by:
- **"Continue your path"** — seeds they're already enrolled in
- **"You must like"** — top recommendations (not yet personalized, roadmap item)
- **"Maybe u like"** — secondary suggestions
- **"Not for you at all"** — lower affinity seeds

Each seed card shows: title, slogan, category, cover image, and enrollment progress (day X of Y, done today or not).

**Current state:** Categorization is static order. The dream state is a personalization engine that re-ranks seeds based on prior reflection data.

---

### 2. Seed Detail & Enrollment (`seed/[id].tsx`)

When a student taps a seed:
- They see the seed description, slogan, expert profile (name, title, company)
- A preview of the path days (Day 1 title, Day 2 title, etc.)
- A prompt: *"Why do you want to try this?"* (optional, becomes `why_joined`)
- A single CTA: **Start Path** or **Continue**

`why_joined` is a rich signal — a student's stated intent before they experience the path, compared later to their actual emotional trajectory.

**NPC Avatar:** Each seed can have an NPC character (name, SVG, description) that can guide the student through content. Infrastructure is in place; not all seeds have one yet.

---

### 3. Daily Tasks (`path/[enrollmentId].tsx`)

The heart of the experience. Each day has:
- A `context_text` — frames the day's work (what they're doing and why)
- A list of **activities** — the actual tasks:
  - `text` — reading or written prompts
  - `video` — embedded video content
  - `quiz` — multiple-choice or ranking questions
  - `npc_chat` — guided conversation with an NPC character
  - `ai_chat` — open conversation with an AI
  - `reflection_card` — structured self-reflection prompts
  - `assessment` — scored evaluation
- Progress tracking per activity: `not_started → in_progress → completed / skipped`

Time spent per activity is tracked (`time_spent_seconds`) and rolled up to `time_spent_minutes` per day.

---

### 4. Daily Reflection (`reflection/[enrollmentId].tsx`)

At the end of each day, the student rates the day across three dimensions:

| Signal | What It Measures |
|--------|-----------------|
| `energy_level` (1–10) | Did this path energize or drain them? |
| `confusion_level` (1–10) | Was the content accessible or overwhelming? |
| `interest_level` (1–10) | Do they actually want to keep going? |
| `open_response` | Free text — what they're thinking, feeling, noticing |
| `time_spent_minutes` | Engagement depth proxy |

Then they make a **decision**:
- `continue_now` — do the next day immediately
- `continue_tomorrow` — come back tomorrow
- `pause` — take a break
- `quit` — this isn't for me
- `final_reflection` — I've finished all days

---

### 5. Exit & End Reflections

**On quit (`PathExitReflection`):**
- Why did they leave? `boring | confusing | stressful | not_me`
- Did their interest change? `more | less | same`
- Free text response

**On completion (`PathEndReflection`):**
- `overall_interest` (1–10) — after doing it, how interested are you?
- `fit_level` (1–10) — does this feel like you?
- `would_explore_deeper`: `yes | maybe | no`
- `surprise_response` — what surprised them

**Why this matters:** Exit data is as valuable as completion data. A student who quits on Day 2 because it was "stressful" tells us something fundamentally different about their profile than one who quits because it was "not me."

---

### 6. Path Report (`PathReport`)

Generated after completion or exit. Aggregates:
- Days completed, total time
- Energy/confusion/interest trend across days
- Exit or end reflection summary
- Shareable via `share_token`

The `PathReportData` type (`trend: PathTrendPoint[]`) gives day-by-day emotional trajectory — the raw material for profile intelligence.

---

## How Seeds Connects to Other Modules

```
                        ┌─────────────────────┐
                        │       SEEDS          │
                        │  (the entry point)   │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
      ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
      │    PATHS     │    │   LEARNING   │    │   EXPERTS        │
      │  (structure) │    │    MAPS      │    │  (role models)   │
      │  path_days   │    │  map_nodes   │    │  expert_pathlabs │
      └──────┬───────┘    └──────┬───────┘    └──────────────────┘
             │                   │
             ▼                   ▼
      ┌──────────────┐    ┌──────────────┐
      │  ENROLLMENT  │    │   ACTIVITY   │
      │  (user state)│    │   PROGRESS   │
      └──────┬───────┘    └──────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌────────────┐  ┌──────────────────────────┐
│REFLECTIONS │  │   NPC / AI CONVERSATIONS │
│(emotional  │  │   (dialogue traces)       │
│ data)      │  └──────────────────────────┘
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                   STUDENT PROFILE                    │
│  energy trends · interest vectors · quit patterns   │
│  time investment · fit scores · ikigai signals      │
│  (feeds Direction Finder, university roadmap match) │
└─────────────────────────────────────────────────────┘
```

### Connection Details

| Module | How Seeds Connects | Data Exchanged |
|--------|-------------------|----------------|
| **Paths** | 1 seed → 1 path (via `path.seed_id`) | `total_days`, structure |
| **Path Days** | Path → N days of content | `context_text`, `reflection_prompts`, `node_ids` |
| **Learning Maps / Nodes** | `node_ids` in each PathDay link to `map_nodes` | Activity content (video, quiz, text) |
| **Path Enrollments** | Student → path relationship | `current_day`, `status`, `why_joined` |
| **Path Reflections** | Per-day emotional data | `energy`, `confusion`, `interest`, `decision` |
| **Exit / End Reflections** | Terminal emotional state | Quit reason, fit level, would explore deeper |
| **Path Reports** | Post-completion summary | Trend data, shareable report |
| **Expert Profiles** | Each seed surfaces one expert | Name, title, company (social proof, role model) |
| **NPC Avatars** | Guided in-path experience | Name, SVG, dialogue personality |
| **Student Profile** | Downstream consumer of all reflection data | Ikigai scores, Direction Finder, fit signals |
| **Auth** | Guest browsing + authenticated enrollment | `user_id`, `isGuest`, `preferred_language` |
| **Onboarding** | User preferences for discovery UX | `preferred_language` for Thai/EN display |

---

## Data Points That Feed the Student Profile

This is the product's deepest value: every interaction inside a Seed generates a profile signal.

| Data Point | Table | What It Reveals |
|------------|-------|----------------|
| `why_joined` | `path_enrollments` | Stated motivation (pre-experience intent) |
| `energy_level` per day | `path_reflections` | Energizers vs. drainers across domains |
| `confusion_level` per day | `path_reflections` | Cognitive comfort zone |
| `interest_level` per day | `path_reflections` | Interest trajectory (rising? falling?) |
| `open_response` | `path_reflections` | Qualitative emotional texture |
| `decision` per day | `path_reflections` | Persistence, patience, decisiveness |
| `time_spent_minutes` | `path_reflections` | Engagement depth (time is honest) |
| `reason_category` on exit | `path_exit_reflections` | What specifically repels them |
| `interest_change` on exit | `path_exit_reflections` | Direction of interest shift |
| `fit_level` on completion | `path_end_reflections` | Perceived self-match |
| `would_explore_deeper` | `path_end_reflections` | Future-facing intent signal |
| `surprise_response` | `path_end_reflections` | What broke their mental model |
| Activity completion rate | `path_activities` | Grit vs. avoidance patterns by task type |
| Number of seeds tried | `path_enrollments` | Exploration breadth |
| Quit day (Day 1 vs Day 4) | `path_enrollments` | Persistence threshold |

**The long-term vision:** Across 3–5 seeds, a student's profile becomes rich enough to answer: *"Given everything this student has tried and felt — what paths are likely to energize, challenge, and fit them?"*

---

## 12-Month Dream State

```
TODAY (March 2026)                   12-MONTH IDEAL
─────────────────────────────────────────────────────────────────
Static seed list                 →   Personalized seed queue ranked by
                                     profile affinity + exploration gaps

Manual seed creation             →   AI-assisted PathLab generation
                                     (expert interview → seed in 1 hour)

Profile shows mock ikigai        →   Real ikigai derived from reflection
                                     data across all completed seeds

Reflections stored but not used  →   Reflection trends feed Direction
                                     Finder and university roadmap match

Single expert per seed           →   Expert conversation layer (student
                                     can "talk" to the expert)

Thai/English language toggle     →   Fully localized seed content

No peer layer                    →   "N students tried this path" social
                                     proof + cohort comparison
```

---

## Related Files

### Types
| File | Purpose |
|------|---------|
| `types/seeds.ts` | `Seed`, `SeedWithEnrollment`, `SeedNpcAvatar`, `SeedCategory` |
| `types/pathlab.ts` | `Path`, `PathDay`, `PathEnrollment`, `PathReflection`, `PathExitReflection`, `PathEndReflection`, `PathReport`, `PathReportData`, all enums |
| `types/map.ts` | `MapNode`, `NodeContent`, `StudentNodeProgress` (activity layer) |

### API / Library
| File | Purpose |
|------|---------|
| `lib/pathlab.ts` | All seed/path/enrollment/reflection API functions |
| `lib/auth.tsx` | Auth context — guest mode, user session |
| `lib/onboarding.ts` | User preferences (language), career goal storage |
| `lib/supabase.ts` | Supabase client initialization |

### Screens
| File | Purpose |
|------|---------|
| `app/(tabs)/discover.tsx` | Browse and discover seeds |
| `app/seed/[id].tsx` | Seed detail + enrollment |
| `app/path/[enrollmentId].tsx` | Daily tasks view |
| `app/reflection/[enrollmentId].tsx` | End-of-day reflection + decision |
| `app/(tabs)/my-paths.tsx` | Active and completed enrollments |
| `app/(tabs)/profile.tsx` | Student profile (consumes seed data, currently partial) |

### Database Seeds
| File | Purpose |
|------|---------|
| `supabase/seed/pathlab_seed.sql` | UX Designer PathLab (5-day) |
| `supabase/seed/web-developer-pathlab-seed.sql` | Web Developer PathLab (5-day) |

### Tests & Verification
| File | Purpose |
|------|---------|
| `tests/pathlab.test.ts` | Integration tests for seed retrieval |
| `scripts/verify-pathlab-data.ts` | TypeScript verification script |
| `scripts/verify-pathlab-data.sh` | Shell verification script |

### Related Plans
| File | Purpose |
|------|---------|
| `docs/plans/2026-03-19-web-developer-pathlab-design.md` | Web Developer seed design |
| `docs/plans/2026-03-20-autonomous-pathlab-generation-design.md` | AI-assisted seed generation |

---

## What Seeds Is NOT

- Not a course (no certification, no completion grade)
- Not a commitment (quit any time, no shame)
- Not a test of ability (students are exploring, not being evaluated)
- Not just content (it's behavioral + emotional signal collection with learning as the vehicle)

---

## Open Questions / Next Bets

1. **Personalization engine** — when do we have enough reflection data per user to rank seeds by predicted fit?
2. **Profile feedback loop** — when does a student get to *see* what their seeds are revealing about them? The reveal moment is a product unlock.
3. **Seed velocity** — how many seeds does a student need to explore before the Direction Finder has meaningful signal? Hypothesis: 3.
4. **Expert voice** — is an expert profile card enough, or should students be able to ask the expert a question (async or AI-simulated)?
5. **Social layer** — does seeing "47 students explored this path this week" change behavior?
