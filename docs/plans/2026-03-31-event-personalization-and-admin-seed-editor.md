# Event Personalization + Admin Seed Editor Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Close the event tracker loop by (1) adding `tags` to seeds so affinity scoring can match them, (2) enabling users to read their own events via RLS, (3) building `lib/userSignals.ts` to compute personalized affinity profiles, (4) wiring that into `seedRecommendations.ts` to produce real reason labels, and (5) building a mobile admin screen at `app/admin/seeds.tsx` where admins can edit seed `tags`, `visibility`, and `slogan` from their phone.

**Architecture:** DB migration adds `tags text[]` to seeds + user_events SELECT policy for own rows. Client-side affinity computation reads events, maps them to seed tags, and boosts existing recommendation scores. Admin screen is gated by `user_roles` admin check and writes directly to Supabase.

**Tech Stack:** Expo Router, Supabase JS client, TypeScript, existing `seedRecommendations.ts` shape

---

## Task 1: DB Migration — Add `tags` to seeds + fix user_events RLS

**Files:**
- Supabase migration (via MCP `apply_migration`)

**Step 1: Apply migration**

Run via `mcp_supabase-prod_apply_migration` with project_id `iikrvgjfkuijcpvdwzvv`:

```sql
-- Add tags array to seeds for personalization keyword matching
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Allow users to read their OWN events (currently only admins can read)
CREATE POLICY "users_read_own_events"
  ON user_events
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Step 2: Seed tags for existing seeds**

Run via `execute_sql`:

```sql
UPDATE seeds SET tags = ARRAY['machine-learning', 'ai', 'tech', 'coding', 'stem']
  WHERE title ILIKE '%machine learning%';
UPDATE seeds SET tags = ARRAY['cooking', 'chef', 'food', 'culinary', 'creative']
  WHERE title ILIKE '%chef%';
UPDATE seeds SET tags = ARRAY['philosophy', 'humanities', 'writing', 'critical-thinking']
  WHERE title ILIKE '%philosopher%';
UPDATE seeds SET tags = ARRAY['ai', 'tech', 'machine-learning', 'coding', 'stem']
  WHERE title ILIKE '%ai 101%';
UPDATE seeds SET tags = ARRAY['business', 'entrepreneurship', 'innovation', 'startup']
  WHERE title ILIKE '%business innovation%';
UPDATE seeds SET tags = ARRAY['hackathon', 'coding', 'tech', 'teamwork', 'innovation']
  WHERE title ILIKE '%hackathon%';
UPDATE seeds SET tags = ARRAY['economics', 'finance', 'business', 'social-science']
  WHERE title ILIKE '%economics%';
UPDATE seeds SET tags = ARRAY['web', 'coding', 'tech', 'frontend', 'stem']
  WHERE title ILIKE '%web developer%';
UPDATE seeds SET tags = ARRAY['gamedev', 'coding', 'tech', 'creative', 'gaming']
  WHERE title ILIKE '%gamedev%' OR title ILIKE '%game dev%';
```

**Step 3: Verify**
```sql
SELECT id, title, tags, visibility FROM seeds WHERE array_length(tags, 1) > 0;
```
Expected: rows with populated tags arrays.

---

## Task 2: Create `lib/userSignals.ts`

**Files:**
- Create: `lib/userSignals.ts`

**Step 1: Create the file**

```typescript
// lib/userSignals.ts
import { supabase } from './supabase';

export const INTEREST_TO_TAGS: Record<string, string[]> = {
  technology: ['tech', 'coding', 'ai', 'stem', 'machine-learning', 'web', 'gamedev'],
  science: ['stem', 'biology', 'chemistry', 'physics', 'research'],
  business: ['business', 'entrepreneurship', 'startup', 'economics', 'finance', 'innovation'],
  arts: ['creative', 'design', 'music', 'film', 'art'],
  humanities: ['philosophy', 'writing', 'critical-thinking', 'social-science', 'humanities'],
  food: ['cooking', 'chef', 'food', 'culinary'],
  sports: ['sports', 'fitness', 'health', 'wellness'],
  social: ['community', 'teamwork', 'leadership', 'social-science'],
};

export const CAREER_TO_TAGS: Record<string, string[]> = {
  'machine learning': ['machine-learning', 'ai', 'tech', 'stem'],
  'software': ['coding', 'tech', 'web', 'stem'],
  'data scientist': ['machine-learning', 'ai', 'stem', 'tech'],
  'chef': ['cooking', 'chef', 'food', 'culinary'],
  'entrepreneur': ['business', 'startup', 'entrepreneurship', 'innovation'],
  'game developer': ['gamedev', 'coding', 'gaming', 'tech'],
  'economist': ['economics', 'finance', 'business', 'social-science'],
  'philosopher': ['philosophy', 'humanities', 'writing'],
  'web developer': ['web', 'coding', 'frontend', 'tech'],
};

export interface AffinityProfile {
  tags: Set<string>;
  reasons: Record<string, string>;
}

export async function computeAffinityProfile(userId: string): Promise<AffinityProfile | null> {
  try {
    const { data: events, error } = await supabase
      .from('user_events')
      .select('event_type, event_data')
      .eq('user_id', userId)
      .in('event_type', ['interest_selected', 'career_searched', 'career_selected', 'program_saved'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !events || events.length === 0) return null;

    const tags = new Set<string>();
    const reasons: Record<string, string> = {};

    for (const event of events) {
      const data = event.event_data as Record<string, unknown>;

      if (event.event_type === 'interest_selected') {
        const category = (data.category as string | undefined)?.toLowerCase() ?? '';
        const matched = INTEREST_TO_TAGS[category];
        if (matched) {
          matched.forEach(tag => {
            tags.add(tag);
            if (!reasons[tag]) reasons[tag] = `Because you're interested in ${cap(category)}`;
          });
        }
      }

      if (event.event_type === 'career_searched' || event.event_type === 'career_selected') {
        const query = (
          (data.query as string | undefined) ?? (data.career_name as string | undefined) ?? ''
        ).toLowerCase();
        for (const [keyword, keyTags] of Object.entries(CAREER_TO_TAGS)) {
          if (query.includes(keyword)) {
            keyTags.forEach(tag => {
              tags.add(tag);
              if (!reasons[tag]) reasons[tag] = `Because you searched for ${cap(query)}`;
            });
          }
        }
      }
    }

    if (tags.size === 0) return null;
    return { tags, reasons };
  } catch {
    return null;
  }
}

function cap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

**Step 2: Verify compile**
```bash
cd /Users/bunyasit/dev/passionseed/ps_app && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

**Step 3: Commit**
```bash
git add lib/userSignals.ts
git commit -m "feat: add userSignals affinity profile from event history"
```

---

## Task 3: Update `types/seeds.ts` to include `tags`

**Files:**
- Modify: `types/seeds.ts`
- Modify: whichever lib file fetches seeds from Supabase (find with `grep -rn "from('seeds')" lib/`)

**Step 1: Add `tags: string[]` to Seed / SeedWithEnrollment interface**

**Step 2: Add `tags` to the SELECT column list in the seeds query**

**Step 3: Verify compile**
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

**Step 4: Commit**
```bash
git add types/seeds.ts
git commit -m "feat: add tags field to Seed type and SELECT query"
```

---

## Task 4: Wire affinity into `seedRecommendations.ts`

**Files:**
- Modify: `lib/seedRecommendations.ts`
- Modify: `components/discover/useDiscoverSeeds.ts`

**Step 1: Add `AffinityProfile` import and optional param to `buildFallbackRecommendations`**

```typescript
import type { AffinityProfile } from './userSignals';

export function buildFallbackRecommendations(
  seeds: SeedWithEnrollment[],
  affinity: AffinityProfile | null = null,
): SeedRecommendationsPayload {
```

**Step 2: Inside the `.map()` loop, compute affinity boost before `recommendationScore`**

```typescript
let affinityBoost = 0;
const matchedReasonLabels: RecommendationReason[] = [];

if (affinity && seed.tags && seed.tags.length > 0) {
  const seedTagSet = new Set(seed.tags);
  for (const tag of affinity.tags) {
    if (seedTagSet.has(tag)) {
      affinityBoost += 12;
      const reasonLabel = affinity.reasons[tag];
      if (reasonLabel && matchedReasonLabels.length < 2) {
        matchedReasonLabels.push({
          code: 'interest_match',
          label: reasonLabel,
          detail: `Your interest in ${tag} matches this path.`,
        });
      }
    }
  }
  affinityBoost = Math.min(affinityBoost, 40);
}

const recommendationScore = Math.min(100, Math.max(20, 100 - index * 7) + affinityBoost);
```

**Step 3: Use `matchedReasonLabels` in `reasons` field of returned object**

```typescript
reasons: matchedReasonLabels.length > 0
  ? matchedReasonLabels
  : [
      isActive
        ? { code: 'active_path', label: 'Continue momentum', detail: `You're already on day ${seed.enrollment?.current_day ?? 1}.` }
        : { code: 'coverage_gap', label: 'Explore a new path', detail: 'Based on your interests.' },
    ],
```

**Step 4: In `useDiscoverSeeds.ts`, fetch affinity in parallel with seeds**

```typescript
import { computeAffinityProfile } from '../../lib/userSignals';

// Inside the effect / data fetching:
const [seedsData, affinityData] = await Promise.all([
  fetchSeeds(...),
  userId ? computeAffinityProfile(userId) : Promise.resolve(null),
]);

// Then pass to builder:
buildFallbackRecommendations(seeds, affinityData)
```

**Step 5: Verify compile**
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

**Step 6: Commit**
```bash
git add lib/seedRecommendations.ts components/discover/useDiscoverSeeds.ts
git commit -m "feat: wire event affinity into seed scoring and reason labels"
```

---

## Task 5: Build Admin Seed Editor screen

**Files:**
- Create: `app/admin/_layout.tsx`
- Create: `app/admin/seeds.tsx`
- Modify: `app/(tabs)/profile.tsx` (add Admin link for admin users)

**Step 1: Create `app/admin/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="seeds" options={{ title: 'Seed Editor', headerShown: true }} />
    </Stack>
  );
}
```

**Step 2: Create `app/admin/seeds.tsx`**

Full screen with: admin gate (redirect non-admins), seed list, tap-to-edit panel with tag input (comma-separated), visibility cycle button (hidden→visible→featured), slogan input, save/cancel. Style matches app dark theme (`#0a0a0f` bg, `#111118` cards, `#6366f1` primary).

Key logic:
- On mount: check `user_roles` for admin, redirect if not
- Load all seeds: `SELECT id, title, slogan, tags, visibility FROM seeds ORDER BY title`
- Edit panel: local state, on Save → `UPDATE seeds SET tags=..., slogan=..., visibility=... WHERE id=...`
- Optimistic local update after save
- Tags: split by comma, trim, lowercase, replace spaces with `-`

**Step 3: Add Admin link in `app/(tabs)/profile.tsx`**

Check `user_roles` on mount. If admin, show a link button that routes to `/admin/seeds`.

**Step 4: Verify compile**
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

**Step 5: Commit**
```bash
git add app/admin/ app/(tabs)/profile.tsx
git commit -m "feat: admin seed editor mobile screen with tags, visibility, slogan editing"
```

---

## Task 6: Bump version

**Files:**
- Modify: `app.json` → `expo.version` (patch bump)

```bash
git add app.json
git commit -m "chore: bump version for event personalization + admin seed editor"
```

---

## Verification Checklist

- [ ] `seeds.tags` column exists in DB with sample data
- [ ] `user_events` has SELECT policy for own rows
- [ ] `lib/userSignals.ts` compiles cleanly
- [ ] Discover: different seed order for users with event history (log affinity profile)
- [ ] Admin user navigates to `/admin/seeds` from Profile
- [ ] Non-admin redirected back
- [ ] Tags save correctly (comma-split, trimmed, lowercased, hyphenated)
- [ ] Visibility cycles correctly
- [ ] Slogan saves; empty input saves as null
