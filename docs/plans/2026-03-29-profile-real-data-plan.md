# Profile Real-Data Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the Profile tab so it prioritizes real career goals and interests, removes fake metrics and social content, and uses real activity data from the app.

**Architecture:** Extract pure helper functions for profile page data shaping into a small module that can be unit tested with Vitest, then refactor the screen to consume that view-model data. Keep the existing guest and Ikigai flows, but replace mock-only sections with real-data sections and honest empty states.

**Tech Stack:** Expo Router, React Native, Supabase, Vitest, TypeScript

---

### Task 1: Add failing tests for profile view-model helpers

**Files:**
- Create: `tests/profile-screen-data.test.ts`
- Create: `lib/profileScreenData.ts`

**Step 1: Write the failing test**

Add tests that expect helper functions to:

- prioritize career goals in the top-section content
- flatten selected interests into supporting chips
- map only supported `user_events` into recent activity rows
- return empty arrays instead of mock fallback content

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/profile-screen-data.test.ts`
Expected: FAIL because `lib/profileScreenData.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create pure helpers in `lib/profileScreenData.ts` that:

- normalize career goal labels
- flatten selected interests
- build quiet profile metadata pills
- map `user_events` records into display-ready activity items

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/profile-screen-data.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/profile-screen-data.test.ts lib/profileScreenData.ts
git commit -m "test(profile): add real-data profile helpers"
```

### Task 2: Replace fake profile sections with real-data sections

**Files:**
- Modify: `app/(tabs)/profile.tsx`
- Modify: `lib/onboarding.ts`

**Step 1: Write the failing test**

Extend `tests/profile-screen-data.test.ts` with cases for any additional helper behavior needed by the screen refactor, such as activity labels or metadata formatting.

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/profile-screen-data.test.ts`
Expected: FAIL for the new helper expectations.

**Step 3: Write minimal implementation**

- Expand `getProfile` selection to include any real fields needed by the screen.
- Refactor `app/(tabs)/profile.tsx` to:
  - remove fake stats, fake skills, fake achievements, fake friends, and fake title text
  - make career goals the dominant content in the hero card
  - render interests as secondary chips
  - keep Ikigai below the identity section
  - fetch and render real recent activity from `user_events`
  - keep truthful empty states only

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/profile-screen-data.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/\(tabs\)/profile.tsx lib/onboarding.ts tests/profile-screen-data.test.ts
git commit -m "feat(profile): prioritize real career and activity data"
```

### Task 3: Verify screen behavior and clean up

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Step 1: Write the failing test**

If cleanup changes require helper updates, add the failing test first in `tests/profile-screen-data.test.ts`.

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/profile-screen-data.test.ts`
Expected: FAIL only when new behavior is introduced.

**Step 3: Write minimal implementation**

- simplify layout and copy
- ensure empty states route to useful destinations
- remove unused style blocks and imports

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/profile-screen-data.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/\(tabs\)/profile.tsx tests/profile-screen-data.test.ts
git commit -m "refactor(profile): simplify real-data profile layout"
```
