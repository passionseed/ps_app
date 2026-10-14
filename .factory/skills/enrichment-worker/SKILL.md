---
name: enrichment-worker
description: Populates program_requirements data by crawling TCAS1 admission pages and extracting structured requirements
---

# Enrichment Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- Data enrichment from external web sources
- Populating database tables with extracted/crawled data
- TCAS program requirements extraction

## Work Procedure

### TCAS1 Requirements Enrichment

This is an interactive data population task. You will crawl TCAS1 admission pages, extract structured requirements, and write them to the database.

1. **Query TCAS1 rounds** to get the list of programs to enrich. Create and run a small script:

```typescript
// scripts/list-tcas1-rounds.ts
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
const { data } = await supabase
  .from("tcas_admission_rounds")
  .select("id, program_id, link, description, condition, program:tcas_programs(program_name, faculty_name, university:tcas_universities(university_name))")
  .eq("round_number", 1)
  .not("link", "is", null)
  .limit(30);
console.log(JSON.stringify(data, null, 2));
```

Run with `cd /Users/bunyasit/dev/ps_app && npx tsx scripts/list-tcas1-rounds.ts` (load env vars with dotenv if needed).

2. **For each round with a link**, use `FetchUrl` tool to crawl the admission page. Extract the main text content. If a page is inaccessible (403, timeout), skip it and note it.

3. **Extract structured requirements** from each page's content using your own AI capabilities. For each program, determine:
   - `what_they_seek`: 2-4 sentences describing the type of student/projects they value
   - `portfolio_criteria`: Array of required portfolio components (e.g., "project portfolio", "essay", "interview")
   - `program_vision`: 1-2 sentences about the faculty/program mission
   - `sample_keywords`: Keywords that signal good fit (e.g., "leadership", "STEM", "community")

   Also use the existing `description` and `condition` fields from the round data to supplement extraction.

4. **Generate a seed SQL file** with INSERT statements for all extracted data. Write to `supabase/seed/portfolio_requirements_seed.sql`:

```sql
INSERT INTO public.program_requirements (round_id, program_id, what_they_seek, portfolio_criteria, program_vision, sample_keywords, source_urls, enrichment_version)
VALUES
  ('uuid-1', 'prog-1', 'description...', '["criteria1", "criteria2"]'::jsonb, 'vision...', ARRAY['keyword1', 'keyword2'], ARRAY['https://...'], 1),
  ...
ON CONFLICT (round_id) DO UPDATE SET
  what_they_seek = EXCLUDED.what_they_seek,
  portfolio_criteria = EXCLUDED.portfolio_criteria,
  program_vision = EXCLUDED.program_vision,
  sample_keywords = EXCLUDED.sample_keywords,
  source_urls = EXCLUDED.source_urls,
  enrichment_version = EXCLUDED.enrichment_version,
  enriched_at = now();
```

5. **Apply the seed data.** Try these approaches in order:
   a. Create a script using Supabase service role key if available
   b. Use `cd /Users/bunyasit/dev/pseed && npx supabase db execute --file <path>` if available
   c. If neither works, include clear instructions for manual application in the handoff

6. **Verify enrichment** by querying the count and a sample:
```sql
SELECT count(*) FROM program_requirements;
SELECT round_id, program_id, what_they_seek, array_length(sample_keywords, 1) as keyword_count FROM program_requirements LIMIT 5;
```

7. **Target: At least 10 programs enriched** with non-empty what_they_seek or portfolio_criteria.

8. **Commit** the seed SQL file and any utility scripts.

### Quality Guidelines

- Extract data in the same language as the source page (usually Thai)
- If a page has no useful admission info, skip it — don't fabricate data
- Include source_urls for audit trail
- Be realistic about portfolio_criteria — only include what's actually mentioned
- For programs where the link is broken or content is sparse, use the existing `description` and `condition` fields from tcas_admission_rounds as the primary source

## Example Handoff

```json
{
  "salientSummary": "Enriched 15 TCAS Round 1 programs by crawling admission pages and extracting requirements. Created seed SQL at supabase/seed/portfolio_requirements_seed.sql. 12 programs had useful page content, 3 were enriched from existing description/condition fields only. Applied seed to remote Supabase.",
  "whatWasImplemented": "Crawled 20 TCAS1 admission page links using FetchUrl. Extracted structured requirements (what_they_seek, portfolio_criteria, program_vision, sample_keywords) for 15 programs. Generated INSERT...ON CONFLICT SQL seed file. Applied to remote database. Programs cover: Chulalongkorn (3), Thammasat (2), Mahidol (3), Kasetsart (2), KMUTT (2), Chiang Mai (3).",
  "whatWasLeftUndone": "5 programs had inaccessible links (403/timeout). Remaining ~200+ programs not yet enriched — can be done in a follow-up run.",
  "verification": {
    "commandsRun": [
      { "command": "npx tsx scripts/verify-enrichment.ts", "exitCode": 0, "observation": "15 rows in program_requirements, 12 with non-empty what_they_seek" }
    ],
    "interactiveChecks": [
      { "action": "Fetched admission page for Chula Engineering TCAS1", "observed": "Page loaded, extracted criteria: project portfolio, interview, STEM background" },
      { "action": "Fetched admission page for Thammasat Business", "observed": "Page loaded, extracted criteria: leadership essay, business plan, interview" }
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- program_requirements table does not exist (migration not yet applied)
- No TCAS1 rounds with links found in the database
- Cannot write to the database (no service role access and no alternative apply method)
- All admission page links are inaccessible (network issue)
