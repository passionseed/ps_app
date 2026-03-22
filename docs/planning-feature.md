# Planning — Feature Document

> *"A plan isn't a prediction. It's a rehearsal for a future you're choosing to build toward."*

**Last updated:** 2026-03-22

---

## What Is Planning?

**Planning** is the second act of the Passion Seed experience. After students explore career paths through Seeds and build self-knowledge through reflections, Planning takes that data and turns it into a concrete, personalized roadmap — from today's high school grades to a career that genuinely fits who they are.

Planning sits at the intersection of three inputs:

```
SELF-KNOWLEDGE          REAL-WORLD DATA          AI SYNTHESIS
(from Seeds +     +    (TCAS programs,      +   (simulate paths,
 reflections)          jobs, universities)       score fit, advise)
       │                      │                        │
       └──────────────────────┴────────────────────────┘
                              │
                              ▼
                    A PERSONALIZED LIFE PLAN
           (university → career → work that aligns to ikigai)
```

This is not a generic "here are universities you qualify for" tool. It is a *life simulation engine* that helps students answer: **"If I go this route, will I end up somewhere that feels like me?"**

---

## Goal

| Dimension | Goal |
|-----------|------|
| **Student** | See multiple possible futures, understand the trade-offs, and choose one to commit to |
| **Product** | Bridge self-knowledge (from Seeds) with institutional reality (TCAS, jobs, universities) |
| **Platform** | Become the tool Thai students use to make the most consequential decision of their adolescence — with clarity instead of anxiety |

**The deeper north star:** Planning is where Seeds pay off. All the reflection data — energy trends, interest levels, fit scores, quit patterns — becomes fuel for an AI that can say: *"Based on what you've actually experienced and felt, here are three futures that could work for you, and here's why."*

---

## The Planning Stack (Three Layers)

### Layer 1: Know Yourself (Profile + Ikigai)
Before planning, the student needs a self-model. This is built from:
- Seeds exploration (revealed preferences)
- Onboarding inputs (GPAX, budget, preferred location, subject interests)
- Portfolio items (activities, achievements, projects)
- Ikigai scores (Passion, Mission, Profession, Vocation)

### Layer 2: Know Your Options (TCAS + Career Data)
Real-world data the student is planning against:
- TCAS programs with admission rounds, GPAX cutoffs, seat counts, deadlines
- University profiles with AI match scores, tuition, rankings, news, people
- Job database with viability scores, demand trends, required skills, salary
- Portfolio fit scores against specific TCAS Round 1 programs

### Layer 3: Simulate + Decide (AI-Assisted Journey Builder)
The planning interface where futures are built and compared:
- Create up to 3 journey simulations (career → university → path)
- AI scores each simulation across three dimensions: Passion, Future Viability, World Need
- Compare simulations side by side
- Edit, pivot, and refine until one feels right
- Direction Finder synthesizes all data into a recommendation

---

## Feature Breakdown

### 1. TCAS Profile Setup (`onboarding/StepTcasProfile.tsx`)

During onboarding, students enter the raw inputs that determine what's realistically possible:

| Input | What It Gates |
|-------|--------------|
| GPAX | Hard eligibility filter for TCAS rounds |
| Budget per year | Filters affordable programs |
| Preferred location | Regional preference weighting |
| Subject interests | Seed for semantic program matching |

This data lives in `profiles` and is the foundation of every eligibility calculation downstream. Without it, fit scores are unconstrained guesses.

---

### 2. Portfolio Builder (`portfolio/index.tsx`, `portfolio/add.tsx`)

Students build a portfolio of real achievements that feed into TCAS Round 1 (portfolio admission) scoring:

- Activities, projects, awards, extracurriculars
- Each item stored as `StudentPortfolioItem` with title, description, category
- Portfolio is compared against `program_requirements.what_they_seek` via semantic + AI alignment scoring

**Why this matters:** TCAS Round 1 (รอบ 1 Portfolio) is purely portfolio-based — no exam. Students with strong portfolios and weak exam scores have a path. This feature makes that path visible.

---

### 3. Program Fit Scoring (`fit/index.tsx`, `fit/[roundId].tsx`)

The **portfolio-fit** edge function scores a student's portfolio against every TCAS Round 1 program:

```
SCORING PIPELINE
─────────────────────────────────────────────────────────────
Student Portfolio Items
        │
        ▼
Semantic Embedding Similarity (30%)
   cosine_similarity(portfolio_embedding, program_embedding)
        │
        ▼
AI Alignment Scoring (70%)            ← only when portfolio + requirements exist
   Gemini evaluates: does this portfolio
   match what this program is seeking?
   Returns score + narrative in Thai
        │
        ▼
Hard Gates
   GPAX minimum check → fail if below cutoff
        │
        ▼
FIT SCORE (0-100) + Confidence + Gaps + Narrative
```

**Confidence levels:**
- `high` — both portfolio and program requirements are rich
- `medium` — one side is sparse
- `low` — neither side has enough data for a reliable score

**Discover mode:** `GET /portfolio-fit/discover` surfaces "hidden gem" programs the student hasn't considered but that score well against their profile. This is discovery-through-fit, not search.

**UI presentation:**
- Eligible tab (GPAX passes) and All tab
- Score rings: green ≥75, yellow ≥50, red <50
- "Hidden Gems" section for discovered programs
- Per-round detail view with gaps and improvement suggestions

---

### 4. University Comparison (`university/compare.tsx`)

Students pick two universities and programs, then see a head-to-head comparison:

| Metric | What It Tells You |
|--------|------------------|
| AI Match Score | How well this university/program aligns to the student's ikigai profile |
| Acceptance Rate | Realistic odds |
| GPAX Cutoff | Can I get in? |
| Tuition | Can I afford it? |
| Duration | How long is this path? |
| Ranking | Perceived prestige signal |

**Behind the scenes — `university-insights` edge function:**
1. Checks `university_insights_cache` (7-day TTL)
2. Pulls ground truth from `university_static_data`
3. Uses Exa API to research: news, notable people, tuition, curriculum
4. Uses Gemini to synthesize into structured AI match score + narrative
5. Returns: 4 news items, 5 notable people, full metrics

**Quick match client computation:**
```
quickMatch = average(passion_score, future_score, world_score)
```
Where each sub-score comes from the university insights response.

---

### 5. Career Research (`career/[name].tsx`, `build-path.tsx`)

Before building a journey, students can research a career:
- **People to follow** — real professionals in this field (LinkedIn profiles)
- **Top companies** — where this career is practiced
- **Industry news** — what's happening in this space right now

For novel job titles not in the database, the **career-research** edge function (Apify/Viability Agent) researches on demand and returns:
- `viability_score` — how viable is this career?
- `demand_trend` — growing / stable / declining
- Required skills and degree recommendations
- Salary range

**Viability Agent** (`apps/viability-agent/`) is the long-run infrastructure: crawls LinkedIn job boards to compute demand, salary data, and automation risk for any job title.

---

### 6. Journey Simulation (`build-path.tsx`, `my-paths.tsx`, `edit-path/[id].tsx`)

The core of the Planning feature. Students build a **journey** — a structured simulation of a possible future:

```
JOURNEY STRUCTURE
─────────────────────────────────────────────
StudentJourney {
  title: "Become a UX Designer at a startup"
  career_goal: "UX Designer"
  source: "ai_generated" | "manual"
  steps: [
    { type: "university", tcas_program_id: "...", details: {...} }
    { type: "internship", details: {...} }
    { type: "job", details: {...} }
  ]
  scores: {
    passion_score: 78
    future_score: 65
    world_score: 52
    journey_score: 68  // composite
  }
}
```

**Limit: 3 active simulations per user.** This is intentional — forced prioritization prevents paralysis. Students must commit to comparing a small set, not browsing infinitely.

**Score engine** (`supabase/functions/score-engine/`) continuously updates journey scores as new reflection data comes in:
- `POST /score-engine/ingest` — reflection data → passion score extraction → `score_events`
- `POST /score-engine/recalculate` — recompute weighted averages across all events
- `GET /score-engine/timeline` — score history for a simulation (trend visualization)

This creates a live feedback loop: as a student explores more Seeds, their journey scores update to reflect new self-knowledge.

---

### 7. Ikigai Compass + Direction Finder (`profile.tsx`)

The profile is where all planning data converges into a self-portrait:

**Ikigai Compass — four pillars:**

| Pillar | Ikigai Question | Data Sources |
|--------|----------------|--------------|
| 🔥 Passion | What you love | Interest levels from Seeds reflections |
| 🎯 Mission | What the world needs | World need scores from journeys |
| 💼 Profession | What you can be paid for | Future/viability scores, job data |
| 🌍 Vocation | What you're good at | Skills inventory, portfolio fit |

Each pillar has: score (0–100), insight text, and a drill-down route (`/ikigai/passion`, etc.).

**Direction Finder** (the north star feature, currently "coming soon") synthesizes all four pillars and planning data into a recommendation: *"Here is the career space where your ikigai converges, and here are the two or three paths most likely to take you there."*

**Skills Inventory:** Categorized skills (Design, Code, Soft Skills) with color coding — a growing picture of what the student is becoming, not just what they want to be.

---

## How Planning Connects to Other Modules

```
                    ┌──────────────────────────┐
                    │         SEEDS            │
                    │  (generates self-data)   │
                    └────────────┬─────────────┘
                                 │ energy/confusion/interest
                                 │ time_spent, decisions, open text
                                 ▼
                    ┌──────────────────────────┐
                    │    STUDENT PROFILE       │◄──── Onboarding
                    │  GPAX · Portfolio ·      │      (TCAS inputs)
                    │  Interests · Ikigai      │
                    └────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  PORTFOLIO FIT   │   │   UNIVERSITY     │   │  CAREER / JOB    │
│  SCORING         │   │   COMPARISON     │   │  RESEARCH        │
│                  │   │                  │   │                  │
│ • semantic match │   │ • AI match score │   │ • viability score│
│ • AI alignment   │   │ • Exa research   │   │ • demand trend   │
│ • gap analysis   │   │ • 7-day cache    │   │ • skills needed  │
│ • hidden gems    │   │ • news & people  │   │ • salary range   │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │   JOURNEY SIMULATIONS    │
                    │  (up to 3 per student)   │
                    │                          │
                    │  career goal → steps →   │
                    │  passion / future /       │
                    │  world scores            │
                    └────────────┬─────────────┘
                                 │ score events
                                 ▼
                    ┌──────────────────────────┐
                    │   SCORE ENGINE           │
                    │  ingest → recalculate →  │
                    │  timeline                │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   IKIGAI COMPASS +       │
                    │   DIRECTION FINDER       │
                    │  (the synthesis layer)   │
                    └──────────────────────────┘
```

### Module Connection Table

| Module | Connection to Planning | Data Exchanged |
|--------|----------------------|----------------|
| **Seeds** | Primary data source for self-knowledge | `energy_level`, `interest_level`, `confusion_level`, `decision`, `open_response` per day |
| **Profile / Ikigai** | Synthesizes all signals into four pillars | Passion, Mission, Profession, Vocation scores |
| **Onboarding** | Provides hard constraints | GPAX, budget, location, subject interests |
| **TCAS data** | Ground truth for university planning | Programs, rounds, GPAX cutoffs, seats, deadlines |
| **Portfolio** | TCAS Round 1 input | `StudentPortfolioItem` list vs `program_requirements` |
| **Portfolio Fit** | Scores feasibility | Score (0–100), confidence, gaps, Thai narrative |
| **University Insights** | Deepens university decisions | AI match, news, people, tuition, ranking |
| **Career Research** | Validates career choices | Viability score, demand trend, skills, salary |
| **Viability Agent** | Long-run career market data | Crawled job demand, automation risk |
| **Journey Simulations** | The plan itself | `StudentJourney` with steps and three-axis scores |
| **Score Engine** | Keeps plans updated with new data | `score_events`, weighted passion/future/world averages |
| **Direction Finder** | The recommendation layer | Synthesized ikigai → concrete career/university match |

---

## AI Roles in Planning

AI is not a feature in Planning — it is the architecture.

| AI Task | Where | Model | Input | Output |
|---------|-------|-------|-------|--------|
| Portfolio alignment scoring | `portfolio-fit` edge fn | Gemini | Portfolio items + program requirements | Alignment score, gaps, narrative (Thai) |
| University research synthesis | `university-insights` edge fn | Gemini + Exa | University name + student career scores | AI match, news, people, metrics |
| Unknown career research | `career-research` edge fn | (Apify + LLM) | Job title | Viability, skills, salary, demand |
| Career insights | `career-insights` edge fn | Web research APIs | Career name | Professionals, companies, news |
| Passion score extraction | `score-engine` edge fn | (pending) | Reflection `open_response` text | Numerical passion signal |
| Direction Finder recommendation | (planned) | Gemini | Full ikigai profile + journey history | Ranked career/university recommendations |
| Journey simulation generation | (planned) | Gemini | Career goal + profile | Pre-built journey with suggested steps |

---

## Data Points That Feed the Planning Engine

Every data point a student generates feeds the planning layer:

| Signal | Source | Planning Use |
|--------|--------|-------------|
| `energy_level` trend | Seeds reflections | Energizer domains → Passion pillar |
| `interest_level` trend | Seeds reflections | True interest vs. stated interest |
| `confusion_level` trend | Seeds reflections | Cognitive difficulty tolerance |
| `fit_level` on completion | Seed end reflection | Self-assessed domain fit |
| `would_explore_deeper` | Seed end reflection | Depth signal (explorer vs. committed) |
| `reason_category` on exit | Seed exit reflection | What explicitly repels them |
| `why_joined` | Enrollment | Stated intent (compare to revealed data) |
| GPAX | Onboarding | Hard eligibility gate |
| Portfolio items | Portfolio builder | TCAS Round 1 fit scoring |
| Ikigai scores | Profile synthesis | Journey scoring weights |
| Journey decisions | Build-path | Career goal commitment signal |

---

## 12-Month Dream State

```
TODAY (March 2026)                    12-MONTH IDEAL
───────────────────────────────────────────────────────────────────
Score engine mock data           →    Real passion extraction from
                                      reflection text (LLM-powered)

Manual journey building          →    AI pre-builds 3 journeys from
                                      career goal + profile in <10s

Up to 3 simulations (static)     →    Dynamic: simulations update
                                      as student explores more Seeds

Portfolio fit: TCAS Round 1      →    All TCAS rounds scored
only                                  (Round 2 GPAX, Round 3 Exam)

Direction Finder: "coming soon"  →    Shipped: ranked ikigai-based
                                      recommendation with confidence

University comparison: manual    →    "These two universities auto-
pair selection                        suggested based on your top fits"

Viability Agent: mock data       →    Live crawled job demand,
                                      automation risk, salary data

No social proof                  →    "3 students with your profile
                                      chose this university and are
                                      now enrolled"

Thailand only (TCAS)             →    International options (Duolingo,
                                      SAT, IELTS-linked programs)
```

---

## Related Files

### Types
| File | Purpose |
|------|---------|
| `types/tcas.ts` | `TcasUniversity`, `TcasProgram`, `TcasAdmissionRound`, `EligibleRound`, `ProgramSearchResult` |
| `types/portfolio.ts` | `StudentPortfolioItem`, `ProgramRequirements`, `FitGap`, `ProgramFitScore`, `FitScoreResult` |
| `types/university.ts` | `UniversityInsights`, `UniversityPerson`, `UniversityNewsItem` |
| `types/journey.ts` | `CareerPath`, `JourneyStep`, `StudentJourney`, `JourneyScores` |
| `types/onboarding.ts` | Profile type with TCAS fields (GPAX, budget, location, interests) |

### Libraries / API
| File | Purpose |
|------|---------|
| `lib/tcas.ts` | TCAS search, vector match, eligibility, program detail |
| `lib/portfolioFit.ts` | Portfolio CRUD + fit scoring + program discovery |
| `lib/universityInsights.ts` | University insights + quick match computation |
| `lib/journey.ts` | Journey CRUD (create, get, update, delete) |
| `lib/onboarding.ts` | `saveTcasProfile()`, `getTcasProfile()`, career goals |

### Screens
| File | Purpose |
|------|---------|
| `app/onboarding/StepTcasProfile.tsx` | Collect GPAX, budget, location, interests |
| `app/portfolio/index.tsx` | View and delete portfolio items |
| `app/portfolio/add.tsx` | Add portfolio items |
| `app/fit/index.tsx` | Browse fit scores across TCAS Round 1 programs |
| `app/fit/[roundId].tsx` | Individual program fit detail + gap analysis |
| `app/university/compare.tsx` | Compare two universities head-to-head |
| `app/university/[key].tsx` | Single university detail |
| `app/career/[name].tsx` | Career research (people, companies, news) |
| `app/build-path.tsx` | Career simulator — build a journey |
| `app/edit-path/[id].tsx` | Edit an existing journey |
| `app/(tabs)/my-paths.tsx` | View all active journey simulations |
| `app/(tabs)/profile.tsx` | Ikigai Compass, Skills Inventory, Achievements |

### Edge Functions
| File | Purpose |
|------|---------|
| `supabase/functions/portfolio-fit/index.ts` | Semantic + AI fit scoring; program discovery |
| `supabase/functions/university-insights/index.ts` | AI university research with Exa + Gemini |
| `supabase/functions/score-engine/index.ts` | Ingest reflections → passion scores → journey scoring |
| `supabase/functions/career-research/index.ts` | Research unknown career titles |
| `supabase/functions/career-insights/index.ts` | Career people, companies, news |

### Components
| File | Purpose |
|------|---------|
| `components/JourneyBoard/CareerPathCard.tsx` | Career path display card |
| `components/JourneyBoard/JourneySimulationCard.tsx` | Journey simulation card |
| `components/JourneyBoard/PathStepCard.tsx` | Individual journey step |
| `components/JourneyBoard/DonutScore.tsx` | Score ring visualization |
| `components/JourneyBoard/ScoreWidget.tsx` | Score widget display |
| `components/JourneyBoard/PivotCard.tsx` | Pivot/alternative card |

### Viability Agent
| File | Purpose |
|------|---------|
| `apps/viability-agent/` | Apify actor — crawls job demand, salary, automation risk |

### Design Docs
| File | Purpose |
|------|---------|
| `docs/superpowers/plans/2026-03-11-tcas-data-layer-and-student-profile.md` | TCAS data architecture + RPC functions |
| `docs/superpowers/plans/2026-03-13-tcas1-portfolio-fit.md` | Portfolio fit scoring engine design |
| `docs/superpowers/plans/2026-03-09-university-comparison.md` | University comparison design |
| `docs/superpowers/plans/EdgeFunctionScoring.md` | Score engine architecture |
| `docs/superpowers/plans/ViabilityAgent.md` | Viability agent design |
| `docs/superpowers/plans/Career Path Mapping.md` | Career path mapping design |

---

## What Planning Is NOT

- Not a ranking tool ("here are the top 10 universities for you") — it's a simulation + fit engine
- Not a guarantee ("you will get into this program") — it models possibility, not certainty
- Not a one-time output — plans update as the student learns more about themselves through Seeds
- Not exam prep — it helps students decide what to aim for, not how to get a higher score

---

## Open Questions / Next Bets

1. **When does Direction Finder ship?** It's the feature that ties Seeds + Planning into a single narrative. Ikigai scores are mocked — what's the minimum data needed to make them real?
2. **Score engine realism** — passion extraction from open text responses is currently randomized. The LLM scoring upgrade is the highest-leverage pending implementation.
3. **Round 2 + Round 3 fit** — GPAX-based and exam-based rounds are not yet scored. A large segment of students are planning for these, not Round 1.
4. **Journey AI generation** — instead of manually building a journey step by step, a student should be able to say "I want to be a product designer" and get three plausible journeys pre-built in seconds.
5. **The reveal moment** — when does a student first see their ikigai profile with real (not mock) data? That moment of recognition ("this actually describes me") is the product's peak emotional beat and should be designed as a ceremony, not a data dump.
