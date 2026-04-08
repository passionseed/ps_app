---
name: thai-cinematic-comic-generation
description: Generate cinematic portrait comic concepts, Thai captions, panel scripts, production-ready image prompts, and hackathon-ready content payloads for app learning content. Use when the user wants comic-style learning scenes, portrait panel prompts, Thai captioned storyboards, DB-ready hackathon comic metadata, or help turning rough lesson content into emotionally strong mobile-first comic panels. Also use when preparing prompts for image generation tools such as `imagegen`, or when the user wants the comic written into the hackathon activity tables and synced back to seed and preview files.
---

# Thai Cinematic Comic Generation

## Overview

Turn rough learning content into a strong portrait comic package: concept, panel sequence, Thai captions, English art prompts, and hackathon DB-ready metadata.

Default to premium cinematic comic art for mobile. The artwork direction stays in English. The on-panel caption or dialogue stays in Thai unless the user asks otherwise.

The skill supports two formats: **Caption Comic** (images with React Native text overlay) and **Webtoon** (tall continuous images sliced into vertical chunks with no text overlay).

**Theme & UX Note:** Hackathon comics exist in an immersive **Bioluminescent Theme** (`#03050a` space backgrounds, glowing cyan/purple accents, glassy components). The activity screen utilizes a **Pull-to-Scroll Swipe Navigation** mechanism to progress. When building visual payloads, especially Webtoons, design the bottom chunk so important art isn't obscured by the user pulling up to proceed to the next activity.

This skill currently supports direct writeback for hackathon activity content only.

## Workflow

### 0. Pick the operating mode

Decide which mode applies:

- `generate only`
- `generate + DB-ready payload`
- `generate + live hackathon write`

If the user wants live hackathon changes, follow the writeback workflow below instead of stopping at prompts.

### 1. Extract the teaching outcome first

Identify these before writing any prompts:

- what the learner should understand or feel
- what changes from panel 1 to the final panel
- what single visual metaphor or emotional arc can carry the sequence

Do not start with literal bullet-to-panel conversion. Compress the lesson into a narrative shift.

### 2. Choose the panel count and rhythm

Use these defaults:

- `1 panel` for a hero promise page or cover scene
- `3 panels` for setup, evidence, outcome
- `4 panels` for setup, friction, insight, outcome

Keep portrait-first composition. Assume the comic is viewed on a phone.

### 3. Write the panel plan before the prompts

For each panel, define:

- panel purpose
- key visual action
- camera framing
- emotional tone
- Thai caption

Prefer short declarative Thai captions. Avoid dense exposition.

### 4. Keep the art direction cinematic

Default visual direction:

- portrait ratio
- cinematic semi-real comic illustration
- strong lighting and atmosphere
- clear focal subject
- readable negative space for Thai text overlay
- mobile-safe framing with important faces and objects away from extreme edges

Do not default to:

- childish cartoon
- anime unless explicitly requested
- superhero parody
- cluttered infographic collage
- flat corporate explainer art

If the lesson is abstract, invent a grounded cinematic scene instead of drawing abstract icons.

### 5. Separate language responsibilities

Use:

- English for image prompts, style, lighting, camera, composition
- Thai for captions, dialogue, and app-facing comic copy

Do not ask the model to render long Thai text inside the image unless the user explicitly wants text baked into the art. Prefer overlay text in the app.

### 6. Produce generation-ready output

Default output should include:

1. comic concept
2. panel-by-panel script
3. Thai caption set
4. one English prompt per panel
5. if hackathon-related, a DB-ready content payload

If the user wants actual image files, use `imagegen` after the prompts are approved.

## Hackathon Writeback Workflow

Use this only for hackathon content.

### 1. Confirm the target layer

Hackathon comics belong in the direct activity layer:

- `hackathon_phase_activities`
- `hackathon_phase_activity_content`

Do not write comic content into playlists or modules unless the request is explicitly about journey/module UI.

### 2. Query live rows first

Before writing:

- load service-role credentials from repo env
- query the exact target activity row
- query the nested content row(s)
- capture the real production IDs

Do not assume seed IDs match production.

### 3. Use the current runtime-safe comic shape

The current hackathon activity screen parses comic metadata from either a schema-safe `text` content row (for Caption Comics) or a `webtoon` content row (for Webtoons).

Default DB shape for Caption Comic:

- `hackathon_phase_activities.title`
- `hackathon_phase_activities.instructions`
- `hackathon_phase_activity_content.content_type = 'text'`
- `hackathon_phase_activity_content.content_title`
- `hackathon_phase_activity_content.content_body`
- `hackathon_phase_activity_content.metadata.variant = 'evidence_first'` or another explicit variant
- `hackathon_phase_activity_content.metadata.panels[]`

Each panel should usually include:

- `id`
- `order`
- `headline`
- `body`
- `image_key` or `image_url`
- `accent`

Default DB shape for Webtoon:
- `content_type = 'webtoon'`
- `metadata.variant = 'webtoon'`
- `metadata.chunks[]` with `id`, `order`, and `image_key`

Read [references/hackathon-db-shape.md](references/hackathon-db-shape.md) before producing or applying a live patch.

### 4. Generate assets before writing image references

If the comic needs fresh art:

- finalize the panel script
- generate portrait images with `imagegen`
- choose stable asset keys or URLs
- only then write the metadata

Do not write fake final asset references into production.

### 5. Apply the live patch carefully

When the user wants execution:

- update the exact `hackathon_phase_activities` row
- update the exact `hackathon_phase_activity_content` row
- read the row back immediately

### 6. Sync source-of-truth files after live edits

After a successful live hackathon write, sync:

- `supabase/seed/hackathon_customer_discovery_phase1.sql`
- `supabase/seed/hackathon_phase1_activities_complete.sql`
- `lib/hackathonProgramPreview.ts`

Do not leave production ahead of repo state.

## Prompt Rules

- Always specify portrait composition explicitly.
- Tell the model the scene is for mobile viewing.
- Include camera language such as `close portrait`, `medium shot`, `wide vertical frame`, `low angle`, or `over-the-shoulder`.
- Specify mood, lighting, materiality, and environment.
- Reserve space for captions by asking for clean negative space.
- Keep character count low per panel unless crowd pressure is the point.
- Prefer one dominant action per panel.

Read [references/prompt-patterns.md](references/prompt-patterns.md) when you need stronger prompt wording or scene construction.

## Thai Caption Rules

- Keep captions concise and speakable.
- Prefer one strong sentence over two weak ones.
- Use modern natural Thai, not textbook Thai.
- Avoid translating English phrasing too literally.
- Match the panel emotion: tension, clarity, urgency, relief.

Read [references/output-format.md](references/output-format.md) when you need the full response structure.
Read [references/hackathon-db-shape.md](references/hackathon-db-shape.md) when the user wants DB-ready output or live hackathon writes.

## Default Response Shape

Unless the user asks for something else, return:

### Concept

- 1 short paragraph describing the comic's emotional arc

### Panels

- panel number
- scene goal
- Thai caption
- English image prompt

### Hackathon Payload

- activity title
- activity instructions
- content title
- content body
- `metadata.panels[]`
- suggested `image_key` values or resolved asset URLs

### Generation Notes

- portrait ratio reminder
- recurring style constraints
- anything that must stay consistent across all panels

## Image Generation Handoff

If the user wants the actual images:

- ask for approval on the panel script if it is still rough
- then use `imagegen`
- generate portrait images only
- keep the same style language across all prompts
- keep the same character and environment anchors across all panels

If the user wants the live hackathon rows updated:

- query first
- patch exact rows
- read back the result
- sync seed and preview files

If continuity matters, repeat the anchor descriptors in every prompt:

- age and appearance
- wardrobe
- environment
- palette
- lighting logic

## Failure Modes

- Do not turn learning content into a text wall with pictures.
- Do not make every panel the same camera angle.
- Do not lose the teaching outcome in aesthetic flourish.
- Do not overpack multiple ideas into one panel.
- Do not ask the image model to solve caption layout unless that is explicitly required.
- Do not write hackathon comic content into the wrong layer.
- Do not patch production before real IDs and asset references are confirmed.
- Do not stop at live writes without syncing seed and preview files.
