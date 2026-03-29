# HAC-8 Customer Discovery Program Design

## Goal

Design Phase 1 of the hackathon as an in-app, team-aware learning program that delivers world-class customer discovery training while setting up the app to support later hackathon phases.

## Core Product Decision

HAC-8 should not be modeled as one isolated PathLab. It should be modeled as:

- `Hackathon program`
- `program phases`
- `phase playlists/modules`
- `PathLab-powered activities`

PathLab remains the delivery engine for activities, content, AI loops, uploads, and reflections. A new orchestration layer above PathLab manages the multi-phase hackathon structure and ties progress to `hackathon_teams`.

## Why This Shape

The issue is explicitly Phase 1 of a longer hackathon. If Customer Discovery is implemented as a single long path, the app will lose continuity between phases and will force later phases into awkward custom logic. A program layer keeps:

- team identity stable across phases
- mentor context stable across phases
- evidence and submissions reusable across phases
- scoring and uniqueness logic extensible later
- PathLab reusable as the lesson engine instead of the whole product shell

## Recommended Architecture

### Program Layer

Introduce a lightweight hackathon program layer above the current `seed -> path -> day -> activity` model.

Recommended concepts:

- `hackathon_programs`
- `hackathon_program_phases`
- `hackathon_phase_playlists` or `hackathon_phase_modules`
- `hackathon_phase_seed_paths` mapping program modules to existing `seeds` / `paths`

This layer owns:

- phase ordering
- module ordering
- unlock rules
- due windows
- the current team phase/module
- cross-phase continuity

### Delivery Layer

Keep the current PathLab system as the execution layer:

- `seeds`
- `paths`
- `path_days`
- `path_activities`
- `path_content`
- `path_assessments`
- `path_activity_progress`
- `path_assessment_submissions`

This layer owns:

- content rendering
- activity sequencing within a module
- local progress and completion
- AI chat / NPC chat
- file and media uploads
- activity-specific assessments

## Team Model

Anchor the system to `hackathon_teams` and `hackathon_team_members`, not to the generic `teams` layer, because this module is hackathon-specific and should inherit the existing hackathon participant structure.

The program should treat `hackathon_teams` as the primary collaborative unit for:

- shared module enrollment
- team synthesis activities
- mentor review visibility
- team-level final outputs

## Learning Model

Phase 1 is not one monolith. It is a playlist of PathLab modules.

Recommended Phase 1 modules:

1. `Interview Mindset`
2. `Real Customer Evidence`
3. `Pain Point Definition`
4. `Persona + JTBD Workspace`
5. `Research + Reflection`

### Module 1: Interview Mindset

Purpose:

- teach interview fundamentals
- teach 5 Whys
- let students practice before touching real interviews

Activities:

- practice chatbot interviewee
- guided 5 Whys activity
- interviewer simulation / QTE
- short mascot tutorial content
- interview rubric familiarization

Ownership:

- mostly individual

Gate:

- each member must complete practice before the real interview upload unlocks

### Module 2: Real Customer Evidence

Purpose:

- force contact with real people
- collect evidence that customer discovery actually happened

Activities:

- audio/video upload for each member
- transcript or notes upload
- takeaway extraction
- mentor review and pass/fail

Ownership:

- hybrid

Gate:

- each member submits evidence
- mentor can require retry if the interview quality is too weak

### Module 3: Pain Point Definition

Purpose:

- turn raw interview evidence into a sharp validated pain point

Activities:

- interview learning share-in
- team discussion synthesis
- structured pain point workspace
- AI critique loop on clarity, specificity, severity, evidence, and customer definition

Ownership:

- team

Gate:

- team submission must pass AI threshold and optional mentor check

### Module 4: Persona + JTBD Workspace

Purpose:

- help teams structure their understanding of the customer

Activities:

- persona builder
- journey map canvas
- jobs-to-be-done framing
- pains and gains capture
- AI grading and feedback

Ownership:

- team

Gate:

- team workspace must be complete enough to unlock research

### Module 5: Research + Reflection

Purpose:

- connect primary interviews to secondary evidence
- capture learning transformation

Activities:

- NotebookLM handoff pack
- source submission with quantitative evidence
- research synthesis
- interview targeting refinement
- end-of-phase reflection

Ownership:

- team research pack
- individual reflection

Gate:

- team completes research bundle
- each member completes reflection

## Activity System Requirements

The current activity model is too narrow for hackathon learning. Each activity needs explicit responsibility and gating metadata.

Recommended activity metadata:

- `scope`: `individual`, `team`, `hybrid`
- `artifact_kind`: `response`, `structured_canvas`, `file`, `media`, `ai_feedback_loop`, `research_bundle`
- `gate_rule`: `complete`, `all_members_complete`, `min_members_complete`, `mentor_pass`, `team_submission_pass`
- `review_mode`: `auto`, `mentor`, `auto_then_mentor`
- `unlock_condition`: declarative prerequisite rule for the next activity/module

### Why Mixed Ownership Matters

The user explicitly stated that each learning activity is different. The system cannot assume one global completion rule.

Examples:

- interview practice: individual completion
- real interviews: every member uploads evidence
- validated pain point: team synthesis after member evidence exists
- reflection: both team and individual

## Submission Model

The product needs separate submission concepts instead of overloading one assessment record.

Recommended submission classes:

- `individual submissions`
- `team submissions`
- `AI evaluations`
- `mentor reviews`

Each submission should support:

- text answers
- structured JSON payloads for canvases
- file uploads
- media uploads
- system-generated feedback
- pass/fail / revision-required states

## AI Surfaces

Phase 1 should ship with targeted AI loops, not generic chat bolted onto everything.

### AI Pain Point Feedback Loop

Input:

- current pain point draft
- supporting interview snippets
- selected customer definition

Output:

- comments on specificity
- comments on severity
- comments on evidence strength
- comments on scope
- revision suggestions
- pass / revise recommendation

### Persona + JTBD Feedback

Input:

- persona fields
- JTBD statement
- journey steps
- pain and gain list

Output:

- completeness feedback
- contradiction detection
- shallow-thinking warnings
- improvement suggestions

### NotebookLM Handoff Generator

Input:

- pain point output
- persona / JTBD output
- interview takeaways

Output:

- a structured prompt pack for NotebookLM
- guidance on what external data to validate
- required evidence checklist

## First Implementation Slice

The first implementation should design for the full multi-phase program but only ship the backbone plus the Phase 1 core loop.

Build now:

- hackathon program layer above PathLab
- phase playlist navigation
- mixed-scope activity metadata
- submission model for individual and team outputs
- mentor review state
- AI evaluation result storage
- core Phase 1 modules
- team dashboard for blockers and progress

Defer:

- advanced uniqueness graph and embeddings UI
- rich mascot voice-over production
- live multi-user editing
- advanced mentor booking workflow
- full cross-phase analytics

## Screen Model

Recommended screens:

- `Hackathon Program Home`
- `Phase Playlist Screen`
- `Module Overview Screen`
- `Activity Screen`
- `Team Workspace Screen`
- `Review Screen`
- `Phase Reflection Screen`

The activity screen should stay generic and render based on activity metadata. The team workspace screen should be used only when the artifact is truly shared and requires synthesis.

## UX Principle

Every activity must make four things obvious:

- what this activity is for
- who must do it
- what counts as passing
- what it unlocks next

That clarity matters more than adding visual novelty. The program is only effective if students understand responsibility and unblock conditions without confusion.

## Success Criteria

Phase 1 is successful if the product makes teams do real customer discovery instead of role-playing it.

The system should reliably produce:

- at least three real-customer evidence submissions per team
- a sharper validated pain point
- a usable persona/JTBD artifact
- a research pack with credible sources and quantitative support
- reflections that show changed thinking, not filler

## Recommendation

Proceed by implementing the new program layer and extending the PathLab activity/submission model rather than building a separate hackathon engine. This preserves the existing PathLab investment while making the app capable of carrying all three hackathon phases.
