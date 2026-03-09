# Edge Function Scoring Plan (Track C)

## Goal

Implement the core logic for the Supabase Edge Function that powers the Journey Mapper scoring engine.

## Action Items

1.  **Refine Edge Function Routing:**
    - Since Deno deploy functions in Supabase are routed based on folder name, ensure the router correctly matches the structure. e.g. a call to `/score-engine` hits the default route or specific sub-paths.
2.  **Ingest Reflection Logic (`/score-engine/ingest`):**
    - Accept JSON payload containing `{ reflectionData, simulationId }`.
    - (Mock for now) Calculate a new `passion_score` based on `energyLevel` and `interestLevel`.
    - Save a new row to `score_events` table representing this change.
    - Update the `journey_simulations` table with the new `passion_score`.
3.  **Recalculate Scores Logic (`/score-engine/recalculate`):**
    - Fetch all `score_events` for a simulation.
    - Recompute the weighted average for passion and aptitude.
    - Update the `journey_simulations` table.
4.  **Timeline Endpoint (`/score-engine/timeline`):**
    - Fetch `score_events` for a specific simulation ordered by `created_at DESC`.

## Execution

We have scaffolded the file `supabase/functions/score-engine/index.ts`. We will now implement the Supabase database operations using the Deno `@supabase/supabase-js` client to write the mock scores directly into the database.
