# Replace ActivityIndicator with PathLabSkiaLoader Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Standardize loading state animations by replacing all React Native `ActivityIndicator` components with the branded `PathLabSkiaLoader`.

**Architecture:** 
1.  **Enhance shared component:** Add a `tiny` size to `PathLabSkiaLoader` to fit small spaces (like button loaders).
2.  **Bulk replacements:** Update 29 components and screens to use `PathLabSkiaLoader`, mapping sizes appropriately.
3.  **Clean up:** Remove unused `ActivityIndicator` imports and update tests that assert the presence/absence of basic loaders.

**Tech Stack:** React Native, @shopify/react-native-skia

---

### Task 1: Add "tiny" size to PathLabSkiaLoader

**Files:**
- Modify: `components/PathLabSkiaLoader.tsx:26-31`

**Step 1: Update DIMENSIONS and Props types**

```typescript
const DIMENSIONS = {
  large: { canvas: 108, core: 15, ringMax: 46, blur: 14 },
  small: { canvas: 44, core: 5.5, ringMax: 16, blur: 5 },
  tiny: { canvas: 24, core: 3, ringMax: 10, blur: 3 },
} as const;
```

**Step 2: Update rendering logic to handle tiny size (treat same as small for logic)**

```typescript
// Line 112
{size === "large" ? (
  // ... large loader logic
) : (
  <Group>
    <Circle cx={cx} cy={cy} r={coreR} color={LIME_SOFT} opacity={0.92}>
      <BlurMask blur={blur} style="normal" />
    </Circle>
  </Group>
)}
```

**Step 3: Commit**

```bash
git add components/PathLabSkiaLoader.tsx
git commit -m "feat: add tiny size to PathLabSkiaLoader for buttons"
```

### Task 2: Replace ActivityIndicator in Screen Loaders (Large)

**Files:**
- Modify: `app/onboarding/StepCareers.tsx`, `app/onboarding/StepInterests.tsx`, `app/onboarding/index.tsx`, `app/node/[nodeId].tsx`, `app/reflection/[enrollmentId].tsx`, `app/hackathon-program/index.tsx`, `app/ikigai.tsx`, `app/programs/[programId].tsx`, `app/hackathon-program/phase/[phaseId].tsx`, `app/hackathon-program/module/[moduleId].tsx`, `app/programs/index.tsx`, `app/(tabs)/my-paths.tsx`, `app/plans/index.tsx`, `app/plans/[planId].tsx`, `app/plans/create.tsx`, `app/career/[name].tsx`, `app/fit/index.tsx`, `app/fit/[roundId].tsx`, `app/activity/[activityId].tsx`, `app/saved/index.tsx`, `app/settings.tsx`

**Step 1: Replace Large ActivityIndicator with PathLabSkiaLoader**

In each of these files:
- Replace `import { ..., ActivityIndicator, ... } from "react-native";` with `import { ..., ... } from "react-native";` (remove `ActivityIndicator`)
- Import `{ PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";` (adjust path as needed).
- Replace `<ActivityIndicator color={...} size="large" />` with `<PathLabSkiaLoader size="large" />`.

**Step 2: Commit for screens**

```bash
git add app/
git commit -m "style: replace full-page ActivityIndicator with PathLabSkiaLoader"
```

### Task 3: Replace ActivityIndicator in Small Components (Buttons/Tiny)

**Files:**
- Modify: `components/Glass/GlassButton.tsx`, `app/portfolio/add.tsx`, `app/portfolio/index.tsx`, `app/onboarding/StepTcasProfile.tsx`, `app/university/[key].tsx`, `app/university/compare.tsx`

**Step 1: Replace Small ActivityIndicator with Tiny PathLabSkiaLoader**

In `components/Glass/GlassButton.tsx`:
- Import `PathLabSkiaLoader` from `../PathLabSkiaLoader`.
- Replace instances of `<ActivityIndicator size="small" ... />` with `<PathLabSkiaLoader size="tiny" />`.

**Step 2: Update other small loader files**

- Replace `<ActivityIndicator size="small" ... />` with `<PathLabSkiaLoader size="small" />` (if more space) or `tiny` (if inside buttons/pills).

**Step 3: Commit**

```bash
git add components/Glass/GlassButton.tsx app/
git commit -m "style: replace small ActivityIndicator with branded Skia loader"
```

### Task 4: Fix Tests and Clean Up

**Files:**
- Modify: `tests/seed-loading-screen.test.ts`, `tests/path-loading-screen.test.ts`

**Step 1: Update Test Assertions**

Update expectations to check for `PathLabSkiaLoader`.

**Step 2: Commit and Final Verify**

```bash
git add tests/
git commit -m "test: update loader assertions"
```
