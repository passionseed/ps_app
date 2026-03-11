# TCAS Data Layer & Student Profile Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the app to real TCAS data (universities, programs, admission rounds) and enrich the student profile, replacing mock journey data with a real persistent data layer.

**Architecture:** Extend the existing `profiles` table with TCAS-relevant fields (GPAX, budget, interests). Create a new `student_journeys` table to replace `mockPathData.ts`. Add Supabase RPC functions for vector search, text search, and eligibility filtering on TCAS tables. Update existing screens to read from real data.

**Tech Stack:** Supabase (PostgreSQL + pgvector), TypeScript, Expo Router, React Native

**Design System Reference:**
- Background: `#FDFFF5`, Text: `#111`, Accent: `#BFFF00` / `#9FE800`
- Font: `Orbit_400Regular` with explicit `fontWeight`
- All Supabase calls follow patterns in `lib/pathlab.ts` (named exports, camelCase, action-verb prefixes)
- Types use PascalCase, go in `types/` directory

---

## Chunk 1: Database Migrations & RPC Functions

### Task 1: Extend profiles table with TCAS fields

**Files:**
- Create: `supabase/migrations/20260311000001_add_tcas_profile_fields.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260311000001_add_tcas_profile_fields.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gpax numeric NULL
    CONSTRAINT gpax_range CHECK (gpax >= 0 AND gpax <= 4),
  ADD COLUMN IF NOT EXISTS budget_per_year integer NULL
    CONSTRAINT budget_positive CHECK (budget_per_year > 0),
  ADD COLUMN IF NOT EXISTS preferred_location text NULL,
  ADD COLUMN IF NOT EXISTS subject_interests text[] NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interest_embedding vector(1024) NULL,
  ADD COLUMN IF NOT EXISTS tcas_profile_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.gpax IS 'Student cumulative GPAX (0-4 scale)';
COMMENT ON COLUMN public.profiles.budget_per_year IS 'Maximum tuition budget in THB per year';
COMMENT ON COLUMN public.profiles.preferred_location IS 'Preferred province/region for university';
COMMENT ON COLUMN public.profiles.subject_interests IS 'Array of subject interest tags';
COMMENT ON COLUMN public.profiles.interest_embedding IS '1024-dim bge-m3 embedding computed from activity + interests';
COMMENT ON COLUMN public.profiles.tcas_profile_completed IS 'Whether student completed the TCAS profile quiz';
```

- [ ] **Step 2: Apply migration locally**

Run: `cd /Users/bunyasit/dev/pseed && npx supabase db push` (or `npx supabase migration up` depending on local setup)
Expected: Migration applies cleanly, profiles table has new columns.

- [ ] **Step 3: Verify columns exist**

Run: Check in Supabase Studio (localhost:54323) that `profiles` table shows the new columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260311000001_add_tcas_profile_fields.sql
git commit -m "feat(db): extend profiles table with TCAS fields (gpax, budget, interests)"
```

---

### Task 2: Create student_journeys table

**Files:**
- Create: `supabase/migrations/20260311000002_create_student_journeys.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260311000002_create_student_journeys.sql

CREATE TABLE public.student_journeys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  title text NOT NULL,
  career_goal text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores jsonb NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT student_journeys_pkey PRIMARY KEY (id),
  CONSTRAINT student_journeys_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT student_journeys_source_check CHECK (source IN ('ai_generated', 'manual'))
);

-- Indexes
CREATE INDEX idx_student_journeys_student_id ON public.student_journeys(student_id);
CREATE INDEX idx_student_journeys_active ON public.student_journeys(student_id) WHERE is_active = true;

-- Updated_at trigger (reuse existing function from profiles)
CREATE TRIGGER update_student_journeys_updated_at
  BEFORE UPDATE ON public.student_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.student_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own journeys"
  ON public.student_journeys FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own journeys"
  ON public.student_journeys FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update own journeys"
  ON public.student_journeys FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Users can delete own journeys"
  ON public.student_journeys FOR DELETE
  USING (auth.uid() = student_id);

COMMENT ON TABLE public.student_journeys IS 'Career journey plans created by AI or manually by students';
COMMENT ON COLUMN public.student_journeys.steps IS 'Ordered JSON array: [{type, tcas_program_id, label, details}]';
COMMENT ON COLUMN public.student_journeys.scores IS 'Match scores: {passion, future, world}';
```

- [ ] **Step 2: Apply migration locally**

Run: Apply via Supabase CLI.
Expected: Table created with RLS policies.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260311000002_create_student_journeys.sql
git commit -m "feat(db): create student_journeys table with RLS"
```

---

### Task 3: Create TCAS search RPC functions

**Files:**
- Create: `supabase/migrations/20260311000003_create_tcas_rpc_functions.sql`

**Context:** The `tcas_programs` table has columns: `id`, `university_id`, `faculty_name`, `program_name`, `degree`, `total_seats`, `cost_per_semester`, `embedding` (vector(1024)), `projection_2d` (float8[2]), `search_text` (tsvector), plus text description fields. The `tcas_admission_rounds` table has: `id`, `program_id`, `round_type`, `project_name`, `seats`, `min_gpax`, `min_total_score`, `score_weights`, etc.

- [ ] **Step 1: Write the RPC functions**

```sql
-- supabase/migrations/20260311000003_create_tcas_rpc_functions.sql

-- 1. Vector similarity search for programs
CREATE OR REPLACE FUNCTION public.match_programs_by_interest(
  query_embedding vector(1024),
  match_limit integer DEFAULT 20,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  university_id uuid,
  faculty_name text,
  program_name text,
  degree text,
  total_seats integer,
  cost_per_semester numeric,
  projection_2d float8[],
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.university_id,
    p.faculty_name,
    p.program_name,
    p.degree,
    p.total_seats,
    p.cost_per_semester,
    p.projection_2d,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM tcas_programs p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > similarity_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- 2. Full-text search for programs (Thai + English)
CREATE OR REPLACE FUNCTION public.search_programs_text(
  query text,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  university_id uuid,
  university_name text,
  faculty_name text,
  program_name text,
  degree text,
  total_seats integer,
  cost_per_semester numeric,
  rank float4
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsquery_val tsquery;
BEGIN
  -- Build tsquery from plain text (handles Thai and English)
  tsquery_val := plainto_tsquery('simple', query);

  RETURN QUERY
  SELECT
    p.id,
    p.university_id,
    u.name AS university_name,
    p.faculty_name,
    p.program_name,
    p.degree,
    p.total_seats,
    p.cost_per_semester,
    ts_rank(p.search_text, tsquery_val) AS rank
  FROM tcas_programs p
  JOIN tcas_universities u ON u.id = p.university_id
  WHERE p.search_text @@ tsquery_val
  ORDER BY ts_rank(p.search_text, tsquery_val) DESC
  LIMIT result_limit;
END;
$$;

-- 3. Filter programs by GPAX eligibility
CREATE OR REPLACE FUNCTION public.filter_eligible_programs(
  student_gpax numeric,
  filter_university_id uuid DEFAULT NULL,
  filter_round_type text DEFAULT NULL,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  program_id uuid,
  university_name text,
  faculty_name text,
  program_name text,
  degree text,
  round_type text,
  project_name text,
  seats integer,
  min_gpax numeric,
  cost_per_semester numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS program_id,
    u.name AS university_name,
    p.faculty_name,
    p.program_name,
    p.degree,
    ar.round_type,
    ar.project_name,
    ar.seats,
    ar.min_gpax,
    p.cost_per_semester
  FROM tcas_admission_rounds ar
  JOIN tcas_programs p ON p.id = ar.program_id
  JOIN tcas_universities u ON u.id = p.university_id
  WHERE (ar.min_gpax IS NULL OR ar.min_gpax <= student_gpax)
    AND (filter_university_id IS NULL OR p.university_id = filter_university_id)
    AND (filter_round_type IS NULL OR ar.round_type = filter_round_type)
  ORDER BY u.name, p.faculty_name, p.program_name
  LIMIT result_limit;
END;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.match_programs_by_interest TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_programs_text TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.filter_eligible_programs TO authenticated, anon;
```

- [ ] **Step 2: Apply migration locally**

Run: Apply via Supabase CLI.
Expected: All 3 functions created and callable.

- [ ] **Step 3: Test RPC functions via Supabase Studio**

Run SQL in Supabase Studio:
```sql
-- Test text search
SELECT * FROM search_programs_text('วิศวกรรม', 5);

-- Test eligibility (3.5 GPAX)
SELECT * FROM filter_eligible_programs(3.5, NULL, NULL, 5);
```
Expected: Returns matching rows from TCAS data (if data is seeded).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260311000003_create_tcas_rpc_functions.sql
git commit -m "feat(db): add TCAS RPC functions (vector search, text search, eligibility)"
```

---

## Chunk 2: TypeScript Types & Client Library

### Task 4: Create TCAS types

**Files:**
- Create: `types/tcas.ts`

**Context:** Follow the same patterns as `types/university.ts` and `types/pathlab.ts` — named exports, PascalCase interfaces.

- [ ] **Step 1: Write the types file**

```typescript
// types/tcas.ts

export interface TcasUniversity {
  id: string;
  name: string;
  name_en: string | null;
  type: string | null;
  province: string | null;
  logo_url: string | null;
}

export interface TcasProgram {
  id: string;
  university_id: string;
  faculty_name: string;
  program_name: string;
  degree: string | null;
  total_seats: number | null;
  cost_per_semester: number | null;
  projection_2d: [number, number] | null;
  // Joined fields (from RPC results)
  university_name?: string;
  similarity?: number;
  rank?: number;
}

export interface TcasAdmissionRound {
  id: string;
  program_id: string;
  round_type: string;
  project_name: string | null;
  seats: number | null;
  min_gpax: number | null;
  min_total_score: number | null;
  score_weights: Record<string, number> | null;
  has_interview: boolean | null;
  has_portfolio: boolean | null;
  eligibility_conditions: string | null;
}

export interface TcasProgramWithRounds extends TcasProgram {
  university: TcasUniversity;
  admission_rounds: TcasAdmissionRound[];
}

export interface EligibleProgram {
  program_id: string;
  university_name: string;
  faculty_name: string;
  program_name: string;
  degree: string | null;
  round_type: string;
  project_name: string | null;
  seats: number | null;
  min_gpax: number | null;
  cost_per_semester: number | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/tcas.ts
git commit -m "feat(types): add TCAS type definitions"
```

---

### Task 5: Create journey types

**Files:**
- Create: `types/journey.ts`

**Context:** Replaces the inline types from `lib/mockPathData.ts`. Should be compatible with the `student_journeys` table schema.

- [ ] **Step 1: Write the types file**

```typescript
// types/journey.ts

export type JourneyStepType = "university" | "internship" | "job";
export type JourneySource = "ai_generated" | "manual";

export interface JourneyStep {
  type: JourneyStepType;
  tcas_program_id: string | null;
  label: string;
  details: {
    university_name?: string;
    faculty_name?: string;
    company_type?: string;
    salary_range?: string;
    description?: string;
  };
}

export interface JourneyScores {
  passion: number;
  future: number;
  world: number;
}

export interface StudentJourney {
  id: string;
  student_id: string;
  title: string;
  career_goal: string;
  source: JourneySource;
  steps: JourneyStep[];
  scores: JourneyScores | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateJourneyInput {
  title: string;
  career_goal: string;
  source: JourneySource;
  steps: JourneyStep[];
  scores?: JourneyScores;
}

export interface UpdateJourneyInput {
  title?: string;
  career_goal?: string;
  steps?: JourneyStep[];
  scores?: JourneyScores;
  is_active?: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/journey.ts
git commit -m "feat(types): add StudentJourney type definitions"
```

---

### Task 6: Create TCAS client library

**Files:**
- Create: `lib/tcas.ts`

**Context:** Follow patterns from `lib/pathlab.ts` and `lib/universityInsights.ts` — named exports, camelCase functions, uses `supabase` client from `lib/supabase.ts`.

- [ ] **Step 1: Write the client library**

```typescript
// lib/tcas.ts

import { supabase } from "./supabase";
import type {
  TcasProgram,
  TcasUniversity,
  TcasProgramWithRounds,
  TcasAdmissionRound,
  EligibleProgram,
} from "../types/tcas";

/**
 * Full-text search for TCAS programs (Thai + English).
 * Uses the search_programs_text RPC function.
 */
export async function searchPrograms(
  query: string,
  limit = 20
): Promise<TcasProgram[]> {
  const { data, error } = await supabase.rpc("search_programs_text", {
    query,
    result_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as TcasProgram[];
}

/**
 * Vector similarity search using a pre-computed embedding.
 * Used when we have an interest embedding from student profile or search query.
 */
export async function matchProgramsByInterest(
  queryEmbedding: number[],
  limit = 20,
  threshold = 0.3
): Promise<TcasProgram[]> {
  const { data, error } = await supabase.rpc("match_programs_by_interest", {
    query_embedding: queryEmbedding,
    match_limit: limit,
    similarity_threshold: threshold,
  });
  if (error) throw error;
  return (data ?? []) as TcasProgram[];
}

/**
 * Filter programs by GPAX eligibility.
 * Optionally filter by university and/or round type.
 */
export async function getEligiblePrograms(
  gpax: number,
  universityId?: string,
  roundType?: string,
  limit = 50
): Promise<EligibleProgram[]> {
  const { data, error } = await supabase.rpc("filter_eligible_programs", {
    student_gpax: gpax,
    filter_university_id: universityId ?? null,
    filter_round_type: roundType ?? null,
    result_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as EligibleProgram[];
}

/**
 * Get a single program with its university and all admission rounds.
 */
export async function getProgramDetail(
  programId: string
): Promise<TcasProgramWithRounds | null> {
  const { data: program, error: pErr } = await supabase
    .from("tcas_programs")
    .select("*")
    .eq("id", programId)
    .single();
  if (pErr || !program) return null;

  const [uniResult, roundsResult] = await Promise.all([
    supabase
      .from("tcas_universities")
      .select("*")
      .eq("id", program.university_id)
      .single(),
    supabase
      .from("tcas_admission_rounds")
      .select("*")
      .eq("program_id", programId)
      .order("round_type"),
  ]);

  return {
    ...program,
    university: uniResult.data as TcasUniversity,
    admission_rounds: (roundsResult.data ?? []) as TcasAdmissionRound[],
  } as TcasProgramWithRounds;
}

/**
 * Get all programs for a specific university.
 */
export async function getUniversityPrograms(
  universityId: string
): Promise<TcasProgram[]> {
  const { data, error } = await supabase
    .from("tcas_programs")
    .select("*")
    .eq("university_id", universityId)
    .order("faculty_name");
  if (error) throw error;
  return (data ?? []) as TcasProgram[];
}

/**
 * Get all universities (for dropdowns, search).
 */
export async function getAllUniversities(): Promise<TcasUniversity[]> {
  const { data, error } = await supabase
    .from("tcas_universities")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as TcasUniversity[];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/tcas.ts
git commit -m "feat(lib): add TCAS client library with search, matching, and eligibility"
```

---

### Task 7: Rewrite journey.ts to use real data

**Files:**
- Modify: `lib/journey.ts` (currently 134 lines)

**Context:** Currently fetches from `journey_simulations` table and assembles board data. Needs to switch to `student_journeys` table and use the new `StudentJourney` type. Keep the same export names where possible so screen changes are minimal.

- [ ] **Step 1: Read the current file to confirm exact function signatures**

Read: `lib/journey.ts`

- [ ] **Step 2: Rewrite journey.ts**

Replace the file contents. Key changes:
- Import from `types/journey.ts` instead of inline types
- Query `student_journeys` table instead of `journey_simulations`
- Add CRUD functions: `createJourney`, `updateJourney`, `deleteJourney`
- Keep `getFullJourneyBoardData` for backward compat but source from new table

```typescript
// lib/journey.ts

import { supabase } from "./supabase";
import type {
  StudentJourney,
  CreateJourneyInput,
  UpdateJourneyInput,
} from "../types/journey";

/**
 * Get all journeys for the current user.
 */
export async function getStudentJourneys(): Promise<StudentJourney[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentJourney[];
}

/**
 * Get active journeys only.
 */
export async function getActiveJourneys(): Promise<StudentJourney[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("student_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentJourney[];
}

/**
 * Get a single journey by ID.
 */
export async function getJourneyById(
  journeyId: string
): Promise<StudentJourney | null> {
  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("id", journeyId)
    .single();

  if (error) return null;
  return data as StudentJourney;
}

/**
 * Create a new journey.
 */
export async function createJourney(
  input: CreateJourneyInput
): Promise<StudentJourney> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("student_journeys")
    .insert({
      student_id: user.id,
      title: input.title,
      career_goal: input.career_goal,
      source: input.source,
      steps: input.steps,
      scores: input.scores ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudentJourney;
}

/**
 * Update an existing journey.
 */
export async function updateJourney(
  journeyId: string,
  input: UpdateJourneyInput
): Promise<StudentJourney> {
  const { data, error } = await supabase
    .from("student_journeys")
    .update(input)
    .eq("id", journeyId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentJourney;
}

/**
 * Delete a journey.
 */
export async function deleteJourney(journeyId: string): Promise<void> {
  const { error } = await supabase
    .from("student_journeys")
    .delete()
    .eq("id", journeyId);

  if (error) throw error;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/bunyasit/dev/ps_app && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors in journey.ts or its imports.

- [ ] **Step 4: Commit**

```bash
git add lib/journey.ts
git commit -m "feat(lib): rewrite journey.ts to use student_journeys table"
```

---

## Chunk 3: Profile Enrichment & Onboarding

### Task 8: Add profile TCAS functions to lib/onboarding.ts

**Files:**
- Modify: `lib/onboarding.ts` (currently 131 lines)

**Context:** Currently has `getProfile()`, `saveProfileStep()`, etc. Add functions for the TCAS-specific profile fields.

- [ ] **Step 1: Read current file**

Read: `lib/onboarding.ts` to confirm exact current exports.

- [ ] **Step 2: Add TCAS profile functions at the end of the file**

Append to `lib/onboarding.ts`:

```typescript
/**
 * Save TCAS profile fields (GPAX, budget, location, interests).
 */
export async function saveTcasProfile(
  userId: string,
  data: {
    gpax?: number | null;
    budget_per_year?: number | null;
    preferred_location?: string | null;
    subject_interests?: string[];
  }
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      tcas_profile_completed: true,
    })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Get TCAS profile fields for a user.
 */
export async function getTcasProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gpax, budget_per_year, preferred_location, subject_interests, tcas_profile_completed")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/onboarding.ts
git commit -m "feat(lib): add TCAS profile save/get functions"
```

---

### Task 9: Create TCAS profile quiz screen

**Files:**
- Create: `app/onboarding/StepTcasProfile.tsx`

**Context:** Follow the exact patterns from existing onboarding steps (`StepProfile.tsx`, `StepInterests.tsx`). Each step receives `userId` and `onComplete` callback. Uses the project design system.

The quiz collects: GPAX (numeric input), budget range (picker), preferred location (picker), subject interests (multi-select chips).

- [ ] **Step 1: Write the component**

```typescript
// app/onboarding/StepTcasProfile.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { saveTcasProfile } from "../../lib/onboarding";

const BUDGET_OPTIONS = [
  { label: "ไม่จำกัด", value: null },
  { label: "ไม่เกิน 50,000 บาท/ปี", value: 50000 },
  { label: "ไม่เกิน 100,000 บาท/ปี", value: 100000 },
  { label: "ไม่เกิน 200,000 บาท/ปี", value: 200000 },
  { label: "มากกว่า 200,000 บาท/ปี", value: 300000 },
];

const LOCATION_OPTIONS = [
  "ไม่จำกัด",
  "กรุงเทพฯ และปริมณฑล",
  "ภาคเหนือ",
  "ภาคตะวันออกเฉียงเหนือ",
  "ภาคกลาง",
  "ภาคใต้",
  "ภาคตะวันออก",
];

const SUBJECT_INTERESTS = [
  "คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย",
  "สังคมศึกษา", "ศิลปะ", "ดนตรี", "คอมพิวเตอร์",
  "ธุรกิจ", "กีฬา", "สุขศึกษา", "เกษตร",
];

interface Props {
  userId: string;
  onComplete: () => void;
}

export default function StepTcasProfile({ userId, onComplete }: Props) {
  const [gpax, setGpax] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [location, setLocation] = useState("ไม่จำกัด");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (subject: string) => {
    setInterests((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const gpaxNum = gpax ? parseFloat(gpax) : null;
      if (gpaxNum !== null && (gpaxNum < 0 || gpaxNum > 4)) {
        setSaving(false);
        return; // Invalid GPAX — could add error UI
      }
      await saveTcasProfile(userId, {
        gpax: gpaxNum,
        budget_per_year: budget,
        preferred_location: location === "ไม่จำกัด" ? null : location,
        subject_interests: interests,
      });
      onComplete();
    } catch {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>ข้อมูล TCAS ของคุณ</Text>
      <Text style={styles.subtitle}>
        เพื่อแนะนำโปรแกรมที่เหมาะกับคุณ
      </Text>

      {/* GPAX Input */}
      <Text style={styles.label}>เกรดเฉลี่ยสะสม (GPAX)</Text>
      <TextInput
        style={styles.input}
        placeholder="เช่น 3.50"
        keyboardType="decimal-pad"
        value={gpax}
        onChangeText={setGpax}
        maxLength={4}
      />

      {/* Budget Picker */}
      <Text style={styles.label}>งบประมาณค่าเล่าเรียน</Text>
      <View style={styles.chipRow}>
        {BUDGET_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[styles.chip, budget === opt.value && styles.chipSelected]}
            onPress={() => setBudget(opt.value)}
          >
            <Text
              style={[
                styles.chipText,
                budget === opt.value && styles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location Picker */}
      <Text style={styles.label}>ทำเลที่ต้องการ</Text>
      <View style={styles.chipRow}>
        {LOCATION_OPTIONS.map((loc) => (
          <TouchableOpacity
            key={loc}
            style={[styles.chip, location === loc && styles.chipSelected]}
            onPress={() => setLocation(loc)}
          >
            <Text
              style={[
                styles.chipText,
                location === loc && styles.chipTextSelected,
              ]}
            >
              {loc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subject Interests */}
      <Text style={styles.label}>วิชาที่สนใจ (เลือกได้หลายข้อ)</Text>
      <View style={styles.chipRow}>
        {SUBJECT_INTERESTS.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={[
              styles.chip,
              interests.includes(subject) && styles.chipSelected,
            ]}
            onPress={() => toggleInterest(subject)}
          >
            <Text
              style={[
                styles.chipText,
                interests.includes(subject) && styles.chipTextSelected,
              ]}
            >
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.saveBtnText}>บันทึก</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  content: { padding: 24, paddingBottom: 48 },
  title: {
    fontFamily: "Orbit_400Regular",
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  label: {
    fontFamily: "Orbit_400Regular",
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    fontFamily: "Orbit_400Regular",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
  },
  chipSelected: {
    backgroundColor: "#BFFF00",
    borderColor: "#9FE800",
  },
  chipText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
    color: "#555",
  },
  chipTextSelected: { color: "#111", fontWeight: "600" },
  saveBtn: {
    marginTop: 32,
    backgroundColor: "#BFFF00",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
});
```

- [ ] **Step 2: Wire into onboarding flow**

Modify: `app/onboarding/index.tsx`

Add `"tcas_profile"` step to the step array (after `"interests"` or `"careers"`), and render `StepTcasProfile` when active. The step should only show for `education_level === "high_school"` users.

- [ ] **Step 3: Verify the screen renders**

Run: `pnpm start`, navigate to onboarding flow, confirm the TCAS profile step appears and saves correctly.

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/StepTcasProfile.tsx app/onboarding/index.tsx
git commit -m "feat(onboarding): add TCAS profile quiz step"
```

---

## Chunk 4: Screen Updates — Replace Mock Data

### Task 10: Update my-paths.tsx to use real journeys

**Files:**
- Modify: `app/(tabs)/my-paths.tsx` (currently 269 lines)

**Context:** Currently imports `MOCK_PATH_DATA` from `lib/mockPathData.ts` and renders a horizontal carousel. Replace with real data from `getActiveJourneys()`.

- [ ] **Step 1: Read the current file**

Read: `app/(tabs)/my-paths.tsx` — confirm exact mock data usage points.

- [ ] **Step 2: Replace mock import with real data fetch**

Key changes:
1. Remove `import { MOCK_PATH_DATA } from "../../lib/mockPathData"`
2. Add `import { getActiveJourneys } from "../../lib/journey"`
3. Add `import type { StudentJourney } from "../../types/journey"`
4. Add state: `const [journeys, setJourneys] = useState<StudentJourney[]>([])`
5. Add `useEffect` to fetch journeys on mount
6. Add loading state
7. Update the carousel to render `journeys` instead of `MOCK_PATH_DATA`
8. Update `CareerPathCard` to accept `StudentJourney` shape

The card rendering changes:
- `path.label` → `journey.title`
- `path.careerGoal` → `journey.career_goal`
- `path.steps` → `journey.steps` (same structure now)
- `path.confidence` → compute from `journey.scores` (avg of passion/future/world)
- `path.status` → derive from `journey.is_active`

- [ ] **Step 3: Test the screen**

Run: `pnpm start`, navigate to My Paths tab.
Expected: Empty state shows if no journeys exist. If test journeys were inserted manually, they appear in the carousel.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/my-paths.tsx
git commit -m "feat(my-paths): replace mock data with real student_journeys"
```

---

### Task 11: Update university compare screen to use real TCAS programs

**Files:**
- Modify: `app/university/compare.tsx` (currently 437 lines)

**Context:** Currently populates university dropdowns from mock path data. Replace with real `tcas_universities` + `tcas_programs` data.

- [ ] **Step 1: Read the current file**

Read: `app/university/compare.tsx` — confirm dropdown population logic.

- [ ] **Step 2: Replace mock dropdown data with real TCAS data**

Key changes:
1. Remove mock path data imports
2. Add `import { getAllUniversities, getUniversityPrograms } from "../../lib/tcas"`
3. Fetch universities on mount
4. When university selected, fetch its programs
5. Update dropdown options to show `university.name` → `program.faculty_name - program.program_name`
6. When a program is selected, fetch insights using existing `fetchUniversityInsights` with real names

- [ ] **Step 3: Test the comparison flow**

Run: Navigate to university compare, select from real universities.
Expected: Dropdowns show real universities and programs.

- [ ] **Step 4: Commit**

```bash
git add app/university/compare.tsx
git commit -m "feat(university): populate compare screen with real TCAS programs"
```

---

### Task 12: Update university detail screen to show admission rounds

**Files:**
- Modify: `app/university/[key].tsx` (currently 525 lines)

**Context:** Currently shows AI insights only. Enhance with real admission round data from `tcas_admission_rounds` for the selected program.

- [ ] **Step 1: Read the current file**

Read: `app/university/[key].tsx` — confirm current data flow.

- [ ] **Step 2: Add admission rounds section**

Key changes:
1. Add `import { getProgramDetail } from "../../lib/tcas"`
2. Alongside existing `fetchUniversityInsights` call, also call `getProgramDetail` if a `tcas_program_id` is passed in params
3. Add a new "รอบการรับสมัคร" (Admission Rounds) section showing:
   - Round type (Portfolio, Quota, Admission, Direct)
   - Project name
   - Seats available
   - Min GPAX requirement
   - Score weights (if any)
4. Style following existing section patterns (section header with accent bar)

- [ ] **Step 3: Test the detail screen**

Run: Navigate to a university detail page.
Expected: Admission rounds section appears below existing content.

- [ ] **Step 4: Commit**

```bash
git add app/university/[key].tsx
git commit -m "feat(university): show real TCAS admission rounds on detail screen"
```

---

### Task 13: Remove mockPathData.ts dependency

**Files:**
- Modify: `lib/mockPathData.ts` — deprecate or delete
- Check: All files that import from it

- [ ] **Step 1: Search for all imports of mockPathData**

Run: `grep -r "mockPathData" --include="*.ts" --include="*.tsx" -l`

- [ ] **Step 2: Remove or update all remaining imports**

For each file still importing `mockPathData`:
- If it's a screen we already updated (my-paths, compare), verify import is gone
- If there are other consumers, update them to use `lib/journey.ts` or `lib/tcas.ts`

- [ ] **Step 3: Delete or mark mockPathData.ts as deprecated**

If no imports remain:
```bash
git rm lib/mockPathData.ts
```

If some non-critical references remain, add a deprecation comment at the top:
```typescript
/** @deprecated Use lib/journey.ts and types/journey.ts instead */
```

- [ ] **Step 4: Verify build passes**

Run: `cd /Users/bunyasit/dev/ps_app && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No import errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove mockPathData dependency, use real TCAS data"
```

---

## Chunk 5: Seed Data & Verification

### Task 14: Create seed script for test journeys

**Files:**
- Create: `scripts/seed-test-journeys.ts`

**Context:** We need test data to verify the screens work. Insert 2-3 sample journeys using real TCAS program IDs.

- [ ] **Step 1: Write the seed script**

```typescript
// scripts/seed-test-journeys.ts
// Run: npx tsx scripts/seed-test-journeys.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function seed() {
  // Get a real user ID from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .single();

  if (!profile) {
    console.error("No user found. Sign in first.");
    return;
  }

  // Get some real TCAS programs
  const { data: programs } = await supabase
    .from("tcas_programs")
    .select("id, university_id, faculty_name, program_name")
    .limit(3);

  if (!programs || programs.length === 0) {
    console.error("No TCAS programs found. Run scrapers first.");
    return;
  }

  const journeys = [
    {
      student_id: profile.id,
      title: "แผน A: สายออกแบบ",
      career_goal: "UX Designer",
      source: "manual",
      steps: [
        {
          type: "university",
          tcas_program_id: programs[0]?.id ?? null,
          label: programs[0]?.program_name ?? "Program",
          details: {
            university_name: "Silpakorn University",
            faculty_name: programs[0]?.faculty_name ?? "Faculty",
          },
        },
        {
          type: "internship",
          tcas_program_id: null,
          label: "UX Intern at Agoda",
          details: { company_type: "Tech", salary_range: "15,000-20,000" },
        },
        {
          type: "job",
          tcas_program_id: null,
          label: "UX Designer",
          details: { company_type: "Tech", salary_range: "45,000-65,000" },
        },
      ],
      scores: { passion: 85, future: 70, world: 60 },
      is_active: true,
    },
  ];

  const { error } = await supabase.from("student_journeys").insert(journeys);
  if (error) {
    console.error("Seed failed:", error.message);
  } else {
    console.log(`Seeded ${journeys.length} test journey(s)`);
  }
}

seed();
```

- [ ] **Step 2: Run the seed script**

Run: `cd /Users/bunyasit/dev/ps_app && npx tsx scripts/seed-test-journeys.ts`
Expected: "Seeded 1 test journey(s)"

- [ ] **Step 3: Verify end-to-end**

Run: `pnpm start`, navigate through:
1. My Paths tab → should show the seeded journey card
2. Tap a university step → should navigate to university detail with real data
3. University compare → dropdowns should list real TCAS universities

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-test-journeys.ts
git commit -m "feat(scripts): add test journey seed script"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Extend profiles table | 1 migration |
| 2 | Create student_journeys table | 1 migration |
| 3 | TCAS RPC functions | 1 migration |
| 4 | TCAS types | `types/tcas.ts` |
| 5 | Journey types | `types/journey.ts` |
| 6 | TCAS client library | `lib/tcas.ts` |
| 7 | Rewrite journey.ts | `lib/journey.ts` |
| 8 | TCAS profile functions | `lib/onboarding.ts` |
| 9 | TCAS profile quiz screen | `app/onboarding/StepTcasProfile.tsx` + `index.tsx` |
| 10 | My Paths → real data | `app/(tabs)/my-paths.tsx` |
| 11 | Compare → real TCAS | `app/university/compare.tsx` |
| 12 | Detail → admission rounds | `app/university/[key].tsx` |
| 13 | Remove mockPathData | `lib/mockPathData.ts` |
| 14 | Test seed script | `scripts/seed-test-journeys.ts` |

**Total:** 14 tasks across 5 chunks. Tasks 1-3 (DB) must go first. Tasks 4-7 (types/lib) depend on DB. Tasks 8-9 (profile) and 10-13 (screens) can run in parallel. Task 14 verifies everything.
