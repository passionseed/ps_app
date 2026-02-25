# Onboarding + Goal Creation Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a chat-based onboarding flow that builds a user profile (direction, values, blockers, availability), then use that profile to grade all 5 SMART dimensions; simplify goal creation to a single text input with AI-extracted frequency.

**Architecture:** New Supabase `user_profiles` table stores onboarding output. Three new edge functions handle onboarding (follow-up generation + profile extraction) and goal text parsing. The `smart-grade` function is updated to accept proof type + user profile + parsed frequency. `app/onboarding.tsx` is a new screen with a fixed 5-step chat UI + editable summary card. `goal-create.tsx` loses all steppers.

**Tech Stack:** Expo Router v6, React Native, Supabase Edge Functions (Deno), Gemini `gemini-2.5-flash-lite` via `@google/generative-ai` npm package. Package manager: pnpm.

---

## Context for implementor

- All edge functions follow the same pattern: import `GoogleGenerativeAI` from `npm:@google/generative-ai`, read `AI_SDK_GEMINI_KEY` from env, respond with CORS headers. Copy the boilerplate from `supabase/functions/smart-grade/index.ts`.
- The Supabase client is at `lib/supabase.ts`. Auth context is at `lib/auth.tsx` — `useAuth()` returns `{ session, user, loading }`.
- Design system: background `#FDFFF5`, text `#111`, accent `#BFFF00`, font `Orbit_400Regular`.
- No test framework is set up. Verification = run `pnpm start`, open on simulator, check visually + check Supabase dashboard for DB writes.
- Supabase migrations live in `supabase/migrations/`. Run `supabase db push` to apply locally (or use the Supabase dashboard SQL editor for speed during dev).

---

## Task 1: Create `user_profiles` Supabase table

**Files:**
- Create: `supabase/migrations/20260224000000_create_user_profiles.sql`

**Step 1: Write the migration**

```sql
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  onboarding_done boolean not null default false,
  life_areas text[] not null default '{}',
  direction text not null default '',
  values text not null default '',
  blockers text not null default '',
  weekly_hours integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);
```

**Step 2: Apply migration**

Option A (Supabase CLI): `supabase db push`
Option B (dashboard): Paste into Supabase SQL Editor and run.

Verify: table `user_profiles` appears in Supabase dashboard under Table Editor.

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add user_profiles table with onboarding fields"
```

---

## Task 2: Update `lib/auth.tsx` to expose user profile

**Files:**
- Modify: `lib/auth.tsx`

**Step 1: Add `UserProfile` type and load profile after session**

Replace the entire file with:

```tsx
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type UserProfile = {
  onboarding_done: boolean;
  life_areas: string[];
  direction: string;
  values: string;
  blockers: string;
  weekly_hours: number;
};

type AuthContext = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
};

const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  loading: true,
  profile: null,
  profileLoading: false,
  refreshProfile: async () => {},
  signInWithGoogle: async () => {},
});

function extractParamsFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const hash = parsedUrl.hash.substring(1);
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get("access_token"),
    expires_in: parseInt(params.get("expires_in") || "0"),
    refresh_token: params.get("refresh_token"),
    token_type: params.get("token_type"),
    provider_token: params.get("provider_token"),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("onboarding_done, life_areas, direction, values, blockers, weekly_hours")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data ?? null);
    setProfileLoading(false);
  };

  const refreshProfile = async () => {
    if (session?.user.id) await fetchProfile(session.user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user.id) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user.id) fetchProfile(session.user.id);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const redirectTo = "prova://google-auth";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo, {
      showInRecents: true,
    });

    if (result && result.type === "success") {
      const params = extractParamsFromUrl(result.url);
      if (params.access_token && params.refresh_token) {
        const { data: sessionData } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (sessionData.session) setSession(sessionData.session);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, profile, profileLoading, refreshProfile, signInWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/bunyasit/dev/prova && npx tsc --noEmit
```

Expected: no errors related to `lib/auth.tsx`.

**Step 3: Commit**

```bash
git add lib/auth.tsx
git commit -m "feat: expose user profile + onboarding_done in auth context"
```

---

## Task 3: Update `app/_layout.tsx` routing for onboarding

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Add onboarding route and routing logic**

Replace the file:

```tsx
import { Stack, router } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";

function RootNavigator() {
  const { session, loading, profile, profileLoading } = useAuth();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!session) {
      router.replace("/");
      return;
    }
    // Profile null = no row yet = needs onboarding
    if (!profile || !profile.onboarding_done) {
      router.replace("/onboarding");
    } else {
      router.replace("/(tabs)/goals");
    }
  }, [session, loading, profile, profileLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="goal-create" />
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

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: route to onboarding when user profile missing"
```

---

## Task 4: Create `onboarding-followup` edge function

**Files:**
- Create: `supabase/functions/onboarding-followup/index.ts`

**Step 1: Write the function**

```ts
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get("AI_SDK_GEMINI_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const { topic, answer } = await req.json();

    const result = await model.generateContent(
      `You are a warm, curious onboarding coach for a goal accountability app.
The user just answered a question about their "${topic}".
Their answer: "${answer}"

Generate ONE short, warm follow-up question (1 sentence, max 15 words) that digs a little deeper into their answer.
Do not repeat the topic name. Be conversational, not clinical.
Respond with the question only, no explanation.`
    );

    const followUp = result.response.text().trim();
    return new Response(JSON.stringify({ followUp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[onboarding-followup error]", err);
    return new Response(
      JSON.stringify({ error: "followup failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/onboarding-followup/
git commit -m "feat: add onboarding-followup edge function"
```

---

## Task 5: Create `onboarding-extract` edge function

**Files:**
- Create: `supabase/functions/onboarding-extract/index.ts`

**Step 1: Write the function**

```ts
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get("AI_SDK_GEMINI_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const { messages } = await req.json();
    // messages: Array<{ topic: string, answer: string, followUpAnswer: string }>

    const transcript = messages
      .map((m: { topic: string; answer: string; followUpAnswer: string }) =>
        `Topic: ${m.topic}\nAnswer: ${m.answer}\nFollow-up answer: ${m.followUpAnswer}`
      )
      .join("\n\n");

    const result = await model.generateContent(
      `Extract a structured user profile from this onboarding conversation transcript.

${transcript}

Respond with JSON only, no explanation:
{
  "lifeAreas": [<array of 1-5 short strings, e.g. "health", "career", "relationships", "learning", "finances">],
  "direction": <1-2 sentence string summarising their ambitions and 6-12 month vision>,
  "values": <1 sentence string listing their core values>,
  "blockers": <1 sentence string summarising what's in their way>,
  "weeklyHours": <integer, estimated hours per week they can commit to new habits>
}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[onboarding-extract error]", err);
    return new Response(
      JSON.stringify({ error: "extraction failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/onboarding-extract/
git commit -m "feat: add onboarding-extract edge function"
```

---

## Task 6: Create `goal-parse` edge function

**Files:**
- Create: `supabase/functions/goal-parse/index.ts`

**Step 1: Write the function**

```ts
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get("AI_SDK_GEMINI_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const { goalText } = await req.json();

    if (!goalText || goalText.trim().length < 3) {
      return new Response(
        JSON.stringify({ frequencyCount: null, frequencyUnit: null, durationValue: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await model.generateContent(
      `Extract frequency and duration information from this goal text.

Goal: "${goalText}"

Respond with JSON only, no explanation:
{
  "frequencyCount": <integer or null if not stated>,
  "frequencyUnit": <"day" | "week" | "month" | null>,
  "durationValue": <string like "8 weeks" or "until March 2026" or null if not stated>,
  "humanReadable": <short string like "3× per week" or null if nothing extracted>
}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[goal-parse error]", err);
    return new Response(
      JSON.stringify({ error: "parse failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/goal-parse/
git commit -m "feat: add goal-parse edge function for frequency extraction"
```

---

## Task 7: Update `smart-grade` edge function

**Files:**
- Modify: `supabase/functions/smart-grade/index.ts`

**Step 1: Replace the entire file**

```ts
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get("AI_SDK_GEMINI_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const {
      goalText,
      proofTypes = [],
      proofDescription = "",
      userProfile = null,
      parsedFrequency = null,
    } = await req.json();

    if (!goalText || goalText.trim().length < 5) {
      return new Response(
        JSON.stringify({ score: 0, scores: { specific: 0, measurable: 0, achievable: 0, relevant: 0, time_bound: 0 }, tips: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const proofContext = proofTypes.length > 0
      ? `Proof types selected: ${proofTypes.join(", ")}${proofDescription ? `. Description: "${proofDescription}"` : ""}`
      : "No proof type selected yet.";

    const profileContext = userProfile
      ? `User profile: focuses on ${userProfile.lifeAreas?.join(", ")}. Direction: ${userProfile.direction}. Values: ${userProfile.values}.`
      : "No user profile available.";

    const frequencyContext = parsedFrequency
      ? `Frequency extracted from goal: ${parsedFrequency}`
      : "No frequency or time commitment found in the goal text.";

    const result = await model.generateContent(
      `Evaluate this goal on all 5 SMART dimensions.

Goal: "${goalText}"
${proofContext}
${profileContext}
${frequencyContext}

Scoring rules:
- S (Specific): How clearly defined is the action/outcome?
- M (Measurable): Score 0-30 if no proof type selected. Score based on how well the selected proof type + description actually proves the goal was done.
- A (Achievable): Is this realistic? Consider frequency if provided.
- R (Relevant): Score 0 and tip "Complete onboarding to grade this" if no user profile. Otherwise score how well the goal aligns with their life areas, direction, and values.
- T (Time-bound): Score 0-20 if no frequency extracted. Score based on how specific the time commitment is.

Respond with JSON only, no explanation:
{
  "score": <0-100 integer, weighted average>,
  "scores": {
    "specific": <0-100>,
    "measurable": <0-100>,
    "achievable": <0-100>,
    "relevant": <0-100>,
    "time_bound": <0-100>
  },
  "tips": {
    "specific": <null if score >= 75, else one short tip>,
    "measurable": <"Select a proof type to grade this" if no proof, null if score >= 75, else tip>,
    "achievable": <null if score >= 75, else tip>,
    "relevant": <"Complete onboarding to grade this" if no profile, null if score >= 75, else tip>,
    "time_bound": <"Add a frequency to your goal, e.g. '3× a week'" if nothing extracted, null if score >= 75, else tip>
  }
}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[smart-grade error]", err);
    return new Response(
      JSON.stringify({ error: "grading failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/smart-grade/
git commit -m "feat: update smart-grade to accept proof, profile, and frequency for full SMART grading"
```

---

## Task 8: Update `reality-check` edge function

**Files:**
- Modify: `supabase/functions/reality-check/index.ts`

**Step 1: Remove stepper params, accept parsedFrequency instead**

Replace the file:

```ts
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get("AI_SDK_GEMINI_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const { goalText, proofTypes, parsedFrequency } = await req.json();

    const frequencyStr = parsedFrequency ?? "frequency not specified";

    const result = await model.generateContent(
      `Do a reality check on this goal commitment:

Goal: "${goalText}"
Proof type: ${(proofTypes ?? []).join(", ") || "not specified"}
Frequency: ${frequencyStr}

Respond with JSON only:
{
  "likelihood": <0-100 integer, % chance they complete this>,
  "pitfalls": [<2-3 short strings, common failure points>],
  "suggestions": [<1-2 short strings, concrete improvements>]
}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[reality-check error]", err);
    return new Response(
      JSON.stringify({ error: "reality check failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/reality-check/
git commit -m "feat: update reality-check to use parsed frequency instead of steppers"
```

---

## Task 9: Update `lib/ai.ts`

**Files:**
- Modify: `lib/ai.ts`

**Step 1: Replace the entire file with updated types and functions**

```ts
import { supabase } from "./supabase";
import { UserProfile } from "./auth";

export type SmartGradeResult = {
  score: number;
  scores: {
    specific: number;
    measurable: number;
    achievable: number;
    relevant: number;
    time_bound: number;
  };
  tips: {
    specific: string | null;
    measurable: string | null;
    achievable: string | null;
    relevant: string | null;
    time_bound: string | null;
  };
};

export type GoalParseResult = {
  frequencyCount: number | null;
  frequencyUnit: "day" | "week" | "month" | null;
  durationValue: string | null;
  humanReadable: string | null;
};

export type RealityCheckResult = {
  likelihood: number;
  pitfalls: string[];
  suggestions: string[];
};

export type OnboardingMessage = {
  topic: string;
  answer: string;
  followUpAnswer: string;
};

export type ExtractedProfile = {
  lifeAreas: string[];
  direction: string;
  values: string;
  blockers: string;
  weeklyHours: number;
};

export async function gradeGoal(params: {
  goalText: string;
  proofTypes?: string[];
  proofDescription?: string;
  userProfile?: Pick<UserProfile, "life_areas" | "direction" | "values"> | null;
  parsedFrequency?: string | null;
}): Promise<SmartGradeResult> {
  const { data, error } = await supabase.functions.invoke("smart-grade", {
    body: {
      goalText: params.goalText,
      proofTypes: params.proofTypes ?? [],
      proofDescription: params.proofDescription ?? "",
      userProfile: params.userProfile
        ? {
            lifeAreas: params.userProfile.life_areas,
            direction: params.userProfile.direction,
            values: params.userProfile.values,
          }
        : null,
      parsedFrequency: params.parsedFrequency ?? null,
    },
  });
  if (error) throw error;
  return data as SmartGradeResult;
}

export async function parseGoal(goalText: string): Promise<GoalParseResult> {
  const { data, error } = await supabase.functions.invoke("goal-parse", {
    body: { goalText },
  });
  if (error) throw error;
  return data as GoalParseResult;
}

export async function realityCheck(params: {
  goalText: string;
  proofTypes: string[];
  parsedFrequency: string | null;
}): Promise<RealityCheckResult> {
  const { data, error } = await supabase.functions.invoke("reality-check", {
    body: params,
  });
  if (error) throw error;
  return data as RealityCheckResult;
}

export async function onboardingFollowUp(
  topic: string,
  answer: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("onboarding-followup", {
    body: { topic, answer },
  });
  if (error) throw error;
  return (data as { followUp: string }).followUp;
}

export async function onboardingExtract(
  messages: OnboardingMessage[]
): Promise<ExtractedProfile> {
  const { data, error } = await supabase.functions.invoke("onboarding-extract", {
    body: { messages },
  });
  if (error) throw error;
  return data as ExtractedProfile;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add lib/ai.ts
git commit -m "feat: update ai.ts types and functions for full SMART grading and onboarding"
```

---

## Task 10: Create `app/onboarding.tsx`

**Files:**
- Create: `app/onboarding.tsx`

**Step 1: Write the onboarding screen**

The screen has two phases: `"chat"` (5 topics × 2 messages each) and `"summary"` (extracted profile editing).

```tsx
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useRef } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { useAuth, UserProfile } from "../lib/auth";
import { onboardingFollowUp, onboardingExtract, ExtractedProfile, OnboardingMessage } from "../lib/ai";

const TOPICS = [
  {
    id: "life_areas",
    prompt: "What areas of life do you most want to improve right now?",
  },
  {
    id: "direction",
    prompt: "What does success look like for you in the next 6–12 months?",
  },
  {
    id: "values",
    prompt: "What matters most to you — your core values?",
  },
  {
    id: "blockers",
    prompt: "What's getting in your way right now?",
  },
  {
    id: "availability",
    prompt: "How much time can you realistically commit to new habits per week?",
  },
];

type ChatMessage = {
  role: "app" | "user";
  text: string;
};

type TopicState = {
  answer: string;
  followUp: string | null;
  followUpAnswer: string;
  phase: "answer" | "followup" | "done";
};

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [topicIndex, setTopicIndex] = useState(0);
  const [topicStates, setTopicStates] = useState<TopicState[]>(
    TOPICS.map(() => ({ answer: "", followUp: null, followUpAnswer: "", phase: "answer" }))
  );
  const [inputText, setInputText] = useState("");
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);

  // Summary phase
  const [phase, setPhase] = useState<"chat" | "summary">("chat");
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null);
  const [editField, setEditField] = useState<keyof ExtractedProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const current = topicStates[topicIndex];
  const topic = TOPICS[topicIndex];

  // Build chat messages for display
  const chatMessages: ChatMessage[] = [];
  for (let i = 0; i <= topicIndex; i++) {
    chatMessages.push({ role: "app", text: TOPICS[i].prompt });
    if (topicStates[i].answer) {
      chatMessages.push({ role: "user", text: topicStates[i].answer });
    }
    if (topicStates[i].followUp) {
      chatMessages.push({ role: "app", text: topicStates[i].followUp! });
    }
    if (topicStates[i].followUpAnswer) {
      chatMessages.push({ role: "user", text: topicStates[i].followUpAnswer });
    }
  }

  const updateCurrent = (patch: Partial<TopicState>) => {
    setTopicStates((prev) => {
      const next = [...prev];
      next[topicIndex] = { ...next[topicIndex], ...patch };
      return next;
    });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");

    if (current.phase === "answer") {
      updateCurrent({ answer: text, phase: "followup" });
      setLoadingFollowUp(true);
      try {
        const followUp = await onboardingFollowUp(topic.id, text);
        updateCurrent({ followUp, phase: "followup" });
      } catch {
        updateCurrent({ followUp: "Tell me more about that?", phase: "followup" });
      } finally {
        setLoadingFollowUp(false);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } else if (current.phase === "followup") {
      updateCurrent({ followUpAnswer: text, phase: "done" });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleNext = async () => {
    if (topicIndex < TOPICS.length - 1) {
      setTopicIndex((i) => i + 1);
      inputRef.current?.focus();
    } else {
      // All done — extract profile
      setLoadingExtract(true);
      try {
        const messages: OnboardingMessage[] = topicStates.map((s, i) => ({
          topic: TOPICS[i].id,
          answer: s.answer,
          followUpAnswer: s.followUpAnswer,
        }));
        const result = await onboardingExtract(messages);
        setExtracted(result);
        setPhase("summary");
      } catch (err) {
        console.error("[onboarding extract error]", err);
      } finally {
        setLoadingExtract(false);
      }
    }
  };

  const handleSave = async () => {
    if (!extracted || !user) return;
    setSaving(true);
    try {
      await supabase.from("user_profiles").upsert({
        user_id: user.id,
        onboarding_done: true,
        life_areas: extracted.lifeAreas,
        direction: extracted.direction,
        values: extracted.values,
        blockers: extracted.blockers,
        weekly_hours: extracted.weeklyHours,
      }, { onConflict: "user_id" });
      await refreshProfile();
      router.replace("/(tabs)/goals");
    } catch (err) {
      console.error("[onboarding save error]", err);
    } finally {
      setSaving(false);
    }
  };

  const isCurrentDone = current.phase === "done";
  const isLastTopic = topicIndex === TOPICS.length - 1;

  if (phase === "summary" && extracted) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar style="dark" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.summaryTitle}>Here's what I got</Text>
          <Text style={styles.summarySubtitle}>Tap any field to edit</Text>

          <View style={styles.summaryCard}>
            <SummaryRow
              icon="🎯"
              label="Focus areas"
              value={extracted.lifeAreas.join(" · ")}
              editing={editField === "lifeAreas"}
              onTap={() => setEditField(editField === "lifeAreas" ? null : "lifeAreas")}
              onChangeText={(v) => setExtracted({ ...extracted, lifeAreas: v.split("·").map((s) => s.trim()).filter(Boolean) })}
            />
            <SummaryRow
              icon="✨"
              label="Direction"
              value={extracted.direction}
              editing={editField === "direction"}
              onTap={() => setEditField(editField === "direction" ? null : "direction")}
              onChangeText={(v) => setExtracted({ ...extracted, direction: v })}
            />
            <SummaryRow
              icon="💡"
              label="Values"
              value={extracted.values}
              editing={editField === "values"}
              onTap={() => setEditField(editField === "values" ? null : "values")}
              onChangeText={(v) => setExtracted({ ...extracted, values: v })}
            />
            <SummaryRow
              icon="⚡"
              label="Blockers"
              value={extracted.blockers}
              editing={editField === "blockers"}
              onTap={() => setEditField(editField === "blockers" ? null : "blockers")}
              onChangeText={(v) => setExtracted({ ...extracted, blockers: v })}
            />
            <SummaryRow
              icon="⏱"
              label="Weekly time"
              value={`~${extracted.weeklyHours} hrs / week`}
              editing={editField === "weeklyHours"}
              onTap={() => setEditField(editField === "weeklyHours" ? null : "weeklyHours")}
              onChangeText={(v) => {
                const n = parseInt(v);
                if (!isNaN(n)) setExtracted({ ...extracted, weeklyHours: n });
              }}
              inputProps={{ keyboardType: "number-pad" }}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={styles.saveBtnText}>Looks good →</Text>
            )}
          </Pressable>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {TOPICS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= topicIndex && styles.dotActive,
              topicStates[i].phase === "done" && styles.dotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {chatMessages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === "user" ? styles.bubbleUser : styles.bubbleApp,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                msg.role === "user" ? styles.bubbleTextUser : styles.bubbleTextApp,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}

        {loadingFollowUp && (
          <View style={styles.bubbleApp}>
            <ActivityIndicator size="small" color="#111" />
          </View>
        )}

        {loadingExtract && (
          <View style={styles.bubbleApp}>
            <ActivityIndicator size="small" color="#111" />
            <Text style={styles.bubbleTextApp}>  Building your profile...</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {isCurrentDone ? (
        <View style={styles.inputRow}>
          <Pressable
            style={styles.nextBtn}
            onPress={handleNext}
            disabled={loadingExtract}
          >
            <Text style={styles.nextBtnText}>
              {isLastTopic ? "See my profile →" : "Next →"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.chatInput}
            placeholder={current.phase === "answer" ? "Your answer..." : "Tell me more..."}
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!loadingFollowUp}
          />
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || loadingFollowUp) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loadingFollowUp}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function SummaryRow({
  icon, label, value, editing, onTap, onChangeText, inputProps,
}: {
  icon: string;
  label: string;
  value: string;
  editing: boolean;
  onTap: () => void;
  onChangeText: (v: string) => void;
  inputProps?: object;
}) {
  return (
    <Pressable style={styles.summaryRow} onPress={onTap}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryLabel}>{label}</Text>
        {editing ? (
          <TextInput
            style={styles.summaryEditInput}
            value={value}
            onChangeText={onChangeText}
            autoFocus
            multiline
            {...inputProps}
          />
        ) : (
          <Text style={styles.summaryValue}>{value}</Text>
        )}
      </View>
      <Text style={styles.editHint}>{editing ? "✓" : "›"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 64,
    paddingBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
  },
  dotActive: { backgroundColor: "#111" },
  dotDone: { backgroundColor: "#BFFF00" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  bubble: {
    maxWidth: "85%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  bubbleApp: {
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: "#111",
    alignSelf: "flex-end",
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    lineHeight: 20,
  },
  bubbleTextApp: { color: "#111" },
  bubbleTextUser: { color: "#BFFF00" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FDFFF5",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    maxHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: {
    fontSize: 18,
    color: "#BFFF00",
    fontFamily: "Orbit_400Regular",
  },
  nextBtn: {
    flex: 1,
    backgroundColor: "#BFFF00",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  // Summary styles
  summaryTitle: {
    fontSize: 26,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginTop: 40,
    marginBottom: 6,
  },
  summarySubtitle: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 12,
  },
  summaryIcon: { fontSize: 18, marginTop: 2 },
  summaryContent: { flex: 1 },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    color: "#999",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 20,
  },
  summaryEditInput: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#BFFF00",
    paddingVertical: 2,
  },
  editHint: {
    fontSize: 18,
    color: "#CCC",
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 0.5,
  },
});
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Manual verification**

```bash
pnpm start
```

- Sign in → should route to `/onboarding`
- See first topic prompt as a chat bubble
- Type answer, tap send → follow-up question appears
- Answer follow-up, tap "Next →"
- Repeat for all 5 topics
- After last topic → "See my profile →" → summary card appears with extracted data
- Tap a row → inline edit opens
- Tap "Looks good →" → saves to DB, routes to `/(tabs)/goals`
- Check Supabase dashboard: `user_profiles` row exists with `onboarding_done = true`

**Step 4: Commit**

```bash
git add app/onboarding.tsx
git commit -m "feat: add chat-based onboarding screen with profile extraction and summary editing"
```

---

## Task 11: Simplify `app/goal-create.tsx`

**Files:**
- Modify: `app/goal-create.tsx`

**Step 1: Replace the entire file**

Remove: frequency stepper, duration stepper, duration toggle, summary box.
Add: `goal-parse` call on blur (parallel with `smart-grade`), parse chip display, pass proof/profile/frequency to `smart-grade`, update SMART display to show all 5 dims including T.

```tsx
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useRef, useCallback } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  gradeGoal,
  realityCheck,
  parseGoal,
  SmartGradeResult,
  RealityCheckResult,
  GoalParseResult,
} from "../lib/ai";
import { useAuth } from "../lib/auth";

const MEASUREMENT_OPTIONS = [
  { id: "photo", label: "📷 Photo" },
  { id: "video", label: "📹 Video" },
  { id: "screenshot", label: "📸 Screenshot" },
  { id: "text", label: "📝 Text" },
  { id: "voice", label: "🎤 Voice" },
];

const SMART_DIMS = [
  { key: "specific", label: "S", full: "Specific" },
  { key: "measurable", label: "M", full: "Measurable" },
  { key: "achievable", label: "A", full: "Achievable" },
  { key: "relevant", label: "R", full: "Relevant" },
  { key: "time_bound", label: "T", full: "Time-bound" },
] as const;

export default function GoalCreateScreen() {
  const { profile } = useAuth();

  const [goalText, setGoalText] = useState("");
  const [smartGrade, setSmartGrade] = useState<SmartGradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const [parsedGoal, setParsedGoal] = useState<GoalParseResult | null>(null);
  const [parseChipDismissed, setParseChipDismissed] = useState(false);

  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);
  const [proofDescription, setProofDescription] = useState("");

  const [realityResult, setRealityResult] = useState<RealityCheckResult | null>(null);
  const [checkingReality, setCheckingReality] = useState(false);
  const [realityDone, setRealityDone] = useState(false);
  const [realityError, setRealityError] = useState<string | null>(null);

  const [friendSearch, setFriendSearch] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalInputRef = useRef<TextInput>(null);
  const friendInputRef = useRef<TextInput>(null);

  const showMeasurement = goalText.trim().length > 5;
  const showRealityCheck = selectedMeasurements.length > 0;
  const showInvite = realityDone;

  const userProfileForGrading = profile
    ? { life_areas: profile.life_areas, direction: profile.direction, values: profile.values }
    : null;

  const runGrading = useCallback(
    async (
      text: string,
      proofTypes: string[],
      proofDesc: string,
      parsed: GoalParseResult | null
    ) => {
      if (text.trim().length < 5) return;
      setGrading(true);
      setGradeError(null);
      try {
        const result = await gradeGoal({
          goalText: text,
          proofTypes,
          proofDescription: proofDesc,
          userProfile: userProfileForGrading,
          parsedFrequency: parsed?.humanReadable ?? null,
        });
        setSmartGrade(result);
      } catch (err: unknown) {
        setGradeError(err instanceof Error ? err.message : String(err));
      } finally {
        setGrading(false);
      }
    },
    [profile]
  );

  const handleGoalBlur = useCallback(async () => {
    if (goalText.trim().length < 5) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setParseChipDismissed(false);
      // Fire parse + grade in parallel
      const [parseResult] = await Promise.all([
        parseGoal(goalText).catch(() => null),
        runGrading(goalText, selectedMeasurements, proofDescription, null),
      ]);
      if (parseResult) {
        setParsedGoal(parseResult);
        // Re-grade with frequency context
        if (parseResult.humanReadable) {
          await runGrading(goalText, selectedMeasurements, proofDescription, parseResult);
        }
      }
    }, 800);
  }, [goalText, selectedMeasurements, proofDescription, runGrading]);

  const handleProofChange = useCallback(
    (newTypes: string[], newDesc: string) => {
      runGrading(goalText, newTypes, newDesc, parsedGoal);
    },
    [goalText, parsedGoal, runGrading]
  );

  const toggleMeasurement = (id: string) => {
    const next = selectedMeasurements.includes(id)
      ? selectedMeasurements.filter((m) => m !== id)
      : [...selectedMeasurements, id];
    setSelectedMeasurements(next);
    handleProofChange(next, proofDescription);
  };

  const handleRealityCheck = async () => {
    Keyboard.dismiss();
    setCheckingReality(true);
    setRealityError(null);
    try {
      const result = await realityCheck({
        goalText,
        proofTypes: selectedMeasurements,
        parsedFrequency: parsedGoal?.humanReadable ?? null,
      });
      setRealityResult(result);
      setRealityDone(true);
    } catch (err: unknown) {
      setRealityError(err instanceof Error ? err.message : String(err));
    } finally {
      setCheckingReality(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "#BFFF00";
    if (score >= 50) return "#FFE500";
    return "#FF6B6B";
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>New Goal</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎯 What's your goal?</Text>
          <View style={styles.inputCard}>
            <TextInput
              ref={goalInputRef}
              style={styles.goalInput}
              multiline
              placeholder={"I will...  (include how often, e.g. 3× a week)"}
              placeholderTextColor="#999"
              value={goalText}
              onChangeText={setGoalText}
              onBlur={handleGoalBlur}
              blurOnSubmit={false}
            />
          </View>

          {/* Parse chip */}
          {parsedGoal?.humanReadable && !parseChipDismissed && (
            <View style={styles.parseChip}>
              <Text style={styles.parseChipText}>
                📅 {parsedGoal.humanReadable} · interpreted from your goal
              </Text>
              <Pressable onPress={() => setParseChipDismissed(true)}>
                <Text style={styles.parseChipDismiss}>✕</Text>
              </Pressable>
            </View>
          )}

          {gradeError && <Text style={styles.errorText}>⚠️ {gradeError}</Text>}
          {grading && (
            <View style={styles.gradeRow}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.gradingText}>Grading...</Text>
            </View>
          )}

          {!grading && smartGrade && (
            <View style={styles.gradeContainer}>
              <View style={styles.overallRow}>
                <Text style={styles.overallLabel}>SMART Score</Text>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor(smartGrade.score) }]}>
                  <Text style={styles.scoreText}>{smartGrade.score}%</Text>
                </View>
              </View>
              {SMART_DIMS.map(({ key, label, full }) => {
                const score = smartGrade.scores?.[key] ?? 0;
                const tip = smartGrade.tips[key];
                return (
                  <View key={key} style={styles.dimRow}>
                    <View style={styles.dimLabelWrap}>
                      <Text style={styles.dimLetter}>{label}</Text>
                      <Text style={styles.dimFull}>{full}</Text>
                    </View>
                    <View style={styles.dimBarTrack}>
                      <View
                        style={[
                          styles.dimBarFill,
                          { width: `${score}%` as any, backgroundColor: scoreColor(score) },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dimScore, { color: scoreColor(score) }]}>{score}</Text>
                    {tip && <Text style={styles.dimTip}>⚠️ {tip}</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Section 2: Proof type */}
        {showMeasurement && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📏 Proof type</Text>
            <View style={styles.chipRow}>
              {MEASUREMENT_OPTIONS.map((opt) => {
                const selected = selectedMeasurements.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleMeasurement(opt.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              📝 Proof description (optional)
            </Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.proofInput}
                multiline
                placeholder="Describe what the proof should show..."
                placeholderTextColor="#999"
                value={proofDescription}
                onChangeText={(v) => {
                  setProofDescription(v);
                  handleProofChange(selectedMeasurements, v);
                }}
              />
            </View>
          </View>
        )}

        {/* Section 3: Reality Check */}
        {showRealityCheck && (
          <View style={styles.section}>
            <Pressable
              style={[styles.realityBtn, checkingReality && styles.realityBtnDisabled]}
              onPress={handleRealityCheck}
              disabled={checkingReality}
            >
              {checkingReality ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Text style={styles.realityBtnText}>🔍 Run Reality Check</Text>
              )}
            </Pressable>

            {realityError && <Text style={styles.errorText}>⚠️ {realityError}</Text>}
            {realityResult && (
              <View style={styles.realityResult}>
                <Text style={styles.likelihoodText}>{realityResult.likelihood}% likelihood</Text>
                {realityResult.pitfalls.map((p, i) => (
                  <Text key={i} style={styles.pitfallText}>⚠️ {p}</Text>
                ))}
                {realityResult.suggestions.map((s, i) => (
                  <Text key={i} style={styles.suggestionText}>💡 {s}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Section 4: Invite */}
        {showInvite && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 Invite friends</Text>
            <View style={styles.inputCard}>
              <TextInput
                ref={friendInputRef}
                style={styles.searchInput}
                placeholder="Search username..."
                placeholderTextColor="#999"
                value={friendSearch}
                onChangeText={setFriendSearch}
                returnKeyType="done"
              />
            </View>
            <Pressable style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>🔗 Copy invite link</Text>
            </Pressable>
            <Text style={styles.inviteNote}>
              Friends set their own goal. Challenge starts once you both approve.
            </Text>
          </View>
        )}

        {showInvite && (
          <View style={styles.section}>
            <Pressable style={styles.startBtn}>
              <Text style={styles.startBtnText}>🚀 Start Challenge</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    width: 60,
  },
  title: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 10,
    fontWeight: "500",
  },
  inputCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  goalInput: {
    padding: 16,
    minHeight: 80,
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  parseChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5FFD6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
    gap: 8,
  },
  parseChipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#4A7000",
  },
  parseChipDismiss: {
    fontSize: 12,
    color: "#888",
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  gradingText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  gradeContainer: {
    marginTop: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  overallRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  overallLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    letterSpacing: 0.5,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dimLabelWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    width: 90,
  },
  dimLetter: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  dimFull: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    color: "#999",
  },
  dimBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  dimBarFill: {
    height: 6,
    borderRadius: 3,
  },
  dimScore: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    width: 28,
    textAlign: "right",
  },
  dimTip: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    color: "#999",
    width: "100%",
    paddingLeft: 98,
    lineHeight: 14,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chipSelected: { backgroundColor: "#111" },
  chipText: { fontSize: 13, fontFamily: "Orbit_400Regular", color: "#111" },
  chipTextSelected: { color: "#BFFF00" },
  proofInput: {
    padding: 14,
    minHeight: 60,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  realityBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  realityBtnDisabled: { opacity: 0.5 },
  realityBtnText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 0.5,
  },
  realityResult: {
    marginTop: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  likelihoodText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  pitfallText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    lineHeight: 18,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 18,
  },
  searchInput: {
    padding: 14,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  shareBtn: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shareBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  inviteNote: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  startBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  startBtnText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#FF6B6B",
    marginTop: 8,
  },
});
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Manual verification**

```bash
pnpm start
```

- Navigate to goal creation
- Type "I will meditate for 10 minutes, 3x a week" → blur
- Parse chip appears: "📅 3× per week · interpreted from your goal"
- SMART card shows all 5 bars (S/M/A/R/T)
- R shows low with "Complete onboarding to grade this" tip (if no profile)
- M shows low with "Select a proof type" tip
- Select "📷 Photo" → M score updates
- Dismiss parse chip with ✕ → chip disappears

**Step 4: Commit**

```bash
git add app/goal-create.tsx
git commit -m "feat: simplify goal creation — remove steppers, add parse chip, full SMART display"
```

---

## Final verification

```bash
pnpm start
```

Full flow end-to-end:
1. Sign in → routed to `/onboarding`
2. Complete all 5 chat topics
3. View + edit summary card
4. "Looks good →" → saved to Supabase, routed to goals
5. Sign out + sign in again → routed directly to goals (onboarding skipped)
6. Create a new goal with frequency → parse chip + all 5 SMART bars
7. R now grades non-zero using profile data

```bash
git log --oneline -10
```

Expected commits:
- feat: add user_profiles table with onboarding fields
- feat: expose user profile + onboarding_done in auth context
- feat: route to onboarding when user profile missing
- feat: add onboarding-followup edge function
- feat: add onboarding-extract edge function
- feat: add goal-parse edge function for frequency extraction
- feat: update smart-grade to accept proof, profile, and frequency for full SMART grading
- feat: update reality-check to use parsed frequency instead of steppers
- feat: update ai.ts types and functions for full SMART grading and onboarding
- feat: add chat-based onboarding screen with profile extraction and summary editing
- feat: simplify goal creation — remove steppers, add parse chip, full SMART display
