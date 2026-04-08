# Hackathon Learning Activities: Data Model

## Core Files

- `supabase/seed/hackathon_customer_discovery_phase1.sql`
  Canonical additive seed for the customer discovery program, phase, playlist, modules, and initial activity slice.
- `supabase/seed/hackathon_phase1_activities_complete.sql`
  Phase-level reset seed for the direct activity layer. Deletes and recreates all activities/content/assessments for one phase.
- `lib/hackathonProgram.ts`
  Program/phase/playlist/module client layer. Hardcodes `super-seed-hackathon` as the live program slug.
- `lib/hackathonPhaseActivity.ts`
  Fetches phases with nested direct activities/content/assessments.
- `lib/hackathonProgramPreview.ts`
  Preview fallback that must be kept aligned with production-facing naming.

## Ownership Map

### Program orchestration

| Table | Owns |
|---|---|
| `hackathon_programs` | program slug, title, description, status |
| `hackathon_program_phases` | phase slug, title, description, phase order, due windows |
| `hackathon_phase_playlists` | playlist slug/title/description/order within phase |
| `hackathon_phase_modules` | module slug/title/summary/order/scope/gate/review |

### Direct activity layer

| Table | Owns |
|---|---|
| `hackathon_phase_activities` | title, instructions, order, estimated minutes, required/draft flags |
| `hackathon_phase_activity_content` | content blocks under an activity |
| `hackathon_phase_activity_assessments` | one assessment per activity |

### Submission layer

Current repo state is mixed:

- older program plans extend `hackathon_activity_individual_submissions` and `hackathon_activity_team_submissions`
- current mobile submit/fetch flow points to a newer `hackathon_phase_activity_submissions` design through `/api/hackathon/submit`

Do not assume a single submission table without checking the live backend.

## Canonical Customer Discovery Labels

From `supabase/seed/hackathon_customer_discovery_phase1.sql`:

- Program: `Super Seed Hackathon`
- Program slug: `super-seed-hackathon`
- Phase: `Phase 1: Customer Discovery`
- Phase slug: `phase-1-customer-discovery`
- Playlist: `Customer Discovery Core Playlist`
- Modules:
  - `Interview Mindset`
  - `Real Customer Evidence`
  - `Pain Point Definition`
  - `Persona + JTBD Workspace`
  - `Research + Reflection`

If production differs from this set, fix production first, then sync preview/fallback.

## Direct Activity Layer Contract

From `types/hackathon-phase-activity.ts`:

### Content types

`video`, `short_video`, `canva_slide`, `text`, `image`, `pdf`, `ai_chat`, `npc_chat`

### Assessment types

`text_answer`, `file_upload`, `image_upload`

### Important columns

`hackathon_phase_activities`

- `id`
- `phase_id`
- `title`
- `instructions`
- `display_order`
- `estimated_minutes`
- `is_required`
- `is_draft`
- `submission_scope`

`hackathon_phase_activity_content`

- `id`
- `activity_id`
- `content_type`
- `content_title`
- `content_url`
- `content_body`
- `display_order`
- `metadata`

`hackathon_phase_activity_assessments`

- `id`
- `activity_id`
- `assessment_type`
- `points_possible`
- `is_graded`
- `metadata`

## Live Update Playbook

Use service-role credentials from repo env and query first.

### Query current rows

```js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data } = await supabase
  .from("hackathon_programs")
  .select(`
    id, slug, title, description,
    hackathon_program_phases(
      id, slug, title, description, phase_number,
      hackathon_phase_playlists(
        id, slug, title, description, display_order,
        hackathon_phase_modules(
          id, slug, title, summary, display_order, workflow_scope, gate_rule, review_mode
        )
      ),
      hackathon_phase_activities(
        id, title, instructions, display_order, estimated_minutes,
        hackathon_phase_activity_content(
          id, content_type, content_title, content_body, content_url, display_order, metadata
        ),
        hackathon_phase_activity_assessments(
          id, assessment_type, metadata
        )
      )
    )
  `);
```

### Patch exact rows, then read back

Do not patch by guessed seeded IDs unless you already confirmed they match production.

### After a live patch, sync these files

- `supabase/seed/hackathon_customer_discovery_phase1.sql`
- `supabase/seed/hackathon_phase1_activities_complete.sql`
- `lib/hackathonProgramPreview.ts`

## Seed Semantics

### `hackathon_customer_discovery_phase1.sql`

- additive and mostly idempotent
- uses `ON CONFLICT`
- best for canonical naming and structural source of truth

### `hackathon_phase1_activities_complete.sql`

- destructive for one phase
- deletes content, assessments, then activities for a target phase
- useful for phase replacement
- dangerous if its wording diverges from live production

## Known Mismatch History

- production has previously drifted to `Epic Sprint` / `Where is Da Problem`
- preview fallback also carried stale ideation naming
- the live client in `lib/hackathonProgram.ts` expects `super-seed-hackathon`

Any skill user changing naming should check all three:

- live Supabase
- additive seed
- preview fallback
