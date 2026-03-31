# Hackathon Journey — Design Spec

**Date:** 2026-04-01
**Branch:** feature/hackathon-mode
**Status:** Approved

## Overview

Replace the current phases/timeline UI on the hackathon home screen with a "Hackathon Journey" — a horizontally swipeable module carousel backed by PathLab activity nodes. The journey is only visible in hackathon mode (not in PathLab). Data reuses existing tables (`hackathon_phase_modules`, `map_nodes`, `student_node_progress`).

## What Changes

| Screen | Before | After |
|--------|--------|-------|
| `app/(hackathon)/home.tsx` | Phases timeline + team card | Module carousel + team card |
| `app/(hackathon)/module/[moduleId].tsx` | Pain-point AI workspace | Node graph + activity list |
| `app/(hackathon)/activity/[nodeId].tsx` | Does not exist | New hackathon-styled activity player |

`app/hackathon-program/` (light-theme, normal-mode users) is **not changed**.

---

## Screens

### 1. Home Screen (`home.tsx`)

**Layout (top to bottom):**
1. Header — program title eyebrow + "Your Journey" title
2. Module carousel
3. Team card (unchanged)

**Module carousel:**
- One card per `hackathon_phase_module` for the current phase, ordered by `display_order`
- Horizontally swipeable with `‹` / `›` chevron buttons
- Right edge shows a peek (~28px) of the next card to signal there's more
- Dot indicators below the carousel show position
- Tapping anywhere on a card navigates to `/(hackathon)/module/[moduleId]`

**Each carousel card shows:**
- Module name (bold, large)
- Phase date (`ends_at` formatted as e.g. `12/4`)
- Progress label (e.g. `20% complete` or `2 of 4 done`) — loaded lazily
- Node graph SVG showing the activity path through the module (see Node Graph section)
- Thin progress bar at card bottom

**Progress loading (lazy):**
- Home fetches only `hackathon_phase_modules` for the current phase on mount
- When a card becomes visible, it fetches its own progress: node count from `map_nodes` via the module's `path_id`, completed count from `student_node_progress` for the current user
- Card shows a subtle loading state (dim progress label) while fetching

---

### 2. Node Graph

Used in both the carousel card and the module detail screen. Rendered as an SVG.

**Node types and visual states:**

| State | Style |
|-------|-------|
| Completed | Filled green circle (`#10B981`) |
| Completed team activity | Green circle with cross/grid icon inside |
| Current (in progress) | Cyan ring with filled cyan dot (`#00F0FF`), faint glow |
| Future (not unlocked) | Dim outline circle, no fill |
| Locked endpoint | Amber dot (`#F59E0B`) |

**Connecting lines:**
- Completed → completed: solid green line
- Completed → current: solid green line
- Current → future: dashed white line (`rgba(255,255,255,0.15)`)
- Future → future: dashed white line

Nodes are laid out along a gentle wave path (not straight horizontal). Positions are computed proportionally from the ordered node list — alternating slightly above/below a center axis to create the wave from the sketch.

**In carousel card:** full-width SVG, ~110px tall, non-interactive
**In module detail:** same SVG component, ~90px tall, non-interactive (tapping activity rows in the list below is how you navigate, not tapping nodes)

---

### 3. Module Detail Screen (`module/[moduleId].tsx`)

Replaces the current pain-point AI workspace entirely.

**Layout (top to bottom):**
1. Back link (`‹ Back`)
2. Eyebrow (`MODULE`) + module title + description
3. Scope/gate badges row (individual/team/hybrid, gate rule)
4. Mini node graph (same SVG component, rendered at reduced height)
5. Section label (`ACTIVITIES`)
6. Vertical activity list

**Activity list rows:**

Each row shows:
- Status icon (✓ green / cyan dot / 🔒)
- Activity title
- Type pill (Video / NPC / Quiz / Text / Submission / etc.)
- Arrow `→` on the current/unlocked activity

**Row states:**
- **Completed:** green border + background tint, checkmark, title in green
- **Current:** cyan border + background tint, cyan dot, title in white, `→` arrow
- **Locked:** dim, lock icon, no tap handler

Tapping a completed or current activity row navigates to `/(hackathon)/activity/[nodeId]`.

---

### 4. Activity Player (`activity/[nodeId].tsx`) — New Screen

Dark hackathon theme (`#010814` background, cyan `#00F0FF` accents).

**Handles node types:**
- `text` — scrollable markdown/rich text content
- `video` — video player
- `quiz` — question + answer choices, submit button
- `npc_conversation` — chat-style NPC dialogue interface
- `file_upload` — upload prompt + file picker
- `project` — open-ended submission form

**Header:**
- Back link
- Activity type eyebrow (e.g. `NPC CONVERSATION`)
- Activity title

**Footer:**
- "Mark complete" / "Submit" CTA button (cyan, full width)
- On completion: upserts `student_node_progress` with `status = 'completed'`, then navigates back to module detail

**Navigation after completion:**
- If there is a next unlocked activity in the module: navigate back to module detail (list refreshes, next row becomes current)
- If the module is now fully complete: navigate back to home (carousel card updates its progress)

---

## Data Layer (`lib/hackathonProgram.ts`)

New functions added to the existing file:

### `getHackathonJourneyModules(phaseId: string)`
Fetches `hackathon_phase_modules` for the phase ordered by `display_order`. Returns module list with `id`, `title`, `summary`, `workflow_scope`, `gate_rule`, `path_id`, `ends_at` (from joined phase).

### `getModuleActivityProgress(moduleId: string, userId: string)`
Fetches `map_nodes` via the module's `path_id` (ordered by `display_order`) and `student_node_progress` for those node IDs + user. If `path_id` is null, returns empty nodes with zero progress. Returns:
```ts
{
  nodes: MapNode[];
  completedNodeIds: Set<string>;
  currentNodeId: string | null; // first non-completed node
}
```

### `completeActivityNode(nodeId: string, userId: string)`
Upserts `student_node_progress` with `status = 'completed'`, `completed_at = now()`.

---

## Types

No new type files. Reuses:
- `HackathonPhaseModule` from `types/hackathon-program.ts`
- `MapNode`, `StudentNodeProgress` from `types/map.ts`

One addition to `types/hackathon-program.ts`:
```ts
export interface HackathonJourneyModuleProgress {
  moduleId: string;
  totalNodes: number;
  completedNodes: number;
  currentNodeId: string | null;
  nodes: MapNode[];
  completedNodeIds: Set<string>;
}
```

---

## What Is Removed

- `isPainPointModule` branch in `module/[moduleId].tsx`
- Pain-point AI feedback workspace (problem statement, customer, evidence fields)
- `requestPainPointFeedback` / `buildPainPointFeedbackInput` calls from module screen
- Phases/timeline section from `home.tsx`
- `hackathonAi.ts` imports from module screen (file itself stays, may be used elsewhere)

---

## What Is Not Changed

- Team card on home
- Preview mode fallback (`getPreviewHackathonProgramHome`)
- `HackathonProgramHome` type and fetch logic
- Phase enrollment and `current_phase_id` logic
- `app/hackathon-program/` (light-theme normal-mode version)
- Gate/scope/review metadata display on module detail (scope badges stay)
- `ProgressGateCard` and `ResponsibilityBanner` components (kept on module detail if gate data exists)

---

## Out of Scope

- Bottom cards on home (team rank, rewards) — not designed yet
- NPC conversation UI implementation detail — placeholder for now, full design separate
- Reflection screen changes
- Mentor review flow
