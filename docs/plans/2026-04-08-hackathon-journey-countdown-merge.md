# Hackathon Journey Countdown Merge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the real current-phase countdown from the hackathon home screen into the journey screen and let the journey roadmap be driven only by real phase data.

**Architecture:** Reuse the existing cached home/journey bundle helpers and released-phase logic instead of inventing new schedule data. The journey screen gains the countdown card above impact and keeps the real vertical phase cards, while the home screen drops the duplicate countdown and stays focused on mentor booking plus home-specific context.

**Tech Stack:** Expo Router, React Native, TypeScript, Vitest source-assertion tests

---

### Task 1: Lock regression coverage for the screen split

**Files:**
- Modify: `tests/hackathon-journey-loading.test.ts`
- Modify: `tests/hackathon-preloading.test.ts`

**Step 1: Write the failing test**

- Assert `journey.tsx` contains the restored countdown copy and no longer contains the fake trailing `COMING SOON` node.
- Assert `home.tsx` no longer contains the countdown copy once the merge is complete.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/hackathon-journey-loading.test.ts tests/hackathon-preloading.test.ts`

Expected: FAIL because the current journey screen has no countdown and still renders the fake trailing node.

### Task 2: Move countdown ownership to the journey screen

**Files:**
- Modify: `app/(hackathon)/journey.tsx`
- Modify: `app/(hackathon)/home.tsx`

**Step 1: Write minimal implementation**

- Add current-phase countdown state/effect to `journey.tsx`.
- Render the countdown card above the existing impact block, reusing the current released phase or active-card fallback.
- Remove the fake `COMING SOON` tail from the journey roadmap.
- Remove the duplicate countdown card from `home.tsx` while keeping mentor booking on home.

**Step 2: Run tests to verify they pass**

Run: `pnpm vitest tests/hackathon-journey-loading.test.ts tests/hackathon-preloading.test.ts`

Expected: PASS

### Task 3: Verify no local regressions in hackathon screen source tests

**Files:**
- Test: `tests/hackathon-journey-loading.test.ts`
- Test: `tests/hackathon-preloading.test.ts`

**Step 1: Run focused verification**

Run: `pnpm vitest tests/hackathon-journey-loading.test.ts tests/hackathon-preloading.test.ts`

Expected: PASS with 0 failures

**Step 2: Run broader hackathon smoke verification**

Run: `pnpm vitest tests/hackathon-journey-loading.test.ts tests/hackathon-preloading.test.ts tests/hackathon-program.test.ts`

Expected: PASS with 0 failures
