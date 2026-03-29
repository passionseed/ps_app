# HAC-8 Customer Discovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the reusable hackathon program layer and the first shippable slice of the Phase 1 Customer Discovery playlist on top of the existing PathLab engine.

**Architecture:** Add a hackathon orchestration layer above the current PathLab data model, then extend activity and submission primitives to support individual, team, and hybrid learning flows. Keep PathLab as the execution engine for module delivery, and add only the minimum new UI needed for program navigation, team workspaces, mentor review, and AI feedback.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase, existing PathLab screens in `app/`, client helpers in `lib/`, and schema changes in `supabase/`.

---

### Task 1: Capture the current PathLab integration points

**Files:**
- Review: `app/(tabs)/discover.tsx`
- Review: `app/path/[enrollmentId].tsx`
- Review: `app/activity/[activityId].tsx`
- Review: `lib/pathlab.ts`
- Review: `lib/pathlabSession.ts`
- Review: `types/pathlab.ts`
- Review: `types/pathlab-content.ts`
- Review: `types/seeds.ts`

**Step 1: Read the discover screen**

Run: `sed -n '1,260p' 'app/(tabs)/discover.tsx'`
Expected: current seed discovery and enrollment entrypoints

**Step 2: Read the daily path screen**

Run: `sed -n '1,280p' 'app/path/[enrollmentId].tsx'`
Expected: current day bundle loading and auto-navigation to activities

**Step 3: Read the activity renderer**

Run: `sed -n '1,320p' 'app/activity/[activityId].tsx'`
Expected: current activity rendering behavior and supported activity modes

**Step 4: Read PathLab helpers and types**

Run: `sed -n '1,260p' lib/pathlab.ts`
Expected: current seed, enrollment, progress, and activity helper patterns

**Step 5: Write a short integration note into the implementation branch notes**

Document:
- where program navigation should enter
- where mixed-scope metadata is needed
- where submission state is currently too narrow

**Step 6: Commit**

```bash
git add <notes-if-any>
git commit -m "docs: capture current pathlab integration points"
```

### Task 2: Add the hackathon program schema

**Files:**
- Create: `supabase/migrations/20260329000100_create_hackathon_program_layer.sql`
- Review: existing hackathon team tables in the live schema or migration history

**Step 1: Write the migration for program orchestration**

Include tables for:
- `hackathon_programs`
- `hackathon_program_phases`
- `hackathon_phase_playlists`
- `hackathon_phase_seed_paths`
- `hackathon_team_program_enrollments`

Include:
- foreign keys to `hackathon_teams`, `seeds`, and `paths`
- phase ordering and playlist ordering
- visibility and active-state fields
- unique constraints that prevent duplicate mappings

**Step 2: Add indexes for team lookup and phase ordering**

Add indexes for:
- `hackathon_team_program_enrollments.team_id`
- `hackathon_phase_playlists.phase_id, display_order`
- `hackathon_phase_seed_paths.playlist_id, display_order`

**Step 3: Add RLS policies**

Allow:
- hackathon team members to read their program state
- service role/admin workflows to manage program content

**Step 4: Review the SQL for accidental destructive changes**

Run: `sed -n '1,260p' supabase/migrations/20260329000100_create_hackathon_program_layer.sql`
Expected: additive schema only, no destructive statements

**Step 5: Commit**

```bash
git add supabase/migrations/20260329000100_create_hackathon_program_layer.sql
git commit -m "feat(db): add hackathon program orchestration layer"
```

### Task 3: Extend PathLab activity metadata for mixed ownership

**Files:**
- Modify: `types/pathlab-content.ts`
- Modify: `lib/pathlab.ts`
- Test: `tests/pathlab-content-metadata.test.ts`

**Step 1: Write the failing type-level and helper tests**

Test for:
- accepted activity scopes
- accepted artifact kinds
- accepted gate rules
- accepted review modes
- metadata parsing helpers

**Step 2: Run the tests to verify failure**

Run: `pnpm test tests/pathlab-content-metadata.test.ts`
Expected: FAIL because new metadata types and helpers do not exist yet

**Step 3: Add the minimal types**

Add:
- `PathActivityScope`
- `PathArtifactKind`
- `PathGateRule`
- `PathReviewMode`
- metadata helpers for extracting these from activity or assessment metadata

**Step 4: Update `lib/pathlab.ts` to expose the parsed metadata**

Ensure the activity bundle returned to screens includes the new metadata in a consistent shape.

**Step 5: Run the tests again**

Run: `pnpm test tests/pathlab-content-metadata.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add types/pathlab-content.ts lib/pathlab.ts tests/pathlab-content-metadata.test.ts
git commit -m "feat(pathlab): add mixed-scope activity metadata"
```

### Task 4: Add team and individual submission schema

**Files:**
- Create: `supabase/migrations/20260329000200_create_hackathon_submissions.sql`
- Create: `types/hackathon-program.ts`

**Step 1: Write the migration for submissions**

Include additive tables for:
- `hackathon_activity_individual_submissions`
- `hackathon_activity_team_submissions`
- `hackathon_activity_ai_reviews`
- `hackathon_activity_mentor_reviews`

Fields should support:
- activity id
- team id
- participant id where applicable
- submission status
- structured JSON payloads
- file/media references
- pass/fail / revision-required states
- timestamps

**Step 2: Write TypeScript types for the new records**

Add explicit interfaces for each table and shared enum-like unions for status fields.

**Step 3: Review for overlap with `path_assessment_submissions`**

Keep `path_assessment_submissions` for generic activity completion, but use the new hackathon submission tables for evidence-heavy, collaborative workflow.

**Step 4: Commit**

```bash
git add supabase/migrations/20260329000200_create_hackathon_submissions.sql types/hackathon-program.ts
git commit -m "feat(db): add hackathon team and individual submissions"
```

### Task 5: Add a client library for the program layer

**Files:**
- Create: `lib/hackathonProgram.ts`
- Modify: `lib/pathlab.ts`
- Test: `tests/hackathon-program.test.ts`

**Step 1: Write the failing tests for program queries**

Test cases:
- load current team program
- load current phase playlist
- load module mappings
- resolve whether a team can enter a module

**Step 2: Run the tests to verify failure**

Run: `pnpm test tests/hackathon-program.test.ts`
Expected: FAIL because `lib/hackathonProgram.ts` does not exist

**Step 3: Write the minimal client library**

Add functions such as:
- `getCurrentHackathonTeamProgram`
- `getProgramPhases`
- `getPhasePlaylist`
- `getTeamModuleStatus`
- `canTeamStartModule`

Use existing `lib/pathlab.ts` patterns for Supabase retries and user-facing errors.

**Step 4: Run the tests again**

Run: `pnpm test tests/hackathon-program.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/hackathonProgram.ts lib/pathlab.ts tests/hackathon-program.test.ts
git commit -m "feat(app): add hackathon program client library"
```

### Task 6: Add the program home and phase playlist screens

**Files:**
- Create: `app/hackathon-program/index.tsx`
- Create: `app/hackathon-program/phase/[phaseId].tsx`
- Modify: `app/_layout.tsx`
- Reuse: existing visual primitives from `components/Glass/*` and `components/AppText.tsx`

**Step 1: Write the failing screen-level tests if the repo already has screen test coverage**

If there is no screen test setup, document that and skip directly to implementation with manual verification steps.

**Step 2: Add the program home screen**

Show:
- current phase
- upcoming phases
- team status summary
- current playlist CTA

**Step 3: Add the phase playlist screen**

Show:
- module list
- locked/unlocked state
- what is individual vs team
- what is blocked and why

**Step 4: Wire the routes in `app/_layout.tsx`**

Make the new program screens navigable without disturbing existing routes.

**Step 5: Run Expo typecheck / tests used in this repo**

Run: `pnpm test`
Expected: existing tests remain green, or failures are isolated and understood

**Step 6: Commit**

```bash
git add app/hackathon-program/index.tsx app/hackathon-program/phase/[phaseId].tsx app/_layout.tsx
git commit -m "feat(ui): add hackathon program and phase playlist screens"
```

### Task 7: Add the Phase 1 team workspace screen

**Files:**
- Create: `app/hackathon-program/module/[moduleId].tsx`
- Create: `components/Hackathon/TeamWorkspaceSection.tsx`
- Create: `components/Hackathon/ResponsibilityBanner.tsx`
- Create: `components/Hackathon/ProgressGateCard.tsx`

**Step 1: Build the module overview contract**

The screen must clearly show:
- the module goal
- required deliverables
- who must do what
- the unlock rule for the next step

**Step 2: Add the reusable responsibility and gate components**

These components should be used across modules, not just for HAC-8.

**Step 3: Add the team workspace surface**

Support:
- structured form sections
- read-only member evidence summary
- team synthesis inputs
- save state and submission CTA

**Step 4: Verify route navigation manually**

Run: `pnpm start`
Expected: route opens and the module screen renders without crashing

**Step 5: Commit**

```bash
git add app/hackathon-program/module/[moduleId].tsx components/Hackathon/TeamWorkspaceSection.tsx components/Hackathon/ResponsibilityBanner.tsx components/Hackathon/ProgressGateCard.tsx
git commit -m "feat(ui): add hackathon team workspace module screen"
```

### Task 8: Ship the AI pain point feedback loop

**Files:**
- Create: `supabase/functions/hackathon-pain-point-feedback/index.ts`
- Create: `lib/hackathonAi.ts`
- Modify: `app/hackathon-program/module/[moduleId].tsx`
- Test: `tests/hackathon-ai.test.ts`

**Step 1: Write the failing tests for prompt shaping and response parsing**

Test cases:
- structured prompt includes customer evidence
- invalid drafts return actionable critique fields
- passing drafts return pass state with improvement notes

**Step 2: Run the tests to confirm failure**

Run: `pnpm test tests/hackathon-ai.test.ts`
Expected: FAIL because AI helper and function do not exist

**Step 3: Add the edge function**

Return structured fields such as:
- `specificity_score`
- `evidence_score`
- `severity_score`
- `clarity_score`
- `pass_recommendation`
- `revision_notes`

**Step 4: Add the client helper**

Create a typed helper in `lib/hackathonAi.ts` for calling the edge function from the app.

**Step 5: Render the feedback loop in the module screen**

The user should be able to:
- draft
- submit for feedback
- read critique
- revise
- resubmit

**Step 6: Run the tests again**

Run: `pnpm test tests/hackathon-ai.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add supabase/functions/hackathon-pain-point-feedback/index.ts lib/hackathonAi.ts app/hackathon-program/module/[moduleId].tsx tests/hackathon-ai.test.ts
git commit -m "feat(ai): add pain point feedback loop"
```

### Task 9: Add mentor review state for real interview evidence

**Files:**
- Modify: `lib/hackathonProgram.ts`
- Modify: `app/hackathon-program/module/[moduleId].tsx`
- Modify: `types/hackathon-program.ts`

**Step 1: Add review state and retry status to the types**

Support:
- `pending_review`
- `passed`
- `revision_required`

**Step 2: Add read/write helpers**

Expose helpers for:
- fetching mentor review state
- attaching mentor comments
- marking revision required

**Step 3: Reflect this state in the module screen**

Show:
- which members are approved
- who needs to retry
- whether the team gate is still blocked

**Step 4: Verify manually**

Run: `pnpm start`
Expected: module state reflects mocked or real review data without crashing

**Step 5: Commit**

```bash
git add lib/hackathonProgram.ts app/hackathon-program/module/[moduleId].tsx types/hackathon-program.ts
git commit -m "feat(review): add mentor review and retry state"
```

### Task 10: Add the individual and team reflection flow

**Files:**
- Create: `app/hackathon-program/reflection/[phaseId].tsx`
- Reuse patterns from: `app/reflection/[enrollmentId].tsx`
- Modify: `lib/hackathonProgram.ts`

**Step 1: Review the existing PathLab reflection flow**

Run: `sed -n '1,260p' 'app/reflection/[enrollmentId].tsx'`
Expected: current reflection structure and submission pattern

**Step 2: Build the phase reflection screen**

Support:
- individual reflection prompt
- team reflection prompt
- learning-change capture
- submission completion state

**Step 3: Add persistence helpers**

Store:
- individual reflection
- team reflection
- phase completion timestamp

**Step 4: Verify manually**

Run: `pnpm start`
Expected: reflection screen opens and saves safely

**Step 5: Commit**

```bash
git add app/hackathon-program/reflection/[phaseId].tsx lib/hackathonProgram.ts
git commit -m "feat(reflection): add phase reflection flow"
```

### Task 11: Seed Phase 1 content and mappings

**Files:**
- Create: `supabase/seed/hackathon_customer_discovery_phase1.sql`
- Optionally create: `scripts/seed-hackathon-phase1.ts`

**Step 1: Write the seed data**

Create:
- program
- phase
- playlist/modules
- seed/path mappings
- initial activities and metadata for the five recommended modules

**Step 2: Include only first-slice activities**

Seed enough content to support:
- Interview Mindset
- Real Customer Evidence
- Pain Point Definition
- Persona + JTBD
- Research + Reflection

**Step 3: Verify the seed file is additive and idempotent**

Review:
- stable IDs
- `ON CONFLICT` behavior where appropriate

**Step 4: Commit**

```bash
git add supabase/seed/hackathon_customer_discovery_phase1.sql scripts/seed-hackathon-phase1.ts
git commit -m "feat(seed): add customer discovery phase 1 content"
```

### Task 12: Verify and document the rollout

**Files:**
- Modify: `docs/plans/2026-03-29-hac-8-customer-discovery-design.md`
- Modify: `docs/plans/2026-03-29-hac-8-customer-discovery-implementation.md`
- Optionally update: `CLAUDE.md` if new routing or schema conventions matter long-term

**Step 1: Run the focused test suite**

Run:
- `pnpm test tests/pathlab-content-metadata.test.ts`
- `pnpm test tests/hackathon-program.test.ts`
- `pnpm test tests/hackathon-ai.test.ts`

Expected: PASS

**Step 2: Run the full test suite if feasible**

Run: `pnpm test`
Expected: PASS, or clearly understood unrelated failures

**Step 3: Smoke test the app**

Run: `pnpm start`
Expected:
- program home loads
- phase playlist loads
- module screen loads
- AI feedback loop works
- team gating UI renders correctly

**Step 4: Update the docs with any deviations**

Record:
- schema changes shipped
- content seeded
- deferred scope
- manual verification notes

**Step 5: Commit**

```bash
git add docs/plans/2026-03-29-hac-8-customer-discovery-design.md docs/plans/2026-03-29-hac-8-customer-discovery-implementation.md CLAUDE.md
git commit -m "docs: finalize hac-8 rollout plan"
```
