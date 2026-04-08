# Hackathon Phase 1 Comic Promise Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Phase 1 Activity 1’s placeholder chat experience with a hybrid evidence-first comic promise page backed by direct-activity metadata, generated panel art, and a Skia-enhanced renderer.

**Architecture:** Keep the change inside the direct activity layer. Add a new content type and metadata contract in the activity content model, parse it into a stable comic view model, render it with a dedicated React Native + Skia component, and align both live-source seed files plus the preview fallback so runtime behavior stays consistent across environments.

**Tech Stack:** Expo Router, React Native, TypeScript, `@shopify/react-native-skia`, `react-native-reanimated`, Supabase seed SQL, OpenAI Image API via `scripts/image_gen.py`

---

### Task 1: Define the comic content contract

**Files:**
- Modify: `types/hackathon-phase-activity.ts`
- Create: `lib/hackathonComic.ts`
- Test: `tests/hackathon-comic.test.ts`

**Step 1: Write the failing test**

Create `tests/hackathon-comic.test.ts` covering:

- valid `infographic_comic` metadata parses into four ordered panels
- missing panel fields fall back safely
- unsupported metadata shape returns `null`

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/hackathon-comic.test.ts`
Expected: FAIL because `lib/hackathonComic.ts` does not exist.

**Step 3: Extend the activity content types**

Modify `types/hackathon-phase-activity.ts`:

- add `'infographic_comic'` to `HackathonPhaseActivityContentType`
- add exported interfaces for the normalized comic panel shape and comic metadata shape if useful

**Step 4: Implement the parser**

Create `lib/hackathonComic.ts` with:

- a normalized `HackathonComicPanel` type
- a `parseHackathonComicContent(metadata, contentTitle, contentBody)` helper
- validation and fallback behavior for panel order, headlines, bodies, and image keys

Keep this file pure so it is easy to test.

**Step 5: Run test to verify it passes**

Run: `pnpm test tests/hackathon-comic.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add types/hackathon-phase-activity.ts lib/hackathonComic.ts tests/hackathon-comic.test.ts
git commit -m "feat(hackathon): define comic infographic content contract"
```

### Task 2: Build the hybrid comic renderer

**Files:**
- Create: `components/Hackathon/HackathonEvidenceComic.tsx`
- Modify: `app/(hackathon)/activity/[nodeId].tsx`
- Reference: `components/Hackathon/HackathonBackground.tsx`
- Reference: `components/discover/HackathonHeroCard.tsx`

**Step 1: Read the Skia docs before coding**

Review the exact APIs you plan to use:

- Canvas overview
- Group / Rect / RoundedRect primitives
- LinearGradient
- Blur or shadow primitives

Use the official React Native Skia docs only.

**Step 2: Add the failing integration point**

Modify `app/(hackathon)/activity/[nodeId].tsx` so `ContentBlock` includes a branch for `'infographic_comic'`, returning a temporary placeholder component import.

Run TypeScript to confirm the missing component/type errors appear.

Run: `pnpm tsc --noEmit`
Expected: FAIL with missing import or incomplete handling for the new content type.

**Step 3: Implement the comic component**

Create `components/Hackathon/HackathonEvidenceComic.tsx`:

- accept a normalized comic model plus optional remote/local image mapping
- render four stacked panels
- use Skia for panel frames, connective evidence path, ambient glow, and a subtle animated sweep
- render generated images inside each panel with normal React Native image primitives
- render short headline/body text outside Skia for responsive readability

Use restrained motion only. Do not animate layout with React state on every frame.

**Step 4: Wire the renderer into the activity screen**

Modify `app/(hackathon)/activity/[nodeId].tsx`:

- add a label mapping for `infographic_comic`
- import the parser/helper from `lib/hackathonComic.ts`
- import the new comic component
- render the comic for `infographic_comic` blocks
- keep all existing content types behaving the same

**Step 5: Run typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add app/\(hackathon\)/activity/\[nodeId\].tsx components/Hackathon/HackathonEvidenceComic.tsx
git commit -m "feat(hackathon): render evidence-first comic promise page"
```

### Task 3: Generate the comic panel art

**Files:**
- Create: `output/imagegen/hackathon-phase1-comic/`
- Temporary: `tmp/imagegen/hackathon-phase1-comic.jsonl`
- Reference skill: `/Users/bunyasit/.codex/skills/imagegen/SKILL.md`

**Step 1: Confirm environment**

Check that `OPENAI_API_KEY` is set locally before live generation.

Run: `printenv OPENAI_API_KEY | wc -c`
Expected: non-zero output

If missing, stop and set it locally before continuing.

**Step 2: Write the batch prompt file**

Create a JSONL batch describing four coordinated images with the same visual language:

- Panel 1: noise / vague idea / scattered signals
- Panel 2: interviews / repeated pain / evidence
- Panel 3: validation / one user / one pain / one context
- Panel 4: clear artifact / validated pain point / guide next step

Prompt rules:

- use case: `illustration-story`
- evidence-first tone
- editorial semi-real comic
- no childish cartoon style
- no embedded text required for correctness

**Step 3: Run image generation**

Run the bundled CLI once for the batch and save outputs under:

- `output/imagegen/hackathon-phase1-comic/`

Use stable filenames keyed by panel intent.

**Step 4: Review outputs**

Open the outputs and reject any set that feels:

- childish
- motivational instead of analytical
- visually inconsistent across panels
- too busy for mobile

Iterate with one targeted prompt adjustment if needed.

**Step 5: Clean temporary files**

Delete the temporary JSONL file after the successful run.

**Step 6: Commit**

```bash
git add output/imagegen/hackathon-phase1-comic
git commit -m "feat(hackathon): add phase 1 comic panel art"
```

### Task 4: Align seeds and preview fallback

**Files:**
- Modify: `supabase/seed/hackathon_phase1_activities_complete.sql`
- Modify: `supabase/seed/hackathon_customer_discovery_phase1.sql` only for bootstrap/setup data
- Modify: `lib/hackathonProgramPreview.ts`

**Step 1: Update the destructive phase seed**

Modify `supabase/seed/hackathon_phase1_activities_complete.sql`:

- replace Activity 1 content from `npc_chat` to `infographic_comic`
- set the approved evidence-first metadata payload
- point image keys or URLs to the generated panel art contract
- keep title/instructions aligned with the approved promise-page wording

**Step 2: Update the additive seed**

Modify `supabase/seed/hackathon_customer_discovery_phase1.sql` only if the bootstrap/setup layer needs to stay in sync with phase metadata.

Do not treat this file as the source of truth for Activity 1 content, assessment, or webtoon data.

**Step 3: Update preview fallback**

Modify `lib/hackathonProgramPreview.ts` so preview Activity 1 uses the same content type, metadata shape, and message.

Do not leave preview on `npc_chat`.

**Step 4: Verify readback in code**

Check all three files to confirm:

- same Activity 1 title
- same instructions
- same content type
- same four-panel narrative

**Step 5: Commit**

```bash
git add supabase/seed/hackathon_phase1_activities_complete.sql supabase/seed/hackathon_customer_discovery_phase1.sql lib/hackathonProgramPreview.ts
git commit -m "feat(hackathon): align phase 1 comic promise page data sources"
```

### Task 5: Verify end-to-end behavior

**Files:**
- Verify: `app/(hackathon)/activity/[nodeId].tsx`
- Verify: `components/Hackathon/HackathonEvidenceComic.tsx`
- Verify: `lib/hackathonProgramPreview.ts`
- Verify: `supabase/seed/hackathon_phase1_activities_complete.sql`

**Step 1: Run automated verification**

Run:

```bash
pnpm test tests/hackathon-comic.test.ts
pnpm tsc --noEmit
```

Expected:

- comic parser test passes
- no TypeScript errors

**Step 2: Run the app and manually verify Activity 1**

Launch the app and navigate to Phase 1 Activity 1.

Manual checks:

- the screen no longer shows a chat placeholder
- the comic reads clearly on a phone-sized viewport
- images load in the correct panel order
- Skia accents do not overwhelm the text
- Activity 2 and other content types still render correctly

**Step 3: Verify preview fallback**

Force preview/fallback mode if needed and confirm Activity 1 still renders the comic with the same narrative.

**Step 4: Optional production patch**

If the user wants live production updated immediately, query the current production rows first, then patch:

- `hackathon_phase_activities`
- `hackathon_phase_activity_content`

Read back the updated rows after writing, then confirm the repo seeds still match.

**Step 5: Commit final verification fixes**

```bash
git add .
git commit -m "chore(hackathon): verify comic promise page end to end"
```
