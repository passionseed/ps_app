# Profile Page "Vision Board" Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Redesign the profile page (`/app/(tabs)/profile.tsx`) to feature a premium glassmorphic "Vision Board" header and a glowing activity timeline, making it instantly engaging for teenagers.

**Architecture:** We will replace the existing simple header and layout in `profile.tsx`. The new architecture involves a master `LinearGradient` header containing absolute positioned or flex-wrapped chips for careers and interests. Below this, we will implement a vertical scroll view containing the user's activity using the style established by `PathStepCard`. We will use mock data for the timeline initially. The entire structure, spacing, and colors will adhere strictly to the `design_guidelines.md`.

**Tech Stack:** React Native, Expo Router, Expo Linear Gradient, Supabase (for existing data fetching).

---

### Task 1: Scaffolding the Vision Board Header

**Files:**

- Modify: `app/(tabs)/profile.tsx`

**Step 1: Write the failing test**
(No automated tests for this UI component currently exist in the project, verified via `grep_search` and manual review. We will proceed with manual visual verification).

**Step 2: Write minimal implementation**

1. Add necessary imports (e.g., `LinearGradient` from `expo-linear-gradient` is already there, but we might need new icons or utility functions).
2. Replace the existing `styles.header` container with a new `LinearGradient` component.
3. Apply the gradient colors: `#FFFFFF` (0%), `#F9F5FF` (50%), `#EEF2FF` (100%).
4. Apply border radius (32px), border (1px solid `#CECECE`), and the premium shadow physics defined in the guidelines.
5. Move the existing `displayName` text and `settingsBtn` inside this new container.

**Step 3: Run test to verify it passes**
Manual verification: Open the app in the simulator and navigate to the Profile tab. The header should now be a large, soft-purple gradient card with a shadow and curved edges.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(profile): implement vision board gradient header container"
```

---

### Task 2: Populating the Vision Board with Chips

**Files:**

- Modify: `app/(tabs)/profile.tsx`

**Step 1: Write the failing test**
(Manual visual verification).

**Step 2: Write minimal implementation**

1. Create a helper function or sub-component within `profile.tsx` to render a "Vision Chip".
2. The Vision Chip should take a `type` (career or interest) to determine its glow color (Emerald Green `rgba(16, 185, 129, 0.25)` or Purple `rgba(139, 92, 246, 0.25)`).
3. If `careers.length > 0`, map over them and render green Vision Chips inside the new header.
4. If `interests.length > 0`, map over the selected statements and render purple Vision Chips inside the header.
5. Implement fallback mock data: If `careers.length === 0` and `interests.length === 0`, render hardcoded aspirational chips (e.g., "Game Developer" (green), "AI Ethics" (purple), "Space Architecture" (green)).
6. Style the layout within the header to wrap these chips nicely, perhaps with some slight random rotation or varied sizing if possible, otherwise a clean flex-wrap grid. Remove the old Career Goals section from the body.

**Step 3: Run test to verify it passes**
Manual verification: Check the Profile tab. The header should now contain colorful, glowing chips representing either the user's fetched data or the inspiring mock data.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(profile): populate vision board header with glowing chips"
```

---

### Task 3: Implementing the Journey Activity Timeline

**Files:**

- Modify: `app/(tabs)/profile.tsx`

**Step 1: Write the failing test**
(Manual visual verification).

**Step 2: Write minimal implementation**

1. Below the new header, create a new section title "Recent Activity".
2. Since we don't have a real activity feed, create a mock array of activity objects:
   ```typescript
   const mockActivity = [
     {
       id: 1,
       type: "milestone",
       title: "Unlocked Space Architect Path",
       date: "Today",
     },
     {
       id: 2,
       type: "learning",
       title: "Explored Cyber Security basics",
       date: "Yesterday",
     },
     { id: 3, type: "milestone", title: "Joined the Beta", date: "3 days ago" },
   ];
   ```
3. Map over `mockActivity` to render timeline cards.
4. Style these cards based on the `PathStepCard` guidelines: `borderRadius: 20px`, white background (`#FFFFFF`), `18px` padding, `gap: 16px`.
5. Apply the conditional soft glow shadows based on the `type` property (Green `rgba(16, 185, 129, 0.25)` for milestone, Blue `rgba(59, 130, 246, 0.25)` for learning).
6. Remove the old "Interests" section from the body, as they are now in the header.

**Step 3: Run test to verify it passes**
Manual verification: Scroll down on the Profile tab. You should see a vertical list of crisp white cards with colored glowing shadows representing the mock timeline.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat(profile): add mock journey activity timeline"
```

---

### Task 4: Refining Stats, Details, and Utilities

**Files:**

- Modify: `app/(tabs)/profile.tsx`

**Step 1: Write the failing test**
(Manual visual verification).

**Step 2: Write minimal implementation**

1. Update the `statsRow` styling to ensure it sits cleanly on the `#F3F4F6` background (no change to background color might be needed, just ensure margins/borders look right below the timeline).
2. Refactor the "Education" section. Instead of `infoRow` with borders, render the Level, School, and Language as inline pill-shaped chips (reusing the styling from the old `statementChip`: `#f0f8e8` background, rounded).
3. Ensure the Settings button is positioned correctly over the new gradient header (might need `zIndex`).
4. Modify the Sign Out button (`signOutBtn`). Change it to a "ghost" style: remove any background, make the border very subtle (e.g., `1px solid #E5E7EB`), text color `#9CA3AF`. Move it to the bottom of the scroll view.

**Step 3: Run test to verify it passes**
Manual verification: Check the bottom half of the Profile tab. The stats should look clean, education details should be pills, and the sign-out button should be subtle and recessed at the bottom. The settings gear should be clickable on top of the header.

**Step 4: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "refactor(profile): polish stats, details pills, and utility buttons"
```
