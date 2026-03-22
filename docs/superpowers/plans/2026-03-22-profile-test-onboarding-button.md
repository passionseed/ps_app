# Profile Test Onboarding Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Test Onboarding" button in the profile page that navigates to the onboarding screen.

**Architecture:** Add a single `Pressable` button above the existing Sign Out button in `app/(tabs)/profile.tsx`. The button calls `router.push("/onboarding")`. No new files needed.

**Tech Stack:** React Native, Expo Router, TypeScript

---

### Task 1: Add Test Onboarding Button to Profile Page

**Files:**
- Modify: `app/(tabs)/profile.tsx` (near line 477, above the Sign Out button)

- [ ] **Step 1: Locate the Sign Out button in profile.tsx**

Open `app/(tabs)/profile.tsx` and find the `{/* Sign out */}` comment around line 477. The button to add goes directly above it.

- [ ] **Step 2: Add the Test Onboarding button**

Insert the following block immediately before the `{/* Sign out */}` comment. Wrapped in `__DEV__` so it only appears in development builds:

```tsx
          {/* Dev: Test Onboarding */}
          {__DEV__ && (
            <Pressable
              style={({ pressed }) => [
                styles.testOnboardingBtn,
                pressed && styles.testOnboardingBtnPressed,
              ]}
              onPress={() => router.push("/onboarding")}
            >
              <Text style={styles.testOnboardingText}>Test Onboarding</Text>
            </Pressable>
          )}
```

- [ ] **Step 3: Add styles for the button**

In the `StyleSheet.create({...})` block (bottom of the file), add these entries:

```ts
  testOnboardingBtn: {
    marginHorizontal: Space.lg,
    marginBottom: Space.sm,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  testOnboardingBtnPressed: {
    backgroundColor: "#F3F4F6",
  },
  testOnboardingText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
    color: "#6B7280",
  },
  testOnboardingTextPressed: {
    color: "#374151",
  },
```

- [ ] **Step 4: Verify visually**

Run `pnpm start` (or `pnpm ios`) and navigate to the Profile tab. Confirm:
- "Test Onboarding" button appears above the "Sign out" button
- Button is visually muted (gray, distinct from Sign Out)
- Tapping it navigates to the onboarding screen
- Sign Out button still works correctly

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat(profile): add Test Onboarding button for dev testing"
```
