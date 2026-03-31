# Hackathon Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hackathon login button (email + password) to the landing page that routes participants into a completely separate `/(hackathon)/` tab experience, isolated from the normal app.

**Architecture:** Add `isHackathon` + `signInWithEmailPassword` to the existing `AuthContext` (same pattern as `isGuest`), persist the flag via AsyncStorage, and route hackathon users to a new `/(hackathon)/` route group with its own tab layout. The hackathon screens are ported from the existing pseed web project.

**Tech Stack:** Expo Router v6, Supabase (`signInWithPassword`), AsyncStorage, React Native, existing Hackathon components already in `components/Hackathon/`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `lib/hackathon-mode.ts` | AsyncStorage read/write for `hackathon_mode` key |
| Modify | `lib/auth.tsx` | Add `isHackathon`, `signInWithEmailPassword` to AuthContext |
| Modify | `app/_layout.tsx` | Route hackathon users to `/(hackathon)/home` |
| Create | `app/hackathon-login.tsx` | Email + password login screen |
| Create | `app/(hackathon)/_layout.tsx` | Tab navigator for hackathon users |
| Create | `app/(hackathon)/home.tsx` | Hackathon journey home (ported from pseed) |
| Create | `app/(hackathon)/profile.tsx` | Team info + sign out |
| Create | `app/(hackathon)/phase/[phaseId].tsx` | Phase detail (ported from pseed) |
| Create | `app/(hackathon)/module/[moduleId].tsx` | Module detail (ported from pseed) |
| Create | `app/(hackathon)/reflection/[phaseId].tsx` | Phase reflection (ported from pseed) |
| Modify | `app/index.tsx` | Add "Hackathon Login" button |

**Already exists (no action needed):**
- `types/hackathon-program.ts` — all hackathon types
- `lib/hackathonProgram.ts` — all query functions
- `lib/hackathonProgramPreview.ts` — preview/fallback data
- `lib/hackathonAi.ts` — AI feedback functions
- `components/Hackathon/ProgressGateCard.tsx`
- `components/Hackathon/ResponsibilityBanner.tsx`
- `components/Hackathon/TeamWorkspaceSection.tsx`

---

## Task 1: Create `lib/hackathon-mode.ts`

**Files:**
- Create: `lib/hackathon-mode.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/hackathon-mode.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HACKATHON_MODE_KEY = "hackathon_mode";

export async function readHackathonMode(): Promise<boolean> {
  const value = await AsyncStorage.getItem(HACKATHON_MODE_KEY);
  return value === "true";
}

export async function saveHackathonMode(value: boolean): Promise<void> {
  if (value) {
    await AsyncStorage.setItem(HACKATHON_MODE_KEY, "true");
  } else {
    await AsyncStorage.removeItem(HACKATHON_MODE_KEY);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hackathon-mode.ts
git commit -m "feat: add hackathon-mode AsyncStorage helper"
```

---

## Task 2: Extend `lib/auth.tsx` with hackathon auth

**Files:**
- Modify: `lib/auth.tsx`

- [ ] **Step 1: Add imports at the top of `lib/auth.tsx`**

After the existing imports (around line 15), add:

```typescript
import { readHackathonMode, saveHackathonMode } from "./hackathon-mode";
```

- [ ] **Step 2: Extend the `AuthContext` type (around line 89)**

Replace:
```typescript
type AuthContext = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  appLanguage: GuestLanguage;
  guestLanguage: GuestLanguage;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  setGuestLanguage: (language: GuestLanguage) => Promise<void>;
  setUserLanguage: (language: GuestLanguage) => void;
  enterAsGuest: () => void;
  exitGuestMode: () => void;
};
```

With:
```typescript
type AuthContext = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isHackathon: boolean;
  appLanguage: GuestLanguage;
  guestLanguage: GuestLanguage;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  setGuestLanguage: (language: GuestLanguage) => Promise<void>;
  setUserLanguage: (language: GuestLanguage) => void;
  enterAsGuest: () => void;
  exitGuestMode: () => void;
};
```

- [ ] **Step 3: Extend the default context value (around line 104)**

Replace:
```typescript
const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
  appLanguage: "th",
  guestLanguage: "th",
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  setGuestLanguage: async () => {},
  setUserLanguage: () => {},
  enterAsGuest: () => {},
  exitGuestMode: () => {},
});
```

With:
```typescript
const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
  isHackathon: false,
  appLanguage: "th",
  guestLanguage: "th",
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmailPassword: async () => {},
  setGuestLanguage: async () => {},
  setUserLanguage: () => {},
  enterAsGuest: () => {},
  exitGuestMode: () => {},
});
```

- [ ] **Step 4: Add `isHackathon` state inside `AuthProvider` (after line 122 where `isGuest` state is declared)**

After the line `const [isGuest, setIsGuest] = useState(false);`, add:
```typescript
const [isHackathon, setIsHackathon] = useState(false);
```

- [ ] **Step 5: Read `hackathon_mode` on bootstrap**

In the bootstrap `useEffect`, make two minimal changes to the existing `Promise.all`:

**Change 1** — add `readHackathonMode().catch(() => false)` to the array (after `readGuestLanguage()`):
```typescript
// Find this line:
      readGuestLanguage(),
// Add after it:
      readHackathonMode().catch(() => false),  // safe fallback if AsyncStorage fails
```

**Change 2** — extend the destructured params in the `.then()`:
```typescript
// Find:
    .then(async ([result, language]) => {
// Replace with:
    .then(async ([result, language, hackathonMode]) => {
```

**Change 3** — after `setGuestLanguageState(language);`, add:
```typescript
// Only apply hackathon mode if we also have a session
const sessionFromResult = result.data?.session ?? null;
if (hackathonMode && sessionFromResult) {
  setIsHackathon(true);
}
```

Do NOT restructure the existing Promise.race or its `.then()` chain — those are unchanged.

- [ ] **Step 6: Add `signInWithEmailPassword` function**

Add this function inside `AuthProvider`, after `exitGuestMode`:

```typescript
const signInWithEmailPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Verify the user is a hackathon participant
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Sign in succeeded but no user id returned.");

  // Defer by one tick so the Supabase auth lock is fully released before querying
  // (matches the existing pattern in onAuthStateChange — avoids Android deadlock)
  const { data: membership, error: memberError } = await new Promise<{
    data: { id: string } | null;
    error: unknown;
  }>((resolve) =>
    setTimeout(
      () =>
        supabase
          .from("hackathon_team_members")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle()
          .then(resolve),
      0,
    ),
  );

  if (memberError) throw memberError;

  if (!membership) {
    // Not a hackathon participant — sign them back out
    await supabase.auth.signOut();
    throw new Error("This account is not registered for a hackathon.");
  }

  await saveHackathonMode(true);
  setIsHackathon(true);
};
```

- [ ] **Step 7: Clear `isHackathon` on sign out**

Find the existing sign out / `onAuthStateChange` handler. In the block that runs when `nextSession` is null (around line 248):

```typescript
if (!nextSession) {
  console.log("[Auth] No session, setting loading=false");
  setProfileLanguageState(null);
  setLoading(false);
  return;
}
```

Replace with:
```typescript
if (!nextSession) {
  console.log("[Auth] No session, setting loading=false");
  setProfileLanguageState(null);
  setIsHackathon(false);
  void saveHackathonMode(false);
  setLoading(false);
  return;
}
```

- [ ] **Step 8: Add `isHackathon` and `signInWithEmailPassword` to the context provider value (around line 415)**

Find:
```typescript
value={{
  session,
  user: session?.user ?? null,
  loading,
  isGuest,
  appLanguage,
  guestLanguage,
  signInWithGoogle,
  signInWithApple,
  setGuestLanguage,
  setUserLanguage,
  enterAsGuest,
  exitGuestMode,
}}
```

Replace with:
```typescript
value={{
  session,
  user: session?.user ?? null,
  loading,
  isGuest,
  isHackathon,
  appLanguage,
  guestLanguage,
  signInWithGoogle,
  signInWithApple,
  signInWithEmailPassword,
  setGuestLanguage,
  setUserLanguage,
  enterAsGuest,
  exitGuestMode,
}}
```

- [ ] **Step 9: Commit**

```bash
git add lib/auth.tsx
git commit -m "feat: add isHackathon and signInWithEmailPassword to AuthContext"
```

---

## Task 3: Update routing in `app/_layout.tsx`

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Destructure `isHackathon` from `useAuth`**

Find (around line 60):
```typescript
const { session, loading, isGuest } = useAuth();
```

Replace with:
```typescript
const { session, loading, isGuest, isHackathon } = useAuth();
```

- [ ] **Step 2: Add hackathon routing before the guest check**

Find (around line 81):
```typescript
if (isGuest) {
  // Guest user - go to discover
  console.log("[RootNavigator] Guest mode, going to tabs");
  setProfile(null);
  router.replace("/(tabs)/discover");
  setIsNavReady(true);
  return;
}
```

Insert before that block:
```typescript
if (isHackathon && session) {
  console.log("[RootNavigator] Hackathon mode, going to hackathon home");
  setProfile(null);
  router.replace("/(hackathon)/home");
  setIsNavReady(true);
  return;
}
```

- [ ] **Step 3: Also add `isHackathon` to the `useEffect` dependency array**

Find:
```typescript
}, [isGuest, loading, session]);
```

Replace with:
```typescript
}, [isGuest, isHackathon, loading, session]);
```

- [ ] **Step 4: Register the new screens in the Stack**

In the `<Stack>` inside `RootNavigator`, add after the existing `<Stack.Screen name="index" />`:

```tsx
<Stack.Screen name="hackathon-login" />
<Stack.Screen name="(hackathon)" />
```

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: route hackathon users to /(hackathon)/home"
```

---

## Task 4: Create `app/hackathon-login.tsx`

**Files:**
- Create: `app/hackathon-login.tsx`

- [ ] **Step 1: Create the login screen**

```tsx
// app/hackathon-login.tsx
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppText } from "../components/AppText";
import { GlassButton } from "../components/Glass/GlassButton";
import { useAuth } from "../lib/auth";
import {
  Accent,
  PageBg,
  Radius,
  Space,
  Text as ThemeText,
  Type,
} from "../lib/theme";

export default function HackathonLoginScreen() {
  const { signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;  // prevent double-submit
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <AppText style={styles.backText}>‹ Back</AppText>
        </Pressable>

        <AppText variant="bold" style={styles.title}>
          Hackathon Login
        </AppText>
        <AppText style={styles.subtitle}>
          Sign in with your registered hackathon email and password.
        </AppText>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={ThemeText.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={ThemeText.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? (
          <AppText style={styles.errorText}>{error}</AppText>
        ) : null}

        <GlassButton
          variant="primary"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.loginButton}
        >
          Sign In
        </GlassButton>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  content: {
    flex: 1,
    padding: Space["2xl"],
    paddingTop: Space["4xl"],
    gap: Space.lg,
  },
  backRow: {
    marginBottom: Space.sm,
  },
  backText: {
    fontSize: 15,
    color: ThemeText.secondary,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: ThemeText.primary,
  },
  subtitle: {
    fontSize: Type.body.fontSize,
    lineHeight: 22,
    color: ThemeText.secondary,
  },
  form: {
    gap: Space.md,
    marginTop: Space.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",  // Border.default is transparent — use literal for visible input border
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
    backgroundColor: "#fff",
    fontFamily: "LibreFranklin_400Regular",
  },
  errorText: {
    color: Accent.red,
    fontSize: 14,
  },
  loginButton: {
    marginTop: Space.sm,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/hackathon-login.tsx
git commit -m "feat: add hackathon email/password login screen"
```

---

## Task 5: Add "Hackathon Login" button to `app/index.tsx`

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Add the hackathon button import and navigate call**

In `app/index.tsx`, find where `useAuth` is destructured. Add `router` import if not already present (it is: `import { router } from "expo-router";` — already there).

- [ ] **Step 2: Add the button in the JSX**

Find the guest button in the JSX. It looks like:
```tsx
<GlassButton
  ...
  onPress={handleGuestEntry}
>
  {copy.guestBtn}
</GlassButton>
```

After that button, add:
```tsx
<View style={styles.hackathonDivider}>
  <AppText style={styles.hackathonDividerText}>or</AppText>
</View>

<GlassButton
  variant="secondary"
  onPress={() => router.push("/hackathon-login")}
  style={styles.hackathonButton}
>
  🏆 {copy.hackathonBtn}
</GlassButton>
```

- [ ] **Step 3: Add the copy strings to the `COPY` object**

In the `COPY` object, add `hackathonBtn` to both `th` and `en`:

```typescript
// in th:
hackathonBtn: "เข้าสู่ระบบ Hackathon",

// in en:
hackathonBtn: "Hackathon Login",
```

- [ ] **Step 4: Add styles**

In the `StyleSheet.create({...})` at the bottom of `app/index.tsx`, add:

```typescript
hackathonDivider: {
  alignItems: "center",
  marginVertical: Space.xs,
},
hackathonDividerText: {
  fontSize: 12,
  color: ThemeText.muted ?? ThemeText.secondary,
},
hackathonButton: {
  borderColor: Accent.purple,
  borderWidth: 1,
},
```

- [ ] **Step 5: Check that `Space` and `ThemeText` are imported** — they are already imported in `app/index.tsx`. Verify `Accent` is also imported (it is, from `../lib/theme`).

- [ ] **Step 6: Commit**

```bash
git add app/index.tsx
git commit -m "feat: add hackathon login button to landing page"
```

---

## Task 6: Create `app/(hackathon)/_layout.tsx`

**Files:**
- Create: `app/(hackathon)/_layout.tsx`

- [ ] **Step 1: Create the tab layout**

```tsx
// app/(hackathon)/_layout.tsx
import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { Accent, PageBg, Text as ThemeText } from "../../lib/theme";

export default function HackathonLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PageBg.default,
          borderTopColor: "rgba(0,0,0,0.08)",
        },
        tabBarActiveTintColor: Accent.purple,
        tabBarInactiveTintColor: ThemeText.secondary,
        tabBarLabelStyle: {
          fontFamily: "LibreFranklin_400Regular",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(hackathon)/_layout.tsx"
git commit -m "feat: add hackathon tab layout with Home + Profile tabs"
```

---

## Task 7: Create `app/(hackathon)/home.tsx`

**Files:**
- Create: `app/(hackathon)/home.tsx`

- [ ] **Step 1: Create the home screen** (ported from pseed `app/hackathon-program/index.tsx`, with import paths updated)

```tsx
// app/(hackathon)/home.tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { GlassCard } from "../../components/Glass/GlassCard";
import { GlassButton } from "../../components/Glass/GlassButton";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
} from "../../lib/hackathonProgram";
import { getPreviewHackathonProgramHome } from "../../lib/hackathonProgramPreview";
import { Accent, PageBg, Space, Text as ThemeText, Radius, Type } from "../../lib/theme";
import type { HackathonProgramHome } from "../../types/hackathon-program";

function Badge({ label, color, bgColor }: { label: string; color: string; bgColor: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <AppText variant="bold" style={[styles.badgeText, { color }]}>
        {label}
      </AppText>
    </View>
  );
}

export default function HackathonHomeScreen() {
  const [data, setData] = useState<HackathonProgramHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const home = await getCurrentHackathonProgramHome();
      const isEmpty =
        JSON.stringify(home) === JSON.stringify(getEmptyHackathonProgramHome());

      if (isEmpty || !home.program || home.phases.length === 0) {
        setData(getPreviewHackathonProgramHome());
        setIsPreview(true);
      } else {
        setData(home);
        setIsPreview(false);
      }
    } catch {
      setData(getPreviewHackathonProgramHome());
      setIsPreview(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  const currentPhase =
    data.phases.find((phase) => phase.id === data.enrollment?.current_phase_id) ??
    data.phases[0];

  if (!currentPhase) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: ThemeText.secondary }}>No phases available yet.</AppText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={Accent.yellow}
        />
      }
    >
      <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>
          {data.program?.title ?? "Super Seed Hackathon"}
        </AppText>
        <AppText variant="bold" style={styles.title}>
          Your Hackathon Journey
        </AppText>
        <AppText style={styles.subtitle}>
          Track your progress, access team checkpoints, and complete structured evidence in each phase.
        </AppText>
      </View>

      {isPreview && (
        <GlassCard size="small" style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={[styles.statusDot, { backgroundColor: Accent.amber }]} />
            <AppText variant="bold" style={styles.previewTitle}>Preview Mode</AppText>
          </View>
          <AppText style={styles.previewCopy}>
            You are viewing sample data. Sign in with a valid participant account to see your real progress.
          </AppText>
        </GlassCard>
      )}

      <View style={styles.section}>
        <GlassCard size="large" style={styles.heroCard}>
          <View style={styles.cardHeader}>
            <Badge label="CURRENT PHASE" color={Accent.purple} bgColor="rgba(139, 92, 246, 0.1)" />
          </View>
          <View style={styles.heroTextContainer}>
            <AppText variant="bold" style={styles.heroTitle}>
              {currentPhase.title}
            </AppText>
            <AppText style={styles.heroBody}>
              {currentPhase.description}
            </AppText>
          </View>
          <GlassButton
            variant="primary"
            style={styles.heroCta}
            onPress={() => router.push(`/(hackathon)/phase/${currentPhase.id}`)}
          >
            Enter Phase
          </GlassButton>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <GlassCard size="medium" style={styles.teamCard}>
          <View style={styles.cardHeader}>
            <Badge label="TEAM" color={ThemeText.primary} bgColor={PageBg.default} />
            <AppText style={styles.metaCopy}>
              ID: {data.team?.id?.substring(0, 6) ?? "---"}
            </AppText>
          </View>
          <AppText variant="bold" style={styles.teamName}>
            {data.team?.name ?? data.team?.team_name ?? "Not assigned to a team yet"}
          </AppText>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <AppText variant="bold" style={styles.sectionTitle}>
          Program Timeline
        </AppText>
        <View style={styles.timelineContainer}>
          {data.phases.map((phase, index) => {
            const isCurrent = phase.id === currentPhase.id;
            const isPast = data.phases.findIndex((p) => p.id === currentPhase.id) > index;
            const nodeColor = isCurrent ? Accent.purple : isPast ? Accent.green : ThemeText.muted;
            const cardBgColor = "#FFFFFF";
            const borderColor = isCurrent ? "rgba(139, 92, 246, 0.2)" : "rgba(0,0,0,0.05)";

            return (
              <View key={phase.id} style={styles.timelineRow}>
                <View style={styles.timelineVisual}>
                  <View
                    style={[
                      styles.timelineNode,
                      {
                        backgroundColor: nodeColor,
                        borderColor: isCurrent ? "rgba(139, 92, 246, 0.3)" : "transparent",
                        borderWidth: isCurrent ? 4 : 0,
                      },
                    ]}
                  />
                  {index < data.phases.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: isPast ? Accent.green : ThemeText.muted },
                      ]}
                    />
                  )}
                </View>
                <Pressable
                  style={styles.timelineCardWrapper}
                  onPress={() => router.push(`/(hackathon)/phase/${phase.id}`)}
                >
                  <View
                    style={[
                      styles.phaseCard,
                      { backgroundColor: cardBgColor, borderColor },
                      isCurrent && styles.currentPhaseCardShadow,
                    ]}
                  >
                    <View style={styles.phaseCardHeader}>
                      <AppText
                        variant="bold"
                        style={[
                          styles.phaseTitle,
                          isCurrent && { color: Accent.purple },
                          !isCurrent && !isPast && { color: ThemeText.tertiary },
                        ]}
                      >
                        {phase.title}
                      </AppText>
                      {isPast && (
                        <Badge label="DONE" color={Accent.green} bgColor="rgba(16, 185, 129, 0.1)" />
                      )}
                    </View>
                    <AppText
                      style={[
                        styles.phaseBody,
                        !isCurrent && !isPast && { color: ThemeText.tertiary },
                      ]}
                    >
                      {phase.description}
                    </AppText>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PageBg.default },
  content: { padding: Space.xl, paddingTop: Space["3xl"], paddingBottom: 120, gap: Space["2xl"] },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: PageBg.default },
  header: { gap: Space.xs, paddingHorizontal: Space.xs },
  eyebrow: { fontSize: Type.label.fontSize, color: Accent.purple, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: Space.xs },
  title: { fontSize: 32, lineHeight: 38, color: ThemeText.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: Type.body.fontSize, lineHeight: 24, color: ThemeText.secondary, marginTop: Space.sm },
  previewCard: { backgroundColor: "#FFFFFF", borderColor: Accent.amber, borderWidth: 1, gap: Space.sm },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  statusDot: { width: 8, height: 8, borderRadius: Radius.full },
  previewTitle: { fontSize: Type.body.fontSize, color: ThemeText.primary },
  previewCopy: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary },
  section: { gap: Space.lg },
  sectionTitle: { fontSize: Type.title.fontSize, color: ThemeText.primary, paddingLeft: Space.xs, letterSpacing: -0.5, marginBottom: Space.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Space.sm },
  badge: { paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Radius.full },
  badgeText: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  heroCard: { gap: Space.lg, paddingBottom: Space["2xl"] },
  heroTextContainer: { gap: Space.sm },
  heroTitle: { fontSize: Type.header.fontSize, lineHeight: 34, color: ThemeText.primary, letterSpacing: -0.5 },
  heroBody: { fontSize: Type.body.fontSize, lineHeight: 24, color: ThemeText.secondary },
  heroCta: { marginTop: Space.lg, backgroundColor: Accent.yellow, borderRadius: Radius.full },
  teamCard: { gap: Space.sm },
  metaCopy: { fontSize: 12, color: ThemeText.tertiary, fontFamily: "LibreFranklin_400Regular" },
  teamName: { fontSize: Type.subtitle.fontSize, color: ThemeText.primary },
  timelineContainer: { marginTop: Space.sm },
  timelineRow: { flexDirection: "row", marginBottom: Space.md },
  timelineVisual: { width: 32, alignItems: "center", marginRight: Space.md },
  timelineNode: { width: 14, height: 14, borderRadius: Radius.full, marginTop: 4, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, marginTop: -10, marginBottom: -24, opacity: 0.3 },
  timelineCardWrapper: { flex: 1, paddingBottom: Space.xl },
  phaseCard: { backgroundColor: "#FFFFFF", borderRadius: Radius.lg, padding: Space.lg, borderWidth: 1, gap: Space.xs },
  currentPhaseCardShadow: { shadowColor: Accent.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  phaseCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  phaseTitle: { fontSize: Type.subtitle.fontSize, color: ThemeText.primary, flex: 1 },
  phaseBody: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary, marginTop: 2 },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(hackathon)/home.tsx"
git commit -m "feat: add hackathon home screen"
```

---

## Task 8: Create `app/(hackathon)/profile.tsx`

**Files:**
- Create: `app/(hackathon)/profile.tsx`

- [ ] **Step 1: Create the profile screen**

```tsx
// app/(hackathon)/profile.tsx
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/AppText";
import { GlassButton } from "../../components/Glass/GlassButton";
import { useAuth } from "../../lib/auth";
import { PageBg, Space, Text as ThemeText, Type } from "../../lib/theme";
import { supabase } from "../../lib/supabase";

export default function HackathonProfileScreen() {
  const { user } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.root}>
      <AppText variant="bold" style={styles.title}>Profile</AppText>

      <View style={styles.infoRow}>
        <AppText style={styles.label}>Email</AppText>
        <AppText style={styles.value}>{user?.email ?? "—"}</AppText>
      </View>

      <GlassButton variant="secondary" onPress={handleSignOut} style={styles.signOutButton}>
        Sign Out
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PageBg.default,
    padding: Space["2xl"],
    paddingTop: Space["4xl"],
    gap: Space.xl,
  },
  title: {
    fontSize: 30,
    color: ThemeText.primary,
  },
  infoRow: {
    gap: Space.xs,
  },
  label: {
    fontSize: 12,
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
  },
  signOutButton: {
    marginTop: Space.lg,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(hackathon)/profile.tsx"
git commit -m "feat: add hackathon profile screen with sign out"
```

---

## Task 9: Create `app/(hackathon)/phase/[phaseId].tsx`

**Files:**
- Create: `app/(hackathon)/phase/[phaseId].tsx`

- [ ] **Step 1: Create the directory and file** (ported from pseed, with import paths and router paths updated)

```tsx
// app/(hackathon)/phase/[phaseId].tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { GlassCard } from "../../../components/Glass/GlassCard";
import { getHackathonPhaseDetail } from "../../../lib/hackathonProgram";
import { getPreviewPhaseDetail } from "../../../lib/hackathonProgramPreview";
import { Accent, PageBg, Space, Text as ThemeText } from "../../../lib/theme";
import type { HackathonPhaseDetail } from "../../../types/hackathon-program";

export default function HackathonPhaseScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const [detail, setDetail] = useState<HackathonPhaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const live = await getHackathonPhaseDetail(phaseId!);
          if (!cancelled) {
            setDetail(live.phase ? live : getPreviewPhaseDetail(phaseId!));
          }
        } catch {
          if (!cancelled) {
            setDetail(getPreviewPhaseDetail(phaseId!));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [phaseId]),
  );

  if (loading || !detail) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <AppText variant="bold" style={styles.title}>
        {detail.phase?.title ?? "Phase"}
      </AppText>
      <AppText style={styles.subtitle}>{detail.phase?.description}</AppText>

      {detail.playlists.map((playlist) => (
        <View key={playlist.id} style={styles.playlist}>
          <GlassCard variant="destination" style={styles.playlistCard}>
            <AppText variant="bold" style={styles.playlistTitle}>
              {playlist.title}
            </AppText>
            <AppText style={styles.playlistBody}>{playlist.description}</AppText>
          </GlassCard>

          {playlist.modules.map((module) => (
            <Pressable
              key={module.id}
              onPress={() => router.push(`/(hackathon)/module/${module.id}`)}
            >
              <GlassCard variant="neutral" style={styles.moduleCard}>
                <AppText variant="bold" style={styles.moduleTitle}>
                  {module.title}
                </AppText>
                <AppText style={styles.moduleBody}>
                  {module.summary ?? "Structured module"}
                </AppText>
                <AppText style={styles.moduleMeta}>
                  Scope: {module.workflow_scope} · Gate: {module.gate_rule}
                </AppText>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PageBg.default },
  content: { padding: Space.lg, gap: Space.lg, paddingBottom: 96 },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: PageBg.default },
  backLink: { fontSize: 15, color: ThemeText.secondary },
  title: { fontSize: 30, lineHeight: 36, color: ThemeText.primary },
  subtitle: { fontSize: 16, lineHeight: 24, color: ThemeText.secondary },
  playlist: { gap: 12 },
  playlistCard: { gap: 8 },
  playlistTitle: { fontSize: 20, color: ThemeText.primary },
  playlistBody: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary },
  moduleCard: { gap: 8 },
  moduleTitle: { fontSize: 18, color: ThemeText.primary },
  moduleBody: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary },
  moduleMeta: { fontSize: 12, color: ThemeText.tertiary, textTransform: "uppercase" },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(hackathon)/phase/[phaseId].tsx"
git commit -m "feat: add hackathon phase detail screen"
```

---

## Task 10: Create `app/(hackathon)/module/[moduleId].tsx`

**Files:**
- Create: `app/(hackathon)/module/[moduleId].tsx`

- [ ] **Step 1: Create the module screen** (ported from pseed, with import paths updated)

```tsx
// app/(hackathon)/module/[moduleId].tsx
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../../components/AppText";
import { GlassCard } from "../../../components/Glass/GlassCard";
import { ProgressGateCard } from "../../../components/Hackathon/ProgressGateCard";
import { ResponsibilityBanner } from "../../../components/Hackathon/ResponsibilityBanner";
import { TeamWorkspaceSection } from "../../../components/Hackathon/TeamWorkspaceSection";
import {
  buildModuleProgressSnapshot,
  getHackathonModuleDetail,
} from "../../../lib/hackathonProgram";
import { getPreviewModuleDetail } from "../../../lib/hackathonProgramPreview";
import {
  buildPainPointFeedbackInput,
  getPainPointFeedbackVerdictLabel,
  requestPainPointFeedback,
  type PainPointFeedbackResult,
} from "../../../lib/hackathonAi";
import {
  Accent,
  PageBg,
  Radius,
  Space,
  Text as ThemeText,
  Type,
} from "../../../lib/theme";
import type { PathActivityScope } from "../../../types/pathlab-content";

function getResponsibilityCopy(scope: PathActivityScope) {
  switch (scope) {
    case "team":
      return {
        label: "Team synthesis required",
        detail: "This module is owned by the team. Individual evidence should feed the shared output before submission.",
      };
    case "hybrid":
      return {
        label: "Individual work unlocks team work",
        detail: "Each member contributes evidence first, then the team consolidates it into one shared submission.",
      };
    default:
      return {
        label: "Each member completes this activity",
        detail: "This step is individually owned so every participant builds real customer discovery skill, not just the loudest teammate.",
      };
  }
}

function getGateCardCopy(params: {
  gateStatus: string;
  gateRule: string;
  reviewMode: string;
  requiredMemberCount: number | null;
}) {
  const requiredCount = params.requiredMemberCount ?? 3;
  switch (params.gateStatus) {
    case "passed":
      return { title: "Gate passed", status: "passed", body: "This module has enough evidence to move forward." };
    case "revision_required":
      return { title: "Revision required", status: "revise", body: "At least one submission needs another pass before proceeding." };
    case "ready_for_team":
      return {
        title: "Ready for team synthesis",
        status: "ready",
        body: params.gateRule === "all_members_complete"
          ? "Every required member has completed the prerequisite work. The team can now consolidate."
          : `At least ${requiredCount} members have enough progress. The team can open the shared submission.`,
      };
    default:
      return {
        title: "Progress gate",
        status: "blocked",
        body: params.gateRule === "all_members_complete"
          ? "Every member must finish their part before the team can move on."
          : `This module needs more individual evidence. Target at least ${requiredCount} members.`,
      };
  }
}

export default function HackathonModuleScreen() {
  const insets = useSafeAreaInsets();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [module, setModule] = useState<Awaited<ReturnType<typeof getHackathonModuleDetail>> | null>(null);
  const [problemStatement, setProblemStatement] = useState("");
  const [customer, setCustomer] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState<PainPointFeedbackResult | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!moduleId) return;
      try {
        const result = await getHackathonModuleDetail(moduleId);
        if (!cancelled) {
          const fallback = result ?? getPreviewModuleDetail(moduleId);
          setModule(fallback);
          setError(fallback ? null : "Module not found");
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = getPreviewModuleDetail(moduleId);
          setModule(fallback);
          setError(fallback ? null : err instanceof Error ? err.message : "Unable to load module");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [moduleId]);

  const moduleSnapshot = useMemo(() => {
    if (!module) return null;
    return buildModuleProgressSnapshot({
      memberStatuses: Array.from({ length: module.required_member_count ?? 3 }, () => "pending"),
      workflow: {
        scope: module.workflow_scope,
        gate_rule: module.gate_rule,
        review_mode: module.review_mode,
        required_member_count: module.required_member_count,
      },
      teamSubmissionStatus: "not_started",
    });
  }, [module]);

  const responsibilityCopy = getResponsibilityCopy(module?.workflow_scope ?? "individual");
  const gateCopy = getGateCardCopy({
    gateStatus: moduleSnapshot?.gate_status ?? "blocked",
    gateRule: module?.gate_rule ?? "complete",
    reviewMode: module?.review_mode ?? "auto",
    requiredMemberCount: module?.required_member_count ?? null,
  });

  const isPainPointModule = Boolean(
    module?.slug?.includes("pain-point") || module?.title?.toLowerCase().includes("pain point"),
  );

  async function handleFeedback() {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const result = await requestPainPointFeedback(
        buildPainPointFeedbackInput({ problemStatement, customer, evidenceText }),
      );
      setFeedback(result);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Unable to get feedback");
    } finally {
      setFeedbackLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Space.xl, paddingBottom: Space["4xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <AppText style={styles.backText}>‹ Back</AppText>
          </Pressable>
          <AppText variant="bold" style={styles.title}>{module?.title ?? "Module"}</AppText>
          <AppText style={styles.subtitle}>
            {module?.summary ?? error ?? "This module trains a concrete customer discovery skill."}
          </AppText>
        </View>

        <ResponsibilityBanner label={responsibilityCopy.label} detail={responsibilityCopy.detail} />

        <View style={styles.metaGrid}>
          <MetaPill label="Scope" value={module?.workflow_scope ?? "individual"} />
          <MetaPill label="Gate" value={module?.gate_rule ?? "complete"} />
          <MetaPill label="Review" value={module?.review_mode ?? "auto"} />
          <MetaPill label="Members" value={String(module?.required_member_count ?? 3)} />
        </View>

        {moduleSnapshot ? (
          <>
            <ProgressGateCard title={gateCopy.title} body={gateCopy.body} status={gateCopy.status} />
            <GlassCard style={styles.snapshotCard}>
              <AppText style={styles.sectionLabel}>Gate snapshot</AppText>
              <AppText style={styles.snapshotText}>
                {moduleSnapshot.pending_members} members still need progress before the team can confidently move forward.
              </AppText>
            </GlassCard>
          </>
        ) : null}

        {isPainPointModule ? (
          <>
            <TeamWorkspaceSection
              title="Problem statement"
              description="Draft the team's pain point clearly. Then use the feedback loop to sharpen it before submission."
              fields={[{ key: "problem-statement", label: "Pain point draft", placeholder: "Describe the specific healthcare problem your team observed.", value: problemStatement, onChangeText: setProblemStatement, multiline: true }]}
            />
            <TeamWorkspaceSection
              title="Target customer"
              description="Name the exact healthcare user segment this pain belongs to."
              fields={[{ key: "target-customer", label: "Customer segment", placeholder: "Example: outpatient clinic managers handling insurance denials", value: customer, onChangeText: setCustomer }]}
            />
            <TeamWorkspaceSection
              title="Evidence bullets"
              description="Paste one interview fact per line."
              fields={[{ key: "evidence-bullets", label: "Interview evidence", placeholder: "One interview observation per line", value: evidenceText, onChangeText: setEvidenceText, multiline: true }]}
            />
            <Pressable
              onPress={handleFeedback}
              disabled={feedbackLoading}
              style={[styles.feedbackButton, feedbackLoading ? styles.feedbackButtonDisabled : null]}
            >
              <AppText variant="bold" style={styles.feedbackButtonText}>
                {feedbackLoading ? "Generating feedback..." : "Get AI feedback"}
              </AppText>
            </Pressable>
            {feedbackError ? <AppText style={styles.errorText}>{feedbackError}</AppText> : null}
            {feedback ? (
              <GlassCard variant="education" style={styles.feedbackResult}>
                <AppText variant="bold" style={styles.resultTitle}>
                  {getPainPointFeedbackVerdictLabel(feedback.verdict)}
                </AppText>
                <AppText style={styles.resultScores}>
                  Specificity {feedback.specificityScore} · Evidence {feedback.evidenceScore} · Severity {feedback.severityScore} · Clarity {feedback.clarityScore}
                </AppText>
                <View style={styles.noteList}>
                  {feedback.revisionNotes.map((note) => (
                    <View key={note} style={styles.noteRow}>
                      <View style={styles.noteDot} />
                      <AppText style={styles.noteText}>{note}</AppText>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ) : null}
          </>
        ) : (
          <GlassCard style={styles.placeholderCard}>
            <AppText style={styles.sectionLabel}>Submission workspace</AppText>
            <AppText variant="bold" style={styles.placeholderTitle}>Shared workspace contract is ready</AppText>
            <AppText style={styles.placeholderBody}>
              This module carries scope, gate, and review metadata. The next layer binds real submission records and mentor review states to this UI.
            </AppText>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <AppText style={styles.metaLabel}>{label}</AppText>
      <AppText variant="bold" style={styles.metaValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PageBg.default },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: PageBg.default },
  scrollContent: { paddingHorizontal: Space["2xl"], gap: Space.xl },
  header: { gap: Space.sm },
  backText: { fontSize: 14, color: Accent.purple },
  title: { fontSize: 28, color: ThemeText.primary },
  subtitle: { fontSize: 15, lineHeight: 22, color: ThemeText.secondary },
  sectionLabel: { fontSize: Type.label.fontSize, color: ThemeText.tertiary, textTransform: "uppercase", letterSpacing: 0.8 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  metaPill: { minWidth: 120, borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(0,0,0,0.10)", paddingHorizontal: Space.md, paddingVertical: Space.sm, gap: 2 },
  metaLabel: { fontSize: 11, color: ThemeText.tertiary },
  metaValue: { fontSize: 13, color: ThemeText.primary },
  snapshotCard: { gap: Space.sm },
  snapshotText: { fontSize: 14, lineHeight: 21, color: ThemeText.secondary },
  feedbackResult: { gap: Space.sm },
  feedbackButton: { alignItems: "center", justifyContent: "center", borderRadius: Radius.lg, backgroundColor: Accent.yellow, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  feedbackButtonDisabled: { opacity: 0.7 },
  feedbackButtonText: { color: "#101418", fontSize: 15 },
  resultTitle: { fontSize: 17, color: ThemeText.primary },
  resultScores: { fontSize: 13, color: ThemeText.secondary },
  noteList: { gap: Space.xs },
  noteRow: { flexDirection: "row", gap: Space.sm, alignItems: "flex-start" },
  noteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Accent.purple, marginTop: 8 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: ThemeText.secondary },
  errorText: { color: Accent.red, fontSize: 13 },
  placeholderCard: { gap: Space.sm },
  placeholderTitle: { fontSize: 18, color: ThemeText.primary },
  placeholderBody: { fontSize: 14, lineHeight: 21, color: ThemeText.secondary },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(hackathon)/module/[moduleId].tsx"
git commit -m "feat: add hackathon module detail screen"
```

---

## Task 11: Create `app/(hackathon)/reflection/[phaseId].tsx`

**Files:**
- Create: `app/(hackathon)/reflection/[phaseId].tsx`

- [ ] **Step 1: Create the reflection screen** (ported from pseed, import paths updated)

```tsx
// app/(hackathon)/reflection/[phaseId].tsx
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { TeamWorkspaceSection } from "../../../components/Hackathon/TeamWorkspaceSection";
import { GlassButton } from "../../../components/Glass/GlassButton";
import { PageBg, Space, Text as ThemeText } from "../../../lib/theme";

export default function HackathonPhaseReflectionScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const [individualReflection, setIndividualReflection] = useState("");
  const [teamReflection, setTeamReflection] = useState("");

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <AppText variant="bold" style={styles.title}>
        Phase reflection
      </AppText>
      <AppText style={styles.subtitle}>
        Capture what changed in how the team thinks after {phaseId?.replaceAll("-", " ")}.
      </AppText>

      <TeamWorkspaceSection
        title="Individual reflection"
        description="Each member should reflect on what surprised them, where their assumptions were wrong, and what they would investigate next."
        fields={[{
          key: "individual-reflection",
          label: "What changed in your thinking?",
          placeholder: "Write the strongest shift in your thinking after the interviews and research.",
          value: individualReflection,
          onChangeText: setIndividualReflection,
          multiline: true,
        }]}
      />

      <TeamWorkspaceSection
        title="Team reflection"
        description="The team reflection should capture the shared learning and what the group now believes about the customer problem."
        fields={[{
          key: "team-reflection",
          label: "What does the team now believe?",
          placeholder: "Summarize the team's strongest shared insight.",
          value: teamReflection,
          onChangeText: setTeamReflection,
          multiline: true,
        }]}
      />

      <GlassButton
        variant="primary"
        onPress={() =>
          Alert.alert(
            "Reflection captured",
            "The next step is wiring these fields into the hackathon reflection persistence layer.",
          )
        }
      >
        Submit reflection
      </GlassButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PageBg.default },
  content: { padding: Space.lg, gap: Space.lg, paddingBottom: 96 },
  backLink: { fontSize: 15, color: ThemeText.secondary },
  title: { fontSize: 30, lineHeight: 36, color: ThemeText.primary },
  subtitle: { fontSize: 16, lineHeight: 24, color: ThemeText.secondary },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(hackathon)/reflection/[phaseId].tsx"
git commit -m "feat: add hackathon phase reflection screen"
```

---

## Task 12: End-to-end verification

- [ ] **Step 1: Start the app**

```bash
pnpm start
```

- [ ] **Step 2: Verify normal login is unaffected**
  - Open the app
  - Tap "Continue with Google" → should log in and land on `/(tabs)/discover` as before

- [ ] **Step 3: Verify hackathon login button appears**
  - On landing page, confirm "🏆 Hackathon Login" button (or "🏆 เข้าสู่ระบบ Hackathon" in Thai) appears below the guest button

- [ ] **Step 4: Verify invalid credentials show an error**
  - Tap Hackathon Login → enter wrong email/password → should see Supabase auth error

- [ ] **Step 5: Verify non-hackathon account shows a clear error**
  - Log in with a valid Supabase account that is NOT in `hackathon_team_members` → should see: "This account is not registered for a hackathon."

- [ ] **Step 6: Verify hackathon login routes correctly**
  - Log in with a valid hackathon participant account → should land on `/(hackathon)/home` with program title, current phase hero card, team card, and timeline

- [ ] **Step 7: Verify navigation within hackathon**
  - Tap "Enter Phase" → navigates to phase detail with playlists and modules
  - Tap a module → navigates to module detail with gate card and meta pills
  - Tap Back → returns to previous screen correctly

- [ ] **Step 8: Verify persistence across app restart**
  - Log in as hackathon user → background the app → reopen → should still land on `/(hackathon)/home`

- [ ] **Step 9: Verify sign out**
  - Tap Profile tab → tap "Sign Out" → should return to landing page
  - Reopen app → should show landing page (not hackathon home)

---

## Task 13: Bump app version

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Bump `expo.version` in `app.json`**

Per the project versioning policy, bump the version on every shipped app update.

```bash
# Check current version first
grep '"version"' app.json
```

Increment the patch version (e.g., 1.2.3 → 1.2.4) or minor version if this is a significant feature addition.

- [ ] **Step 2: Commit**

```bash
git add app.json
git commit -m "chore: bump version for hackathon mode release"
```

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | DONE | 5 fixes applied, 0 critical gaps, mode: HOLD_SCOPE |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | DONE | 3 bugs fixed, test gap accepted |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**CEO FIXES APPLIED:** (1) AsyncStorage bootstrap `.catch(() => false)` safety, (2) double-submit guard in `handleLogin`, (3) null guard on `currentPhase`, (4) version bump task added, (5) Android auth-lock defer for `hackathon_team_members` query.

**ENG FIXES APPLIED:** (6) `hackathon-login.tsx`: `Border.default` is transparent — replaced with `rgba(0,0,0,0.12)` literal for visible input borders, removed unused `Border` import. (7) `module/[moduleId].tsx`: same `Border.default` bug in `metaPill` borderColor — replaced with `rgba(0,0,0,0.10)`, removed unused `Border` import. (8) Bootstrap Step 5 rewritten as 3 minimal changes (not a block replacement) to avoid misleading the executing agent.

**TEST GAPS ACCEPTED:** `lib/hackathon-mode.ts` has no unit tests. Skipped by user decision. UI screens: no tests (acceptable).

**CROSS-MODEL:** Outside voice ran during CEO review. 2 false positives. 1 accepted fix (auth lock defer). Reflection persistence deferred by user decision.

**UNRESOLVED:** 0

**VERDICT:** ENG CLEARED — plan is ready to implement.
