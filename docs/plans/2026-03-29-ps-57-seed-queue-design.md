# PS-57 Seed Queue Design

**Goal:** Ship a server-backed mobile seed queue with ranking, recommendation reasons, coverage visualization, and offline-first caching without recomputing recommendations on every app open.

**Architecture:** A Supabase Edge Function returns a per-user recommendation snapshot. The function reads a cached snapshot from the database when still fresh and only recomputes when the user's recommendation inputs have changed or the snapshot TTL has expired. The mobile app caches the returned payload locally with stale-while-revalidate behavior and persists day bundles for offline reopen.

**Scope**

- Replace static discover slicing with ranked recommendations
- Show why each seed is recommended
- Show exploration coverage summary
- Add durable offline cache for discover payload and path day bundles
- Keep existing in-memory session cache for fast in-app navigation

**Server design**

- New edge function: `supabase/functions/seed-recommendations/index.ts`
- New cache table: `public.seed_recommendation_snapshots`
- Cache key: `user_id`
- Freshness:
  - Snapshot TTL controls age-based recompute
  - User signal timestamps control invalidation on profile, interests, goals, enrollments, and reflections changes
- Response includes:
  - ranked seeds
  - score breakdown
  - recommendation reasons
  - coverage summary
  - computed timestamp
  - cache source

**Mobile design**

- New durable cache module for recommendation payloads and day bundles
- `discover.tsx` renders cached data immediately when present, then refreshes in background
- `pathlab.ts` reads cached day bundles when network fetch fails
- `pathlabSession.ts` continues to warm the hot in-memory cache and also persists bundles durably

**Failure behavior**

- Recommendation fetch failure with cache present: render cached queue
- Recommendation fetch failure with no cache: fall back to plain available seeds
- Day bundle fetch failure with cache present: render cached bundle

**Versioning**

- Recommendation payloads carry a schema version
- Day bundle cache keys carry a schema version
- App version must be bumped for shipped app changes
