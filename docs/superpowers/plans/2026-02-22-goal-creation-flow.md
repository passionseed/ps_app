# Goal Creation Flow Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-scroll goal creation screen with AI SMART grading, reality check, and friend invitation flow.

**Architecture:** Progressive-reveal single scroll screen (`app/goal-create.tsx`). AI calls (SMART grading + reality check) go through Supabase Edge Functions to keep the Anthropic API key server-side. DB tables: `goals`, `challenges`, `challenge_participants`.

**Tech Stack:** Expo Router v6, React Native, TypeScript, Supabase (DB + Edge Functions), Claude Haiku (`claude-haiku-4-5-20251001`), pnpm

---

## Chunk 1: Database Schema

### Task 1: Create Supabase SQL Migration

**Files:**
- Create: `supabase/migrations/001_goal_creation.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/001_goal_creation.sql

-- Goals table
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  smart_score integer,
  smart_tips jsonb,
  measurement_types text[] not null default '{}',
  frequency_count integer,
  frequency_unit text check (frequency_unit in ('day', 'week', 'month')),
  duration_type text check (duration_type in ('count', 'date')),
  duration_value text,
  ai_reality_check jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending', 'active', 'completed')),
  created_at timestamptz default now()
);

-- Challenges table (links a creator's goal to a group challenge)
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_goal_id uuid references public.goals(id) on delete cascade not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed')),
  created_at timestamptz default now()
);

-- Challenge participants (each participant has their own goal)
create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references public.goals(id),
  status text not null default 'invited' check (status in ('invited', 'submitted', 'approved', 'rejected')),
  invited_at timestamptz default now(),
  unique(challenge_id, user_id)
);

-- RLS
alter table public.goals enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

create policy "Users can manage own goals"
  on public.goals for all
  using (auth.uid() = user_id);

create policy "Users can view challenges they are part of"
  on public.challenges for select
  using (
    creator_goal_id in (select id from public.goals where user_id = auth.uid())
    or
    id in (select challenge_id from public.challenge_participants where user_id = auth.uid())
  );

create policy "Creators can insert challenges"
  on public.challenges for insert
  with check (
    creator_goal_id in (select id from public.goals where user_id = auth.uid())
  );

create policy "Creators can update their challenges"
  on public.challenges for update
  using (
    creator_goal_id in (select id from public.goals where user_id = auth.uid())
  );

create policy "Participants can view their own rows"
  on public.challenge_participants for select
  using (
    user_id = auth.uid()
    or
    challenge_id in (
      select c.id from public.challenges c
      join public.goals g on g.id = c.creator_goal_id
      where g.user_id = auth.uid()
    )
  );

create policy "Creators can manage participants"
  on public.challenge_participants for all
  using (
    challenge_id in (
      select c.id from public.challenges c
      join public.goals g on g.id = c.creator_goal_id
      where g.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

Copy the contents of `supabase/migrations/001_goal_creation.sql` and run it in your Supabase project's SQL editor (Dashboard → SQL Editor → New query → paste → Run).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_goal_creation.sql
git commit -m "feat: add goals, challenges, challenge_participants schema"
```

---

## Chunk 2: Supabase Edge Functions (AI)

### Task 2: SMART Grading Edge Function

**Files:**
- Create: `supabase/functions/smart-grade/index.ts`

- [ ] **Step 1: Create the function**

```typescript
// supabase/functions/smart-grade/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { goalText } = await req.json();

    if (!goalText || goalText.trim().length < 5) {
      return new Response(JSON.stringify({ score: 0, tips: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Evaluate this goal on SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound).

Goal: "${goalText}"

Respond with JSON only, no explanation:
{
  "score": <0-100 integer, overall SMART score>,
  "tips": {
    "specific": <null if good, or one short tip string>,
    "measurable": <null if good, or one short tip string>,
    "achievable": <null if good, or one short tip string>,
    "relevant": <null if good, or one short tip string>,
    "time_bound": <null if good, or one short tip string>
  }
}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "grading failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/smart-grade/index.ts
git commit -m "feat: add smart-grade edge function"
```

### Task 3: Reality Check Edge Function

**Files:**
- Create: `supabase/functions/reality-check/index.ts`

- [ ] **Step 1: Create the function**

```typescript
// supabase/functions/reality-check/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { goalText, measurementTypes, frequencyCount, frequencyUnit, durationType, durationValue } =
      await req.json();

    const durationStr =
      durationType === "date"
        ? `until ${durationValue}`
        : `for ${durationValue}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Do a reality check on this goal commitment:

Goal: "${goalText}"
Proof type: ${measurementTypes.join(", ")}
Frequency: ${frequencyCount} times per ${frequencyUnit}
Duration: ${durationStr}

Respond with JSON only:
{
  "likelihood": <0-100 integer, % chance they complete this>,
  "pitfalls": [<2-3 short strings, common failure points>],
  "suggestions": [<1-2 short strings, concrete improvements>]
}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "reality check failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Deploy both Edge Functions**

You need the Supabase CLI. If not installed:
```bash
brew install supabase/tap/supabase
```

Then deploy:
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=<your-key>
supabase functions deploy smart-grade
supabase functions deploy reality-check
```

> Alternatively, create both functions in the Supabase Dashboard → Edge Functions → New Function and paste the code.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/reality-check/index.ts
git commit -m "feat: add reality-check edge function"
```

---

## Chunk 3: Client AI Library

### Task 4: lib/ai.ts

**Files:**
- Create: `lib/ai.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/ai.ts
import { supabase } from "./supabase";

export type SmartGradeResult = {
  score: number;
  tips: {
    specific: string | null;
    measurable: string | null;
    achievable: string | null;
    relevant: string | null;
    time_bound: string | null;
  };
};

export type RealityCheckResult = {
  likelihood: number;
  pitfalls: string[];
  suggestions: string[];
};

export async function gradeGoal(goalText: string): Promise<SmartGradeResult> {
  const { data, error } = await supabase.functions.invoke("smart-grade", {
    body: { goalText },
  });
  if (error) throw error;
  return data as SmartGradeResult;
}

export async function realityCheck(params: {
  goalText: string;
  measurementTypes: string[];
  frequencyCount: number;
  frequencyUnit: string;
  durationType: string;
  durationValue: string;
}): Promise<RealityCheckResult> {
  const { data, error } = await supabase.functions.invoke("reality-check", {
    body: params,
  });
  if (error) throw error;
  return data as RealityCheckResult;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai.ts
git commit -m "feat: add AI client wrappers for smart-grade and reality-check"
```

---

## Chunk 4: Navigation Wiring

### Task 5: Wire up navigation

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/goals.tsx`

- [ ] **Step 1: Add Stack.Screen in `app/_layout.tsx`**

In `RootNavigator`, add `goal-create` to the Stack after `(tabs)`:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="goal-create" />
</Stack>
```

- [ ] **Step 2: Wire "+ New" button in `app/(tabs)/goals.tsx`**

Add `import { router } from "expo-router";` at the top, then update the `Pressable` `onPress`:

```tsx
<Pressable
  style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
  onPress={() => router.push("/goal-create")}
>
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx app/(tabs)/goals.tsx
git commit -m "feat: wire navigation to goal-create screen"
```

---

## Chunk 5: Goal Creation Screen

### Task 6: Scaffold + Goal Text Section with SMART Grading

**Files:**
- Create: `app/goal-create.tsx`

- [ ] **Step 1: Create the scaffold with goal text input and SMART grading**

```tsx
// app/goal-create.tsx
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useRef, useCallback } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { gradeGoal, realityCheck, SmartGradeResult, RealityCheckResult } from "../lib/ai";

const MEASUREMENT_OPTIONS = [
  { id: "video", label: "📹 Video" },
  { id: "screenshot", label: "📸 Screenshot" },
  { id: "text", label: "📝 Text log" },
  { id: "voice", label: "🎤 Voice note" },
];

const FREQ_UNITS = ["day", "week", "month"] as const;

export default function GoalCreateScreen() {
  // Goal text
  const [goalText, setGoalText] = useState("");
  const [smartGrade, setSmartGrade] = useState<SmartGradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measurement
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);

  // Time
  const [freqCount, setFreqCount] = useState(3);
  const [freqUnit, setFreqUnit] = useState<"day" | "week" | "month">("week");
  const [durationType, setDurationType] = useState<"count" | "date">("count");
  const [durationCount, setDurationCount] = useState(8);
  const [durationCountUnit, setDurationCountUnit] = useState<"weeks" | "months">("weeks");
  const [durationDate, setDurationDate] = useState("");

  // Reality check
  const [realityResult, setRealityResult] = useState<RealityCheckResult | null>(null);
  const [checkingReality, setCheckingReality] = useState(false);
  const [realityDone, setRealityDone] = useState(false);

  // Invite
  const [friendSearch, setFriendSearch] = useState("");

  // Derived reveal flags
  const showMeasurement = goalText.trim().length > 5;
  const showTime = selectedMeasurements.length > 0;
  const showRealityCheck =
    showTime &&
    freqCount > 0 &&
    (durationType === "count" ? durationCount > 0 : durationDate.length > 0);
  const showInvite = realityDone;

  // SMART grade on blur with debounce
  const handleGoalBlur = useCallback(async () => {
    if (goalText.trim().length < 5) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setGrading(true);
      try {
        const result = await gradeGoal(goalText);
        setSmartGrade(result);
      } catch {
        // silently fail
      } finally {
        setGrading(false);
      }
    }, 800);
  }, [goalText]);

  const handleRealityCheck = async () => {
    setCheckingReality(true);
    try {
      const durationValue =
        durationType === "count"
          ? `${durationCount} ${durationCountUnit}`
          : durationDate;
      const result = await realityCheck({
        goalText,
        measurementTypes: selectedMeasurements,
        frequencyCount: freqCount,
        frequencyUnit: freqUnit,
        durationType,
        durationValue,
      });
      setRealityResult(result);
      setRealityDone(true);
    } catch {
      // silently fail
    } finally {
      setCheckingReality(false);
    }
  };

  const toggleMeasurement = (id: string) => {
    setSelectedMeasurements((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "#BFFF00";
    if (score >= 50) return "#FFE500";
    return "#FF4444";
  };

  const durationSummary = () => {
    const freq = `${freqCount}× per ${freqUnit}`;
    const dur =
      durationType === "count"
        ? `for ${durationCount} ${durationCountUnit}`
        : `until ${durationDate}`;
    return `${freq}, ${dur}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
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
        {/* ── Section 1: Goal Text ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎯 What's your goal?</Text>
          <TextInput
            style={styles.goalInput}
            multiline
            placeholder="I will..."
            placeholderTextColor="#999"
            value={goalText}
            onChangeText={setGoalText}
            onBlur={handleGoalBlur}
          />

          {/* SMART Grade */}
          {grading && (
            <View style={styles.gradeRow}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.gradingText}>Grading...</Text>
            </View>
          )}
          {!grading && smartGrade && (
            <View style={styles.gradeContainer}>
              <View
                style={[
                  styles.scoreBadge,
                  { borderColor: scoreColor(smartGrade.score) },
                ]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    { color: scoreColor(smartGrade.score) },
                  ]}
                >
                  {smartGrade.score}% SMART
                </Text>
              </View>
              {Object.entries(smartGrade.tips)
                .filter(([, tip]) => tip !== null)
                .map(([dim, tip]) => (
                  <Text key={dim} style={styles.tipText}>
                    ⚠️ {dim.replace("_", "-")}: {tip}
                  </Text>
                ))}
            </View>
          )}
        </View>

        {/* ── Section 2: Measurement ── */}
        {showMeasurement && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📏 How will you prove it?</Text>
            <View style={styles.chipRow}>
              {MEASUREMENT_OPTIONS.map((opt) => {
                const selected = selectedMeasurements.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleMeasurement(opt.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Section 3: Time Commitment ── */}
        {showTime && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>⏱️ Time commitment</Text>

            {/* Frequency */}
            <Text style={styles.subLabel}>Frequency</Text>
            <View style={styles.row}>
              <Pressable
                style={styles.stepper}
                onPress={() => setFreqCount((v) => Math.max(1, v - 1))}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{freqCount}</Text>
              <Pressable
                style={styles.stepper}
                onPress={() => setFreqCount((v) => Math.min(30, v + 1))}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
              <Text style={styles.unitLabel}>times per</Text>
              <View style={styles.unitSelector}>
                {FREQ_UNITS.map((u) => (
                  <Pressable
                    key={u}
                    style={[
                      styles.unitChip,
                      freqUnit === u && styles.unitChipSelected,
                    ]}
                    onPress={() => setFreqUnit(u)}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        freqUnit === u && styles.unitChipTextSelected,
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Duration */}
            <Text style={styles.subLabel}>Duration</Text>
            <View style={styles.row}>
              <Pressable
                style={[
                  styles.durationToggle,
                  durationType === "count" && styles.durationToggleSelected,
                ]}
                onPress={() => setDurationType("count")}
              >
                <Text
                  style={[
                    styles.durationToggleText,
                    durationType === "count" && styles.durationToggleTextSelected,
                  ]}
                >
                  # weeks
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.durationToggle,
                  durationType === "date" && styles.durationToggleSelected,
                ]}
                onPress={() => setDurationType("date")}
              >
                <Text
                  style={[
                    styles.durationToggleText,
                    durationType === "date" && styles.durationToggleTextSelected,
                  ]}
                >
                  end date
                </Text>
              </Pressable>
            </View>

            {durationType === "count" ? (
              <View style={styles.row}>
                <Pressable
                  style={styles.stepper}
                  onPress={() => setDurationCount((v) => Math.max(1, v - 1))}
                >
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{durationCount}</Text>
                <Pressable
                  style={styles.stepper}
                  onPress={() => setDurationCount((v) => v + 1)}
                >
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
                <View style={styles.unitSelector}>
                  {(["weeks", "months"] as const).map((u) => (
                    <Pressable
                      key={u}
                      style={[
                        styles.unitChip,
                        durationCountUnit === u && styles.unitChipSelected,
                      ]}
                      onPress={() => setDurationCountUnit(u)}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          durationCountUnit === u && styles.unitChipTextSelected,
                        ]}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={durationDate}
                onChangeText={setDurationDate}
              />
            )}

            {/* Summary line */}
            {showRealityCheck && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>📅 {durationSummary()}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Section 4: Reality Check ── */}
        {showRealityCheck && (
          <View style={styles.section}>
            <Pressable
              style={[
                styles.realityBtn,
                checkingReality && styles.realityBtnDisabled,
              ]}
              onPress={handleRealityCheck}
              disabled={checkingReality}
            >
              {checkingReality ? (
                <ActivityIndicator size="small" color="#FDFFF5" />
              ) : (
                <Text style={styles.realityBtnText}>🔍 Reality Check</Text>
              )}
            </Pressable>

            {realityResult && (
              <View style={styles.realityResult}>
                <Text style={styles.likelihoodText}>
                  {realityResult.likelihood}% chance you'll complete this
                </Text>
                {realityResult.pitfalls.map((p, i) => (
                  <Text key={i} style={styles.pitfallText}>
                    ⚠️ {p}
                  </Text>
                ))}
                {realityResult.suggestions.map((s, i) => (
                  <Text key={i} style={styles.suggestionText}>
                    💡 {s}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Section 5: Invite Friends ── */}
        {showInvite && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 Invite friends</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#999"
              value={friendSearch}
              onChangeText={setFriendSearch}
            />
            <Pressable style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>🔗 Share invite link</Text>
            </Pressable>
            <Text style={styles.inviteNote}>
              Friends set their own goal. Challenge starts once you approve at least one.
            </Text>
          </View>
        )}

        {/* ── Start Challenge ── */}
        {showInvite && (
          <View style={styles.section}>
            <Pressable style={[styles.startBtn, styles.startBtnDisabled]} disabled>
              <Text style={styles.startBtnText}>🚀 Start Challenge</Text>
            </Pressable>
            <Text style={styles.startNote}>
              Waiting for a friend to submit their goal
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#111",
  },
  backBtn: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    width: 60,
  },
  title: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    marginBottom: 8,
    marginTop: 12,
  },
  goalInput: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
    minHeight: 100,
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    textAlignVertical: "top",
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  gradingText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
  },
  gradeContainer: { marginTop: 10, gap: 6 },
  scoreBadge: {
    alignSelf: "flex-start",
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
  },
  tipText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    lineHeight: 18,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: "#111" },
  chipText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  chipTextSelected: { color: "#BFFF00" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  stepper: {
    borderWidth: 2,
    borderColor: "#111",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperText: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 20,
  },
  stepperValue: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    minWidth: 32,
    textAlign: "center",
  },
  unitLabel: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#555",
  },
  unitSelector: { flexDirection: "row", gap: 6 },
  unitChip: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  unitChipSelected: { backgroundColor: "#111" },
  unitChipText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  unitChipTextSelected: { color: "#BFFF00" },
  durationToggle: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  durationToggleSelected: { backgroundColor: "#111" },
  durationToggleText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  durationToggleTextSelected: { color: "#BFFF00" },
  dateInput: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 12,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  summaryBox: {
    marginTop: 14,
    borderWidth: 2,
    borderColor: "#BFFF00",
    backgroundColor: "#F5FFD6",
    padding: 10,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  realityBtn: {
    backgroundColor: "#111",
    padding: 16,
    alignItems: "center",
  },
  realityBtnDisabled: { opacity: 0.5 },
  realityBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#BFFF00",
    letterSpacing: 1,
  },
  realityResult: {
    marginTop: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
  },
  likelihoodText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 4,
  },
  pitfallText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    lineHeight: 18,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 18,
  },
  searchInput: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 12,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    marginBottom: 12,
  },
  shareBtn: {
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  inviteNote: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
  },
  startBtn: {
    backgroundColor: "#BFFF00",
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#111",
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    letterSpacing: 1,
  },
  startNote: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#555",
    textAlign: "center",
    marginTop: 8,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/goal-create.tsx
git commit -m "feat: add goal creation screen with SMART grading, measurement, time, reality check, invite"
```

---

## Chunk 6: Verify

### Task 7: Smoke test the flow

- [ ] **Step 1: Start dev server**

```bash
pnpm start
```

- [ ] **Step 2: Verify navigation**
  - Open Goals tab → tap "+ New" → `goal-create` screen opens
  - Tap "← Back" → returns to Goals

- [ ] **Step 3: Verify progressive reveal**
  - Type 6+ characters in goal input → Measurement section appears
  - Select a measurement chip → Time section appears
  - Set frequency + duration → summary line appears, Reality Check button unlocks
  - Tap Reality Check → result panel appears, Invite section reveals

- [ ] **Step 4: Verify SMART grading**
  - Type a vague goal, tab away → after ~800ms grading spinner appears, then score badge + tips
  - Type a strong specific goal → score should be higher

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: goal creation flow complete"
```
