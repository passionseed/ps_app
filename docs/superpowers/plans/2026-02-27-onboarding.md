# Onboarding Feature Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hard-gate onboarding flow for first-time users that collects profile data, runs a Gemini-powered interest discovery chat, and captures career goals before allowing access to the app.

**Architecture:** A 5-step onboarding screen (`app/onboarding/index.tsx`) acts as the step controller, rendering one step component at a time. The auth gate in `_layout.tsx` routes unauthenticated-but-first-time users to `/onboarding`. A Supabase Edge Function in the pseed project proxies chat requests to Gemini 2.5 Flash, keeping the API key server-side. Progress is persisted to `onboarding_state` table so users can resume mid-flow.

**Tech Stack:** Expo Router v6, React Native, Supabase JS v2, Supabase Edge Functions (Deno), Gemini 2.5 Flash API, TypeScript, pnpm

---

## Key Paths

| What               | Where                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| Migrations         | `/Users/bunyasit/dev/pseed/supabase/migrations/`                        |
| Edge Function      | `/Users/bunyasit/dev/pseed/supabase/functions/onboarding-chat/index.ts` |
| Mobile app root    | `/Users/bunyasit/dev/ps_app/`                                           |
| Types              | `types/onboarding.ts`                                                   |
| DB helpers         | `lib/onboarding.ts`                                                     |
| Auth gate          | `app/_layout.tsx`                                                       |
| Onboarding screens | `app/onboarding/`                                                       |

## Files to Create / Modify

| Action | File                                                             | Responsibility                                                                 |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Create | `pseed/supabase/migrations/20260227000002_onboarding_schema.sql` | Add columns to profiles, create user_interests, career_goals, onboarding_state |
| Create | `pseed/supabase/functions/onboarding-chat/index.ts`              | Gemini 2.5 Flash proxy Edge Function                                           |
| Create | `ps_app/types/onboarding.ts`                                     | All onboarding TypeScript types                                                |
| Create | `ps_app/lib/onboarding.ts`                                       | Supabase DB helpers for onboarding                                             |
| Modify | `ps_app/app/_layout.tsx`                                         | Add onboarding gate + profile fetch                                            |
| Create | `ps_app/app/onboarding/_layout.tsx`                              | Minimal layout wrapper for onboarding route                                    |
| Create | `ps_app/app/onboarding/index.tsx`                                | Step controller (renders active step)                                          |
| Create | `ps_app/app/onboarding/StepProfile.tsx`                          | Education, school, language, DOB inputs                                        |
| Create | `ps_app/app/onboarding/StepChat.tsx`                             | Chat bubble UI + Edge Function calls                                           |
| Create | `ps_app/app/onboarding/StepInterests.tsx`                        | AI-generated interest category cards                                           |
| Create | `ps_app/app/onboarding/StepCareers.tsx`                          | Career chip selection + freetext                                               |
| Create | `ps_app/app/onboarding/StepSettings.tsx`                         | Push notifications, reminder, theme                                            |

---

## Chunk 1: Database Migration

### Task 1: Write the migration

**Files:**

- Create: `/Users/bunyasit/dev/pseed/supabase/migrations/20260227000002_onboarding_schema.sql`

- [ ] **Step 1: Create migration file**

```sql
-- /Users/bunyasit/dev/pseed/supabase/migrations/20260227000002_onboarding_schema.sql

-- 1. Extend profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_name     text null,
  ADD COLUMN IF NOT EXISTS is_onboarded   boolean not null default false,
  ADD COLUMN IF NOT EXISTS onboarded_at   timestamptz null,
  ADD COLUMN IF NOT EXISTS mobile_settings jsonb null;

-- mobile_settings JSON shape:
-- { "push_enabled": true, "reminder_time": "09:00", "theme": "light" }

-- 2. user_interests table
CREATE TABLE IF NOT EXISTS public.user_interests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_name  text not null,
  statements     text[] not null,
  selected       text[] not null default '{}',
  created_at     timestamptz not null default now()
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own interests"
  ON public.user_interests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. career_goals table
CREATE TABLE IF NOT EXISTS public.career_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  career_name  text not null,
  source       text not null check (source in ('ai_suggested', 'user_typed')),
  created_at   timestamptz not null default now()
);

ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own career goals"
  ON public.career_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. onboarding_state table (resumability)
CREATE TABLE IF NOT EXISTS public.onboarding_state (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  current_step   text not null default 'profile'
                   check (current_step in ('profile','chat','interests','careers','settings')),
  chat_history   jsonb not null default '[]',
  collected_data jsonb not null default '{}',
  updated_at     timestamptz not null default now()
);

ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own onboarding state"
  ON public.onboarding_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration to Supabase cloud**

In the Supabase dashboard SQL editor, run the migration SQL. Or via CLI from pseed project:

```bash
cd /Users/bunyasit/dev/pseed
npx supabase db push
```

Verify in the dashboard that profiles now has `is_onboarded`, and the 3 new tables exist.

- [ ] **Step 3: Commit migration**

```bash
cd /Users/bunyasit/dev/pseed
git add supabase/migrations/20260227000002_onboarding_schema.sql
git commit -m "feat: add onboarding schema (profiles cols, user_interests, career_goals, onboarding_state)"
```

---

## Chunk 2: Edge Function

### Task 2: Gemini proxy Edge Function

**Files:**

- Create: `/Users/bunyasit/dev/pseed/supabase/functions/onboarding-chat/index.ts`

The Edge Function accepts a `mode` field and dispatches to Gemini accordingly. It returns a typed JSON response the mobile app parses.

- [ ] **Step 1: Create functions directory and file**

```bash
mkdir -p /Users/bunyasit/dev/pseed/supabase/functions/onboarding-chat
```

- [ ] **Step 2: Write the Edge Function**

```typescript
// /Users/bunyasit/dev/pseed/supabase/functions/onboarding-chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

interface RequestBody {
  mode: "chat" | "generate_interests" | "suggest_careers";
  chat_history: ChatMessage[];
  user_context: {
    name: string;
    education_level: string;
    selected_interests?: string[];
  };
}

interface OnboardingResponse {
  message: string;
  action:
    | null
    | "transition_to_interests"
    | "show_interest_categories"
    | "show_career_suggestions";
  action_data?: {
    categories?: { name: string; statements: string[] }[];
    careers?: string[];
  };
}

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `You are a friendly onboarding guide for Passion Seed, a Thai app that helps students discover their career paths. You are having a warm, encouraging conversation with a new user.

Your goal is to understand their personality, values, and interests through natural conversation. Ask 2-4 thoughtful open-ended questions — one at a time. Keep responses concise and conversational (2-3 sentences max).

When you feel you have enough context to identify 3-4 distinct interest themes, end your message with the exact token: [READY_FOR_INTERESTS]

Do not mention this token to the user. Keep it casual and supportive.`,

  generate_interests: `Based on the conversation history, generate exactly 3-4 interest categories that reflect this user's personality and values.

For each category:
- Give it a vivid, role-like name (e.g. "System Architect", "Human Connector", "Creative Catalyst")
- Write exactly 6 statements in first person starting with "I" that someone in that role would deeply resonate with
- Make statements specific and emotionally resonant, not generic

Respond ONLY with valid JSON in this exact shape:
{
  "categories": [
    {
      "name": "Category Name",
      "statements": ["I statement 1", "I statement 2", "I statement 3", "I statement 4", "I statement 5", "I statement 6"]
    }
  ]
}`,

  suggest_careers: `Based on the user's selected interest statements, suggest 6-8 specific career paths they might want to explore.

Rules:
- Be specific (e.g. "Product Designer" not "Designer")
- Mix conventional and unconventional options
- Bias toward careers that are explorable in a 4-5 day micro-journey format
- Consider the Thai education context

Respond ONLY with valid JSON:
{
  "careers": ["Career 1", "Career 2", "Career 3", "Career 4", "Career 5", "Career 6"]
}`,
};

async function callGemini(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage?: string,
): Promise<string> {
  const contents: ChatMessage[] = [...history];
  if (userMessage) {
    contents.push({ role: "user", parts: [{ text: userMessage }] });
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { mode, chat_history, user_context } = body;

    let response: OnboardingResponse;

    if (mode === "chat") {
      const text = await callGemini(
        SYSTEM_PROMPTS.chat.replace("{name}", user_context.name),
        chat_history,
      );

      const readyForInterests = text.includes("[READY_FOR_INTERESTS]");
      const cleanText = text.replace("[READY_FOR_INTERESTS]", "").trim();

      response = {
        message: cleanText,
        action: readyForInterests ? "transition_to_interests" : null,
      };
    } else if (mode === "generate_interests") {
      const text = await callGemini(
        SYSTEM_PROMPTS.generate_interests,
        chat_history,
      );
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in Gemini response");
      const parsed = JSON.parse(jsonMatch[0]);

      response = {
        message:
          "Here are some themes I noticed about you. Select statements that feel true:",
        action: "show_interest_categories",
        action_data: { categories: parsed.categories },
      };
    } else if (mode === "suggest_careers") {
      const interestContext = user_context.selected_interests?.join(", ") ?? "";
      const prompt = `User's selected interests: ${interestContext}`;
      const text = await callGemini(SYSTEM_PROMPTS.suggest_careers, [
        { role: "user", parts: [{ text: prompt }] },
      ]);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in Gemini response");
      const parsed = JSON.parse(jsonMatch[0]);

      response = {
        message:
          "Based on your interests, here are some paths you might want to try:",
        action: "show_career_suggestions",
        action_data: { careers: parsed.careers },
      };
    } else {
      throw new Error(`Unknown mode: ${mode}`);
    }

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 3: Set Gemini API key as Supabase secret**

In Supabase dashboard → Project Settings → Edge Functions → Secrets, add:

```
GEMINI_API_KEY = <your Gemini API key from Google AI Studio>
```

Or via CLI:

```bash
cd /Users/bunyasit/dev/pseed
npx supabase secrets set GEMINI_API_KEY=your_key_here
```

- [ ] **Step 4: Deploy the Edge Function**

```bash
cd /Users/bunyasit/dev/pseed
npx supabase functions deploy onboarding-chat --no-verify-jwt
```

`--no-verify-jwt` lets the mobile app call it with the user's Supabase session token (handled by the Supabase client automatically).

- [ ] **Step 5: Commit**

```bash
cd /Users/bunyasit/dev/pseed
git add supabase/functions/onboarding-chat/index.ts
git commit -m "feat: add onboarding-chat Edge Function (Gemini 2.5 Flash proxy)"
```

---

## Chunk 3: Types + DB Helpers + Auth Gate

### Task 3: TypeScript types

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/types/onboarding.ts`

- [ ] **Step 1: Write types file**

```typescript
// /Users/bunyasit/dev/ps_app/types/onboarding.ts

export type OnboardingStep =
  | "profile"
  | "chat"
  | "interests"
  | "careers"
  | "settings";

export type ChatMessage = {
  role: "user" | "model";
  parts: [{ text: string }];
};

export type InterestCategory = {
  id?: string;
  category_name: string;
  statements: string[];
  selected: string[];
};

export type CareerGoal = {
  career_name: string;
  source: "ai_suggested" | "user_typed";
};

export type MobileSettings = {
  push_enabled: boolean;
  reminder_time: string; // "HH:MM" e.g. "09:00"
  theme: "light" | "dark";
};

export type OnboardingState = {
  current_step: OnboardingStep;
  chat_history: ChatMessage[];
  collected_data: Partial<CollectedData>;
};

export type CollectedData = {
  education_level: "high_school" | "university" | "unaffiliated";
  school_name?: string;
  preferred_language: "en" | "th";
  date_of_birth?: string; // ISO date string YYYY-MM-DD
};

export type OnboardingChatResponse = {
  message: string;
  action:
    | null
    | "transition_to_interests"
    | "show_interest_categories"
    | "show_career_suggestions";
  action_data?: {
    categories?: { name: string; statements: string[] }[];
    careers?: string[];
  };
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  education_level: "high_school" | "university" | "unaffiliated";
  preferred_language: "en" | "th";
  school_name: string | null;
  is_onboarded: boolean;
  onboarded_at: string | null;
  mobile_settings: MobileSettings | null;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/bunyasit/dev/ps_app
npx tsc --noEmit
```

Expected: no errors.

---

### Task 4: DB helper functions

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/lib/onboarding.ts`

- [ ] **Step 1: Write lib/onboarding.ts**

```typescript
// /Users/bunyasit/dev/ps_app/lib/onboarding.ts
import { supabase } from "./supabase";
import type {
  OnboardingStep,
  ChatMessage,
  CollectedData,
  InterestCategory,
  CareerGoal,
  MobileSettings,
  Profile,
  OnboardingChatResponse,
} from "../types/onboarding";

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, avatar_url, education_level, preferred_language, school_name, is_onboarded, onboarded_at, mobile_settings",
    )
    .eq("id", userId)
    .single();

  if (error) return null;
  return data as Profile;
}

// ── Onboarding State ──────────────────────────────────────────────────────────

export async function getOnboardingState(userId: string) {
  const { data } = await supabase
    .from("onboarding_state")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function upsertOnboardingState(
  userId: string,
  updates: {
    current_step?: OnboardingStep;
    chat_history?: ChatMessage[];
    collected_data?: Partial<CollectedData>;
  },
) {
  await supabase.from("onboarding_state").upsert({
    user_id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

// ── Step saves ────────────────────────────────────────────────────────────────

export async function saveProfileStep(userId: string, data: CollectedData) {
  await supabase
    .from("profiles")
    .update({
      education_level: data.education_level,
      preferred_language: data.preferred_language,
      school_name: data.school_name ?? null,
      date_of_birth: data.date_of_birth ?? null,
    })
    .eq("id", userId);

  await upsertOnboardingState(userId, {
    current_step: "chat",
    collected_data: data,
  });
}

export async function saveInterests(
  userId: string,
  categories: InterestCategory[],
) {
  // Delete previous interests (re-onboarding edge case)
  await supabase.from("user_interests").delete().eq("user_id", userId);

  const rows = categories.map((c) => ({
    user_id: userId,
    category_name: c.category_name,
    statements: c.statements,
    selected: c.selected,
  }));

  await supabase.from("user_interests").insert(rows);
  await upsertOnboardingState(userId, { current_step: "careers" });
}

export async function saveCareers(userId: string, careers: CareerGoal[]) {
  await supabase.from("career_goals").delete().eq("user_id", userId);

  const rows = careers.map((c) => ({
    user_id: userId,
    career_name: c.career_name,
    source: c.source,
  }));

  if (rows.length > 0) await supabase.from("career_goals").insert(rows);
  await upsertOnboardingState(userId, { current_step: "settings" });
}

export async function completeOnboarding(
  userId: string,
  settings: MobileSettings,
) {
  await supabase
    .from("profiles")
    .update({
      mobile_settings: settings,
      is_onboarded: true,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", userId);

  await supabase.from("onboarding_state").delete().eq("user_id", userId);
}

// ── Edge Function call ────────────────────────────────────────────────────────

export async function callOnboardingChat(params: {
  mode: "chat" | "generate_interests" | "suggest_careers";
  chat_history: ChatMessage[];
  user_context: {
    name: string;
    education_level: string;
    selected_interests?: string[];
  };
}): Promise<OnboardingChatResponse> {
  const { data, error } = await supabase.functions.invoke("onboarding-chat", {
    body: params,
  });
  if (error) throw error;
  return data as OnboardingChatResponse;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/bunyasit/dev/ps_app
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add types/onboarding.ts lib/onboarding.ts
git commit -m "feat: add onboarding types and DB helpers"
```

---

### Task 5: Update auth gate in \_layout.tsx

**Files:**

- Modify: `/Users/bunyasit/dev/ps_app/app/_layout.tsx`

Current `_layout.tsx` redirects only based on `session`. We need to also fetch the profile and route to `/onboarding` when `is_onboarded = false`.

- [ ] **Step 1: Update \_layout.tsx**

Replace the entire file:

```tsx
// /Users/bunyasit/dev/ps_app/app/_layout.tsx
import { Stack, router } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import { getProfile } from "../lib/onboarding";
import type { Profile } from "../types/onboarding";

function RootNavigator() {
  const { session, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setProfile(null);
      router.replace("/");
      return;
    }

    getProfile(session.user.id).then((p) => {
      setProfile(p);
      if (!p || !p.is_onboarded) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/discover");
      }
    });
  }, [session, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="seed/[id]" options={{ presentation: "card" }} />
      <Stack.Screen
        name="path/[enrollmentId]"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="reflection/[enrollmentId]"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Orbit_400Regular: require("../assets/Orbit_400Regular.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/bunyasit/dev/ps_app
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add app/_layout.tsx
git commit -m "feat: add onboarding gate to root layout"
```

---

## Chunk 4: Onboarding Screens

### Task 6: Onboarding layout + step controller scaffolding

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/app/onboarding/_layout.tsx`
- Create: `/Users/bunyasit/dev/ps_app/app/onboarding/index.tsx`

- [ ] **Step 1: Create onboarding layout**

```tsx
// /Users/bunyasit/dev/ps_app/app/onboarding/_layout.tsx
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Create onboarding index (step controller)**

```tsx
// /Users/bunyasit/dev/ps_app/app/onboarding/index.tsx
import { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../../lib/auth";
import { getOnboardingState } from "../../lib/onboarding";
import type {
  OnboardingStep,
  ChatMessage,
  CollectedData,
  InterestCategory,
} from "../../types/onboarding";
import StepProfile from "./StepProfile";
import StepChat from "./StepChat";
import StepInterests from "./StepInterests";
import StepCareers from "./StepCareers";
import StepSettings from "./StepSettings";

const STEPS: OnboardingStep[] = [
  "profile",
  "chat",
  "interests",
  "careers",
  "settings",
];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("profile");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [collectedData, setCollectedData] = useState<Partial<CollectedData>>(
    {},
  );
  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Resume from saved state
  useEffect(() => {
    if (!user) return;
    getOnboardingState(user.id).then((state) => {
      if (state) {
        setCurrentStep(state.current_step as OnboardingStep);
        setChatHistory(state.chat_history ?? []);
        setCollectedData(state.collected_data ?? {});
      }
      setLoading(false);
    });
  }, [user]);

  const stepIndex = STEPS.indexOf(currentStep);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#BFFF00" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.dot,
              i <= stepIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {currentStep === "profile" && (
        <StepProfile
          userId={user!.id}
          onComplete={(data) => {
            setCollectedData(data);
            setCurrentStep("chat");
          }}
        />
      )}
      {currentStep === "chat" && (
        <StepChat
          userId={user!.id}
          userName={user?.user_metadata?.full_name?.split(" ")[0] ?? "there"}
          educationLevel={collectedData.education_level ?? "high_school"}
          chatHistory={chatHistory}
          onChatHistoryUpdate={setChatHistory}
          onComplete={() => setCurrentStep("interests")}
        />
      )}
      {currentStep === "interests" && (
        <StepInterests
          userId={user!.id}
          userName={user?.user_metadata?.full_name?.split(" ")[0] ?? "there"}
          educationLevel={collectedData.education_level ?? "high_school"}
          chatHistory={chatHistory}
          onComplete={(cats) => {
            setInterests(cats);
            setCurrentStep("careers");
          }}
        />
      )}
      {currentStep === "careers" && (
        <StepCareers
          userId={user!.id}
          userName={user?.user_metadata?.full_name?.split(" ")[0] ?? "there"}
          educationLevel={collectedData.education_level ?? "high_school"}
          interests={interests}
          onComplete={() => setCurrentStep("settings")}
        />
      )}
      {currentStep === "settings" && <StepSettings userId={user!.id} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0514" },
  loading: {
    flex: 1,
    backgroundColor: "#0a0514",
    justifyContent: "center",
    alignItems: "center",
  },
  progress: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 60,
    paddingBottom: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: "#BFFF00" },
  dotInactive: { backgroundColor: "rgba(255,255,255,0.2)" },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add app/onboarding/
git commit -m "feat: add onboarding layout and step controller scaffold"
```

---

### Task 7: StepProfile

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/app/onboarding/StepProfile.tsx`

- [ ] **Step 1: Create StepProfile.tsx**

```tsx
// /Users/bunyasit/dev/ps_app/app/onboarding/StepProfile.tsx
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { saveProfileStep } from "../../lib/onboarding";
import type { CollectedData } from "../../types/onboarding";

type Props = {
  userId: string;
  onComplete: (data: CollectedData) => void;
};

const EDUCATION_OPTIONS = [
  { value: "high_school" as const, label: "🏫 High School" },
  { value: "university" as const, label: "🎓 University" },
  { value: "unaffiliated" as const, label: "🌍 Self-directed" },
];

const LANGUAGE_OPTIONS = [
  { value: "th" as const, label: "🇹🇭 ภาษาไทย" },
  { value: "en" as const, label: "🇬🇧 English" },
];

export default function StepProfile({ userId, onComplete }: Props) {
  const [education, setEducation] = useState<
    CollectedData["education_level"] | null
  >(null);
  const [language, setLanguage] = useState<
    CollectedData["preferred_language"] | null
  >(null);
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue = !!education && !!language;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    const data: CollectedData = {
      education_level: education!,
      preferred_language: language!,
      school_name: school.trim() || undefined,
    };
    await saveProfileStep(userId, data);
    onComplete(data);
    setSaving(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.title}>Let's get to know you</Text>
        <Text style={styles.subtitle}>Just a few quick things first</Text>

        <Text style={styles.label}>Education level</Text>
        <View style={styles.chipRow}>
          {EDUCATION_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              style={[styles.chip, education === o.value && styles.chipActive]}
              onPress={() => setEducation(o.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  education === o.value && styles.chipTextActive,
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>
          School / University name{" "}
          <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={school}
          onChangeText={setSchool}
          placeholder="e.g. Chulalongkorn University"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />

        <Text style={styles.label}>Preferred language</Text>
        <View style={styles.chipRow}>
          {LANGUAGE_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              style={[styles.chip, language === o.value && styles.chipActive]}
              onPress={() => setLanguage(o.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  language === o.value && styles.chipTextActive,
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || saving}
        >
          <Text style={styles.btnText}>
            {saving ? "Saving..." : "Continue →"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 26,
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 32,
  },
  label: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  optional: { fontWeight: "300", color: "rgba(255,255,255,0.4)" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: { backgroundColor: "#BFFF00", borderColor: "#BFFF00" },
  chipText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  chipTextActive: { color: "#0a0514" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    fontSize: 15,
    marginBottom: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add app/onboarding/StepProfile.tsx
git commit -m "feat: add onboarding StepProfile"
```

---

### Task 8: StepChat

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/app/onboarding/StepChat.tsx`

- [ ] **Step 1: Create StepChat.tsx**

```tsx
// /Users/bunyasit/dev/ps_app/app/onboarding/StepChat.tsx
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  callOnboardingChat,
  upsertOnboardingState,
} from "../../lib/onboarding";
import type { ChatMessage } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  chatHistory: ChatMessage[];
  onChatHistoryUpdate: (history: ChatMessage[]) => void;
  onComplete: () => void;
};

type BubbleMessage = {
  role: "user" | "model";
  text: string;
};

export default function StepChat({
  userId,
  userName,
  educationLevel,
  chatHistory,
  onChatHistoryUpdate,
  onComplete,
}: Props) {
  const [bubbles, setBubbles] = useState<BubbleMessage[]>(() =>
    chatHistory.map((m) => ({ role: m.role, text: m.parts[0].text })),
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Send initial greeting if no history
  useEffect(() => {
    if (chatHistory.length === 0) {
      sendToAI([]);
    }
  }, []);

  const sendToAI = async (history: ChatMessage[], userText?: string) => {
    setLoading(true);
    const newHistory: ChatMessage[] = userText
      ? [...history, { role: "user", parts: [{ text: userText }] }]
      : history;

    try {
      const res = await callOnboardingChat({
        mode: "chat",
        chat_history: newHistory,
        user_context: { name: userName, education_level: educationLevel },
      });

      const updatedHistory: ChatMessage[] = [
        ...newHistory,
        { role: "model", parts: [{ text: res.message }] },
      ];

      onChatHistoryUpdate(updatedHistory);
      await upsertOnboardingState(userId, { chat_history: updatedHistory });

      setBubbles(
        updatedHistory.map((m) => ({ role: m.role, text: m.parts[0].text })),
      );

      if (res.action === "transition_to_interests") {
        setTimeout(() => onComplete(), 1200);
      }
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const currentHistory = bubbles.map((b) => ({
      role: b.role,
      parts: [{ text: b.text }] as [{ text: string }],
    }));
    setBubbles((prev) => [...prev, { role: "user", text }]);
    sendToAI(currentHistory, text);
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [bubbles]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Tell me about yourself</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {bubbles.map((b, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              b.role === "user" ? styles.bubbleUser : styles.bubbleAI,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                b.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAI,
              ]}
            >
              {b.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <ActivityIndicator color="#BFFF00" size="small" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your answer..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!input.trim() || loading) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 12 },
  headerText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  bubble: { maxWidth: "80%", borderRadius: 20, padding: 14 },
  bubbleAI: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#BFFF00",
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontFamily: "Orbit_400Regular", fontSize: 15, lineHeight: 22 },
  bubbleTextAI: { color: "#fff" },
  bubbleTextUser: { color: "#0a0514", fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#BFFF00",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: "#0a0514", fontWeight: "700" },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add app/onboarding/StepChat.tsx
git commit -m "feat: add onboarding StepChat with Gemini chat UI"
```

---

### Task 9: StepInterests

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/app/onboarding/StepInterests.tsx`

- [ ] **Step 1: Create StepInterests.tsx**

```tsx
// /Users/bunyasit/dev/ps_app/app/onboarding/StepInterests.tsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { callOnboardingChat, saveInterests } from "../../lib/onboarding";
import type { ChatMessage, InterestCategory } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  chatHistory: ChatMessage[];
  onComplete: (categories: InterestCategory[]) => void;
};

export default function StepInterests({
  userId,
  userName,
  educationLevel,
  chatHistory,
  onComplete,
}: Props) {
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    callOnboardingChat({
      mode: "generate_interests",
      chat_history: chatHistory,
      user_context: { name: userName, education_level: educationLevel },
    })
      .then((res) => {
        if (res.action_data?.categories) {
          setCategories(
            res.action_data.categories.map((c) => ({
              category_name: c.name,
              statements: c.statements,
              selected: [],
            })),
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleStatement = (catIndex: number, statement: string) => {
    setCategories((prev) =>
      prev.map((cat, i) => {
        if (i !== catIndex) return cat;
        const alreadySelected = cat.selected.includes(statement);
        if (alreadySelected) {
          return {
            ...cat,
            selected: cat.selected.filter((s) => s !== statement),
          };
        }
        if (cat.selected.length >= 2) return cat; // max 2 per category
        return { ...cat, selected: [...cat.selected, statement] };
      }),
    );
  };

  const handleContinue = async () => {
    setSaving(true);
    await saveInterests(userId, categories);
    onComplete(categories);
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#BFFF00" size="large" />
        <Text style={styles.loadingText}>Analyzing your interests...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>What resonates with you?</Text>
      <Text style={styles.subtitle}>
        Select up to 2 statements per theme (optional)
      </Text>

      {categories.map((cat, catIndex) => (
        <View key={catIndex} style={styles.category}>
          <Text style={styles.categoryName}>{cat.category_name}</Text>
          {cat.statements.map((stmt, si) => {
            const selected = cat.selected.includes(stmt);
            return (
              <Pressable
                key={si}
                style={[
                  styles.statementCard,
                  selected && styles.statementCardActive,
                ]}
                onPress={() => toggleStatement(catIndex, stmt)}
              >
                <Text
                  style={[
                    styles.statementText,
                    selected && styles.statementTextActive,
                  ]}
                >
                  {stmt}
                </Text>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable
        style={[styles.btn, saving && styles.btnDisabled]}
        onPress={handleContinue}
        disabled={saving}
      >
        <Text style={styles.btnText}>
          {saving ? "Saving..." : "Continue →"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: {
    fontFamily: "Orbit_400Regular",
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
  },
  scroll: { padding: 24, paddingBottom: 48 },
  title: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 24,
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 32,
  },
  category: { marginBottom: 32 },
  categoryName: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 16,
    color: "#BFFF00",
    marginBottom: 12,
  },
  statementCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statementCardActive: {
    borderColor: "#BFFF00",
    backgroundColor: "rgba(191,255,0,0.08)",
  },
  statementText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    flex: 1,
    lineHeight: 20,
  },
  statementTextActive: { color: "#BFFF00" },
  checkmark: {
    color: "#BFFF00",
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "700",
  },
  btn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add app/onboarding/StepInterests.tsx
git commit -m "feat: add onboarding StepInterests with AI-generated categories"
```

---

### Task 10: StepCareers

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/app/onboarding/StepCareers.tsx`

- [ ] **Step 1: Create StepCareers.tsx**

```tsx
// /Users/bunyasit/dev/ps_app/app/onboarding/StepCareers.tsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { callOnboardingChat, saveCareers } from "../../lib/onboarding";
import type { InterestCategory, CareerGoal } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  interests: InterestCategory[];
  onComplete: () => void;
};

export default function StepCareers({
  userId,
  userName,
  educationLevel,
  interests,
  onComplete,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [customCareers, setCustomCareers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const allSelected = interests.flatMap((c) => c.selected);
    callOnboardingChat({
      mode: "suggest_careers",
      chat_history: [],
      user_context: {
        name: userName,
        education_level: educationLevel,
        selected_interests: allSelected,
      },
    })
      .then((res) => {
        setSuggestions(res.action_data?.careers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleSuggestion = (career: string) => {
    setSelected((prev) =>
      prev.includes(career)
        ? prev.filter((c) => c !== career)
        : [...prev, career],
    );
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    setCustomCareers((prev) => [...prev, val]);
    setCustomInput("");
  };

  const handleContinue = async () => {
    setSaving(true);
    const goals: CareerGoal[] = [
      ...selected.map((c) => ({
        career_name: c,
        source: "ai_suggested" as const,
      })),
      ...customCareers.map((c) => ({
        career_name: c,
        source: "user_typed" as const,
      })),
    ];
    await saveCareers(userId, goals);
    onComplete();
    setSaving(false);
  };

  const totalSelected = selected.length + customCareers.length;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#BFFF00" size="large" />
        <Text style={styles.loadingText}>Finding paths for you...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>What do you want to try?</Text>
      <Text style={styles.subtitle}>
        Based on your interests — no commitment needed
      </Text>

      <View style={styles.chipsWrap}>
        {suggestions.map((career) => {
          const active = selected.includes(career);
          return (
            <Pressable
              key={career}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleSuggestion(career)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {career}
              </Text>
            </Pressable>
          );
        })}
        {customCareers.map((career) => (
          <Pressable
            key={`custom-${career}`}
            style={[styles.chip, styles.chipActive]}
            onPress={() =>
              setCustomCareers((prev) => prev.filter((c) => c !== career))
            }
          >
            <Text style={[styles.chipText, styles.chipTextActive]}>
              {career} ×
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={styles.input}
          value={customInput}
          onChangeText={setCustomInput}
          placeholder="Add your own..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          returnKeyType="done"
          onSubmitEditing={addCustom}
        />
        <Pressable style={styles.addBtn} onPress={addCustom}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {totalSelected === 0
          ? "You can skip this — that's fine too"
          : `${totalSelected} selected`}
      </Text>

      <Pressable
        style={[styles.btn, saving && styles.btnDisabled]}
        onPress={handleContinue}
        disabled={saving}
      >
        <Text style={styles.btnText}>
          {saving ? "Saving..." : totalSelected === 0 ? "Skip →" : "Continue →"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: {
    fontFamily: "Orbit_400Regular",
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
  },
  scroll: { padding: 24, paddingBottom: 48 },
  title: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 24,
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 28,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: { backgroundColor: "#BFFF00", borderColor: "#BFFF00" },
  chipText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  chipTextActive: { color: "#0a0514" },
  customRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  addBtnText: { color: "#fff", fontSize: 24 },
  hint: {
    fontFamily: "Orbit_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add app/onboarding/StepCareers.tsx
git commit -m "feat: add onboarding StepCareers"
```

---

### Task 11: StepSettings

**Files:**

- Create: `/Users/bunyasit/dev/ps_app/app/onboarding/StepSettings.tsx`

- [ ] **Step 1: Create StepSettings.tsx**

```tsx
// /Users/bunyasit/dev/ps_app/app/onboarding/StepSettings.tsx
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { completeOnboarding } from "../../lib/onboarding";
import type { MobileSettings } from "../../types/onboarding";

const REMINDER_TIMES = ["07:00", "09:00", "12:00", "18:00", "21:00"];
const THEMES = [
  { value: "light" as const, label: "☀️ Light" },
  { value: "dark" as const, label: "🌙 Dark" },
];

type Props = { userId: string };

export default function StepSettings({ userId }: Props) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    const settings: MobileSettings = {
      push_enabled: pushEnabled,
      reminder_time: reminderTime,
      theme,
    };
    await completeOnboarding(userId, settings);
    router.replace("/(tabs)/discover");
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>Set up your preferences</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Daily reminders</Text>
            <Text style={styles.labelSub}>
              We'll nudge you to do your daily task
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: "#BFFF00" }}
            thumbColor="#fff"
          />
        </View>

        {pushEnabled && (
          <>
            <Text style={styles.label}>Reminder time</Text>
            <View style={styles.chipRow}>
              {REMINDER_TIMES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, reminderTime === t && styles.chipActive]}
                  onPress={() => setReminderTime(t)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      reminderTime === t && styles.chipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Theme</Text>
        <View style={styles.chipRow}>
          {THEMES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.chip, theme === t.value && styles.chipActive]}
              onPress={() => setTheme(t.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  theme === t.value && styles.chipTextActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleFinish}
          disabled={saving}
        >
          <Text style={styles.btnText}>
            {saving ? "Setting up..." : "Let's go 🌱"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 26,
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 32,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  label: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  labelSub: {
    fontFamily: "Orbit_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: { backgroundColor: "#BFFF00", borderColor: "#BFFF00" },
  chipText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  chipTextActive: { color: "#0a0514" },
  btn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add app/onboarding/StepSettings.tsx
git commit -m "feat: add onboarding StepSettings — completes onboarding flow"
```

---

## Chunk 5: Final Integration Check

### Task 12: Verify full flow

- [ ] **Step 1: TypeScript check**

```bash
cd /Users/bunyasit/dev/ps_app
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Start dev server and test manually**

```bash
cd /Users/bunyasit/dev/ps_app
pnpm ios
```

Manual test checklist:

1. Sign in with Google → should route to `/onboarding` (not tabs)
2. Step 1: Select education, enter school (optional), select language → Continue
3. Step 2: AI greets you, have a short conversation → AI transitions automatically
4. Step 3: Interest categories appear as cards → select some statements
5. Step 4: Career suggestions appear as chips → select/skip
6. Step 5: Toggle notifications, pick time and theme → "Let's go"
7. App navigates to Discover tab
8. Sign out and sign back in → should go directly to Discover (is_onboarded = true)
9. Kill app mid-onboarding → reopen → should resume at same step

- [ ] **Step 3: Final commit**

```bash
cd /Users/bunyasit/dev/ps_app
git add .
git commit -m "feat: complete onboarding flow integration"
```
