# Architecture

Architectural decisions, patterns discovered, and key conventions.

---

## App Structure

- **Expo Router v6** with file-based routing
- **Root layout:** `app/_layout.tsx` (Stack, auth-based routing)
- **Tab navigation:** `app/(tabs)/` (discover, my-paths, profile)
- **New routes for this mission:**
  - `app/portfolio/index.tsx` — Portfolio builder list
  - `app/portfolio/add.tsx` — Add portfolio item form
  - `app/fit/index.tsx` — Fit browser
  - `app/fit/[roundId].tsx` — Fit detail

## Supabase Patterns

### Client Library (lib/)
- Import `supabase` from `./supabase`
- Named async exports grouped by domain with comment headers
- Auth gating: `const { data: { user } } = await supabase.auth.getUser()`
- Error pattern: `if (error) throw error`
- Edge function invocation: `supabase.functions.invoke("name", { body: {...} })`
- Session-level caching pattern (see `lib/universityInsights.ts`): `Map<string, { data, fetchedAt }>` with TTL check

### Edge Functions (supabase/functions/)
- Deno runtime with `Deno.serve(async (req) => { ... })`
- CORS headers on all responses (including OPTIONS preflight)
- Supabase client created from `Deno.env.get("SUPABASE_URL")` and `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`
- Gemini API for AI: model `gemini-3-flash-preview`, called via fetch
- Import supabase client: `import { createClient } from "jsr:@supabase/supabase-js@2";`

## TCAS Data Model

Existing tables (DO NOT MODIFY):
- `tcas_programs` — program_id (text PK), program_name, program_name_en, faculty_name, embedding (vector)
- `tcas_universities` — university_id (text PK), university_name
- `tcas_admission_rounds` — id (uuid), program_id, round_number, round_type, min_gpax, link, folio_closed_date, receive_seats, description, condition
- `profiles` — id (uuid, FK auth.users), gpax, subject_interests, interest_embedding

New tables (this mission):
- `program_requirements` — Enriched TCAS1 criteria per round (what_they_seek, portfolio_criteria, program_vision, sample_keywords)
- `student_portfolio_items` — Portfolio items per student (item_type, title, description, tags, embedding)
- `program_fit_scores` — Cached fit scores per student per round (eligibility_pass, fit_score, confidence, narrative, gaps)

## Component Patterns

- `AppText` component (`components/AppText.tsx`) for Thai/English font switching
  - Detects Thai characters, applies BaiJamjuree font for Thai, LibreFranklin for English
  - Supports `variant` prop: "regular" (default) or "bold"
- Latin text uses Libre Franklin (`LibreFranklin_400Regular` / `LibreFranklin_700Bold`); prefer `AppText` for Thai-aware defaults
- `LinearGradient` from `expo-linear-gradient` for hero sections (dark purple gradient: `["#1E0A3C", "#4C1D95"]`)
- `useSafeAreaInsets()` from `react-native-safe-area-context` for safe area padding

## Scoring Algorithm

```
Confidence levels:
  high   = portfolio items exist AND program_requirements exist
  medium = program_requirements exist but no portfolio items
  low    = no requirements (GPAX + semantic only)

Fit score formula:
  high confidence:   30% semantic + 70% AI portfolio alignment (Gemini)
  medium confidence: semantic similarity score
  low confidence:    50% GPAX eligibility bonus + 50% semantic

Eligibility gate:
  If GPAX < min_gpax → eligibility_pass = false, fit_score = 0
```
