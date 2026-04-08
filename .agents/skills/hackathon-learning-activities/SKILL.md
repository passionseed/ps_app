---
name: hackathon-learning-activities
description: Use when updating hackathon learning activity content, naming, ordering, metadata, assessments, production Supabase rows, or the matching mobile frontend and preview fallback for hackathon programs, phases, playlists, modules, and phase activities.
---

# Hackathon Learning Activities

## Overview

Repo-local skill for managing hackathon learning activities across both data and UI.

This skill exists because the hackathon stack has multiple overlapping layers:

- program orchestration tables
- direct phase activity tables
- mobile hackathon screens
- preview fallback data
- seed files that can overwrite or drift from production

**Core principle:** do not treat a copy change as "just content" until you know which layer owns it at runtime.

## Use This Skill For

- Renaming hackathon programs, phases, playlists, or modules
- Updating hackathon activity titles, instructions, durations, content, or assessments
- Patching production Supabase data for hackathon learning flows
- Syncing seed files after a live data change
- Fixing mismatches between live data and preview fallback
- Extending the mobile hackathon phase/activity screens
- Auditing why hackathon content shown in the app does not match the seed files

## Do Not Use This Skill For

- Pure PathLab content work outside the hackathon program layer
- Expert interview / expert_pathlab generation workflows
- Generic Supabase work unrelated to hackathon learning activities

For non-hackathon PathLab content, prefer `expert-pathlab-manager`.

## Runtime Ownership Map

### Orchestration layer

- `hackathon_programs`
- `hackathon_program_phases`
- `hackathon_phase_playlists`
- `hackathon_phase_modules`

Use this layer for names, slugs, descriptions, ordering, module scope, gate rules, review mode, and phase/module navigation.

### Direct activity layer

- `hackathon_phase_activities`
- `hackathon_phase_activity_content`
- `hackathon_phase_activity_assessments`

Use this layer for activity cards and activity detail content rendered under `/(hackathon)/phase/[phaseId]` and `/(hackathon)/activity/[nodeId]`.

### Submission layer

The repo currently shows two overlapping models:

- older plan/docs: `hackathon_activity_individual_submissions` and `hackathon_activity_team_submissions`
- current mobile submission helper/docs: `hackathon_phase_activity_submissions` via `lib/hackathon-submit.ts` and `/api/hackathon/submit`

Never assume which one is live. Inspect current code and database before changing submission behavior.

## Mandatory Workflow

### 1. Classify the request first

Decide whether the user is asking for:

- production data only
- seed/source update only
- frontend/UI update only
- cross-layer sync

Default to cross-layer sync if the request changes user-facing naming or activity content.

### 2. Identify the actual runtime path

Inspect these before editing:

- `lib/hackathonProgram.ts`
- `lib/hackathonPhaseActivity.ts`
- `app/(hackathon)/phase/[phaseId].tsx`
- `app/(hackathon)/activity/[nodeId].tsx`
- `lib/hackathonProgramPreview.ts`

Questions to answer:

- Is the screen reading live Supabase or preview fallback?
- Is the request about playlists/modules or about direct phase activities?
- Is the content interactive at runtime, or only metadata/card copy?

### 3. Inspect live records before writing

If the request targets production:

- use service-role credentials from repo env
- query the exact live rows first
- capture the real IDs before updating

Do not assume the IDs in seeds are the IDs in production.

### 4. Patch the correct layer

Use this rule:

- `hackathon_programs` for program identity
- `hackathon_program_phases` for phase identity
- `hackathon_phase_playlists` / `hackathon_phase_modules` for journey/program screens
- `hackathon_phase_activities` / content / assessments for activity list and detail screens

If the request says "activity", "instructions", "minutes", "content", or "assessment", it usually belongs in the direct activity layer.

### 5. Sync the source of truth after live edits

After a production patch, update the matching repo files so the next seed run does not undo it:

- `supabase/seed/hackathon_customer_discovery_phase1.sql`
- `supabase/seed/hackathon_phase1_activities_complete.sql`
- `lib/hackathonProgramPreview.ts`

### 6. Verify with readback

Always read back the updated rows and confirm:

- title / slug / description
- display order
- estimated minutes
- content titles / bodies / URLs / metadata
- assessment type / metadata

If frontend behavior changed, also verify the route-level screen that consumes that data.

## Current Repo Truth

### Canonical live-program slug

`lib/hackathonProgram.ts` expects:

`super-seed-hackathon`

If production uses a different slug, the mobile program layer can silently drift or fail.

### Canonical customer discovery seed

The current intended names live in:

- `supabase/seed/hackathon_customer_discovery_phase1.sql`

This file defines:

- `Super Seed Hackathon`
- `Phase 1: Customer Discovery`
- `Customer Discovery Core Playlist`
- `Interview Mindset`
- `Real Customer Evidence`
- `Pain Point Definition`
- `Persona + JTBD Workspace`
- `Research + Reflection`

### Destructive phase-activity seed

`supabase/seed/hackathon_phase1_activities_complete.sql` deletes and recreates all direct phase activities for one phase before inserting replacements.

Use extra care with it:

- it is useful for hard resets
- it can overwrite live wording or ordering
- it should be kept aligned with production if you ever patch prod manually

## Frontend Rules

### Phase activity screen

`app/(hackathon)/activity/[nodeId].tsx` reads directly from `hackathon_phase_activities` and nested content/assessment rows.

Important current limitation:

- `ai_chat` and `npc_chat` are rendered as a generic "Coming soon" block in the hackathon activity screen

So:

- changing `content_title`, `content_body`, and `metadata` affects copy and future compatibility
- it does **not** by itself create a live interactive chatbot experience on the hackathon screen

### Phase list screen

`app/(hackathon)/phase/[phaseId].tsx` reads a phase plus direct activities from `lib/hackathonPhaseActivity.ts`.

If the user wants the phase screen card list to change, edit the activity layer.

### Program/playlist screen

`app/hackathon-program/phase/[phaseId].tsx` renders playlists/modules, not direct phase activities.

If the user wants module cards, module scope, gate badges, or playlist naming to change, edit the orchestration layer instead.

### Preview fallback

`lib/hackathonProgramPreview.ts` is a separate fallback/demo source and can drift from live data.

Whenever you rename programs, phases, playlists, modules, or top-of-funnel activities, sync this file too.

## High-Risk Pitfalls

### Pitfall 1: Live data drift vs seeds

Production may have old names even if seeds are correct. Query prod before assuming anything.

### Pitfall 2: Preview drift

The preview fallback may still show stale labels such as older hackathon branding or ideation-era module names.

### Pitfall 3: Content type does not guarantee runtime support

`ai_chat` and `npc_chat` in hackathon activity rows currently describe content type, but the hackathon activity screen still shows placeholders for them.

### Pitfall 4: Submission model ambiguity

The codebase contains both:

- plan references to team/individual submission tables
- a newer `hackathon_phase_activity_submissions` flow via web API

Inspect `lib/hackathon-submit.ts` and current backend implementation before changing submission storage.

### Pitfall 5: Wrong layer edits

Changing a phase title will not update an activity title.
Changing a playlist/module will not update the activity list screen.
Changing the seed only will not fix production immediately.

## References To Load As Needed

- `references/data-model.md`
  Use for tables, seed files, live update rules, and cross-layer ownership.
- `references/frontend-runtime.md`
  Use for screens, helper files, current runtime behavior, and known frontend gaps.

## Minimum Verification Standard

For data-only tasks:

1. query the current live row
2. apply the update
3. query the row again
4. sync the repo seed/fallback if relevant

For frontend tasks:

1. inspect the consuming screen/helper
2. patch the right file
3. verify types still match
4. confirm the data contract still lines up with Supabase rows

Do not claim completion until you have evidence for the exact layer the user asked to change.
