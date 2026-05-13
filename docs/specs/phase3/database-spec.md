# Phase 3 — Database Specification + SQL Migration

**Version:** 1.0  
**Date:** May 2026  
**Adapts:** Phase 2 schema (`hackathon_phase_activities`, `hackathon_phase_activity_content`, `hackathon_phase_activity_assessments`)  
**New pattern:** Loop-based workspace (cycles repeat steps 1–4) + dynamic content (auto-populated drafts) + real-time AI coaching

---

## Philosophy: Adapt, Don't Replace

Phase 2 schema works. Phase 3 extends it with:

| Phase 2 Pattern | Phase 3 Extension |
|-------------------|-------------------|
| 5 linear activities (1→2→3→4→5) | 1 workspace with 4 repeating step types (hypothesis → build → test → synthesize) |
| Static content (chat_comic, video, text) | Dynamic content (templates, auto-drafts, interactive forms) |
| One-shot assessments | Per-cycle assessments that accumulate |
| Single submission per activity | Multiple submissions per step (one per cycle) |

All Phase 3 data lives in **new tables** alongside Phase 2. Zero changes to existing Phase 2 rows.

---

## Schema Overview

```
┌─────────────────────────────────────────┐
│  hackathon_program_phases               │
│  (existing)                             │
│  • Phase 2: ideation_sprint             │
│  • Phase 3: user_testing_sprint  ← new  │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  hackathon_phase_activities             │
│  (existing, extended)                   │
│  • activity_type: 'linear' (Phase 2)   │
│  • activity_type: 'loop_step' (Phase 3) │
│  • activity_type: 'workspace' (Phase 3)│
│  • cycle_aware: true/false               │
└─────────────────────────────────────────┘
           │
           ├──► hackathon_phase_activity_content
           │      (existing, extended)
           │      • content_type: 'chat_comic' (Phase 2)
           │      • content_type: 'template' (Phase 3)
           │      • content_type: 'auto_draft' (Phase 3)
           │      • content_type: 'interactive_form' (Phase 3)
           │
           ├──► hackathon_phase_activity_assessments
           │      (existing, extended)
           │      • assessment_type: 'text_answer' (both)
           │      • metadata->thread: 'test_results' (Phase 3)
           │      • metadata->rubric_focus: ['behavioral_observation'] (Phase 3)
           │
           └──► NEW: hackathon_phase3_cycles
                  ├── NEW: hackathon_phase3_cycle_steps
                  ├── NEW: hackathon_phase3_test_sessions
                  ├── NEW: hackathon_phase3_daily_checkins
                  ├── NEW: hackathon_phase3_midphase_synthesis
                  └── NEW: hackathon_phase3_ritual_posts
```

---

## Migration: Full SQL

```sql
-- ============================================================
-- PHASE 3 DATABASE MIGRATION
-- ============================================================
-- Run after: 20260401000000_hackathon_phase_activities.sql (Phase 2)
-- Zero risk to Phase 2 data. All additive.

-- ------------------------------------------------------------
-- 1. EXTEND EXISTING TABLES (Additive only)
-- ------------------------------------------------------------

-- Add activity_type to hackathon_phase_activities
-- This lets Phase 3 activities coexist with Phase 2
ALTER TABLE hackathon_phase_activities
  ADD COLUMN activity_type text NOT NULL DEFAULT 'linear'
    CHECK (activity_type IN ('linear', 'loop_step', 'workspace', 'checkpoint'));

ALTER TABLE hackathon_phase_activities
  ADD COLUMN cycle_aware boolean NOT NULL DEFAULT false;

ALTER TABLE hackathon_phase_activities
  ADD COLUMN max_cycles int;  -- NULL = unlimited (Phase 3 default)

-- Add content_type variants for Phase 3
-- Note: If content_type already has a CHECK constraint,
-- you may need to drop and recreate it.
-- For safety, this migration assumes you add to the check:
-- content_type: 'chat_comic', 'video', 'text', 'image', 'template', 'auto_draft', 'interactive_form'

-- Add assessment metadata fields for Phase 3 rubric tracking
ALTER TABLE hackathon_phase_activity_assessments
  ADD COLUMN ai_rubric jsonb;  -- stores per-dimension scores

-- ------------------------------------------------------------
-- 2. PHASE 3 CYCLE SYSTEM (Core)
-- ------------------------------------------------------------

CREATE TABLE hackathon_phase3_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  program_phase_id uuid NOT NULL REFERENCES hackathon_program_phases(id),
  
  -- Iteration counter
  cycle_number int NOT NULL CHECK (cycle_number > 0),
  
  -- State machine
  status text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'testing', 'synthesizing', 'completed', 'abandoned')),
  
  -- Gate decision (set on completion)
  gate_decision text CHECK (gate_decision IN ('refine', 'proceed', 'kill')),
  
  -- Hypothesis tracker (persisted per cycle)
  hypothesis_who text,
  hypothesis_will_do text,
  hypothesis_because text,
  hypothesis_measured_by text,
  hypothesis_full text GENERATED ALWAYS AS (
    COALESCE(hypothesis_who, '') || ' will ' || 
    COALESCE(hypothesis_will_do, '') || ' because ' || 
    COALESCE(hypothesis_because, '') || ' measured by ' || 
    COALESCE(hypothesis_measured_by, '')
  ) STORED,
  
  -- Variable isolation
  variable_changed text,
  prior_variable text,  -- from previous cycle
  
  -- Pretotype
  pretotype_method text,
  pretotype_artifact_url text,
  pretotype_description text,
  
  -- Synthesis
  synthesis_result text CHECK (synthesis_result IN ('confirmed', 'killed', 'unclear')),
  synthesis_what_changed text,
  synthesis_honest_wrongness text,  -- "what we were wrong about"
  
  -- Scoring (AI + mentor)
  ai_score jsonb,  -- { hypothesis_quality: 3, variable_isolation: 2, ... }
  mentor_score jsonb,
  mentor_notes text,
  
  -- Timestamps
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  
  UNIQUE (team_id, cycle_number),
  
  -- Ensure cycles are sequential per team
  CONSTRAINT valid_cycle_sequence CHECK (
    cycle_number = 1 OR EXISTS (
      SELECT 1 FROM hackathon_phase3_cycles c2
      WHERE c2.team_id = hackathon_phase3_cycles.team_id
        AND c2.cycle_number = hackathon_phase3_cycles.cycle_number - 1
    )
  )
);

CREATE INDEX idx_phase3_cycles_team ON hackathon_phase3_cycles(team_id);
CREATE INDEX idx_phase3_cycles_status ON hackathon_phase3_cycles(status);

-- ------------------------------------------------------------
-- 3. CYCLE STEPS (Individual step submissions)
-- ------------------------------------------------------------

-- Each cycle has 4 steps. Each step submission is a row here.
-- This maps to Phase 2's assessment submission model but per-cycle.

CREATE TABLE hackathon_phase3_cycle_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES hackathon_phase3_cycles(id) ON DELETE CASCADE,
  
  -- Step type
  step_type text NOT NULL CHECK (step_type IN ('hypothesis', 'pretotype', 'test_session', 'synthesis')),
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'ai_reviewed', 'mentor_reviewed', 'locked')),
  
  -- Submission data (varies by step_type)
  submission_data jsonb NOT NULL DEFAULT '{}',
  
  -- Examples of submission_data by step_type:
  -- hypothesis: { who, will_do, because, measured_by, discord_ritual_post_id }
  -- pretotype: { method, variable_changed, artifact_url, description }
  -- test_session: { sessions: [{ tester_name, role, fresh_tester, behavior_log, clip_url, result }] }
  -- synthesis: { result, what_changed, next_variable, gate_decision }
  
  -- AI feedback (real-time coaching)
  ai_feedback jsonb,  -- { flags: [...], response: "...", linked_module: "..." }
  ai_feedback_at timestamptz,
  
  -- Mentor override
  mentor_override boolean DEFAULT false,
  mentor_override_reason text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  locked_at timestamptz,  -- when cycle moves to next step or closes
  
  UNIQUE (cycle_id, step_type)
);

CREATE INDEX idx_cycle_steps_cycle ON hackathon_phase3_cycle_steps(cycle_id);
CREATE INDEX idx_cycle_steps_type ON hackathon_phase3_cycle_steps(step_type);

-- ------------------------------------------------------------
-- 4. TEST SESSIONS (Detailed behavior logs)
-- ------------------------------------------------------------

-- One row per user test session. Linked to cycle_steps (test_session type).

CREATE TABLE hackathon_phase3_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_step_id uuid NOT NULL REFERENCES hackathon_phase3_cycle_steps(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  cycle_number int NOT NULL,
  
  -- Tester info
  tester_name text NOT NULL,
  tester_role text,
  tester_contact text,
  tester_channel text CHECK (tester_channel IN ('in_person', 'zoom', 'phone', 'line', 'other')),
  
  -- Freshness check
  fresh_tester boolean NOT NULL DEFAULT true,
  fresh_override_reason text,  -- if override needed
  
  -- Session details
  session_date date NOT NULL,
  session_duration_min int,
  
  -- Behavior log (timed intervals)
  behavior_log jsonb NOT NULL DEFAULT '[]',
  -- Format: [{ interval: "0:00-0:30", action: "...", surprise: false }, ...]
  
  -- Unprompted quotes
  unprompted_quotes text[],
  
  -- Painful detail / surprise
  painful_detail text,
  
  -- Hypothesis result for this session
  session_result text CHECK (session_result IN ('confirmed', 'killed', 'unclear')),
  
  -- Media
  clip_url text,
  screenshot_urls text[],
  
  -- AI analysis
  ai_behavior_quality jsonb,  -- { opinion_words_found: [...], suggestion: "..." }
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_sessions_team ON hackathon_phase3_test_sessions(team_id);
CREATE INDEX idx_test_sessions_cycle ON hackathon_phase3_test_sessions(cycle_number);
CREATE INDEX idx_test_sessions_fresh ON hackathon_phase3_test_sessions(fresh_tester) WHERE fresh_tester = true;

-- Fresh-tester cross-check helper
CREATE OR REPLACE FUNCTION is_fresh_tester(p_team_id uuid, p_tester_name text, p_cycle_number int)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM hackathon_phase3_test_sessions ts
    WHERE ts.team_id = p_team_id
      AND ts.tester_name = p_tester_name
      AND ts.cycle_number < p_cycle_number
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ------------------------------------------------------------
-- 5. DAILY CHECK-INS (10-day system)
-- ------------------------------------------------------------

CREATE TABLE hackathon_phase3_daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  
  day_number int NOT NULL CHECK (day_number BETWEEN 1 AND 10),
  
  -- Cycle context
  current_cycle_number int,
  current_cycle_state text,
  
  -- Form fields
  current_hypothesis text,
  variable_changed text,
  test_sessions_today int DEFAULT 0,
  
  -- AI feedback
  ai_feedback jsonb,
  ai_feedback_at timestamptz,
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'late', 'excused')),
  
  -- Due date tracking
  due_at timestamptz NOT NULL,
  submitted_at timestamptz,
  late_reason text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (team_id, day_number)
);

CREATE INDEX idx_daily_checkins_team ON hackathon_phase3_daily_checkins(team_id);
CREATE INDEX idx_daily_checkins_status ON hackathon_phase3_daily_checkins(status);

-- ------------------------------------------------------------
-- 6. MID-PHASE SYNTHESIS (Day 6 checkpoint)
-- ------------------------------------------------------------

CREATE TABLE hackathon_phase3_midphase_synthesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  
  -- Auto-generated draft
  auto_draft text,
  auto_draft_generated_at timestamptz,
  
  -- Team edited version
  what_learned text,
  what_changed text,
  what_wrong text,
  next_hypothesis text,
  pretotype_state_url text,
  confidence_score int CHECK (confidence_score BETWEEN 1 AND 10),
  
  -- AI scoring
  ai_score jsonb,  -- { pattern_detection: 3, wrongness_honesty: 2, evidence_specificity: 3 }
  ai_suggested_pattern text,
  
  -- Mentor follow-up
  mentor_scheduled boolean DEFAULT false,
  mentor_meeting_at timestamptz,
  mentor_notes text,
  
  -- Public posting
  discord_post_id text,
  posted_at timestamptz,
  
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'scored', 'mentor_reviewed')),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  
  UNIQUE (team_id)
);

-- ------------------------------------------------------------
-- 7. PUBLIC HYPOTHESIS RITUAL (Discord pre-registration)
-- ------------------------------------------------------------

CREATE TABLE hackathon_phase3_ritual_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  cycle_number int NOT NULL,
  
  -- Discord
  discord_channel_id text,
  discord_message_id text,
  discord_thread_id text,
  posted_at timestamptz,
  
  -- Hypothesis content
  hypothesis_full text NOT NULL,
  
  -- Pre-registration enforcement
  pre_test boolean NOT NULL DEFAULT true,  -- posted BEFORE test session?
  test_sessions_after int DEFAULT 0,  -- how many sessions logged after this post
  
  -- AI quality check
  ai_quality_score jsonb,
  ai_reply_discord_id text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (team_id, cycle_number)
);

CREATE INDEX idx_ritual_posts_team ON hackathon_phase3_ritual_posts(team_id);

-- ------------------------------------------------------------
-- 8. MODULE PROGRESS (App learning block)
-- ------------------------------------------------------------

CREATE TABLE hackathon_phase3_module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  
  module_number int NOT NULL CHECK (module_number BETWEEN 1 AND 9),
  
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
  
  -- Interactive check results
  quiz_answers jsonb,
  quiz_score int,
  quiz_passed boolean,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (participant_id, module_number)
);

-- ------------------------------------------------------------
-- 9. ROUND 1 VIDEO (Storyboard + submission)
-- ------------------------------------------------------------

CREATE TABLE hackathon_phase3_video_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  
  -- Storyboard sections (auto-assembled + team edited)
  storyboard jsonb NOT NULL DEFAULT '[]',
  -- Format: [
  --   { section: "problem", content: "...", media_url: "...", voiceover_url: "..." },
  --   { section: "cycle_1", hypothesis: "...", clip_url: "...", result: "..." },
  --   ...
  -- ]
  
  -- Final video
  video_url text,
  video_duration_sec int,
  video_file_size_mb numeric,
  
  -- Hard gate checklist
  hard_gates jsonb,  -- { user_clips_count: 2, clip_duration_ok: true, captions_present: true, wrongness_present: true, iteration_arc_visible: true }
  
  -- Soft gate checklist
  soft_gates jsonb,
  
  -- AI grading pipeline
  ai_extractor_output jsonb,    -- Pass 1
  ai_scrutinizer_output jsonb,  -- Pass 2
  ai_suspicion_score int,
  
  -- Human review
  human_review_status text DEFAULT 'pending' CHECK (human_review_status IN ('pending', 'flagged', 'cleared', 'reviewed')),
  human_reviewer_notes text,
  
  -- Final scores
  judge_scores jsonb,  -- { problem_statement: 85, solution_effectiveness: 90, ... }
  
  -- Submission tracking
  submitted_at timestamptz,
  confirmed_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (team_id)
);

-- ------------------------------------------------------------
-- 10. MENTOR DIGEST (Daily organizer summary)
-- ------------------------------------------------------------

CREATE TABLE hackathon_phase3_mentor_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date date NOT NULL UNIQUE,
  
  -- Summary data
  teams_attention jsonb,     -- [{ team_id, flags_count, reason }]
  teams_progressing jsonb,   -- [{ team_id, highlight }]
  leaderboard_snapshot jsonb,
  new_suspicion_flags jsonb, -- [{ team_id, suspicion_type }]
  action_queue jsonb,        -- [{ action, team_id, priority }]
  
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- ============================================================
-- VIEWS (For queries and leaderboards)
-- ============================================================

-- Cycle completion leaderboard
CREATE VIEW phase3_leaderboard_cycles AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  COUNT(DISTINCT c.cycle_number) AS cycles_completed,
  COUNT(DISTINCT ts.tester_name) AS distinct_testers,
  COUNT(DISTINCT ts.id) FILTER (WHERE ts.fresh_tester) AS fresh_testers,
  COUNT(DISTINCT rp.id) AS hypotheses_preregistered,
  MAX(ms.submitted_at) AS synthesis_submitted_at,
  MAX(vs.submitted_at) AS video_submitted_at
FROM hackathon_teams t
LEFT JOIN hackathon_phase3_cycles c ON c.team_id = t.id AND c.status = 'completed'
LEFT JOIN hackathon_phase3_test_sessions ts ON ts.team_id = t.id
LEFT JOIN hackathon_phase3_ritual_posts rp ON rp.team_id = t.id
LEFT JOIN hackathon_phase3_midphase_synthesis ms ON ms.team_id = t.id
LEFT JOIN hackathon_phase3_video_submissions vs ON vs.team_id = t.id
GROUP BY t.id, t.name;

-- Funnel view: where teams are stuck
CREATE VIEW phase3_funnel AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  MAX(c.cycle_number) AS current_cycle,
  MAX(c.status) AS current_status,
  MAX(c.gate_decision) AS last_gate_decision,
  COUNT(DISTINCT dc.id) FILTER (WHERE dc.status = 'submitted') AS checkins_submitted,
  COUNT(DISTINCT ts.id) AS total_test_sessions,
  COUNT(DISTINCT ts.id) FILTER (WHERE ts.fresh_tester) AS fresh_test_sessions,
  MAX(ms.confidence_score) AS confidence,
  CASE
    WHEN MAX(vs.submitted_at) IS NOT NULL THEN 'submitted'
    WHEN MAX(c.cycle_number) >= 2 THEN 'proceeding'
    WHEN MAX(c.cycle_number) = 1 THEN 'in_cycle_1'
    ELSE 'not_started'
  END AS funnel_stage
FROM hackathon_teams t
LEFT JOIN hackathon_phase3_cycles c ON c.team_id = t.id
LEFT JOIN hackathon_phase3_daily_checkins dc ON dc.team_id = t.id
LEFT JOIN hackathon_phase3_test_sessions ts ON ts.team_id = t.id
LEFT JOIN hackathon_phase3_midphase_synthesis ms ON ms.team_id = t.id
LEFT JOIN hackathon_phase3_video_submissions vs ON vs.team_id = t.id
GROUP BY t.id, t.name;

-- ============================================================
-- PHASE 3 ACTIVITY SEED DATA
-- ============================================================

-- Insert Phase 3 program phase (replace with actual program_id)
-- INSERT INTO hackathon_program_phases (id, program_id, title, phase_number, ...)
-- VALUES ('f3000000-0000-0000-0000-000000000003', ...);

-- Insert Phase 3 activities (workspace structure)
-- These map to the 4 interactive steps in the cycle workspace

-- INSERT INTO hackathon_phase_activities (
--   id, phase_id, title, instructions, display_order, 
--   activity_type, cycle_aware, max_cycles, is_draft
-- ) VALUES
-- ('p3a00001-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000003', 
--  'Step 1: Write Your Hypothesis', 
--  'Produce a testable hypothesis with WHO+WILL DO+BECAUSE+MEASURED BY. AI coach validates live.',
--  1, 'loop_step', true, null, false),
-- ('p3a00002-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000003', 
--  'Step 2: Build Your Pretotype', 
--  'Choose a method, isolate ONE variable, upload your artifact.',
--  2, 'loop_step', true, null, false),
-- ('p3a00003-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000003', 
--  'Step 3: Test With Real Users', 
--  'Log behavioral evidence. Capture what users DO, not what they say.',
--  3, 'loop_step', true, null, false),
-- ('p3a00004-0000-0000-0000-000000000004', 'f3000000-0000-0000-0000-000000000003', 
--  'Step 4: Synthesize + Choose Gate', 
--  'Honest synthesis. Decide: Refine, Proceed, or Kill.',
--  4, 'loop_step', true, null, false),
-- ('p3a00005-0000-0000-0000-000000000005', 'f3000000-0000-0000-0000-000000000003', 
--  'Mid-Phase Synthesis (Day 6)', 
--  'Auto-generated from your cycles. Edit and own it.',
--  5, 'checkpoint', false, null, false),
-- ('p3a00006-0000-0000-0000-000000000006', 'f3000000-0000-0000-0000-000000000003', 
--  'Round 1 Video Assembly', 
--  'Auto-assembled from your workspace. Edit, narrate, submit.',
--  6, 'workspace', false, null, false);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get team's current cycle (latest active or most recent)
CREATE OR REPLACE FUNCTION get_team_current_cycle(p_team_id uuid)
RETURNS TABLE (
  cycle_number int,
  status text,
  step_type text,
  step_status text
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_cycle AS (
    SELECT * FROM hackathon_phase3_cycles
    WHERE team_id = p_team_id
    ORDER BY cycle_number DESC
    LIMIT 1
  )
  SELECT
    lc.cycle_number,
    lc.status,
    COALESCE(cs.step_type, 'hypothesis'),
    COALESCE(cs.status, 'draft')
  FROM latest_cycle lc
  LEFT JOIN hackathon_phase3_cycle_steps cs ON cs.cycle_id = lc.id
    AND cs.step_type = (
      SELECT step_type FROM hackathon_phase3_cycle_steps
      WHERE cycle_id = lc.id AND status != 'locked'
      ORDER BY 
        CASE step_type
          WHEN 'hypothesis' THEN 1
          WHEN 'pretotype' THEN 2
          WHEN 'test_session' THEN 3
          WHEN 'synthesis' THEN 4
        END
      LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Start a new cycle for a team
CREATE OR REPLACE FUNCTION start_phase3_cycle(p_team_id uuid, p_program_phase_id uuid)
RETURNS uuid AS $$
DECLARE
  v_next_cycle int;
  v_new_cycle_id uuid;
BEGIN
  SELECT COALESCE(MAX(cycle_number), 0) + 1
  INTO v_next_cycle
  FROM hackathon_phase3_cycles
  WHERE team_id = p_team_id;
  
  INSERT INTO hackathon_phase3_cycles (team_id, program_phase_id, cycle_number)
  VALUES (p_team_id, p_program_phase_id, v_next_cycle)
  RETURNING id INTO v_new_cycle_id;
  
  RETURN v_new_cycle_id;
END;
$$ LANGUAGE plpgsql;

-- Get cycle scorecard
CREATE OR REPLACE FUNCTION get_cycle_scorecard(p_cycle_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'hypothesis_quality', COALESCE((ai_score->>'hypothesis_quality')::int, 0),
    'variable_isolation', COALESCE((ai_score->>'variable_isolation')::int, 0),
    'behavioral_evidence', COALESCE((ai_score->>'behavioral_evidence')::int, 0),
    'tester_freshness', COALESCE((ai_score->>'tester_freshness')::int, 0),
    'synthesis_honesty', COALESCE((ai_score->>'synthesis_honesty')::int, 0),
    'total', COALESCE((ai_score->>'hypothesis_quality')::int, 0) +
             COALESCE((ai_score->>'variable_isolation')::int, 0) +
             COALESCE((ai_score->>'behavioral_evidence')::int, 0) +
             COALESCE((ai_score->>'tester_freshness')::int, 0) +
             COALESCE((ai_score->>'synthesis_honesty')::int, 0)
  )
  INTO v_result
  FROM hackathon_phase3_cycles
  WHERE id = p_cycle_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Data Flow: Phase 2 vs Phase 3

### Phase 2 (Linear)

```
User opens Activity 1
  → Content blocks render (chat_comic, video)
  → User reads
  → User submits assessment (text_answer)
  → Mentor reviews later
  → Gate opens Activity 2
```

### Phase 3 (Loop)

```
User opens Cycle Workspace
  → Step 1: Hypothesis Form renders (interactive_form content type)
    → AI checks live (60 sec)
    → Submit → Discord ritual post → unlocks Step 2
  → Step 2: Pretotype Form renders (template content type)
    → Variable isolator compares to prior cycle
    → Submit → unlocks Step 3
  → Step 3: Test Capture renders (interactive_form with timer)
    → Fresh-tester check runs (is_fresh_tester function)
    → AI converts opinions to behaviors
    → Submit → unlocks Step 4
  → Step 4: Synthesize renders (auto_draft content type)
    → Auto-populated from Steps 1–3
    → AI blocks Proceed if no learning
    → Gate decision: Refine / Proceed / Kill
      → Refine: start_cycle() → new cycle workspace
      → Proceed: video assembly opens
      → Kill: exit survey
```

---

## Content Block Mapping

| Phase 2 content_type | Phase 3 content_type | Purpose |
|---------------------|---------------------|---------|
| `chat_comic` | `chat_comic` | Static intro content (e.g., "Shut up and watch" comic) |
| `video` | `video` | Workshop clips, demo videos |
| `text` | `text` | Static instructions, sticky phrases |
| `image` | `image` | Diagrams, method picker cards |
| — | `template` | Prefilled forms with placeholders (e.g., hypothesis builder) |
| — | `auto_draft` | AI-generated drafts team edits (mid-phase synthesis) |
| — | `interactive_form` | Live-validated forms with AI coach (hypothesis, test capture) |

### Assessment Mapping

| Phase 2 metadata | Phase 3 metadata | Example |
|------------------|----------------|---------|
| `prompt` | `prompt` | "What is your hypothesis?" |
| `placeholder` | `placeholder` | "We believe [WHO] will..." |
| `submission_label` | `submission_label` | "สมมติฐาน", "Behavior Log" |
| `min_words` | `min_words` | 20 |
| — | `thread` | `test_results`, `synthesis`, `gate_decision` |
| — | `rubric_focus` | `["behavioral_observation", "variable_isolation"]` |
| — | `decision_options` | `["refine", "proceed", "kill"]` |
| `is_group_submission` | `is_group_submission` | true (team scope) |
| — | `ai_flags` | `["opinion_detected", "missing_threshold"]` |
| — | `linked_module` | `"module_2_hypothesis_writing"` |

---

## API Patterns

### Fetch Phase 3 Workspace (adapted from Phase 2 pattern)

```typescript
// Phase 2 pattern:
// const phase2 = await getPhaseWithActivities('f1000000-0000-0000-0000-000000000020');
// phase2.activities[].content[]    → chat comic messages
// phase2.activities[].assessments[] → prompts, rubrics

// Phase 3 equivalent:
// const workspace = await getPhase3Workspace(teamId);
// workspace.currentCycle → cycle_number, status, step
// workspace.tracker → all cycles with hypotheses + results
// workspace.steps[].content[] → templates, auto_drafts, interactive_forms
// workspace.steps[].assessments[] → prompts with live AI validation

interface Phase3Workspace {
  teamId: string;
  currentCycle: {
    cycleNumber: number;
    status: 'planning' | 'testing' | 'synthesizing' | 'completed';
    activeStep: 'hypothesis' | 'pretotype' | 'test_session' | 'synthesis';
  };
  tracker: Array<{
    cycleNumber: number;
    hypothesis: string;
    result: 'confirmed' | 'killed' | 'unclear';
    variableChanged: string;
    score: number;
  }>;
  steps: Array<{
    stepType: string;
    status: 'draft' | 'submitted' | 'locked';
    content: ActivityContent[];      // templates, auto_drafts
    assessments: ActivityAssessment[]; // prompts with rubric_focus
    aiFeedback?: AICoachResponse;
  }>;
}
```

---

## Files Referenced

- `20260401000000_hackathon_phase_activities.sql` — Phase 2 base schema
- `docs/specs/phase3/_loop-interactive.md` — State machine, cycle rules
- `docs/specs/phase3/activity-cycle-workspace.md` — Step 1–4 UI fields
- `docs/specs/phase3/activity-mid-phase-synthesis.md` — Auto-generation logic
- `docs/specs/phase3/activity-round-1-video.md` — Storyboard assembly
- `docs/specs/phase3/ai-mentor-prompts.md` — Flag triggers
- `docs/specs/phase3/daily-system.md` — Check-in schema (overlaps)

---

## Migration Order

1. Run this migration (additive, no data loss)
2. Seed Phase 3 activities into `hackathon_phase_activities`
3. Seed content blocks (templates, interactive forms)
4. Seed assessments with Phase 3 rubric metadata
5. Test with one team: full cycle → synthesis → video
6. Open to all teams
