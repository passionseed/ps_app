# Hackathon Learning Activities: Frontend Runtime

## Main Frontend Files

### Program layer

- `lib/hackathonProgram.ts`
  - live program slug constant: `super-seed-hackathon`
  - program/phase/playlist/module fetches
  - module gate/scope helpers

- `app/hackathon-program/phase/[phaseId].tsx`
  - renders playlists/modules
  - module cards show title, summary, scope, gate rule
  - this screen does **not** read direct phase activities

- `app/hackathon-program/module/[moduleId].tsx`
  - module detail/workflow screen
  - uses `getHackathonModuleDetail`, progress snapshots, pain-point feedback helpers

### Direct activity layer

- `lib/hackathonPhaseActivity.ts`
  - `getPhaseWithActivities(phaseId)`
  - `getProgramPhasesWithActivities(programId)`
  - loads nested `hackathon_phase_activities`, content, and assessments

- `app/(hackathon)/phase/[phaseId].tsx`
  - activity list screen for one phase
  - shows activity title, instructions, submission scope, minutes, assessment chip
  - route to detail: `/(hackathon)/activity/${activity.id}`

- `app/(hackathon)/activity/[nodeId].tsx`
  - activity detail screen
  - fetches a single `hackathon_phase_activities` row with nested content and assessment
  - uses `lib/hackathon-submit.ts` for submit/fetch status

### Preview fallback

- `lib/hackathonProgramPreview.ts`
  - alternate source for preview/demo data
  - can drift from production if not kept in sync

## Current Runtime Caveats

### `ai_chat` and `npc_chat` are placeholders on the hackathon activity screen

`app/(hackathon)/activity/[nodeId].tsx` renders:

- `text`
- `image`
- `video` / `short_video`

For:

- `ai_chat`
- `npc_chat`

it currently shows a generic block with "Coming soon".

That means:

- content metadata and copy still matter
- but live interactive chatbot behavior is not yet implemented in this screen

If the user asks for "make the chatbot actually work" or "make npc_chat interactive", that is a frontend feature request, not just a data patch.

### Submission flow is API-backed

`lib/hackathon-submit.ts` sends requests to:

- `POST ${EXPO_PUBLIC_WEB_API_URL}/api/hackathon/submit`
- `GET ${EXPO_PUBLIC_WEB_API_URL}/api/hackathon/submissions`

If submission UX or payload changes, inspect both:

- the mobile helper in this repo
- the backend API implementation in the web app if available

## Editing Rules

### If the user wants the program/phase/module journey renamed

Edit:

- `hackathon_programs`
- `hackathon_program_phases`
- `hackathon_phase_playlists`
- `hackathon_phase_modules`
- `lib/hackathonProgramPreview.ts`

### If the user wants the phase activity list or activity detail changed

Edit:

- `hackathon_phase_activities`
- `hackathon_phase_activity_content`
- `hackathon_phase_activity_assessments`
- optionally `supabase/seed/hackathon_phase1_activities_complete.sql`
- optionally `lib/hackathonProgramPreview.ts`

### If the user wants a real interaction rather than card copy

Inspect and likely edit:

- `app/(hackathon)/activity/[nodeId].tsx`
- `lib/hackathon-submit.ts`
- any backing web/API route

## Useful Readback Checks

### Verify the phase screen contract

Check:

- every activity has the intended `title`
- `instructions` are short enough for the phase card
- `estimated_minutes` are sane
- `submission_scope` matches expected chip
- content count and assessment chip match the intended UX

### Verify the activity detail contract

Check:

- `content_title`
- `content_body`
- `content_url`
- `assessment_type`
- assessment `metadata`

### Verify the preview fallback

Check:

- program title/slug
- phase title/slug
- playlist title/slug
- module names
- first activities shown in preview

If preview differs, users may still see stale naming during fallback/demo flows even when production data is fixed.
