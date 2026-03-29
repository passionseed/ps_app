# PS-57 Seed Queue Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a server-backed seed recommendation queue with reasons, coverage, and offline-first caching in the mobile app.

**Architecture:** The mobile app requests a cached recommendation snapshot from a Supabase Edge Function. The function reuses a per-user database snapshot when still valid and recomputes only when user inputs or activity changed. The app persists both recommendation payloads and path day bundles locally for offline fallback.

**Tech Stack:** Expo Router, React Native, Supabase Edge Functions, Supabase Postgres, AsyncStorage, Vitest, TypeScript

---

### Task 1: Add failing tests for recommendation cache and sectioning

**Files:**
- Create: `tests/seed-recommendations.test.ts`
- Create: `lib/seedRecommendations.ts`

**Step 1: Write failing tests**

- verify ranked recommendations split into continue/recommended/explore/deprioritized sections
- verify cache freshness and expiration behavior
- verify stale cached payload can still render while marked stale

**Step 2: Run tests to verify they fail**

Run: `pnpm test tests/seed-recommendations.test.ts`

**Step 3: Implement minimal helpers**

- add recommendation types
- add section builder
- add cache freshness helpers

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/seed-recommendations.test.ts`

### Task 2: Add server recommendation snapshot endpoint and schema

**Files:**
- Create: `supabase/functions/seed-recommendations/index.ts`
- Create: `scripts/sql/create-seed-recommendations.sql`

**Step 1: Add SQL table and indexes**

- create snapshot table keyed by `user_id`
- store `snapshot`, `computed_at`, `source_updated_at`, `expires_at`, `version`

**Step 2: Implement edge function**

- authenticate user
- read snapshot and latest user signal timestamps
- return cached snapshot when fresh
- recompute otherwise and upsert snapshot

**Step 3: Keep algorithm simple and explainable**

- derive affinity from interests/career keywords and progress
- derive gap score from unexplored seeds and low coverage
- attach human-readable reasons

### Task 3: Add mobile recommendation fetch and durable cache

**Files:**
- Modify: `lib/pathlab.ts`
- Modify: `lib/pathlabSession.ts`
- Modify: `lib/onboarding.ts` if shared signal reads are needed
- Modify: `types/seeds.ts`

**Step 1: Add recommendation fetch helper**

- invoke edge function
- persist returned payload locally
- serve cached payload on failure

**Step 2: Add day bundle persistence**

- persist enrollment day bundles after successful load
- read them on fetch failure

### Task 4: Replace discover static slicing

**Files:**
- Modify: `app/(tabs)/discover.tsx`

**Step 1: Render recommendation coverage summary**

- explored count
- active count
- completion percent

**Step 2: Render ranked queue with reasons**

- continue section for active paths
- recommended section with reason chips
- lower-priority sections for exploration/deprioritized seeds

### Task 5: Verify and ship

**Files:**
- Modify: `app.config.js`

**Step 1: Run targeted tests**

Run: `pnpm test tests/seed-recommendations.test.ts tests/runtime-config.test.ts tests/guest-language.test.ts`

**Step 2: Run full test suite**

Run: `pnpm test`

**Step 3: Bump Expo app version**

- increment `expo.version` in `app.config.js`

**Step 4: Commit and push**

- create commit for PS-57
- push branch
