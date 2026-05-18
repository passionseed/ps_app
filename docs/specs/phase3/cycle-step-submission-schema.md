# Phase 3 — Cycle Step submission_data JSON Schema

**Version:** 1.0  
**Date:** 2026-05-17  
**Scope:** `hackathon_phase3_cycle_steps.submission_data` column  
**Table:** `public.hackathon_phase3_cycle_steps`  

---

## Overview

The `submission_data` column is a `jsonb NOT NULL DEFAULT '{}'` blob whose shape depends on `step_type`. Each cycle has up to 5 steps. Four are stored in the DB check constraint; one (`test_run`) is used by the app but missing from the constraint.

> ⚠️ **Known mismatch:** The app writes `step_type = 'test_run'` (see `workspace.tsx` line 387), but the DB CHECK only allows `('hypothesis', 'pretotype', 'test_session', 'synthesis')`. A migration is required to add `'test_run'` to the CHECK, OR the app should fold test_run data into `test_session`.

---

## 1. hypothesis

**UI:** `HypothesisForm.tsx`  
**Step order:** 1  
**Trigger:** AI coach validates live (score ≥ 80 required to submit).  

### submission_data schema

```typescript
interface HypothesisSubmission {
  /** Specific user group being tested (e.g., "university students who commute by bus") */
  who: string;

  /** Observable action, not opinion (e.g., "complete signup without prompting") */
  will_do: string;

  /** Evidence from Phase 1 user research */
  because: string;

  /** Observable threshold with numbers (e.g., "≥4 of 5 testers will complete within 30s") */
  measured_by: string;

  /** Auto-concatenated full sentence: "{who} will {will_do} because {because} measured by {measured_by}" */
  full: string;
}
```

### JSON Schema

```json
{
  "type": "object",
  "required": ["who", "will_do", "because", "measured_by", "full"],
  "properties": {
    "who":          { "type": "string", "minLength": 1 },
    "will_do":      { "type": "string", "minLength": 1 },
    "because":      { "type": "string", "minLength": 1 },
    "measured_by":  { "type": "string", "minLength": 1 },
    "full":         { "type": "string", "minLength": 20 }
  }
}
```

### Mirror columns in `hackathon_phase3_cycles`

On submit, `lib/hackathonPhase3.ts` also writes these columns on the parent cycle:
- `hypothesis_who`
- `hypothesis_will_do`
- `hypothesis_because`
- `hypothesis_measured_by`
- `hypothesis_full` (GENERATED ALWAYS)

---

## 2. pretotype

**UI:** `PretotypeForm.tsx`  
**Step order:** 2  
**Trigger:** Submit after picking method + describing test plan. Artifact upload optional.

### submission_data schema

```typescript
interface PretotypeSubmission {
  /** One of: video_prototype | fake_door | demo | concierge | digital_mockup | physical_mockup */
  method: string;

  /** URL to uploaded artifact image/video (nullable) */
  artifact_url: string | null;

  /** How someone will interact with the pretotype */
  description: string;
}
```

### JSON Schema

```json
{
  "type": "object",
  "required": ["method", "description"],
  "properties": {
    "method":       { "type": "string", "enum": ["video_prototype","fake_door","demo","concierge","digital_mockup","physical_mockup"] },
    "artifact_url": { "type": ["string", "null"], "format": "uri" },
    "description":  { "type": "string", "minLength": 1 }
  }
}
```

### Mirror columns in `hackathon_phase3_cycles`

On submit, `lib/hackathonPhase3.ts` also writes:
- `pretotype_method`
- `variable_changed` (not collected in current PretotypeForm — gap!)
- `pretotype_artifact_url`
- `pretotype_description`

> ⚠️ **Gap:** The UI does not collect `variable_changed`. The spec says "What ONE variable does this test?" but the current form only has method + artifact + description. Need to add a `variable_changed` field to PretotypeForm.

---

## 3. test_session

**UI:** `TestCaptureForm.tsx`  
**Step order:** 3  
**Trigger:** Submit after adding ≥1 tester with name/role/habit.

### submission_data schema (current implementation)

The app currently stores a **lightweight tester roster** in `submission_data`. Detailed per-session behavior logs belong in `hackathon_phase3_test_sessions` (see below).

```typescript
interface TestSessionSubmission {
  /** Roster of testers planned for this cycle */
  testers: Array<{
    name: string;
    role: string;
    oldHabit: string;   // existing habit before test
  }>;
}
```

### JSON Schema

```json
{
  "type": "object",
  "required": ["testers"],
  "properties": {
    "testers": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name":     { "type": "string", "minLength": 1 },
          "role":     { "type": "string" },
          "oldHabit": { "type": "string" }
        }
      }
    }
  }
}
```

### Full test session data — `hackathon_phase3_test_sessions` table

The spec defines a separate table for detailed behavior logs. Each row represents one actual test session.

```typescript
interface HackathonPhase3TestSession {
  id: string;
  cycle_step_id: string;          // FK to hackathon_phase3_cycle_steps
  team_id: string;
  cycle_number: number;

  tester_name: string;
  tester_role: string | null;
  tester_contact: string | null;
  tester_channel: 'in_person' | 'zoom' | 'phone' | 'line' | 'other' | null;

  fresh_tester: boolean;
  fresh_override_reason: string | null;

  session_date: string;           // ISO date
  session_duration_min: number | null;

  behavior_log: BehaviorLogEntry[];
  unprompted_quotes: string[];
  painful_detail: string | null;
  session_result: 'confirmed' | 'killed' | 'unclear' | null;
  clip_url: string | null;
  screenshot_urls: string[] | null;
  ai_behavior_quality: {
    opinion_words_found: string[];
    suggestion: string;
  } | null;
}

interface BehaviorLogEntry {
  interval: string;   // e.g. "0:00-0:30"
  action: string;     // what the user DID
  surprise: boolean;  // was this unexpected?
}
```

> ⚠️ **Gap:** The app currently does NOT create rows in `hackathon_phase3_test_sessions`. It only stores the roster in `submission_data`. The `TestRunForm` captures observations per tester but writes them to `test_run` step, not to `test_sessions` table.

---

## 4. test_run

**UI:** `TestRunForm.tsx`  
**Step order:** 4  
**Status:** Used by app but NOT in DB CHECK constraint  
**Trigger:** Submit after logging observations per tester.

### submission_data schema

```typescript
interface TestRunSubmission {
  runs: Array<{
    name: string;
    role: string;
    oldHabit: string;
    observation: string;                     // behavioral notes
    result: 'confirmed' | 'killed' | 'unclear' | '';
  }>;
}
```

### JSON Schema

```json
{
  "type": "object",
  "required": ["runs"],
  "properties": {
    "runs": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "observation", "result"],
        "properties": {
          "name":        { "type": "string", "minLength": 1 },
          "role":        { "type": "string" },
          "oldHabit":    { "type": "string" },
          "observation": { "type": "string", "minLength": 1 },
          "result":      { "type": "string", "enum": ["confirmed", "killed", "unclear", ""] }
        }
      }
    }
  }
}
```

> ⚠️ **Fix needed:** Either:
> 1. Add `'test_run'` to the DB CHECK constraint, OR
> 2. Merge `test_run` data into `test_session` step (preferred — keeps 4-step model)

---

## 5. synthesis

**UI:** `SynthesisGate.tsx`  
**Step order:** 5 (or 4 if test_run merged)  
**Trigger:** Submit after choosing gate + writing what changed.

### submission_data schema

```typescript
interface SynthesisSubmission {
  /** What the cycle revealed that the team didn't know before */
  what_changed: string;

  /** If gate = next_cycle: the ONE variable to change */
  next_variable?: string;

  /** Gate decision (UI values; mapped to DB values on write) */
  gate_decision: 'next_cycle' | 'finish' | 'kill';
}
```

### JSON Schema

```json
{
  "type": "object",
  "required": ["what_changed", "gate_decision"],
  "properties": {
    "what_changed":   { "type": "string", "minLength": 1 },
    "next_variable":  { "type": "string" },
    "gate_decision":  { "type": "string", "enum": ["next_cycle", "finish", "kill"] }
  }
}
```

### Gate decision mapping (app → DB cycle columns)

| UI value (`submission_data`) | DB `gate_decision` | `synthesis_result` |
|---|---|---|
| `next_cycle` | `refine` | `unclear` |
| `finish` | `proceed` | `confirmed` |
| `kill` | `kill` | `killed` |

On submit, `lib/hackathonPhase3.ts` writes `gate_decision`, `synthesis_result`, and `synthesis_what_changed` to the parent `hackathon_phase3_cycles` row.

---

## Summary Table

| step_type | UI Component | Key fields in `submission_data` | Mirror cycle columns |
|---|---|---|---|
| `hypothesis` | `HypothesisForm` | `who`, `will_do`, `because`, `measured_by`, `full` | `hypothesis_*` |
| `pretotype` | `PretotypeForm` | `method`, `artifact_url`, `description` | `pretotype_*` |
| `test_session` | `TestCaptureForm` | `testers[]` | — |
| `test_run` | `TestRunForm` | `runs[]` (observation + result per tester) | — |
| `synthesis` | `SynthesisGate` | `what_changed`, `next_variable`, `gate_decision` | `gate_decision`, `synthesis_result`, `synthesis_what_changed` |

---

## Recommended Migration

To align DB with code:

```sql
-- Option A: Add test_run to CHECK (quick fix)
ALTER TABLE public.hackathon_phase3_cycle_steps
  DROP CONSTRAINT IF EXISTS hackathon_phase3_cycle_steps_step_type_check;

ALTER TABLE public.hackathon_phase3_cycle_steps
  ADD CONSTRAINT hackathon_phase3_cycle_steps_step_type_check
    CHECK (step_type IN ('hypothesis', 'pretotype', 'test_session', 'test_run', 'synthesis'));

-- Option B: Merge test_run into test_session (cleaner model)
-- 1. Remove test_run step_type values, move runs[] into test_session.submission_data.runs
-- 2. Update app step order to: hypothesis → pretotype → test_session → synthesis
```

---

## Related Files

- `supabase/migrations/20260511000000_hackathon_phase3.sql` — Base schema
- `types/hackathon-phase3.ts` — TypeScript interfaces
- `lib/hackathonPhase3.ts` — CRUD functions + mirror-column writes
- `app/(hackathon)/phase3/workspace.tsx` — Workspace orchestration
- `components/Hackathon/Phase3/HypothesisForm.tsx`
- `components/Hackathon/Phase3/PretotypeForm.tsx`
- `components/Hackathon/Phase3/TestCaptureForm.tsx`
- `components/Hackathon/Phase3/TestRunForm.tsx`
- `components/Hackathon/Phase3/SynthesisGate.tsx`
