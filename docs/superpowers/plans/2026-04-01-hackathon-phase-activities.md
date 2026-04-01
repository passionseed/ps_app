# Hackathon Phase Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct activity content to `hackathon_program_phases` — a PathLab-like activity system without the day layer — so the hackathon home screen can display phase activities with content and submission tracking.

**Architecture:** Add a `due_at` column to the existing `hackathon_program_phases` table. Create three new tables (`hackathon_phase_activities`, `hackathon_phase_activity_content`, `hackathon_phase_activity_assessments`) mirroring `path_activities`, `path_content`, and `path_assessments` but referencing `hackathon_program_phases` directly. Progress is tracked per individual participant and per team via existing `hackathon_activity_individual_submissions` / `hackathon_activity_team_submissions` tables (extend them to reference the new activity table). Add TypeScript types and API functions in the app.

**Tech Stack:** Supabase (PostgreSQL), TypeScript, Expo Router (React Native app), pnpm

---

## File Structure

### New files
- `supabase/migrations/20260401000000_hackathon_phase_activities.sql` — all schema changes (web project)
- `types/hackathon-phase-activity.ts` — TypeScript types for the new tables (app project)
- `lib/hackathonPhaseActivity.ts` — API fetch functions for phase activities (app project)

### Modified files
- `types/hackathon-program.ts` — add `due_at` to `HackathonProgramPhase` interface
- `supabase/seed/hackathon_customer_discovery_phase1.sql` — seed sample phase activities

---

## Task 1: Database migration

**Files:**
- Create: `/Users/pine/Documents/web/supabase/migrations/20260401000000_hackathon_phase_activities.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Hackathon Phase Activities
-- Adds direct activity content to hackathon phases (PathLab without the day layer)

-- 1. Add due_at to phases
ALTER TABLE public.hackathon_program_phases
  ADD COLUMN IF NOT EXISTS due_at timestamptz;

COMMENT ON COLUMN public.hackathon_program_phases.due_at IS 'Deadline for completing this phase';

-- 2. Phase activities (mirrors path_activities, references phase instead of path_day)
CREATE TABLE IF NOT EXISTS public.hackathon_phase_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.hackathon_program_phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  display_order int NOT NULL DEFAULT 0,
  estimated_minutes int,
  is_required boolean NOT NULL DEFAULT true,
  is_draft boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (phase_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_activities_phase
  ON public.hackathon_phase_activities(phase_id, display_order);

COMMENT ON TABLE public.hackathon_phase_activities IS 'Activities within a hackathon phase, analogous to path_activities without the day layer';

-- 3. Activity content (mirrors path_content)
CREATE TABLE IF NOT EXISTS public.hackathon_phase_activity_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN (
    'video', 'short_video', 'canva_slide', 'text', 'image', 'pdf', 'ai_chat', 'npc_chat'
  )),
  content_title text,
  content_url text,
  content_body text,
  display_order int NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (activity_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_activity_content_activity
  ON public.hackathon_phase_activity_content(activity_id, display_order);

COMMENT ON TABLE public.hackathon_phase_activity_content IS 'Content items for hackathon phase activities. For video/short_video, URL goes in content_url.';

-- 4. Activity assessments (mirrors path_assessments)
CREATE TABLE IF NOT EXISTS public.hackathon_phase_activity_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'text_answer', 'file_upload', 'image_upload'
  )),
  points_possible int,
  is_graded boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One assessment per activity
  UNIQUE (activity_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_activity_assessments_activity
  ON public.hackathon_phase_activity_assessments(activity_id);

COMMENT ON TABLE public.hackathon_phase_activity_assessments IS 'Submission definitions for hackathon phase activities. One per activity max.';

-- 5. Updated_at triggers
DROP TRIGGER IF EXISTS hackathon_phase_activities_handle_updated_at ON public.hackathon_phase_activities;
CREATE TRIGGER hackathon_phase_activities_handle_updated_at
  BEFORE UPDATE ON public.hackathon_phase_activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS hackathon_phase_activity_assessments_handle_updated_at ON public.hackathon_phase_activity_assessments;
CREATE TRIGGER hackathon_phase_activity_assessments_handle_updated_at
  BEFORE UPDATE ON public.hackathon_phase_activity_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Extend individual submissions to also reference phase activities
--    (nullable — existing rows reference hackathon_phase_modules, new rows reference hackathon_phase_activities)
ALTER TABLE public.hackathon_activity_individual_submissions
  ADD COLUMN IF NOT EXISTS phase_activity_id uuid REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE;

ALTER TABLE public.hackathon_activity_team_submissions
  ADD COLUMN IF NOT EXISTS phase_activity_id uuid REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hackathon_individual_submissions_phase_activity
  ON public.hackathon_activity_individual_submissions(phase_activity_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_submissions_phase_activity
  ON public.hackathon_activity_team_submissions(phase_activity_id);
```

- [ ] **Step 2: Apply migration to local Supabase**

From `/Users/pine/Documents/web`:
```bash
npx supabase db push
```
Expected: migration applies with no errors.

- [ ] **Step 3: Verify tables exist**

```bash
npx supabase db diff --linked | head -5
# Should show nothing new (already applied)
```

Or check directly:
```bash
npx supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres --no-seed 2>/dev/null || \
psql postgresql://postgres:postgres@localhost:54322/postgres -c "\dt hackathon_phase_act*"
```
Expected output includes: `hackathon_phase_activities`, `hackathon_phase_activity_content`, `hackathon_phase_activity_assessments`

- [ ] **Step 4: Commit**

```bash
cd /Users/pine/Documents/web
git add supabase/migrations/20260401000000_hackathon_phase_activities.sql
git commit -m "feat: add hackathon phase activities schema (PathLab without day layer)"
```

---

## Task 2: TypeScript types (app)

**Files:**
- Create: `/Users/pine/Documents/app_ps/ps_app/types/hackathon-phase-activity.ts`
- Modify: `/Users/pine/Documents/app_ps/ps_app/types/hackathon-program.ts`

- [ ] **Step 1: Create types file**

Create `/Users/pine/Documents/app_ps/ps_app/types/hackathon-phase-activity.ts`:

```typescript
export type HackathonPhaseActivityContentType =
  | 'video'
  | 'short_video'
  | 'canva_slide'
  | 'text'
  | 'image'
  | 'pdf'
  | 'ai_chat'
  | 'npc_chat';

export type HackathonPhaseActivityAssessmentType =
  | 'text_answer'
  | 'file_upload'
  | 'image_upload';

export interface HackathonPhaseActivity {
  id: string;
  phase_id: string;
  title: string;
  instructions: string | null;
  display_order: number;
  estimated_minutes: number | null;
  is_required: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface HackathonPhaseActivityContent {
  id: string;
  activity_id: string;
  content_type: HackathonPhaseActivityContentType;
  content_title: string | null;
  content_url: string | null;
  content_body: string | null;
  display_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HackathonPhaseActivityAssessment {
  id: string;
  activity_id: string;
  assessment_type: HackathonPhaseActivityAssessmentType;
  points_possible: number | null;
  is_graded: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Full activity with content and optional assessment — used for home screen display */
export interface HackathonPhaseActivityDetail extends HackathonPhaseActivity {
  content: HackathonPhaseActivityContent[];
  assessment: HackathonPhaseActivityAssessment | null;
}

/** Phase with its activities — used for home screen */
export interface HackathonPhaseWithActivities {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  description: string | null;
  phase_number: number;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  activities: HackathonPhaseActivityDetail[];
}
```

- [ ] **Step 2: Add `due_at` to existing `HackathonProgramPhase` type**

In `/Users/pine/Documents/app_ps/ps_app/types/hackathon-program.ts`, find the `HackathonProgramPhase` interface and add the field:

```typescript
// Before:
export interface HackathonProgramPhase {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  description: string | null;
  phase_number: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// After:
export interface HackathonProgramPhase {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  description: string | null;
  phase_number: number;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pine/Documents/app_ps/ps_app
pnpm tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to the new types.

- [ ] **Step 4: Commit**

```bash
git add types/hackathon-phase-activity.ts types/hackathon-program.ts
git commit -m "feat: add TypeScript types for hackathon phase activities"
```

---

## Task 3: API functions (app)

**Files:**
- Create: `/Users/pine/Documents/app_ps/ps_app/lib/hackathonPhaseActivity.ts`

- [ ] **Step 1: Create the API lib file**

Create `/Users/pine/Documents/app_ps/ps_app/lib/hackathonPhaseActivity.ts`:

```typescript
import type {
  HackathonPhaseWithActivities,
  HackathonPhaseActivityDetail,
} from "../types/hackathon-phase-activity";

async function getSupabaseClient() {
  const mod = await import("./supabase");
  return mod.supabase;
}

/**
 * Fetch a single phase with all its activities (content + assessments).
 * Used for the hackathon home screen phase card.
 */
export async function getPhaseWithActivities(
  phaseId: string
): Promise<HackathonPhaseWithActivities | null> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("hackathon_program_phases")
    .select(`
      id,
      program_id,
      slug,
      title,
      description,
      phase_number,
      starts_at,
      ends_at,
      due_at,
      hackathon_phase_activities (
        id,
        phase_id,
        title,
        instructions,
        display_order,
        estimated_minutes,
        is_required,
        is_draft,
        created_at,
        updated_at,
        hackathon_phase_activity_content (
          id,
          activity_id,
          content_type,
          content_title,
          content_url,
          content_body,
          display_order,
          metadata,
          created_at
        ),
        hackathon_phase_activity_assessments (
          id,
          activity_id,
          assessment_type,
          points_possible,
          is_graded,
          metadata,
          created_at,
          updated_at
        )
      )
    `)
    .eq("id", phaseId)
    .single();

  if (error || !data) return null;

  const activities: HackathonPhaseActivityDetail[] = (
    (data.hackathon_phase_activities as any[]) ?? []
  )
    .filter((a) => !a.is_draft)
    .sort((a, b) => a.display_order - b.display_order)
    .map((a) => ({
      ...a,
      content: (a.hackathon_phase_activity_content ?? []).sort(
        (x: any, y: any) => x.display_order - y.display_order
      ),
      assessment: a.hackathon_phase_activity_assessments?.[0] ?? null,
    }));

  return {
    id: data.id,
    program_id: data.program_id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    phase_number: data.phase_number,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    due_at: (data as any).due_at ?? null,
    activities,
  };
}

/**
 * Fetch all phases for a program that have at least one activity.
 * Used to render the home screen phase list.
 */
export async function getProgramPhasesWithActivities(
  programId: string
): Promise<HackathonPhaseWithActivities[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("hackathon_program_phases")
    .select(`
      id,
      program_id,
      slug,
      title,
      description,
      phase_number,
      starts_at,
      ends_at,
      due_at,
      hackathon_phase_activities (
        id,
        phase_id,
        title,
        instructions,
        display_order,
        estimated_minutes,
        is_required,
        is_draft,
        created_at,
        updated_at,
        hackathon_phase_activity_content (
          id,
          activity_id,
          content_type,
          content_title,
          content_url,
          content_body,
          display_order,
          metadata,
          created_at
        ),
        hackathon_phase_activity_assessments (
          id,
          activity_id,
          assessment_type,
          points_possible,
          is_graded,
          metadata,
          created_at,
          updated_at
        )
      )
    `)
    .eq("program_id", programId)
    .order("phase_number");

  if (error || !data) return [];

  return data.map((phase) => {
    const activities: HackathonPhaseActivityDetail[] = (
      (phase.hackathon_phase_activities as any[]) ?? []
    )
      .filter((a) => !a.is_draft)
      .sort((a, b) => a.display_order - b.display_order)
      .map((a) => ({
        ...a,
        content: (a.hackathon_phase_activity_content ?? []).sort(
          (x: any, y: any) => x.display_order - y.display_order
        ),
        assessment: a.hackathon_phase_activity_assessments?.[0] ?? null,
      }));

    return {
      id: phase.id,
      program_id: phase.program_id,
      slug: phase.slug,
      title: phase.title,
      description: phase.description,
      phase_number: phase.phase_number,
      starts_at: phase.starts_at,
      ends_at: phase.ends_at,
      due_at: (phase as any).due_at ?? null,
      activities,
    };
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pine/Documents/app_ps/ps_app
pnpm tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hackathonPhaseActivity.ts
git commit -m "feat: add hackathon phase activity API functions"
```

---

## Task 4: Seed sample data

**Files:**
- Modify: `/Users/pine/Documents/app_ps/ps_app/supabase/seed/hackathon_customer_discovery_phase1.sql`

- [ ] **Step 1: Add sample activities to Phase 1**

Append to the bottom of `supabase/seed/hackathon_customer_discovery_phase1.sql`:

```sql
-- Phase 1 activities (direct activity list, no day layer)
-- due_at for phase 1
UPDATE public.hackathon_program_phases
SET due_at = '2026-04-26T23:59:59Z'
WHERE id = 'f1000000-0000-0000-0000-000000000010';

-- Activity 1: Watch intro video
INSERT INTO public.hackathon_phase_activities (
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
) VALUES (
  'fa000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000010',
  'Customer Discovery Overview',
  'Watch this short video to understand what customer discovery means and why it matters.',
  0, 5, true, false
) ON CONFLICT (phase_id, display_order) DO NOTHING;

INSERT INTO public.hackathon_phase_activity_content (
  id, activity_id, content_type, content_title, content_url, display_order
) VALUES (
  'fb000000-0000-0000-0000-000000000001',
  'fa000000-0000-0000-0000-000000000001',
  'video',
  'What is Customer Discovery?',
  'https://www.youtube.com/watch?v=IVhPCOKu7Rs',
  0
) ON CONFLICT (activity_id, display_order) DO NOTHING;

-- Activity 2: Read the brief
INSERT INTO public.hackathon_phase_activities (
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
) VALUES (
  'fa000000-0000-0000-0000-000000000002',
  'f1000000-0000-0000-0000-000000000010',
  'Read the Problem Brief',
  'Read your track''s problem brief carefully before conducting interviews.',
  1, 10, true, false
) ON CONFLICT (phase_id, display_order) DO NOTHING;

INSERT INTO public.hackathon_phase_activity_content (
  id, activity_id, content_type, content_title, content_body, display_order
) VALUES (
  'fb000000-0000-0000-0000-000000000002',
  'fa000000-0000-0000-0000-000000000002',
  'text',
  'Problem Brief Guide',
  'Your goal this phase is to identify the real pain behind your track''s problem statement. Talk to at least 5 people. Ask open-ended questions. Focus on behaviors, not opinions.',
  0
) ON CONFLICT (activity_id, display_order) DO NOTHING;

-- Activity 3: Submit interview notes (individual submission)
INSERT INTO public.hackathon_phase_activities (
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
) VALUES (
  'fa000000-0000-0000-0000-000000000003',
  'f1000000-0000-0000-0000-000000000010',
  'Submit Interview Notes',
  'Conduct at least 3 customer interviews and submit your notes summarizing what you learned.',
  2, 60, true, false
) ON CONFLICT (phase_id, display_order) DO NOTHING;

INSERT INTO public.hackathon_phase_activity_assessments (
  id, activity_id, assessment_type, is_graded, metadata
) VALUES (
  'fc000000-0000-0000-0000-000000000001',
  'fa000000-0000-0000-0000-000000000003',
  'text_answer',
  false,
  '{"submission_label": "Interview Notes", "min_words": 100, "rubric": "Summarize what you heard from each interviewee. What pain points came up most?"}'::jsonb
) ON CONFLICT (activity_id) DO NOTHING;
```

- [ ] **Step 2: Apply seed to local DB**

From `/Users/pine/Documents/web`:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  < /Users/pine/Documents/app_ps/ps_app/supabase/seed/hackathon_customer_discovery_phase1.sql
```
Expected: INSERT/UPDATE statements complete without errors.

- [ ] **Step 3: Verify data**

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -c \
  "SELECT a.title, a.display_order, c.content_type, ass.assessment_type
   FROM hackathon_phase_activities a
   LEFT JOIN hackathon_phase_activity_content c ON c.activity_id = a.id
   LEFT JOIN hackathon_phase_activity_assessments ass ON ass.activity_id = a.id
   ORDER BY a.display_order;"
```
Expected: 3 rows with titles "Customer Discovery Overview", "Read the Problem Brief", "Submit Interview Notes".

- [ ] **Step 4: Commit**

```bash
cd /Users/pine/Documents/app_ps/ps_app
git add supabase/seed/hackathon_customer_discovery_phase1.sql
git commit -m "seed: add Phase 1 sample activities (video, text, submission)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Phase has `due_at` — added via `ALTER TABLE`
- ✅ Activities directly under phase (no day layer) — `hackathon_phase_activities.phase_id`
- ✅ Same content types as PathLab — mirrored enum from latest `path_content` constraint
- ✅ Same assessment types as PathLab — `text_answer`, `file_upload`, `image_upload`
- ✅ Individual + team completion — extended `hackathon_activity_individual_submissions` and `hackathon_activity_team_submissions` with `phase_activity_id`
- ✅ Used for home screen display — `getProgramPhasesWithActivities()` function ready to call

**Placeholder scan:** No TBDs, all code blocks complete.

**Type consistency:**
- `HackathonPhaseActivityDetail` uses `content: HackathonPhaseActivityContent[]` and `assessment: HackathonPhaseActivityAssessment | null` — matches what the API functions return.
- `due_at` cast as `(data as any).due_at` in API — safe until Supabase types are regenerated.
