# Hackathon Wrapped — Backend & Data Model

> Context doc for building the web admin viewer. Covers where data lives, how it gets there, and what shape it's in.

---

## What It Is

**Hackathon Wrapped** is a "Spotify Wrapped"-style personality/archetype experience for hackathon participants. After completing **Phase 1**, a participant answers **6 reflective prompts** and receives:

- A computed **archetype** (e.g. *The Empath*, *The Architect*, *The Pivot-Forcer*)
- A **best ally** recommendation (complementary archetype)
- **Phase 2 hints** tailored to their archetype (superpower + growth edge)
- A **Squad Constellation** view showing teammates' archetypes plotted on a 2D MM/SB axes chart
- Auto-inferred **Phase 2 stats**: ideas killed, primary testing method, biggest surprise

---

## Architecture Summary

| Layer | Approach |
|-------|----------|
| **Compute** | Entirely client-side (React Native) |
| **Storage** | Direct Supabase client queries — no dedicated API or Edge Functions |
| **Table** | `wrapped_reflections` (see schema below) |
| **Upsert key** | `(enrollment_id, participant_id)` — re-taking overwrites previous data |

All scoring, archetype classification, best-ally lookup, and Phase 2 heuristics happen in the app. The backend is just a single Supabase table.

---

## Database Schema

### `wrapped_reflections`

| Column | Type | Notes |
|--------|------|-------|
| `enrollment_id` | `string` (FK) | Hackathon program enrollment |
| `participant_id` | `string` (FK) | Hackathon participant |
| `archetype` | `string` | Primary archetype ID |
| `archetype_secondary` | `string` | Runner-up archetype ID (used when user taps "Not me") |
| `axes` | `jsonb` | `{ MM: number, SB: number, PR: number, SQ: number }` — each -1 to +1 |
| `surprise_evidence` | `string` | Free-text answer to "What surprised you?" |
| `phase1_title` | `string` | User's one-line title for Phase 1 (max 80 chars) |
| `archetype_fit` | `enum` | `nailed` / `sort_of` / `not_me` — how well the user felt the archetype fit |
| `phase2_cycles_run` | `number` | Unused, defaults 0 |
| `phase2_primary_method` | `string` | Inferred testing method (e.g. `Wizard of Oz`, `Paper Prototype`, `Concierge MVP`, `Figma Mockup`) |
| `phase2_ideas_killed` | `number` | Inferred count of kill/pivot mentions from gate/synthesize submissions |
| `phase2_surprise` | `string` | Inferred surprise text from test/surprise activity answers |
| `created_at` | `timestamptz` | ISO string |

> **Note:** This table was created directly in the Supabase dashboard. There is **no migration file** for it in `supabase/migrations/` yet.

---

## Data Flow

### 1. Generation (Client-Side)

Prompt responses are collected in `WrappedModal.tsx`:

| Prompt | Type | Axis | How Stored |
|--------|------|------|------------|
| `p1` | Slider (0-4) | MM | `axes.MM` (blended) |
| `p2` | Slider (0-4) | SB | `axes.SB` (blended) |
| `p3` | Multi-select (6 options) | SQ + MM | `axes.SQ`, `axes.MM` (blended) |
| `p4` | Drag-rank (3 of 6 items) | PR | `axes.PR` (blended) |
| `p5` | Free text (optional) | — | `surprise_evidence` |
| `p6` | One-line title (optional, 80 chars) | — | `phase1_title` |

**Score computation** (`lib/wrapped/archetypes.ts`):

1. Compute raw axis scores from prompts:
   - `computeMMAxis(p1Slider, p3Selections)`
   - `computeSBAxis(p2Slider)`
   - `computeSQAxis(p3Selections)`
   - `computePRAxis(p4RankedIndices)`

2. Compute **activity signals** from the participant's submission history (`hackathon_participant_submissions`):
   - 5+ evidence uploads → MM -0.30 (Micro)
   - System map submission → MM +0.30 (Macro)
   - Decision Gate "Proceed" → SB +0.30 (Believer)
   - Decision Gate "Pivot"/"Kill" → SB -0.30 (Skeptic)
   - Late/clustered submissions → PR +0.20 (Restless)
   - Evenly distributed submissions → PR -0.20 (Patient)
   - Solo reflection → SQ -0.20 (Solo)

3. **Blend**: 65% prompt scores + 35% activity signals, clamped to [-1, 1]

**Archetype classification**:
- 8 named archetypes + 1 fallback (`wanderer`)
- Each archetype has a sign vector `{ mm, sb, pr, sq }` where each is -1, 0, or +1
- Scores are converted to signs using `NEUTRAL_THRESHOLD = 0.25`
- Exact match first → Hamming distance for extremes → `wanderer` fallback

**Phase 2 heuristics** (inferred from existing submissions):
- `phase2IdeasKilled`: Count of `kill`/`pivot` mentions in gate/synthesize submissions
- `phase2PrimaryMethod`: Detected from method/prototype submissions
- `phase2Surprise`: Extracted from test/surprise activity answers

### 2. Storage

On reaching the final `SummaryCard` (step 13), the app calls:

```ts
// lib/wrapped/saveReflection.ts
await supabase
  .from("wrapped_reflections")
  .upsert(reflection, { onConflict: "enrollment_id,participant_id" });
```

This overwrites any previous reflection for the same participant/enrollment pair.

### 3. Retrieval

**Individual reflection**: Query by `enrollment_id` + `participant_id`.

**Teammate reflections** (`lib/hackathonProgram.ts`):

```ts
const { data, error } = await supabase
  .from("wrapped_reflections")
  .select("participant_id, archetype, phase1_title, axes")
  .eq("enrollment_id", enrollmentId)
  .neq("participant_id", currentParticipantId);
```

Then joins `hackathon_participants` to get names.

---

## TypeScript Interfaces

```ts
// lib/wrapped/archetypes.ts

interface AxisScores {
  mm: number;  // Micro (-1) ↔ Macro (+1)
  sb: number;  // Skeptic (-1) ↔ Believer (+1)
  pr: number;  // Patient (-1) ↔ Restless (+1)
  sq: number;  // Solo (-1) ↔ Squad (+1)
}

type ArchetypeId =
  | "the-empath"
  | "the-advocate"
  | "the-interrogator"
  | "the-mythbuster"
  | "the-architect"
  | "the-synthesizer"
  | "the-auditor"
  | "the-pivot-forcer"
  | "wanderer";

type ArchetypeFit = "nailed" | "sort_of" | "not_me";

interface WrappedReflection {
  enrollment_id: string;
  archetype: ArchetypeId;
  archetype_secondary: ArchetypeId;
  axes: { MM: number; SB: number; PR: number; SQ: number };
  surprise_evidence: string;
  phase1_title: string;
  archetype_fit: ArchetypeFit;
  phase2_cycles_run?: number;
  phase2_primary_method?: string;
  phase2_ideas_killed?: number;
  phase2_surprise?: string;
  created_at: string;
}

// For squad constellation display
interface TeammateWrappedReflection {
  participantId: string;
  name: string;
  archetypeId: ArchetypeId;
  phase1Title: string;
  mm: number;
  sb: number;
}
```

---

## Static Lookup Tables (Client-Side)

These are hardcoded in the app — no DB tables. If the admin viewer needs to display them, replicate these lookups.

### Archetypes

Full definitions in `lib/wrapped/archetypes.ts`. Each has:
- `id`, `display` (en/th), `caption` (en/th), `persona` (en/th), `bgmPrompt`
- `sqDynamic`: different copy for solo vs squad orientation
- `signs`: `{ mm, sb, pr, sq }` vector for classification

### Best Ally

`lib/wrapped/bestAlly.ts` — curated partner mapping:

| Archetype | Best Ally |
|-----------|-----------|
| The Empath | The Architect |
| The Advocate | The Systems Auditor |
| The Interrogator | The Synthesizer |
| The Mythbuster | The Empath |
| The Architect | The Empath |
| The Synthesizer | The Interrogator |
| The Systems Auditor | The Advocate |
| The Pivot-Forcer | The Architect |
| Wanderer | The Synthesizer |

### Phase 2 Hints

`lib/wrapped/phase2Hints.ts` — per-archetype superpower + growth edge (en/th).

---

## Query Patterns for Admin Viewer

### List all reflections for an enrollment

```sql
SELECT *
FROM wrapped_reflections
WHERE enrollment_id = '...'
ORDER BY created_at DESC;
```

### Join with participant names

```sql
SELECT
  wr.*,
  hp.name AS participant_name,
  hp.team_id
FROM wrapped_reflections wr
JOIN hackathon_participants hp ON wr.participant_id = hp.id
WHERE wr.enrollment_id = '...';
```

### Aggregate archetype distribution

```sql
SELECT
  archetype,
  COUNT(*) AS count,
  ROUND(AVG(axes->>'MM')::numeric, 2) AS avg_mm,
  ROUND(AVG(axes->>'SB')::numeric, 2) AS avg_sb,
  ROUND(AVG(axes->>'PR')::numeric, 2) AS avg_pr,
  ROUND(AVG(axes->>'SQ')::numeric, 2) AS avg_sq
FROM wrapped_reflections
WHERE enrollment_id = '...'
GROUP BY archetype;
```

### Team constellation data

```sql
SELECT
  wr.participant_id,
  hp.name,
  wr.archetype,
  wr.phase1_title,
  (wr.axes->>'MM')::float AS mm,
  (wr.axes->>'SB')::float AS sb
FROM wrapped_reflections wr
JOIN hackathon_participants hp ON wr.participant_id = hp.id
WHERE wr.enrollment_id = '...'
  AND hp.team_id = '...';
```

---

## Key Files

| File | What It Does |
|------|--------------|
| `lib/wrapped/archetypes.ts` | Axis scoring, activity signal computation, archetype classification |
| `lib/wrapped/prompts.ts` | Prompt definitions, option weights, BGM prompts |
| `lib/wrapped/saveReflection.ts` | Supabase upsert for `wrapped_reflections` |
| `lib/wrapped/bestAlly.ts` | Best-ally lookup table |
| `lib/wrapped/phase2Hints.ts` | Per-archetype Phase 2 hints |
| `lib/hackathonProgram.ts` | `getTeammateWrappedReflections()` — reads teammate data |
| `lib/hackathonParticipantSubmissions.ts` | `fetchParticipantSubmissionsDashboard()` — source for Phase 2 heuristics |
| `components/Wrapped/WrappedModal.tsx` | Main orchestrator — collects prompts, computes scores, calls save |

---

## Gotchas for Admin

1. **No server-side API** — The web admin should query Supabase directly (same as the app) or you can create new Edge Functions.
2. **Phase 2 heuristics are client-computed** — `phase2_ideas_killed`, `phase2_primary_method`, `phase2_surprise` are calculated in `WrappedModal.tsx` from submission data before being saved. They are not recomputed on the backend.
3. **Missing migration** — `wrapped_reflections` is not in `supabase/migrations/`. If you need to replicate the schema elsewhere, derive it from this doc or the production table.
4. **SQ axis is stored but not used for classification** — The 8 named archetypes all have `sq: 0` in their sign vectors. SQ only affects the `wanderer` fallback and the dynamic `sqDynamic` copy.
5. **Re-taking overwrites** — Because of the `upsert` on `(enrollment_id, participant_id)`, there is only ever one reflection row per participant per enrollment.
