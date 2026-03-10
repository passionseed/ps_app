# Profile Page Redesign (Player Dashboard) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transform the Profile page into a game-like Player Dashboard featuring an Avatar, a 2x2 Ikigai grid, a Skills Inventory, and an Achievements Feed based on the approved design spec.

**Architecture:** We will enhance the layout in `app/(tabs)/profile.tsx` with new sections stacked below the existing header. We will use local mock data for the initial release and structure the layout into multiple smaller visual blocks.

**Tech Stack:** React Native, Expo Router, Line Gradients (`expo-linear-gradient`).

---

### Task 1: Skeleton & Basic Header Rebuild

**Files:**

- Modify: `/Users/bunyasit/dev/ps_app/app/(tabs)/profile.tsx`

**Step 1: Write the failing test**

We don't have a test suite set up for React Native UI elements in this project yet (npm test is failing). We will manually verify.

Run: `npm test`
Expected: Failing due to lack of test suite.

**Step 2: Write minimal implementation**

Remove the `SeedSection` components.
Create a basic Player Header featuring an Avatar (`<Image source={require("../../assets/passionseed-logo.svg")} />`) and a title text ("Level 3 Explorer"). Add basic safe area padding. Remove the old `refreshControl` temporarily if it gets in the way of building the static views.

**Step 3: Run test to verify it passes**

Manually verify in simulator that the header displays the Avatar and "Level 3 Explorer" without the old seed lists.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(discover): scaffolding and player header"
```

---

### Task 2: The Ikigai Compass (2x2 Grid)

**Files:**

- Modify: `/Users/bunyasit/dev/ps_app/app/(tabs)/profile.tsx`

**Step 1: Write the failing test**

Manual testing.

**Step 2: Write minimal implementation**

Create a 2x2 grid using flexbox (`flexDirection: 'row', flexWrap: 'wrap'`).
The four blocks will be: Passion (🔥), Mission (🎯), Profession (💼), Vocation (🌍). Style them like glassmorphic cards with scores out of 100 based on mock data (e.g., Passion: 85, Mission: 72, Profession: 45, Vocation: 60).
Add a small "Insights" text snippet below the grid ("Your strength lies in Passion and Mission!").

**Step 3: Run test to verify it passes**

Manual verification in simulator.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(discover): add 2x2 ikigai compass and insights"
```

---

### Task 3: Skills Inventory

**Files:**

- Modify: `/Users/bunyasit/dev/ps_app/app/(tabs)/profile.tsx`

**Step 1: Write the failing test**

Manual testing.

**Step 2: Write minimal implementation**

Create a vertical list or a grid of "Skills".
Mock data array: `[{ id: 1, name: "UX Design", level: "Intermediate", category: "Design" }, { id: 2, name: "React", level: "Beginner", category: "Code" }]`.
Map over the mock data and render distinct badges or chips for each skill, colored by category, with the proficiency level included. Use a title like "Your Skills".

**Step 3: Run test to verify it passes**

Manual verification in simulator.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(discover): add skills inventory section"
```

---

### Task 4: Activity & Achievements Feed

**Files:**

- Modify: `/Users/bunyasit/dev/ps_app/app/(tabs)/profile.tsx`

**Step 1: Write the failing test**

Manual testing.

**Step 2: Write minimal implementation**

Add a "Recent Activity" list at the bottom of the page.
Mock data array: `[{ id: 1, text: "You unlocked the Prototyping skill", time: "2h ago" }, { id: 2, text: "Alex completed their first project", time: "5h ago" }]`.
Render these items as distinct activity cards with an icon (e.g., 🏆 or 🌟).
Ensure there is a bottom padding so it clears the tab bar.

**Step 3: Run test to verify it passes**

Manual verification in simulator.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(discover): add activity and achievements feed"
```
