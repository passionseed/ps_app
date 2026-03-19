# TCAS1 Portfolio Fit Engine — Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let grade 11-12 students enter their portfolio (projects, awards, activities) and see how well they align with each TCAS Round 1 (portfolio round) program — including a fit score, gap analysis, and hidden gem program discovery.

**Architecture:** Four sequential phases: (1) DB migration adding three new tables, (2) enrichment pipeline script that crawls each TCAS1 program's admission page and uses Claude to extract structured requirements, (3) a new `portfolio-fit` Supabase edge function that scores a student's portfolio against programs, (4) UI screens for portfolio building and program fit browsing. The scoring degrades gracefully: full score when portfolio + requirements exist, eligibility-only when neither exists.

**Tech Stack:** Expo Router v6, Supabase (PostgreSQL + pgvector + Edge Functions), Deno (edge functions), TypeScript, Playwright (crawling), Anthropic API (Claude), React Native.

---

## File Map

### New Files — Created in this plan

| File | Purpose |
|---|---|
| `supabase/migrations/20260313000000_tcas1_portfolio.sql` | 3 new tables + RLS + indexes |
| `types/portfolio.ts` | TypeScript types for portfolio items, fit scores, requirements |
| `scripts/enrich-tcas1-requirements.ts` | Crawl TCAS1 links → Claude extract → write `program_requirements` |
| `supabase/functions/portfolio-fit/index.ts` | Edge function: score student vs programs + discover hidden gems |
| `lib/portfolioFit.ts` | Client library: CRUD portfolio items, get fit scores, invalidate cache |
| `app/portfolio/index.tsx` | Portfolio builder list screen |
| `app/portfolio/add.tsx` | Add/edit portfolio item form |
| `app/fit/index.tsx` | Program fit browser (sorted list) |
| `app/fit/[roundId].tsx` | Fit breakdown detail screen |
| `tests/portfolio-fit.ts` | Integration test script for scoring logic |
| `tests/enrichment.ts` | Smoke test for enrichment output quality |

### Modified Files

| File | What changes |
|---|---|
| `app/(tabs)/profile.tsx` | Add "My Portfolio" row linking to `/portfolio` |
| `app/university/[key].tsx` | Show fit score badge on TCAS1 rounds if scores exist |

---

## Chunk 1: Database Foundation

### Task 1: Write and apply the migration

**Files:**
- Create: `supabase/migrations/20260313000000_tcas1_portfolio.sql`

- [ ] **Step 1.1: Write the migration**

```sql
-- supabase/migrations/20260313000000_tcas1_portfolio.sql

-- ─────────────────────────────────────────────────────────────
-- 1. program_requirements
--    Enriched TCAS1 admission criteria per round.
--    Populated by scripts/enrich-tcas1-requirements.ts
-- ─────────────────────────────────────────────────────────────
create table if not exists public.program_requirements (
  id                  uuid primary key default gen_random_uuid(),
  round_id            uuid not null references public.tcas_admission_rounds(id) on delete cascade,
  program_id          text not null references public.tcas_programs(program_id) on delete cascade,
  what_they_seek      text,           -- free-text: type of student/project they want
  portfolio_criteria  jsonb,          -- ["project portfolio", "essay", "interview"]
  program_vision      text,           -- faculty mission / culture from uni site
  sample_keywords     text[],         -- signal words from admission materials
  source_urls         text[],         -- where data was crawled from (audit trail)
  enrichment_version  int not null default 1,
  enriched_at         timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (round_id)
);

create index idx_program_requirements_program on public.program_requirements(program_id);

create trigger set_updated_at before update on public.program_requirements
  for each row execute function public.handle_updated_at();

alter table public.program_requirements enable row level security;
create policy "public_read" on public.program_requirements
  for select to authenticated, anon using (true);
create policy "service_write" on public.program_requirements
  for all to service_role using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 2. student_portfolio_items
--    Portfolio items manually added by the student.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.student_portfolio_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  item_type           text not null check (item_type in ('project','award','activity','course','other')),
  title               text not null,
  description         text,
  date_from           date,
  date_to             date,
  tags                text[] not null default '{}',
  embedding           vector(1024),   -- bge-m3 embedding, computed async after insert
  source              text not null default 'manual' check (source in ('manual','pathlab_auto')),
  pathlab_journey_id  uuid,           -- FK if auto-pulled from PathLab
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint date_order check (date_from is null or date_to is null or date_from <= date_to),
  constraint title_length check (char_length(title) <= 200),
  constraint description_length check (char_length(description) <= 2000)
);

create index idx_portfolio_items_user on public.student_portfolio_items(user_id);
create index idx_portfolio_items_user_type on public.student_portfolio_items(user_id, item_type);

create trigger set_updated_at before update on public.student_portfolio_items
  for each row execute function public.handle_updated_at();

alter table public.student_portfolio_items enable row level security;
create policy "own_select" on public.student_portfolio_items
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.student_portfolio_items
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.student_portfolio_items
  for update using (auth.uid() = user_id);
create policy "own_delete" on public.student_portfolio_items
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. program_fit_scores
--    Cached fit scores per student per TCAS1 round.
--    Invalidated when student adds/removes portfolio items.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.program_fit_scores (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  round_id            uuid not null references public.tcas_admission_rounds(id) on delete cascade,
  program_id          text not null references public.tcas_programs(program_id),
  eligibility_pass    boolean not null,
  fit_score           int check (fit_score >= 0 and fit_score <= 100),
  confidence          text not null default 'low' check (confidence in ('low','medium','high')),
  narrative           text,           -- AI-generated explanation (may be null)
  gaps                jsonb,          -- [{gap: "community impact", suggestion: "..."}]
  portfolio_snapshot  jsonb,          -- snapshot of portfolio at scoring time (for debug)
  scored_at           timestamptz not null default now(),
  score_version       int not null default 1,
  unique (user_id, round_id)
);

create index idx_fit_scores_user on public.program_fit_scores(user_id, scored_at desc);
create index idx_fit_scores_user_score on public.program_fit_scores(user_id, fit_score desc);

alter table public.program_fit_scores enable row level security;
create policy "own_select" on public.program_fit_scores
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.program_fit_scores
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.program_fit_scores
  for update using (auth.uid() = user_id);
create policy "service_write" on public.program_fit_scores
  for all to service_role using (true) with check (true);
```

- [ ] **Step 1.2: Apply the migration**

```bash
cd /path/to/pseed   # the web project that runs supabase
npx supabase db push
```

If local Supabase is running (from pseed project), apply directly:
```bash
npx supabase db reset  # or use migration apply
```

Verify tables exist:
```bash
npx supabase db diff --schema public | grep -E 'program_requirements|student_portfolio_items|program_fit_scores'
```
Expected: no diff (tables already applied).

- [ ] **Step 1.3: Commit**

```bash
git add supabase/migrations/20260313000000_tcas1_portfolio.sql
git commit -m "feat(db): add portfolio items, program requirements, and fit scores tables"
```

---

### Task 2: Add TypeScript types

**Files:**
- Create: `types/portfolio.ts`

- [ ] **Step 2.1: Write the types**

```typescript
// types/portfolio.ts

export type PortfolioItemType = 'project' | 'award' | 'activity' | 'course' | 'other';
export type FitConfidence = 'low' | 'medium' | 'high';

export interface StudentPortfolioItem {
  id: string;
  user_id: string;
  item_type: PortfolioItemType;
  title: string;
  description: string | null;
  date_from: string | null;   // ISO date string 'YYYY-MM-DD'
  date_to: string | null;
  tags: string[];
  embedding: number[] | null;
  source: 'manual' | 'pathlab_auto';
  pathlab_journey_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewPortfolioItem {
  item_type: PortfolioItemType;
  title: string;
  description?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

export interface ProgramRequirements {
  id: string;
  round_id: string;
  program_id: string;
  what_they_seek: string | null;
  portfolio_criteria: string[] | null;
  program_vision: string | null;
  sample_keywords: string[] | null;
  source_urls: string[] | null;
  enrichment_version: number;
  enriched_at: string;
}

export interface FitGap {
  gap: string;           // e.g. "community impact"
  suggestion: string;    // e.g. "Add your volunteer work or group projects"
}

export interface ProgramFitScore {
  id: string;
  user_id: string;
  round_id: string;
  program_id: string;
  eligibility_pass: boolean;
  fit_score: number;     // 0-100
  confidence: FitConfidence;
  narrative: string | null;
  gaps: FitGap[] | null;
  portfolio_snapshot: Record<string, unknown> | null;
  scored_at: string;
  score_version: number;
}

// Returned by edge function — includes program info for display
export interface FitScoreResult extends ProgramFitScore {
  program_name: string;
  program_name_en: string | null;
  faculty_name: string;
  university_name: string;
  university_id: string;
  round_type: string;
  round_number: number;
  project_name: string | null;
  receive_seats: number | null;
  min_gpax: number | null;
  folio_closed_date: string | null;
  link: string | null;
}
```

- [ ] **Step 2.2: Commit**

```bash
git add types/portfolio.ts
git commit -m "feat(types): add portfolio item, fit score, and program requirements types"
```

---

## Chunk 2: Enrichment Pipeline

**Goal:** Crawl each TCAS Round 1 admission page → ask Claude to extract what the program looks for → store in `program_requirements`.

**Run:** `npx tsx scripts/enrich-tcas1-requirements.ts`
**Prerequisites:** `.env.local` must have `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.

### Task 3: Write the enrichment script

**Files:**
- Create: `scripts/enrich-tcas1-requirements.ts`

- [ ] **Step 3.1: Write the script**

```typescript
// scripts/enrich-tcas1-requirements.ts
// Run: npx tsx scripts/enrich-tcas1-requirements.ts
// Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY in .env.local

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const DELAY_MS = 2000; // 2s between requests per domain — be respectful
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = process.argv.includes("--limit")
  ? parseInt(process.argv[process.argv.indexOf("--limit") + 1])
  : 9999;

// ── Types ──────────────────────────────────────────────────────────────
interface RoundRow {
  id: string;
  program_id: string;
  round_type: string;
  round_number: number;
  project_name: string | null;
  link: string | null;
  description: string | null;
  condition: string | null;
  program: {
    program_name: string;
    faculty_name: string | null;
    university: { university_name: string };
  };
}

interface ExtractedRequirements {
  what_they_seek: string;
  portfolio_criteria: string[];
  program_vision: string;
  sample_keywords: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function crawlPage(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "PassionSeedBot/1.0 (educational research; contact: support@passionseed.app)",
  });

  try {
    const response = await page.goto(url, {
      timeout: 20000,
      waitUntil: "domcontentloaded",
    });

    if (!response || response.status() >= 400) {
      throw new Error(`HTTP ${response?.status() ?? "no response"}`);
    }

    // Extract main content — strip nav, footer, scripts
    const text = await page.evaluate(() => {
      const remove = document.querySelectorAll(
        "script, style, nav, footer, header, .sidebar, .menu",
      );
      remove.forEach((el) => el.remove());
      return document.body?.innerText?.slice(0, 8000) ?? "";
    });

    return text;
  } finally {
    await browser.close();
  }
}

async function extractWithClaude(
  pageText: string,
  round: RoundRow,
): Promise<ExtractedRequirements | null> {
  const programName = round.program.program_name;
  const facultyName = round.program.faculty_name ?? "";
  const uniName = round.program.university.university_name;
  const existingDesc = round.description ?? "";
  const existingCondition = round.condition ?? "";

  const prompt = `You are analyzing Thai university TCAS Round 1 (portfolio round) admission requirements.

Program: ${programName}
Faculty: ${facultyName}
University: ${uniName}
Existing description: ${existingDesc}
Existing conditions: ${existingCondition}

Page content from the admission URL:
---
${pageText.slice(0, 6000)}
---

Extract what this program looks for in TCAS1 portfolio applicants. Return ONLY valid JSON matching this schema:
{
  "what_they_seek": "string — 2-4 sentences describing the type of student and projects this program values",
  "portfolio_criteria": ["array", "of", "required portfolio components, e.g. 'project portfolio', 'essay', 'interview', 'certificate'"],
  "program_vision": "string — 1-2 sentences about what this faculty/program is about and its values",
  "sample_keywords": ["keywords", "that signal good fit, e.g. 'leadership', 'STEM', 'community service'"]
}

If the page contains no useful admission information, return:
{"what_they_seek": "", "portfolio_criteria": [], "program_vision": "", "sample_keywords": []}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  // Extract JSON from response (handle markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in Claude response: ${text.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]) as ExtractedRequirements;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 TCAS1 Requirements Enrichment Pipeline`);
  console.log(`   Dry run: ${DRY_RUN}, Limit: ${LIMIT}\n`);

  if (!ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Fetch all TCAS Round 1 rounds that have a link and haven't been enriched yet
  const { data: rounds, error } = await supabase
    .from("tcas_admission_rounds")
    .select(`
      id,
      program_id,
      round_type,
      round_number,
      project_name,
      link,
      description,
      condition,
      program:tcas_programs (
        program_name,
        faculty_name,
        university:tcas_universities ( university_name )
      )
    `)
    .eq("round_number", 1)
    .not("link", "is", null)
    .limit(LIMIT);

  if (error) {
    console.error("❌ Failed to fetch rounds:", error.message);
    process.exit(1);
  }

  if (!rounds || rounds.length === 0) {
    console.log("ℹ️  No TCAS1 rounds found. Make sure TCAS data is seeded.");
    return;
  }

  // Filter out already-enriched rounds
  const { data: existing } = await supabase
    .from("program_requirements")
    .select("round_id");
  const enrichedIds = new Set((existing ?? []).map((r) => r.round_id));

  const toEnrich = rounds.filter((r) => !enrichedIds.has(r.id));
  console.log(
    `📋 ${rounds.length} Round 1 programs | ${enrichedIds.size} already enriched | ${toEnrich.length} to process\n`,
  );

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < toEnrich.length; i++) {
    const round = toEnrich[i] as unknown as RoundRow;
    const label = `[${i + 1}/${toEnrich.length}] ${round.program.university.university_name} / ${round.program.faculty_name ?? "?"} / ${round.program.program_name}`;

    console.log(`⏳ ${label}`);

    if (!round.link) {
      console.log(`   ↳ skipped (no link)\n`);
      skipCount++;
      continue;
    }

    try {
      // Crawl page
      const pageText = await crawlPage(round.link);
      console.log(`   ↳ crawled ${pageText.length} chars`);

      // Extract with Claude
      const extracted = await extractWithClaude(pageText, round);
      if (!extracted) {
        console.log(`   ↳ skipped (Claude returned null)\n`);
        skipCount++;
        continue;
      }

      const hasContent =
        extracted.what_they_seek.length > 0 ||
        extracted.portfolio_criteria.length > 0;
      console.log(
        `   ↳ extracted: "${extracted.what_they_seek.slice(0, 60)}..." | criteria: ${extracted.portfolio_criteria.length} | keywords: ${extracted.sample_keywords.length}`,
      );

      if (DRY_RUN) {
        console.log(`   ↳ [dry run] would write to program_requirements\n`);
        successCount++;
        continue;
      }

      const { error: writeError } = await supabase
        .from("program_requirements")
        .upsert({
          round_id: round.id,
          program_id: round.program_id,
          what_they_seek: extracted.what_they_seek || null,
          portfolio_criteria:
            extracted.portfolio_criteria.length > 0
              ? extracted.portfolio_criteria
              : null,
          program_vision: extracted.program_vision || null,
          sample_keywords:
            extracted.sample_keywords.length > 0
              ? extracted.sample_keywords
              : null,
          source_urls: [round.link],
          enrichment_version: 1,
          enriched_at: new Date().toISOString(),
        });

      if (writeError) {
        console.error(`   ↳ ❌ DB write failed: ${writeError.message}\n`);
        errorCount++;
      } else {
        console.log(`   ↳ ✅ saved${hasContent ? "" : " (empty — no info on page)"}\n`);
        successCount++;
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("403") || msg.includes("401")) {
        console.log(`   ↳ ⚠️  access denied (${msg.slice(0, 60)})\n`);
      } else {
        console.log(`   ↳ ❌ error: ${msg.slice(0, 100)}\n`);
      }
      errorCount++;
    }

    // Rate limit — be polite to university servers
    if (i < toEnrich.length - 1) await sleep(DELAY_MS);
  }

  console.log(
    `\n✅ Done: ${successCount} enriched | ${skipCount} skipped | ${errorCount} errors`,
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
```

- [ ] **Step 3.2: Run a dry-run on 5 programs to verify crawling works**

```bash
npx tsx scripts/enrich-tcas1-requirements.ts --dry-run --limit 5
```

Expected output:
```
🌱 TCAS1 Requirements Enrichment Pipeline
   Dry run: true, Limit: 5

⏳ [1/5] จุฬาลงกรณ์มหาวิทยาลัย / ...
   ↳ crawled XXXX chars
   ↳ extracted: "..."
   ↳ [dry run] would write to program_requirements

✅ Done: 5 enriched | 0 skipped | 0 errors
```

If you see errors: check that `ANTHROPIC_API_KEY` is set in `.env.local`. If a specific university blocks crawling (403), that's expected — the script skips gracefully.

- [ ] **Step 3.3: Run enrichment for real (first 20 programs to validate)**

```bash
npx tsx scripts/enrich-tcas1-requirements.ts --limit 20
```

Check the DB after:
```bash
# In pseed project or via Supabase dashboard
npx supabase db remote changes
```

Or via a quick script:
```bash
npx tsx -e "
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await s.from('program_requirements').select('*', { count: 'exact', head: true });
console.log('program_requirements rows:', count);
"
```

- [ ] **Step 3.4: Write enrichment smoke test**

Create `tests/enrichment.ts`:
```typescript
// tests/enrichment.ts
// Run: npx tsx tests/enrichment.ts
// Checks that enrichment data is usable for scoring

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  console.log("🔍 Checking program_requirements data quality...\n");

  const { data, error } = await supabase
    .from("program_requirements")
    .select("round_id, program_id, what_they_seek, portfolio_criteria, sample_keywords")
    .limit(10);

  if (error) {
    console.error("❌ Query failed:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error("❌ No program_requirements rows found. Run enrichment script first.");
    process.exit(1);
  }

  console.log(`✅ Found ${data.length} enriched programs (showing first 10)`);

  let hasContent = 0;
  for (const row of data) {
    const filled = [row.what_they_seek, row.portfolio_criteria?.length, row.sample_keywords?.length]
      .filter(Boolean).length;
    if (filled > 0) hasContent++;
    console.log(`   round_id=${row.round_id.slice(0, 8)}... fields_filled=${filled}/3`);
  }

  const pct = Math.round((hasContent / data.length) * 100);
  if (pct < 30) {
    console.warn(`⚠️  Only ${pct}% of enriched programs have content — check crawling quality`);
  } else {
    console.log(`✅ ${pct}% of programs have useful content`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
```

Run it:
```bash
npx tsx tests/enrichment.ts
```
Expected: `✅ Found N enriched programs` with >30% having content.

- [ ] **Step 3.5: Commit**

```bash
git add scripts/enrich-tcas1-requirements.ts tests/enrichment.ts
git commit -m "feat(scripts): add TCAS1 requirements enrichment pipeline with Claude extraction"
```

---

## Chunk 3: Scoring Edge Function + Client Library

### Task 4: Write the `portfolio-fit` edge function

**Files:**
- Create: `supabase/functions/portfolio-fit/index.ts`

**Scoring algorithm:**

```
Confidence levels:
  high   = portfolio items exist AND program_requirements exist
  medium = program_requirements exist but no portfolio items (interests-only)
  low    = no requirements (GPAX + semantic only)

Fit score formula:
  high confidence:   30% semantic + 70% AI portfolio alignment
  medium confidence: 40% semantic + 60% interest tag overlap
  low confidence:    50% GPAX eligibility bonus + 50% semantic

Eligibility gate:
  If GPAX < min_gpax → eligibility_pass = false, fit_score = 0
  (Still stored so UI can explain why)
```

- [ ] **Step 4.1: Write the edge function**

```typescript
// supabase/functions/portfolio-fit/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SCORE_VERSION = 1;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Helpers ─────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function sanitize(s: unknown, maxLen = 500): string {
  return String(s ?? "")
    .replace(/[\r\n<>]/g, " ")
    .slice(0, maxLen);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function isCacheFresh(scoredAt: string): boolean {
  return Date.now() - new Date(scoredAt).getTime() < CACHE_MAX_AGE_MS;
}

// ── AI scoring ──────────────────────────────────────────────────────────

interface AiScoringResult {
  alignment_score: number;  // 0-100
  gaps: Array<{ gap: string; suggestion: string }>;
  narrative: string;
}

async function scoreWithClaude(params: {
  portfolioItems: Array<{ item_type: string; title: string; description: string | null; tags: string[] }>;
  requirements: { what_they_seek: string | null; portfolio_criteria: string[] | null; program_vision: string | null; sample_keywords: string[] | null };
  programName: string;
  facultyName: string;
  universityName: string;
}): Promise<AiScoringResult> {
  const portfolioText = params.portfolioItems
    .map((p) => `[${p.item_type.toUpperCase()}] ${p.title}: ${p.description ?? ""}`)
    .join("\n");

  const prompt = `You are evaluating a Thai high school student's portfolio for TCAS Round 1 (portfolio round) admission.

Program: ${sanitize(params.programName)}
Faculty: ${sanitize(params.facultyName)}
University: ${sanitize(params.universityName)}

What this program looks for:
${sanitize(params.requirements.what_they_seek ?? "Not specified", 500)}

Required portfolio components: ${JSON.stringify(params.requirements.portfolio_criteria ?? [])}
Key values/keywords: ${JSON.stringify(params.requirements.sample_keywords ?? [])}

Student's portfolio:
${portfolioText.slice(0, 2000)}

Score the student's portfolio fit for this program. Return ONLY valid JSON:
{
  "alignment_score": <integer 0-100>,
  "narrative": "<2-3 sentences in Thai explaining fit — be specific about what aligns>",
  "gaps": [
    {"gap": "<missing element>", "suggestion": "<concrete action in Thai>"}
  ]
}

Rules:
- alignment_score 80-100 = strong fit, portfolio directly demonstrates program values
- alignment_score 50-79 = moderate fit, some relevant experience but gaps exist
- alignment_score 0-49 = weak fit, portfolio doesn't demonstrate program's needs
- Limit gaps to the 2-3 most important missing elements
- Write narrative and suggestions in Thai`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in Claude response`);
  return JSON.parse(jsonMatch[0]);
}

// ── Route: POST /portfolio-fit ───────────────────────────────────────────
// Score a student against an array of TCAS1 round IDs.
// Returns array of FitScoreResult, writing to program_fit_scores as a side effect.

async function handleScore(req: Request): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth — get user from JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { round_ids?: string[]; force_refresh?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const { round_ids = [], force_refresh = false } = body;
  if (!Array.isArray(round_ids) || round_ids.length === 0) {
    return json({ error: "round_ids must be a non-empty array" }, 400);
  }
  if (round_ids.length > 50) {
    return json({ error: "Max 50 round_ids per request" }, 400);
  }

  // Fetch student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("gpax, subject_interests, interest_embedding")
    .eq("id", user.id)
    .single();

  const studentGpax: number | null = profile?.gpax ?? null;
  const studentEmbedding: number[] | null = profile?.interest_embedding ?? null;

  // Fetch student portfolio
  const { data: portfolioItems } = await supabase
    .from("student_portfolio_items")
    .select("id, item_type, title, description, tags, embedding")
    .eq("user_id", user.id);

  const items = portfolioItems ?? [];

  // Check cache — return cached results where fresh
  const { data: cached } = await supabase
    .from("program_fit_scores")
    .select("*")
    .eq("user_id", user.id)
    .eq("score_version", SCORE_VERSION)
    .in("round_id", round_ids);

  const cachedByRound = new Map<string, Record<string, unknown>>();
  for (const c of cached ?? []) {
    if (!force_refresh && isCacheFresh(c.scored_at)) {
      cachedByRound.set(c.round_id, c);
    }
  }

  const toScore = round_ids.filter((id) => !cachedByRound.has(id));

  // Fetch round details for rounds we need to score
  const results: Record<string, unknown>[] = [...cachedByRound.values()];

  if (toScore.length > 0) {
    const { data: rounds } = await supabase
      .from("tcas_admission_rounds")
      .select(`
        id, program_id, round_type, round_number, project_name,
        receive_seats, min_gpax, folio_closed_date, link,
        program:tcas_programs (
          program_name, program_name_en, faculty_name,
          embedding,
          university:tcas_universities ( university_name, university_id )
        )
      `)
      .in("id", toScore);

    const { data: requirements } = await supabase
      .from("program_requirements")
      .select("round_id, what_they_seek, portfolio_criteria, program_vision, sample_keywords")
      .in("round_id", toScore);

    const reqByRound = new Map(
      (requirements ?? []).map((r) => [r.round_id, r])
    );

    for (const round of rounds ?? []) {
      const prog = round.program as any;
      const uni = prog?.university as any;
      const req = reqByRound.get(round.id);
      const programEmbedding: number[] | null = prog?.embedding ?? null;

      // Hard eligibility gate
      const eligibilityPass =
        !round.min_gpax ||
        round.min_gpax === 0 ||
        (studentGpax !== null && studentGpax >= round.min_gpax);

      if (!eligibilityPass) {
        const row = {
          user_id: user.id,
          round_id: round.id,
          program_id: round.program_id,
          eligibility_pass: false,
          fit_score: 0,
          confidence: "low",
          narrative: `GPAX ขั้นต่ำ ${round.min_gpax} — ยังไม่ผ่านเกณฑ์`,
          gaps: [],
          portfolio_snapshot: { items_count: items.length },
          scored_at: new Date().toISOString(),
          score_version: SCORE_VERSION,
        };
        await supabase.from("program_fit_scores").upsert(row, { onConflict: "user_id,round_id" });
        results.push({ ...row, program_name: prog?.program_name, faculty_name: prog?.faculty_name, university_name: uni?.university_name, university_id: uni?.university_id, round_type: round.round_type, round_number: round.round_number, project_name: round.project_name, receive_seats: round.receive_seats, min_gpax: round.min_gpax, folio_closed_date: round.folio_closed_date, link: round.link });
        continue;
      }

      // Semantic similarity
      let semanticScore = 50; // default neutral
      if (studentEmbedding && programEmbedding) {
        const sim = cosineSimilarity(studentEmbedding, programEmbedding);
        semanticScore = Math.round(Math.min(100, Math.max(0, sim * 100)));
      }

      // Determine confidence + AI scoring
      const hasPortfolio = items.length > 0;
      const hasRequirements = !!req?.what_they_seek;

      let fitScore = semanticScore;
      let confidence: "low" | "medium" | "high" = "low";
      let narrative: string | null = null;
      let gaps: Array<{ gap: string; suggestion: string }> = [];

      if (hasPortfolio && hasRequirements) {
        confidence = "high";
        try {
          const aiResult = await scoreWithClaude({
            portfolioItems: items.map((it) => ({
              item_type: it.item_type,
              title: it.title,
              description: it.description,
              tags: it.tags ?? [],
            })),
            requirements: req,
            programName: prog?.program_name ?? "",
            facultyName: prog?.faculty_name ?? "",
            universityName: uni?.university_name ?? "",
          });
          fitScore = Math.round(semanticScore * 0.3 + aiResult.alignment_score * 0.7);
          narrative = aiResult.narrative;
          gaps = aiResult.gaps ?? [];
        } catch (e) {
          // Degrade gracefully — return semantic score without narrative
          console.error("Claude scoring failed:", e);
          confidence = "medium";
          fitScore = semanticScore;
        }
      } else if (hasRequirements) {
        confidence = "medium";
        fitScore = semanticScore;
        narrative = "เพิ่มผลงานพอร์ตโฟลิโอของคุณเพื่อรับการวิเคราะห์ที่ละเอียดยิ่งขึ้น";
      }

      const row = {
        user_id: user.id,
        round_id: round.id,
        program_id: round.program_id,
        eligibility_pass: true,
        fit_score: fitScore,
        confidence,
        narrative,
        gaps,
        portfolio_snapshot: { items_count: items.length, item_titles: items.map((i) => i.title) },
        scored_at: new Date().toISOString(),
        score_version: SCORE_VERSION,
      };

      const { error: writeError } = await supabase
        .from("program_fit_scores")
        .upsert(row, { onConflict: "user_id,round_id" });

      if (writeError) {
        console.error("Fit score write error:", writeError.message, "round_id:", round.id);
      }

      results.push({ ...row, program_name: prog?.program_name, program_name_en: prog?.program_name_en, faculty_name: prog?.faculty_name, university_name: uni?.university_name, university_id: uni?.university_id, round_type: round.round_type, round_number: round.round_number, project_name: round.project_name, receive_seats: round.receive_seats, min_gpax: round.min_gpax, folio_closed_date: round.folio_closed_date, link: round.link });
    }
  }

  return json({ results });
}

// ── Route: GET /portfolio-fit/discover ──────────────────────────────────
// Returns top-N TCAS1 programs the student hasn't viewed yet, sorted by fit.

async function handleDiscover(req: Request): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "5"), 20);

  // Get student's interest embedding
  const { data: profile } = await supabase
    .from("profiles")
    .select("gpax, interest_embedding")
    .eq("id", user.id)
    .single();

  if (!profile?.interest_embedding) {
    return json({ results: [], reason: "Complete your profile to get recommendations" });
  }

  // Get programs the student has already scored (i.e., viewed)
  const { data: alreadyScored } = await supabase
    .from("program_fit_scores")
    .select("round_id")
    .eq("user_id", user.id);

  const seenRoundIds = new Set((alreadyScored ?? []).map((r) => r.round_id));

  // Vector search: find top TCAS1 programs by embedding similarity
  // Use pgvector cosine search via RPC
  const { data: candidates } = await supabase.rpc("search_programs", {
    query_embedding: profile.interest_embedding,
    match_threshold: 0.3,
    match_count: 100,
  });

  if (!candidates || candidates.length === 0) {
    return json({ results: [] });
  }

  // Get TCAS1 round IDs for these programs, filtering unseen
  const programIds = candidates.map((c: { program_id: string }) => c.program_id);
  const { data: rounds } = await supabase
    .from("tcas_admission_rounds")
    .select("id, program_id, min_gpax")
    .in("program_id", programIds)
    .eq("round_number", 1);

  const eligibleRounds = (rounds ?? []).filter((r) => {
    if (seenRoundIds.has(r.id)) return false;
    if (r.min_gpax && r.min_gpax > 0 && profile.gpax && profile.gpax < r.min_gpax) return false;
    return true;
  });

  const topRoundIds = eligibleRounds.slice(0, limit * 3).map((r) => r.id);
  if (topRoundIds.length === 0) return json({ results: [] });

  // Score them using the same endpoint logic (simplified, no AI to keep latency low)
  const scoreResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/portfolio-fit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization") ?? "",
    },
    body: JSON.stringify({ round_ids: topRoundIds }),
  });

  const scoreData = await scoreResp.json();
  const scored = (scoreData.results ?? [])
    .sort((a: { fit_score: number }, b: { fit_score: number }) => b.fit_score - a.fit_score)
    .slice(0, limit);

  return json({ results: scored });
}

// ── Router ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);

  try {
    if (req.method === "POST" && url.pathname.endsWith("/portfolio-fit")) {
      return await handleScore(req);
    }
    if (req.method === "GET" && url.pathname.endsWith("/portfolio-fit/discover")) {
      return await handleDiscover(req);
    }
    return json({ error: "Not found" }, 404);
  } catch (err: any) {
    console.error("portfolio-fit error:", err?.message ?? err);
    return json({ error: "Internal server error" }, 500);
  }
});
```

- [ ] **Step 4.2: Deploy the edge function**

```bash
cd /path/to/pseed   # web project
npx supabase functions deploy portfolio-fit
```

Or locally with:
```bash
npx supabase functions serve portfolio-fit
```

- [ ] **Step 4.3: Commit**

```bash
git add supabase/functions/portfolio-fit/
git commit -m "feat(edge): add portfolio-fit edge function with scoring + discover endpoints"
```

---

### Task 5: Write the client library

**Files:**
- Create: `lib/portfolioFit.ts`

- [ ] **Step 5.1: Write the library**

```typescript
// lib/portfolioFit.ts
import { supabase } from "./supabase";
import type {
  StudentPortfolioItem,
  NewPortfolioItem,
  FitScoreResult,
} from "../types/portfolio";

// Session-level cache — same pattern as universityInsights.ts
const sessionCache = new Map<string, { results: FitScoreResult[]; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

// ── Portfolio CRUD ────────────────────────────────────────────────────────

export async function getPortfolioItems(
  userId: string
): Promise<StudentPortfolioItem[]> {
  const { data, error } = await supabase
    .from("student_portfolio_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentPortfolioItem[];
}

export async function addPortfolioItem(
  userId: string,
  item: NewPortfolioItem
): Promise<StudentPortfolioItem> {
  if (!item.title || item.title.trim().length === 0) {
    throw new Error("Portfolio item title is required");
  }
  if (item.title.length > 200) {
    throw new Error("Title must be 200 characters or less");
  }
  if (item.description && item.description.length > 2000) {
    throw new Error("Description must be 2000 characters or less");
  }

  const { data, error } = await supabase
    .from("student_portfolio_items")
    .insert({
      user_id: userId,
      item_type: item.item_type,
      title: item.title.trim(),
      description: item.description?.trim() ?? null,
      date_from: item.date_from ?? null,
      date_to: item.date_to ?? null,
      tags: item.tags ?? [],
      source: "manual",
    })
    .select("*")
    .single();

  if (error) throw error;

  // Invalidate cached fit scores since portfolio changed
  invalidateFitScores(userId);

  return data as StudentPortfolioItem;
}

export async function deletePortfolioItem(
  userId: string,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from("student_portfolio_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw error;

  invalidateFitScores(userId);
}

// ── Fit Scores ─────────────────────────────────────────────────────────────

export function invalidateFitScores(userId: string): void {
  // Clear all cached results for this user
  for (const key of sessionCache.keys()) {
    if (key.startsWith(userId)) sessionCache.delete(key);
  }
}

export async function getFitScores(
  userId: string,
  roundIds: string[],
  forceRefresh = false
): Promise<FitScoreResult[]> {
  const cacheKey = `${userId}:${roundIds.sort().join(",")}`;

  if (!forceRefresh) {
    const cached = sessionCache.get(cacheKey);
    if (cached && isFresh(cached.fetchedAt)) return cached.results;
  }

  const { data, error } = await supabase.functions.invoke("portfolio-fit", {
    body: { round_ids: roundIds, force_refresh: forceRefresh },
  });

  if (error) throw error;

  const results = (data?.results ?? []) as FitScoreResult[];
  sessionCache.set(cacheKey, { results, fetchedAt: Date.now() });
  return results;
}

export async function getDiscoveredPrograms(
  userId: string,
  limit = 5
): Promise<FitScoreResult[]> {
  const { data, error } = await supabase.functions.invoke(
    `portfolio-fit/discover?limit=${limit}`,
    { method: "GET" } as any
  );

  if (error) throw error;
  return (data?.results ?? []) as FitScoreResult[];
}
```

- [ ] **Step 5.2: Write the integration test**

Create `tests/portfolio-fit.ts`:
```typescript
// tests/portfolio-fit.ts
// Integration test for portfolio fit scoring.
// Run: npx tsx tests/portfolio-fit.ts
// Requires: a real authenticated user in Supabase.
// Set TEST_USER_EMAIL + TEST_USER_PASSWORD in .env.local

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

async function run() {
  console.log("🔍 Portfolio Fit Integration Test\n");

  // Sign in as test user
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    console.log("⚠️  Set TEST_USER_EMAIL + TEST_USER_PASSWORD in .env.local to run full test");
    console.log("   Running schema checks only...\n");
  } else {
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      console.error("❌ Auth failed:", authError.message);
      process.exit(1);
    }
    console.log("✅ Authenticated as test user");
  }

  // Check 1: Tables exist
  const tables = ["program_requirements", "student_portfolio_items", "program_fit_scores"];
  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error?.code === "42P01") {
      console.error(`❌ Table '${table}' does not exist — run migration`);
      process.exit(1);
    }
    console.log(`✅ Table '${table}' exists`);
  }

  // Check 2: TCAS1 rounds exist
  const { data: rounds } = await supabase
    .from("tcas_admission_rounds")
    .select("id, program_id")
    .eq("round_number", 1)
    .limit(5);

  if (!rounds || rounds.length === 0) {
    console.error("❌ No TCAS Round 1 records found — seed TCAS data first");
    process.exit(1);
  }
  console.log(`✅ Found ${rounds.length} TCAS1 rounds (sample)`);

  // Check 3: Edge function is reachable
  const testRoundIds = rounds.slice(0, 2).map((r) => r.id);
  const { data, error: fnError } = await supabase.functions.invoke("portfolio-fit", {
    body: { round_ids: testRoundIds },
  });

  if (fnError) {
    console.error("❌ portfolio-fit edge function error:", fnError.message);
    process.exit(1);
  }

  const results = data?.results ?? [];
  console.log(`✅ Edge function returned ${results.length} results`);

  for (const r of results) {
    const passLabel = r.eligibility_pass ? "✅ eligible" : "❌ ineligible";
    console.log(`   ${r.program_name ?? "?"} — score: ${r.fit_score ?? "?"} (${r.confidence}) ${passLabel}`);
  }

  console.log("\n✅ All checks passed");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
```

Run it:
```bash
npx tsx tests/portfolio-fit.ts
```

Expected: All `✅` lines, edge function returns results.

- [ ] **Step 5.3: Commit**

```bash
git add lib/portfolioFit.ts tests/portfolio-fit.ts
git commit -m "feat(lib): add portfolioFit client library with CRUD and fit score functions"
```

---

## Chunk 4: UI Screens

Design system reminder:
- Background: `#FDFFF5`
- Accent: `#BFFF00` / `#9FE800`
- Purple: `#8B5CF6` / `#4C1D95`
- Font: `Orbit_400Regular`
- Pressed state: `opacity: 0.85, transform: [{ scale: 0.985 }]`
- Section header pattern: 3px purple left accent bar + uppercase spaced text
- Cards: white bg, `borderRadius: 16`, `borderWidth: 1`, `borderColor: 'rgba(0,0,0,0.06)'`

### Task 6: Portfolio builder screens

**Files:**
- Create: `app/portfolio/index.tsx`
- Create: `app/portfolio/add.tsx`

- [ ] **Step 6.1: Write the portfolio list screen**

```tsx
// app/portfolio/index.tsx
import { useEffect, useState, useCallback } from "react";
import {
  View, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import {
  getPortfolioItems,
  deletePortfolioItem,
} from "../../lib/portfolioFit";
import type { StudentPortfolioItem, PortfolioItemType } from "../../types/portfolio";

const TYPE_LABELS: Record<PortfolioItemType, { label: string; emoji: string }> = {
  project: { label: "โปรเจกต์", emoji: "🔨" },
  award: { label: "รางวัล", emoji: "🏆" },
  activity: { label: "กิจกรรม", emoji: "🌱" },
  course: { label: "คอร์ส", emoji: "📚" },
  other: { label: "อื่นๆ", emoji: "📎" },
};

export default function PortfolioScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<StudentPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPortfolioItems(user.id);
      setItems(data);
    } catch (e) {
      console.error("Failed to load portfolio:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload on focus (so new items from add screen appear immediately)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeleting(id);
    try {
      await deletePortfolioItem(user.id, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← กลับ</Text>
        </Pressable>
        <Text style={s.title}>พอร์ตโฟลิโอของฉัน</Text>
        <Pressable
          style={s.addBtn}
          onPress={() => router.push("/portfolio/add")}
        >
          <Text style={s.addBtnText}>+ เพิ่ม</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#8B5CF6" />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} />
          }
          contentContainerStyle={s.list}
        >
          {items.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>ยังไม่มีผลงาน</Text>
              <Text style={s.emptySubtitle}>
                เพิ่มโปรเจกต์ รางวัล หรือกิจกรรมที่คุณทำ{"\n"}
                เพื่อดูว่าเข้ากับโปรแกรมไหนได้บ้าง
              </Text>
              <Pressable
                style={s.emptyBtn}
                onPress={() => router.push("/portfolio/add")}
              >
                <Text style={s.emptyBtnText}>เพิ่มผลงานแรก →</Text>
              </Pressable>
            </View>
          ) : (
            items.map((item) => {
              const meta = TYPE_LABELS[item.item_type];
              return (
                <View key={item.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>{meta.emoji}</Text>
                    <View style={s.cardInfo}>
                      <Text style={s.cardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={s.cardType}>{meta.label}</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        s.deleteBtn,
                        pressed && s.pressed,
                      ]}
                      onPress={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                    >
                      {deleting === item.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text style={s.deleteBtnText}>ลบ</Text>
                      )}
                    </Pressable>
                  </View>
                  {item.description ? (
                    <Text style={s.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  {item.tags.length > 0 ? (
                    <View style={s.tags}>
                      {item.tags.slice(0, 4).map((tag) => (
                        <View key={tag} style={s.tag}>
                          <Text style={s.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  back: { marginRight: 12 },
  backText: { fontSize: 14, color: "#8B5CF6" },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: "#111" },
  addBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  list: { padding: 20, gap: 12 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: "#BFFF00",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#111" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111", lineHeight: 21 },
  cardType: { fontSize: 12, color: "#8B5CF6", fontWeight: "600", marginTop: 2 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  cardDesc: { fontSize: 13, color: "#6B7280", lineHeight: 19 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
```

- [ ] **Step 6.2: Write the add item form screen**

```tsx
// app/portfolio/add.tsx
import { useState } from "react";
import {
  View, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { addPortfolioItem } from "../../lib/portfolioFit";
import type { PortfolioItemType } from "../../types/portfolio";

const TYPES: Array<{ value: PortfolioItemType; label: string; emoji: string }> = [
  { value: "project", label: "โปรเจกต์", emoji: "🔨" },
  { value: "award", label: "รางวัล", emoji: "🏆" },
  { value: "activity", label: "กิจกรรม", emoji: "🌱" },
  { value: "course", label: "คอร์สเรียน", emoji: "📚" },
  { value: "other", label: "อื่นๆ", emoji: "📎" },
];

export default function AddPortfolioItemScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [itemType, setItemType] = useState<PortfolioItemType>("project");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      setError("กรุณาใส่ชื่อผลงาน");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await addPortfolioItem(user.id, {
        item_type: itemType,
        title: title.trim(),
        description: description.trim() || undefined,
        tags,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← ยกเลิก</Text>
          </Pressable>
          <Text style={s.headerTitle}>เพิ่มผลงาน</Text>
          <Pressable
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={s.saveBtnText}>บันทึก</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          {/* Type picker */}
          <View style={s.field}>
            <Text style={s.label}>ประเภท</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeRow}>
              {TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[s.typePill, itemType === t.value && s.typePillActive]}
                  onPress={() => setItemType(t.value)}
                >
                  <Text style={s.typePillEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      s.typePillText,
                      itemType === t.value && s.typePillTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={s.field}>
            <Text style={s.label}>ชื่อผลงาน *</Text>
            <TextInput
              style={s.input}
              placeholder="เช่น เว็บแอปตรวจสอบคุณภาพอากาศ"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
            <Text style={s.charCount}>{title.length}/200</Text>
          </View>

          {/* Description */}
          <View style={s.field}>
            <Text style={s.label}>รายละเอียด</Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder="บอกเล่าสิ่งที่คุณทำ เทคโนโลยีที่ใช้ และผลที่ได้"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
            <Text style={s.charCount}>{description.length}/2000</Text>
          </View>

          {/* Tags */}
          <View style={s.field}>
            <Text style={s.label}>แท็ก (คั่นด้วยจุลภาค)</Text>
            <TextInput
              style={s.input}
              placeholder="เช่น Python, AI, ทีม, ชุมชน"
              placeholderTextColor="#9CA3AF"
              value={tagsInput}
              onChangeText={setTagsInput}
            />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  back: { marginRight: 12 },
  backText: { fontSize: 14, color: "#8B5CF6" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#111" },
  saveBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  form: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: "700", color: "#374151", letterSpacing: 0.5 },
  typeRow: { gap: 10, paddingVertical: 2 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  typePillActive: { borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.08)" },
  typePillEmoji: { fontSize: 16 },
  typePillText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  typePillTextActive: { color: "#8B5CF6" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    fontFamily: "Orbit_400Regular",
  },
  inputMulti: { minHeight: 100, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right" },
  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center" },
});
```

- [ ] **Step 6.3: Commit**

```bash
git add app/portfolio/
git commit -m "feat(ui): add portfolio builder screens (list + add form)"
```

---

### Task 7: Program fit browser

**Files:**
- Create: `app/fit/index.tsx`
- Create: `app/fit/[roundId].tsx`

- [ ] **Step 7.1: Write the fit browser screen**

```tsx
// app/fit/index.tsx
import { useEffect, useState, useCallback } from "react";
import {
  View, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { getFitScores, getDiscoveredPrograms } from "../../lib/portfolioFit";
import type { FitScoreResult } from "../../types/portfolio";

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const color =
    score >= 75 ? "#BFFF00" : score >= 50 ? "#FCD34D" : "#F87171";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.04)",
      }}
    >
      <Text style={{ fontSize: size * 0.3, fontWeight: "800", color }}>
        {score}
      </Text>
    </View>
  );
}

function ProgramCard({
  item,
  onPress,
}: {
  item: FitScoreResult;
  onPress: () => void;
}) {
  const dayDiff = item.folio_closed_date
    ? Math.ceil(
        (new Date(item.folio_closed_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      onPress={onPress}
    >
      <View style={s.cardLeft}>
        {item.eligibility_pass ? (
          <ScoreRing score={item.fit_score} />
        ) : (
          <View style={s.ineligibleRing}>
            <Text style={s.ineligibleText}>✕</Text>
          </View>
        )}
      </View>
      <View style={s.cardRight}>
        <Text style={s.cardProgram} numberOfLines={2}>
          {item.program_name}
        </Text>
        <Text style={s.cardFaculty} numberOfLines={1}>
          {item.faculty_name}
        </Text>
        <Text style={s.cardUni} numberOfLines={1}>
          {item.university_name}
        </Text>
        <View style={s.cardMeta}>
          {item.receive_seats ? (
            <View style={s.metaPill}>
              <Text style={s.metaPillText}>{item.receive_seats} ที่นั่ง</Text>
            </View>
          ) : null}
          {dayDiff !== null && dayDiff > 0 ? (
            <View style={[s.metaPill, s.deadlinePill]}>
              <Text style={[s.metaPillText, s.deadlineText]}>
                ปิด {dayDiff} วัน
              </Text>
            </View>
          ) : null}
          {!item.eligibility_pass ? (
            <View style={[s.metaPill, s.ineligiblePill]}>
              <Text style={[s.metaPillText, s.ineligiblePillText]}>
                GPAX ไม่ผ่าน
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function FitBrowserScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<FitScoreResult[]>([]);
  const [discovered, setDiscovered] = useState<FitScoreResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "eligible">("eligible");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all TCAS1 round IDs for this student's eligible programs
      const { data: rounds } = await supabase
        .from("tcas_admission_rounds")
        .select("id")
        .eq("round_number", 1)
        .limit(50);

      const roundIds = (rounds ?? []).map((r) => r.id);
      if (roundIds.length > 0) {
        const scores = await getFitScores(user.id, roundIds);
        const sorted = [...scores].sort((a, b) => {
          // Eligible first, then by score desc
          if (a.eligibility_pass !== b.eligibility_pass)
            return a.eligibility_pass ? -1 : 1;
          return b.fit_score - a.fit_score;
        });
        setResults(sorted);
      }

      // Load hidden gems
      const gems = await getDiscoveredPrograms(user.id, 5);
      setDiscovered(gems);
    } catch (e) {
      console.error("Fit browser load failed:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "eligible"
    ? results.filter((r) => r.eligibility_pass)
    : results;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← กลับ</Text>
        </Pressable>
        <Text style={s.heroTitle}>ความเหมาะสมของโปรแกรม</Text>
        <Text style={s.heroSubtitle}>รอบ 1 Portfolio</Text>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {(["eligible", "all"] as const).map((f) => (
          <Pressable
            key={f}
            style={[s.tab, filter === f && s.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === "eligible" ? "ผ่านเกณฑ์" : "ทั้งหมด"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#8B5CF6" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.round_id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} />
          }
          ListHeaderComponent={
            discovered.length > 0 ? (
              <View style={s.gemsSection}>
                <View style={s.sectionHeader}>
                  <View style={s.accent} />
                  <Text style={s.sectionTitle}>HIDDEN GEMS สำหรับคุณ</Text>
                </View>
                <Text style={s.gemsSubtitle}>
                  โปรแกรมที่เหมาะกับคุณที่คุณอาจยังไม่เคยเห็น
                </Text>
                {discovered.map((d) => (
                  <ProgramCard
                    key={d.round_id}
                    item={d}
                    onPress={() =>
                      router.push({
                        pathname: "/fit/[roundId]",
                        params: { roundId: d.round_id },
                      })
                    }
                  />
                ))}
                <View style={s.divider} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>
                {filter === "eligible"
                  ? "ไม่พบโปรแกรมที่ผ่านเกณฑ์ GPAX"
                  : "ยังไม่มีข้อมูลคะแนน"}
              </Text>
              <Text style={s.emptySubtitle}>
                {filter === "eligible"
                  ? "ลองดูแท็บ 'ทั้งหมด' หรืออัปเดต GPAX ของคุณ"
                  : "เพิ่มผลงานพอร์ตโฟลิโอเพื่อรับคะแนน"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProgramCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/fit/[roundId]",
                  params: { roundId: item.round_id },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  hero: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  back: { marginBottom: 12 },
  backText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#8B5CF6" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#9CA3AF" },
  tabTextActive: { color: "#8B5CF6" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  cardLeft: { alignItems: "center", justifyContent: "center" },
  cardRight: { flex: 1, gap: 3 },
  cardProgram: { fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 20 },
  cardFaculty: { fontSize: 12, color: "#6B7280" },
  cardUni: { fontSize: 12, color: "#9CA3AF" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  metaPill: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  metaPillText: { fontSize: 11, color: "#4B5563", fontWeight: "600" },
  deadlinePill: { backgroundColor: "rgba(251,191,36,0.15)" },
  deadlineText: { color: "#92400E" },
  ineligibleRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "#F87171",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  ineligibleText: { fontSize: 18, color: "#F87171", fontWeight: "800" },
  ineligiblePill: { backgroundColor: "rgba(248,113,113,0.1)" },
  ineligiblePillText: { color: "#DC2626" },
  gemsSection: { gap: 10, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  accent: { width: 3, height: 14, backgroundColor: "#BFFF00", borderRadius: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
    letterSpacing: 1.2,
  },
  gemsSubtitle: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginVertical: 12 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySubtitle: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 22 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
```

- [ ] **Step 7.2: Write the fit detail screen**

```tsx
// app/fit/[roundId].tsx
import { useEffect, useState } from "react";
import {
  View, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Linking,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { getFitScores } from "../../lib/portfolioFit";
import type { FitScoreResult, FitGap } from "../../types/portfolio";

const CONFIDENCE_LABELS = {
  high: { label: "วิเคราะห์จากพอร์ตโฟลิโอ", color: "#BFFF00" },
  medium: { label: "วิเคราะห์จากความสนใจ", color: "#FCD34D" },
  low: { label: "เกณฑ์เบื้องต้น", color: "#9CA3AF" },
};

export default function FitDetailScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<FitScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !roundId) return;
    getFitScores(user.id, [roundId])
      .then((res) => setResult(res[0] ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, roundId]);

  const scoreColor = !result
    ? "#9CA3AF"
    : result.fit_score >= 75
      ? "#BFFF00"
      : result.fit_score >= 50
        ? "#FCD34D"
        : "#F87171";

  // Days until portfolio deadline
  const dayDiff =
    result?.folio_closed_date
      ? Math.ceil(
          (new Date(result.folio_closed_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← กลับ</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color="#BFFF00" />
        ) : result ? (
          <>
            <Text style={s.heroProgram}>{result.program_name}</Text>
            <Text style={s.heroFaculty}>{result.faculty_name}</Text>
            <Text style={s.heroUni}>{result.university_name}</Text>

            {/* Score display */}
            <View style={s.scoreRow}>
              <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={[s.scoreValue, { color: scoreColor }]}>
                  {result.eligibility_pass ? result.fit_score : "✕"}
                </Text>
                <Text style={s.scoreLabel}>
                  {result.eligibility_pass ? "ความเหมาะสม" : "GPAX ไม่ผ่าน"}
                </Text>
              </View>
              <View style={s.scoreMeta}>
                {result.receive_seats ? (
                  <View style={s.metaPill}>
                    <Text style={s.metaPillText}>{result.receive_seats} ที่นั่ง</Text>
                  </View>
                ) : null}
                {result.min_gpax && result.min_gpax > 0 ? (
                  <View style={s.metaPill}>
                    <Text style={s.metaPillText}>
                      GPAX ≥ {result.min_gpax.toFixed(2)}
                    </Text>
                  </View>
                ) : null}
                {dayDiff !== null && dayDiff > 0 ? (
                  <View style={[s.metaPill, s.deadlinePill]}>
                    <Text style={[s.metaPillText, s.deadlineText]}>
                      ⏰ ปิดพอร์ตโฟลิโอใน {dayDiff} วัน
                    </Text>
                  </View>
                ) : null}
                <View style={s.confidenceBadge}>
                  <Text style={s.confidenceText}>
                    {CONFIDENCE_LABELS[result.confidence]?.label ?? result.confidence}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <Text style={s.heroProgram}>ไม่พบข้อมูล</Text>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body}>
        {result?.narrative ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.accent} />
              <Text style={s.sectionTitle}>วิเคราะห์ความเหมาะสม</Text>
            </View>
            <View style={s.narrativeCard}>
              <Text style={s.narrativeText}>{result.narrative}</Text>
              <Text style={s.aiDisclaimer}>
                * ข้อมูลนี้วิเคราะห์โดย AI — ไม่ใช่การรับประกันการรับเข้า
              </Text>
            </View>
          </View>
        ) : result && !result.eligibility_pass ? (
          <View style={s.section}>
            <View style={s.ineligibleCard}>
              <Text style={s.ineligibleTitle}>ไม่ผ่านเกณฑ์ GPAX</Text>
              <Text style={s.ineligibleBody}>
                โปรแกรมนี้ต้องการ GPAX ≥ {result.min_gpax?.toFixed(2)} — คุณสามารถดูโปรแกรมอื่นๆ
                ที่เหมาะกับ GPAX ของคุณได้
              </Text>
            </View>
          </View>
        ) : null}

        {/* Gaps */}
        {result?.gaps && result.gaps.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.accent} />
              <Text style={s.sectionTitle}>สิ่งที่ควรเพิ่มเติม</Text>
            </View>
            <View style={s.gapsList}>
              {result.gaps.map((gap: FitGap, i) => (
                <View key={i} style={s.gapCard}>
                  <Text style={s.gapTitle}>⚡ {gap.gap}</Text>
                  <Text style={s.gapSuggestion}>{gap.suggestion}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Add portfolio CTA if score is low confidence */}
        {result?.confidence === "low" ? (
          <View style={s.section}>
            <Pressable
              style={({ pressed }) => [s.portfolioCta, pressed && s.pressed]}
              onPress={() => router.push("/portfolio/index")}
            >
              <Text style={s.portfolioCtaTitle}>เพิ่มพอร์ตโฟลิโอ</Text>
              <Text style={s.portfolioCtaSubtitle}>
                เพิ่มโปรเจกต์และผลงานเพื่อรับการวิเคราะห์ที่แม่นยำขึ้น →
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Link to program */}
        {result?.link ? (
          <View style={s.section}>
            <Pressable
              style={({ pressed }) => [s.linkBtn, pressed && s.pressed]}
              onPress={() => Linking.openURL(result.link!)}
            >
              <Text style={s.linkBtnText}>ดูรายละเอียดการรับสมัคร →</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFFF5" },
  hero: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  back: { marginBottom: 16 },
  backText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroProgram: { fontSize: 20, fontWeight: "800", color: "#fff", lineHeight: 28 },
  heroFaculty: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  heroUni: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 },
  scoreRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scoreValue: { fontSize: 26, fontWeight: "800" },
  scoreLabel: { fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: "600", marginTop: 1 },
  scoreMeta: { flex: 1, gap: 6, flexWrap: "wrap", flexDirection: "row" },
  metaPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaPillText: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  deadlinePill: { backgroundColor: "rgba(251,191,36,0.25)" },
  deadlineText: { color: "#FCD34D" },
  confidenceBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confidenceText: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  body: { padding: 20, gap: 4 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  accent: { width: 3, height: 14, backgroundColor: "#8B5CF6", borderRadius: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
    letterSpacing: 1.2,
  },
  narrativeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
    gap: 10,
  },
  narrativeText: { fontSize: 14, color: "#374151", lineHeight: 22 },
  aiDisclaimer: { fontSize: 11, color: "#9CA3AF" },
  ineligibleCard: {
    backgroundColor: "rgba(248,113,113,0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
  },
  ineligibleTitle: { fontSize: 15, fontWeight: "700", color: "#DC2626", marginBottom: 6 },
  ineligibleBody: { fontSize: 13, color: "#6B7280", lineHeight: 20 },
  gapsList: { gap: 10 },
  gapCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    gap: 6,
  },
  gapTitle: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  gapSuggestion: { fontSize: 13, color: "#374151", lineHeight: 19 },
  portfolioCta: {
    backgroundColor: "rgba(191,255,0,0.12)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(191,255,0,0.3)",
    gap: 4,
  },
  portfolioCtaTitle: { fontSize: 15, fontWeight: "700", color: "#4D7C0F" },
  portfolioCtaSubtitle: { fontSize: 13, color: "#6B7280" },
  linkBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    alignItems: "center",
  },
  linkBtnText: { fontSize: 14, fontWeight: "700", color: "#8B5CF6" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
```

- [ ] **Step 7.3: Commit**

```bash
git add app/fit/
git commit -m "feat(ui): add program fit browser and detail screens"
```

---

### Task 8: Wire up entry points

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 8.1: Add "My Portfolio" row to profile screen**

In `app/(tabs)/profile.tsx`, find the section where action rows are listed (Direction Finder, etc.). Add a row before or after them:

```tsx
// Add this import at top
import { router } from "expo-router";

// Add this row in the profile actions section:
<Pressable
  style={({ pressed }) => [s.actionRow, pressed && s.pressed]}
  onPress={() => router.push("/portfolio")}
>
  <Text style={s.actionRowEmoji}>📁</Text>
  <View style={s.actionRowInfo}>
    <Text style={s.actionRowTitle}>พอร์ตโฟลิโอของฉัน</Text>
    <Text style={s.actionRowSubtitle}>จัดการผลงาน ดูความเหมาะสม TCAS1</Text>
  </View>
  <Text style={s.actionRowArrow}>→</Text>
</Pressable>

<Pressable
  style={({ pressed }) => [s.actionRow, pressed && s.pressed]}
  onPress={() => router.push("/fit")}
>
  <Text style={s.actionRowEmoji}>🎯</Text>
  <View style={s.actionRowInfo}>
    <Text style={s.actionRowTitle}>ความเหมาะสม TCAS1</Text>
    <Text style={s.actionRowSubtitle}>ดูโปรแกรมที่เหมาะกับคุณ</Text>
  </View>
  <Text style={s.actionRowArrow}>→</Text>
</Pressable>
```

Note: Adapt to the actual StyleSheet in `profile.tsx` — match existing `actionRow` style pattern.

- [ ] **Step 8.2: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat(profile): add portfolio and TCAS fit entry points to profile screen"
```

---

### Task 9: Final integration check

- [ ] **Step 9.1: Run the full integration test**

```bash
npx tsx tests/portfolio-fit.ts
```
Expected: all ✅ lines.

- [ ] **Step 9.2: Manual smoke test on simulator**

```bash
pnpm ios
```

Test flow:
1. Navigate to Profile → tap "พอร์ตโฟลิโอของฉัน"
2. Portfolio screen loads (empty state shown)
3. Tap "+ เพิ่ม" → add a project with title "AI chatbot", type "project", tags "Python, AI"
4. Tap "บันทึก" → returns to portfolio list, item appears
5. Navigate back to Profile → tap "ความเหมาะสม TCAS1"
6. Fit browser loads, shows skeleton/loading for scores
7. Scores appear with score rings
8. Tap a program card → fit detail screen opens
9. Narrative and gaps appear (or "เพิ่มพอร์ตโฟลิโอ" CTA if low confidence)
10. If `folio_closed_date` is set, deadline countdown appears

- [ ] **Step 9.3: Final commit + version bump**

```bash
# Bump version in app.json
# Change "version": "X.Y.Z" → "X.Y+1.0"

git add app.json
git commit -m "chore: bump version for TCAS1 portfolio fit feature"
```

---

## TODOS.md Items to Add

After completing the plan, add these to `TODOS.md` (or equivalent):

```markdown
## Deferred: TCAS1 Portfolio Fit

### [P2] Enrichment Pipeline Re-run Strategy
Run enrich-tcas1-requirements.ts annually before TCAS cycle (Oct-Nov).
Add enrichment_version bump + re-enrich only where enrichment_version < current.

### [P3] Delete mock score-engine edge function
supabase/functions/score-engine/ is dead code (all mock routes, no callers).
Confirm no calls exist in app, then delete.

### [P1 VISION] Acceptance Outcome Tracking
After TCAS1 results: let students self-report outcome per program.
Add `outcome ENUM('accepted','rejected','waitlisted','didnt_apply')` + `outcome_reported_at`
to program_fit_scores. Build correlation over 2-3 cycles to make scores predictive.

### [P2] PathLab Auto-Pull to Portfolio
On journey completion: auto-create a portfolio item (item_type='pathlab_auto',
source='pathlab_auto', pathlab_journey_id=journey.id).
Idempotent: upsert on pathlab_journey_id. Needs lib/journey.ts hook.

### [P2] Application Deadline Calendar / Notifications
surface folio_closed_date as countdown on fit detail (data exists).
Add push notification 7 days and 1 day before deadline for shortlisted programs.
```

---

## Completion Checklist

- [ ] Migration applied and verified
- [ ] Types file created
- [ ] Enrichment script runs without errors (dry run passes)
- [ ] At least 20 programs enriched in `program_requirements`
- [ ] `portfolio-fit` edge function deployed
- [ ] `tests/portfolio-fit.ts` passes all checks
- [ ] `tests/enrichment.ts` passes
- [ ] Portfolio builder screens work (add/delete items)
- [ ] Fit browser shows sorted scores with score rings
- [ ] Fit detail shows narrative + gaps + deadline countdown
- [ ] Hidden gem discovery returns results
- [ ] Profile screen has entry points to portfolio and fit browser
- [ ] Version bumped in `app.json`
- [ ] TODOS.md updated with deferred items
