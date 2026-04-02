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
Write the massive SQL seed to inject exactly the 16 steps defined by the team into the exiting Activity Engine.

- [ ] **4.1: Seed File Construction**
  - Create `supabase/seed/hackathon_phase1_activities_complete.sql`
  - Overwrite existing dummy Phase 1 activities with this exact sequence:
    1. **1min Outcome**: Short text/infographic (`content_type: text/image`).
    2. **5min Chatbot Interviewee**: Text prompt directing to AI simulation (`content_type: ai_chat` labeled "Interview AI").
    3. **5min Mascot 5-Whys**: Video or text guide on 5-Whys (`content_type: short_video`).
    4. **10min สัมภาษณ์ ai (AI as interviewer)**: `ai_chat` component.
    5. **20min Create Persona**: Team workspace / `text_answer` assessment to enter Persona.
    6. **30min Real Interview Guidelines**: Instructional docs (`content_type: pdf`/`text`).
    7. **10min Upload Interview Evidence**: Assessment type `file_upload` (sound/video).
    8. **10min AI Comment on Interview**: Native integration triggering AI feedback analysis.
    9. **5min Problem Statement Guidelines**: `image` (infographic).
    10. **30min Discuss In Group**: Text instructions.
    11. **Updated Persona & Statement**: `text_answer` combined submission.
    12. **AI Comment on Final Assets**: Automated rule in DB / Edge.
    13. **5min NotebookLM Guidelines**: Video/Text tutorial.
    14. **30min Submit 3 Trustful Sources**: Assessment type `text_answer` for links + data.
    15. **30min Book Mentor**: Link text to calendly / internal scheduling.
    16. **Submit Final Changes**: Mentor-gated standard workflow submission.
