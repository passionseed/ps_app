---
name: backend-worker
description: Handles Supabase edge functions, client libraries, and deployment
---

# Backend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- Supabase edge functions (creation, modification, deployment)
- Client library functions (lib/*.ts)
- API integration and deployment tasks

## Work Procedure

### For Edge Function Features

1. **Read existing patterns** in `supabase/functions/university-insights/index.ts` for the established edge function structure: Deno.serve, CORS handling, Supabase client creation, Gemini API call pattern.

2. **Read the scoring algorithm** in `.factory/library/architecture.md` for the exact scoring formulas and confidence levels.

3. **Write tests first** (TDD). Create test file(s) in `tests/` that verify:
   - Expected response shape for valid requests
   - Error responses for invalid input (missing round_ids, empty array, too many)
   - Eligibility gate behavior
   - Confidence level determination logic
   - If testing scoring functions directly, extract them into testable pure functions

4. **Implement the edge function** in `supabase/functions/<name>/index.ts`:
   - Use `Deno.serve(async (req) => { ... })` pattern
   - Handle OPTIONS preflight with CORS headers
   - Authenticate user via JWT in Authorization header
   - Use Gemini API (NOT Anthropic) for AI scoring — model: `gemini-3-flash-preview`
   - Follow the Gemini call pattern from `.factory/library/environment.md`
   - Handle errors gracefully — degrade to lower confidence, never crash
   - Sanitize all user input before sending to AI

5. **Run tests**: `npx vitest run` — all tests must pass

6. **Run typecheck**: `npx tsc --noEmit` — must pass

### For Client Library Features

1. **Read existing patterns** in `lib/universityInsights.ts` and `lib/tcas.ts` for the established client library structure.

2. **Write tests first** for:
   - CRUD operations (add, delete, get portfolio items)
   - Cache invalidation behavior
   - Input validation (title required, length limits)
   - Error handling

3. **Implement the client library** in `lib/<name>.ts`:
   - Import `supabase` from `./supabase`
   - Named async exports
   - Session-level cache using Map with TTL (follow universityInsights.ts pattern)
   - Invalidate cache when portfolio changes
   - Client-side input validation before DB calls

4. **Run tests**: `npx vitest run` — all tests must pass

### For Deployment Features

1. **Deploy edge function**: `cd /Users/bunyasit/dev/pseed && npx supabase functions deploy <name> --no-verify-jwt`
2. **Verify deployment** by invoking the function via the Supabase client or curl
3. **Document** any environment variables the function needs (should already be in Supabase secrets)

### General

7. **Commit** with a descriptive message following conventional commits (feat/fix/chore)

## Example Handoff

```json
{
  "salientSummary": "Implemented portfolio-fit edge function with POST /portfolio-fit (score student against rounds) and GET /portfolio-fit/discover (hidden gems). Uses Gemini API for AI alignment scoring. Scoring degrades gracefully: high (portfolio+requirements), medium (requirements only), low (semantic only). All 6 test cases passing.",
  "whatWasImplemented": "Edge function supabase/functions/portfolio-fit/index.ts with: (1) POST handler — validates round_ids (max 50), authenticates via JWT, fetches student profile+portfolio+program data, applies GPAX eligibility gate, computes semantic similarity via cosine, calls Gemini for AI alignment when confidence=high, writes scores to program_fit_scores with 24h cache TTL, returns enriched results with program metadata. (2) GET /discover handler — fetches student embedding, queries programs by similarity, filters unseen/eligible, scores top-N. Uses sanitize() for AI input safety.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx vitest run", "exitCode": 0, "observation": "6 tests passing: POST valid, POST empty array, GPAX gate, high confidence, low confidence, discover endpoint" },
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "No type errors" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "tests/portfolio-fit.test.ts", "cases": [
        { "name": "returns results for valid round_ids", "verifies": "POST /portfolio-fit returns 200 with results array" },
        { "name": "returns 400 for empty round_ids", "verifies": "input validation" },
        { "name": "GPAX gate returns eligibility_pass=false", "verifies": "eligibility logic" },
        { "name": "high confidence when portfolio and requirements exist", "verifies": "confidence determination" },
        { "name": "low confidence when no requirements", "verifies": "graceful degradation" },
        { "name": "discover returns sorted recommendations", "verifies": "discover endpoint" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Gemini API key is not configured in Supabase secrets
- Required tables (program_requirements, student_portfolio_items, program_fit_scores) don't exist
- Deployment fails with permission or configuration errors
- Referenced tables (tcas_programs, tcas_admission_rounds, profiles) have unexpected schema
