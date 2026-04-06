# Hackathon Teammate Submissions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show teammate submissions on the hackathon solo activity screen after the current participant has submitted, while keeping the participant's own submission history visible.

**Architecture:** Extend the existing mobile submission helper to fetch teammate submission rows for the same activity using current team membership and participant lookups. Update the activity screen to load both datasets together and reveal the teammate section only once the current participant has a submission history for that activity.

**Tech Stack:** Expo Router, React Native, Supabase JS, Vitest, TypeScript

---

### Task 1: Add teammate submission helper coverage

**Files:**
- Modify: `lib/hackathon-submit.ts`
- Create/Modify: `tests/lib/hackathon-submit.test.ts`

**Step 1: Write the failing test**

Add a test that mocks:

- current participant read
- `hackathon_team_members` lookup for the current participant
- teammate member rows for the same team
- submission rows for the same activity
- participant name lookup

Assert that the helper:

- excludes the current participant
- enriches rows with teammate names
- returns newest-first rows

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/hackathon-submit.test.ts`

Expected: FAIL because the teammate helper does not exist yet.

**Step 3: Write minimal implementation**

Add:

- teammate submission row type
- helper to load teammate submissions for one activity

Keep the existing personal submission helper unchanged.

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/hackathon-submit.test.ts`

Expected: PASS

### Task 2: Add activity-screen behavior coverage

**Files:**
- Modify: `app/(hackathon)/activity/[nodeId].tsx`
- Create/Modify: `tests/app/hackathon-activity-screen.test.tsx`

**Step 1: Write the failing test**

Add a test that verifies:

- teammate submissions are not rendered when the user has no personal submissions
- teammate submissions render after the screen loads with existing personal submissions
- submit success refreshes both personal and teammate datasets

Use mocks for:

- `fetchActivity`
- personal submission helper
- teammate submission helper
- submit helper

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/app/hackathon-activity-screen.test.tsx`

Expected: FAIL because the screen does not load or render teammate submissions yet.

**Step 3: Write minimal implementation**

Update the screen to:

- track teammate submissions
- load personal and teammate data together
- reveal teammate submissions only when personal submissions exist
- refresh both datasets after submit and after file upload completion

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/app/hackathon-activity-screen.test.tsx`

Expected: PASS

### Task 3: Polish the shared submission UI

**Files:**
- Modify: `app/(hackathon)/activity/[nodeId].tsx`

**Step 1: Add a shared card renderer**

Extract the repeated submission-card rendering so personal and teammate sections use the same visual rules.

**Step 2: Add teammate section copy**

Add a second section title and optional empty text for the teammate area when the user has submitted but teammates have not.

**Step 3: Verify the screen still reads clearly**

Ensure section order is:

1. assessment
2. personal history
3. teammate submissions
4. submit error
5. submit button

### Task 4: Verify end-to-end behavior

**Files:**
- Modify: `lib/hackathon-submit.ts`
- Modify: `app/(hackathon)/activity/[nodeId].tsx`
- Modify/Create: relevant tests above

**Step 1: Run targeted tests**

Run:

- `pnpm test tests/lib/hackathon-submit.test.ts`
- `pnpm test tests/app/hackathon-activity-screen.test.tsx`

**Step 2: Run broader regression check if the targeted tests exist cleanly**

Run:

- `pnpm test`

If full-suite runtime is too heavy or unrelated failures exist, report that precisely.

**Step 3: Review changed files**

Confirm only the intended files changed for this task.

**Step 4: Do not commit automatically**

The worktree is already dirty in unrelated files, so leave commit decisions to a later explicit user request.
