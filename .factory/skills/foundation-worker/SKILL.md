---
name: foundation-worker
description: Handles database migrations, TypeScript types, and test infrastructure setup
---

# Foundation Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- Database migration creation and application
- TypeScript type definitions for new data models
- Test framework setup and configuration (Vitest)

## Work Procedure

### For Database Migration Features

1. **Read the plan reference** in `.factory/library/architecture.md` for the TCAS data model and table schemas.

2. **Write the migration SQL file** in `/Users/bunyasit/dev/pseed/supabase/migrations/` (symlinked from `ps_app/supabase/migrations`). Follow the naming convention: `YYYYMMDDHHMMSS_description.sql`. Include:
   - `CREATE TABLE IF NOT EXISTS` for each table
   - All columns with proper types, constraints, defaults
   - Foreign key references to existing tables
   - Indexes for common query patterns
   - `handle_updated_at` trigger for tables with `updated_at`
   - RLS policies (enable RLS, create appropriate policies)
   - Unique constraints

3. **Apply the migration** using `cd /Users/bunyasit/dev/pseed && npx supabase db push`. If Docker is not running and this fails, try alternative approaches:
   - Check if there's a `supabase db execute` command available
   - Read the migration SQL file content and provide it formatted for manual application
   - Document the blocker clearly in the handoff

4. **Verify tables exist** by writing a quick test script that queries the new tables.

5. **Write TypeScript types** in `types/` directory matching the table schemas. Follow existing patterns in `types/tcas.ts` and `types/pathlab.ts`.

### For Test Infrastructure Features

1. **Install Vitest**: `pnpm add -D vitest`
2. **Create vitest.config.ts** at project root with appropriate configuration for a React Native/Expo project
3. **Add test script** to package.json: `"test": "vitest run"`, `"test:watch": "vitest"`
4. **Write a smoke test** to verify Vitest works (e.g., `tests/smoke.test.ts` with a simple assertion)
5. **Run the test**: `npx vitest run` — must pass

### General

6. **Run typecheck**: `npx tsc --noEmit` — must pass with no errors related to your changes
7. **Commit** with a descriptive message

## Example Handoff

```json
{
  "salientSummary": "Created migration 20260313000000_tcas1_portfolio.sql with 3 tables (program_requirements, student_portfolio_items, program_fit_scores) including RLS, indexes, and constraints. Applied via supabase db push. Created types/portfolio.ts with all TypeScript interfaces.",
  "whatWasImplemented": "Migration SQL file with 3 new tables: program_requirements (enriched TCAS1 criteria per round with unique constraint on round_id), student_portfolio_items (portfolio items with type check, length constraints, date ordering), program_fit_scores (cached scores with unique on user_id+round_id). All tables have RLS enabled with own_select/own_insert/own_update/own_delete for user tables and public_read + service_write for requirements. TypeScript types: StudentPortfolioItem, NewPortfolioItem, ProgramRequirements, ProgramFitScore, FitScoreResult, FitGap, PortfolioItemType, FitConfidence.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd /Users/bunyasit/dev/pseed && npx supabase db push", "exitCode": 0, "observation": "Migration applied successfully, 3 tables created" },
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "No type errors" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "tests/db-schema.test.ts", "cases": [
        { "name": "program_requirements table exists", "verifies": "table was created" },
        { "name": "student_portfolio_items table exists", "verifies": "table was created" },
        { "name": "program_fit_scores table exists", "verifies": "table was created" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Docker is required for `supabase db push` and Docker daemon is not running
- Migration fails due to missing referenced tables (tcas_admission_rounds, tcas_programs, etc.)
- Existing table schema conflicts with planned foreign keys
