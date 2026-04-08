# Hackathon Feature Expansion & Phase 1 Sequence Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal**: Execute the 4 major architectural features outlined by the CEO Plan Review.

1.  **Challenges DB Migration:** Move static `ChallengePage.tsx` challenges into Supabase. Add a selector for teams.
2.  **Post-Activity Reflection System:** Create a structured learning milestone for teams to record "Hypothesis vs Reality".
3.  **Uniqueness Grading (Fun Mode):** Leverage `pgvector` to plot ideas on a dimensional graph, gamifying uniqueness with bonus points and rankings.
4.  **Phase 1 Learning Activities Content:** Fully populate the Hackathon Activity Engine with the rapid-fire, highly interactive Phase 1 sequence explicitly defined by the Product team.

**Tech Stack**: Supabase (PostgreSQL, `pgvector`), TypeScript, Expo Router, React Native Reanimated/Skia.

---

## Task 1: Challenges DB Migration & Hub Integration

**Scope:**
Create DB tables for Tracks and Challenges. Refactor the `app/hackathon-program/index.tsx` screen to include a "View Challenges" button.

- [ ] **1.1: Database Schema**
  - Create migration `20260401000001_hackathon_challenges.sql`:
    - `hackathon_tracks` (id, title, subtitle, icon, color, display_order)
    - `hackathon_challenges` (id, track_id, num, title_en, title_th, hook_en, challenge_en, tangible_equivalent, tags array, severity, difficulty, impact, urgency)
  - Alter `hackathon_team_program_enrollment` to add `selected_challenge_id`.
- [ ] **1.2: Seed Static Data**
  - Create `supabase/seed/hackathon_challenges.sql` translating the `ChallengePage.tsx` JSON into INSERT statements.
- [ ] **1.3: Update Types & Library**
  - Update `types/hackathon-program.ts` with new interfaces: `HackathonTrack`, `HackathonChallenge`.
  - Add fetch functions in `lib/hackathonChallenges.ts`.
- [ ] **1.4: UI Updates**
  - Add a "View All Challenges" Hero/CTA button in `app/hackathon-program/index.tsx`.

---

## Task 2: Post-Activity Reflection System

**Scope:**
After finishing the phase activities, teams must formally reflect on what they learned.

- [ ] **2.1: Database Schema**
  - Create migration `20260401000002_hackathon_reflections.sql`:
    - `hackathon_team_reflections` (id, team_id, phase_id, prev_hypothesis, new_reality, key_insight, member_id, created_at)
- [ ] **2.2: Types & API API Component**
  - Update types in `types/hackathon-program.ts`. Add fetchers in `lib/hackathonReflections.ts`.
- [ ] **2.3: Reflection UI Screen**
  - Create `app/(hackathon)/reflection/[phaseId].tsx` with structured text inputs for "What we believed" vs "What we discovered".

---

## Task 3: Uniqueness Grading & Graphing System

**Scope:**
Gamify uniqueness. Use `pgvector` to embed problem statements, rank them, and grant bonus points.

- [ ] **3.1: Vector DB Setup**
  - Create migration `20260401000003_hackathon_uniqueness.sql`:
    - Ensure `pgvector` extension is enabled.
    - Alter `hackathon_team_program_enrollment` to add `problem_statement` (text), `embedding` (vector(1536)), `uniqueness_score` (float), `uniqueness_rank` (int).
- [ ] **3.2: Grading Logic (Edge Function or Client Hook)**
  - Create `supabase/functions/grade-uniqueness` (or handle server-side in DB proxy).
  - Uses TrueFoundry AI Gateway / OpenAI to generate embeddings.
  - Computes cosine distance against standard/generic clusters + other teams to return a 0-100 `uniqueness_score`.
- [ ] **3.3: Uniqueness Leaderboard & Graph UI**
  - Create `app/(hackathon)/uniqueness-radar.tsx` rendering a Skia-powered scatter plot of team ideas, highlighting the user's team relative to the "generic center".

---

## Task 4: Phase 1 Deep Learning Activities Sequence

**Scope:**
Write the canonical SQL seed for the 7-activity Phase 1 systems-thinking flow in `supabase/seed/hackathon_phase1_activities_complete.sql`.

- [ ] **4.1: Seed File Construction**
  - Create `supabase/seed/hackathon_phase1_activities_complete.sql`
  - Overwrite existing dummy Phase 1 activities with this exact sequence:
    1. **What You'll Walk Away With**
    2. **See the System, Not Just the Symptom**
    3. **Interview Real Humans**
    4. **Upload Evidence**
    5. **Map the System**
    6. **Decision Gate: Proceed / Pivot / Kill**
    7. **Submit Problem Proof Pack**
  - Use mentor review as the checkpoint after evidence and synthesis, not as a separate content step inside the activity list.
