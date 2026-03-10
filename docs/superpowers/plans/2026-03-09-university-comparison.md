# University Comparison Feature — Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make university steps in career path cards tappable to reveal a full-screen deep-dive with AI-computed match %, acceptance rate, tuition, curriculum link, real-time research, and a side-by-side compare screen — all powered by a Supabase edge function with DB-level caching.

**Architecture:** Edge-function-first with Supabase DB cache. `university-insights` edge function checks `university_insights_cache` table first (seeded + previously fetched rows). On cache miss, calls Exa (web research) + Claude Haiku (AI match synthesis), writes result back to cache. Client invokes via `lib/universityInsights.ts`. Two new Expo Router screens: detail (`app/university/[key].tsx`) and compare (`app/university/compare.tsx`).

**Tech Stack:** Expo Router v6, Supabase (Postgres + Edge Functions + Deno), Exa API (web research), Claude Haiku (AI match synthesis), React Native Animated, pnpm

---

## File Map

**Create:**
- `types/university.ts` — UniversityInsights + sub-types
- `lib/universityInsights.ts` — client helper: invokes edge function, session cache, quick match calc
- `supabase/migrations/20260309000000_university_insights_cache.sql` — cache table + RLS
- `supabase/functions/university-insights/index.ts` — Deno edge function
- `app/university/[key].tsx` — university detail screen
- `app/university/compare.tsx` — side-by-side compare screen
- `scripts/seed-universities.ts` — bulk seed script (calls edge function for known Thai unis)

**Modify:**
- `lib/mockPathData.ts` — add optional `universityMeta` field to `PathStep`
- `components/JourneyBoard/PathStepCard.tsx` — wrap university cards in Pressable, navigate to detail
- `components/JourneyBoard/CareerPathCard.tsx` — pass scores + careerGoal down to PathStepCard

---

## Task 1: Define University Types

**Files:**
- Create: `types/university.ts`

- [ ] Create `types/university.ts`:

```typescript
export interface UniversityPerson {
  name: string;
  role: string;
  initials: string;
  url: string;
}

export interface UniversityNewsItem {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedDate: string | null;
}

export interface UniversityInsights {
  // Match
  quickMatchScore: number;         // client-computed from path scores (instant)
  aiMatchScore: number | null;     // AI-computed
  matchExplanation: string | null;

  // Admissions
  acceptanceRate: string | null;   // e.g. "12%" or "GPAX 3.20+"
  gpaxCutoff: string | null;       // e.g. "GPAX 3.25 (2566)"

  // Cost
  tuitionPerYear: number | null;   // THB
  tuitionNote: string | null;      // brief Thai note

  // Program
  duration: string | null;         // e.g. "4 ปี"
  curriculumUrl: string | null;
  ranking: string | null;          // e.g. "QS Thailand #3"

  // Research
  people: UniversityPerson[];
  news: UniversityNewsItem[];

  // Meta
  cachedAt: string | null;
  source: "seeded" | "ai" | null;
}

export interface UniversityMeta {
  universityName: string;
  facultyName: string;
}
```

- [ ] Commit:

```bash
git add types/university.ts
git commit -m "feat(university): add UniversityInsights types"
```

---

## Task 2: Supabase Cache Table Migration

**Files:**
- Create: `supabase/migrations/20260309000000_university_insights_cache.sql`

- [ ] Create the migration file:

```sql
create table if not exists university_insights_cache (
  id uuid primary key default gen_random_uuid(),
  university_name text not null,
  faculty_name    text not null,
  career_goal     text not null default '',
  data            jsonb not null,
  source          text not null default 'ai', -- 'seeded' | 'ai'
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  constraint university_insights_cache_unique
    unique (university_name, faculty_name, career_goal)
);

create index university_insights_cache_lookup
  on university_insights_cache (university_name, faculty_name, career_goal);

alter table university_insights_cache enable row level security;

create policy "University cache readable by authenticated"
  on university_insights_cache for select
  to authenticated using (true);
```

- [ ] Apply migration:

```bash
npx supabase migration up
```

Expected: migration applied, table visible in Supabase Studio at `http://127.0.0.1:54323`.

- [ ] Commit:

```bash
git add supabase/migrations/20260309000000_university_insights_cache.sql
git commit -m "feat(university): add university_insights_cache table migration"
```

---

## Task 3: Supabase Edge Function — `university-insights`

**Files:**
- Create: `supabase/functions/university-insights/index.ts`

- [ ] Create `supabase/functions/university-insights/index.ts`:

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EXA_API_KEY = Deno.env.get("EXA_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const { universityName, facultyName, careerGoal = "", passionScore, futureScore, worldScore } =
    await req.json();

  if (!universityName || !facultyName) {
    return new Response(
      JSON.stringify({ error: "universityName and facultyName required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  // 1. Check DB cache
  const { data: cached } = await supabase
    .from("university_insights_cache")
    .select("data, expires_at")
    .eq("university_name", universityName)
    .eq("faculty_name", facultyName)
    .eq("career_goal", careerGoal)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return new Response(JSON.stringify(cached.data), {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS },
    });
  }

  // 2. Research via Exa
  const [exaSearch, exaPeople] = await Promise.all([
    fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${universityName} ${facultyName} Thailand admission tuition curriculum`,
        numResults: 8,
        useAutoprompt: true,
        contents: { text: { maxCharacters: 800 } },
      }),
    }).then((r) => r.json()),
    fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${facultyName} ${universityName} professor alumni Thailand`,
        numResults: 5,
        type: "neural",
      }),
    }).then((r) => r.json()),
  ]);

  const searchSnippets = (exaSearch.results ?? [])
    .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.text ?? ""}`)
    .join("\n\n---\n\n")
    .slice(0, 6000);

  // 3. AI synthesis via Claude Haiku
  const aiPrompt = `You are helping a Thai high school student evaluate university options.
University: ${universityName}
Faculty: ${facultyName}
Career Goal: ${careerGoal}
Student scores — Passion: ${passionScore}/100, Future: ${futureScore}/100, Market: ${worldScore}/100

Web research:
${searchSnippets}

Return ONLY a JSON object (no markdown fences) with:
{
  "aiMatchScore": <0-100>,
  "matchExplanation": "<2-3 sentences in Thai>",
  "acceptanceRate": "<e.g. '12%' or 'GPAX 3.20+', or null>",
  "gpaxCutoff": "<e.g. 'GPAX 3.25 (2566)', or null>",
  "tuitionPerYear": <THB integer or null>,
  "tuitionNote": "<brief Thai note or null>",
  "duration": "<e.g. '4 ปี' or null>",
  "curriculumUrl": "<URL or null>",
  "ranking": "<e.g. 'QS Thailand #3' or null>",
  "news": [{ "title": "...", "url": "...", "snippet": "...", "publishedDate": "..." }]
}`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: aiPrompt }],
    }),
  });

  const aiData = await aiRes.json();
  let aiParsed: Record<string, any> = {};
  try {
    aiParsed = JSON.parse(aiData.content?.[0]?.text ?? "{}");
  } catch { /* fallback — partial data */ }

  // 4. Build people list
  const people = (exaPeople.results ?? []).slice(0, 5).map((r: any) => {
    const raw = (r.title ?? "").replace(/ \| LinkedIn.*$/i, "").trim();
    const dashIdx = raw.indexOf(" - ");
    const name = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw;
    const role = dashIdx > -1 ? raw.slice(dashIdx + 3).trim() : "";
    const initials =
      name.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("") || "?";
    return { name, role, initials, url: r.url };
  });

  const result = {
    aiMatchScore: aiParsed.aiMatchScore ?? null,
    matchExplanation: aiParsed.matchExplanation ?? null,
    acceptanceRate: aiParsed.acceptanceRate ?? null,
    gpaxCutoff: aiParsed.gpaxCutoff ?? null,
    tuitionPerYear: aiParsed.tuitionPerYear ?? null,
    tuitionNote: aiParsed.tuitionNote ?? null,
    duration: aiParsed.duration ?? null,
    curriculumUrl: aiParsed.curriculumUrl ?? null,
    ranking: aiParsed.ranking ?? null,
    people,
    news: (aiParsed.news ?? []).slice(0, 4),
    cachedAt: new Date().toISOString(),
    source: "ai",
  };

  // 5. Save to DB cache (upsert — also updates seeded rows on miss)
  await supabase.from("university_insights_cache").upsert(
    {
      university_name: universityName,
      faculty_name: facultyName,
      career_goal: careerGoal,
      data: result,
      source: "ai",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "university_name,faculty_name,career_goal" },
  );

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "X-Cache": "MISS", ...CORS },
  });
});
```

- [ ] Set secrets in local Supabase (add to your `.env.local` if not already there, then set via CLI):

```bash
npx supabase secrets set EXA_API_KEY=your_key ANTHROPIC_API_KEY=your_key
```

- [ ] Serve and smoke-test locally:

```bash
npx supabase functions serve university-insights
```

In a second terminal:

```bash
curl -X POST http://localhost:54321/functions/v1/university-insights \
  -H "Content-Type: application/json" \
  -d '{"universityName":"มหาวิทยาลัยศิลปากร","facultyName":"คณะมัณฑนศิลป์","careerGoal":"UX Designer","passionScore":82,"futureScore":68,"worldScore":91}'
```

Expected: JSON with `aiMatchScore`, `acceptanceRate`, `tuitionPerYear`, etc. Second call returns same JSON with `X-Cache: HIT`.

- [ ] Commit:

```bash
git add supabase/functions/university-insights/
git commit -m "feat(university): add university-insights edge function with DB cache + Exa + Claude Haiku"
```

---

## Task 4: Client Library

**Files:**
- Create: `lib/universityInsights.ts`

- [ ] Create `lib/universityInsights.ts`:

```typescript
import { supabase } from "./supabase";
import type { UniversityInsights } from "../types/university";

// Session-level in-memory cache — prevents duplicate in-flight calls
const sessionCache = new Map<string, UniversityInsights>();

function cacheKey(universityName: string, facultyName: string, careerGoal: string) {
  return `${universityName}|${facultyName}|${careerGoal}`;
}

export function computeQuickMatch(
  passionScore: number | null,
  futureScore: number | null,
  worldScore: number | null,
): number {
  const scores = [passionScore, futureScore, worldScore].filter(
    (s): s is number => s !== null,
  );
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export async function fetchUniversityInsights(params: {
  universityName: string;
  facultyName: string;
  careerGoal: string;
  passionScore: number | null;
  futureScore: number | null;
  worldScore: number | null;
}): Promise<UniversityInsights> {
  const { universityName, facultyName, careerGoal, passionScore, futureScore, worldScore } =
    params;
  const key = cacheKey(universityName, facultyName, careerGoal);

  if (sessionCache.has(key)) {
    return sessionCache.get(key)!;
  }

  const { data, error } = await supabase.functions.invoke("university-insights", {
    body: { universityName, facultyName, careerGoal, passionScore, futureScore, worldScore },
  });

  if (error) throw error;

  const result: UniversityInsights = {
    quickMatchScore: computeQuickMatch(passionScore, futureScore, worldScore),
    ...data,
  };

  sessionCache.set(key, result);
  return result;
}
```

- [ ] Commit:

```bash
git add lib/universityInsights.ts
git commit -m "feat(university): add client lib with session cache + quick match computation"
```

---

## Task 5: Extend PathStep + Update Mock Data

**Files:**
- Modify: `lib/mockPathData.ts`

- [ ] Add optional `universityMeta` to `PathStep` interface:

```typescript
export interface PathStep {
  id: string;
  order: number;
  type: StepType;
  title: string;
  subtitle: string;
  detail: string;
  duration: string;
  icon: string;
  status: "completed" | "in-progress" | "upcoming";
  // Optional: enables deep-dive navigation for university type steps
  universityMeta?: {
    universityName: string;
    facultyName: string;
  };
}
```

- [ ] Add `universityMeta` to each university step in `MOCK_PATH_DATA`:

  - step-a1 (Plan A — Silpakorn):
    ```typescript
    universityMeta: {
      universityName: "มหาวิทยาลัยศิลปากร",
      facultyName: "คณะมัณฑนศิลป์",
    },
    ```

  - step-b1 (Plan B — Chula):
    ```typescript
    universityMeta: {
      universityName: "จุฬาลงกรณ์มหาวิทยาลัย",
      facultyName: "คณะพาณิชยศาสตร์และการบัญชี",
    },
    ```

  - step-c1 (Plan C — Kasetsart):
    ```typescript
    universityMeta: {
      universityName: "มหาวิทยาลัยเกษตรศาสตร์",
      facultyName: "คณะวิทยาศาสตร์",
    },
    ```

- [ ] Commit:

```bash
git add lib/mockPathData.ts
git commit -m "feat(university): add universityMeta to PathStep type and mock data"
```

---

## Task 6: Make PathStepCard University Type Tappable

**Files:**
- Modify: `components/JourneyBoard/PathStepCard.tsx`
- Modify: `components/JourneyBoard/CareerPathCard.tsx`

- [ ] Add `router` import to `PathStepCard.tsx`:

```typescript
import { router } from "expo-router";
```

- [ ] Extend `PathStepCardProps` to receive path context for navigation:

```typescript
interface PathStepCardProps {
  step: PathStep;
  isLast: boolean;
  index: number;
  pathCareerGoal?: string;
  passionScore?: number | null;
  futureScore?: number | null;
  worldScore?: number | null;
}
```

- [ ] Inside `PathStepCard`, replace the static `<View style={[styles.cardOuter, ...]}>` wrapper with a conditional `CardWrapper` component — only university steps with `universityMeta` get a `Pressable`:

```typescript
const isUniversityTappable = step.type === "university" && !!step.universityMeta;

const handleUniversityPress = () => {
  if (!step.universityMeta) return;
  router.push({
    pathname: `/university/${encodeURIComponent(step.universityMeta.universityName)}`,
    params: {
      facultyName: step.universityMeta.facultyName,
      careerGoal: pathCareerGoal ?? "",
      passionScore: String(passionScore ?? ""),
      futureScore: String(futureScore ?? ""),
      worldScore: String(worldScore ?? ""),
    },
  });
};
```

Replace the `<View style={[styles.cardOuter, { shadowColor: theme.shadow }]}>` with:

```typescript
{isUniversityTappable ? (
  <Pressable
    style={({ pressed }) => [
      styles.cardOuter,
      { shadowColor: theme.shadow },
      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
    ]}
    onPress={handleUniversityPress}
  >
    {cardContent}
  </Pressable>
) : (
  <View style={[styles.cardOuter, { shadowColor: theme.shadow }]}>
    {cardContent}
  </View>
)}
```

Where `cardContent` is the existing `<LinearGradient ...>...</LinearGradient>` JSX extracted to a variable.

- [ ] Add a subtle tap hint at the bottom of university card content (inside LinearGradient, after durationRow):

```typescript
{isUniversityTappable && (
  <View style={styles.exploreHint}>
    <Text style={styles.exploreHintText}>ดูรายละเอียด →</Text>
  </View>
)}
```

Add to `StyleSheet.create`:

```typescript
exploreHint: {
  marginTop: 8,
  alignItems: "flex-end",
},
exploreHintText: {
  fontSize: 11,
  fontWeight: "600",
  color: "#8B5CF6",
  letterSpacing: 0.3,
},
```

- [ ] In `CareerPathCard.tsx`, pass scores + careerGoal down to each `PathStepCard`:

```typescript
<PathStepCard
  key={step.id}
  step={step}
  isLast={idx === sortedSteps.length - 1}
  index={idx}
  pathCareerGoal={path.careerGoal}
  passionScore={path.passionScore}
  futureScore={path.futureScore}
  worldScore={path.worldScore}
/>
```

- [ ] Test: tap a university PathStepCard in the simulator — should navigate to university detail screen.

- [ ] Commit:

```bash
git add components/JourneyBoard/PathStepCard.tsx components/JourneyBoard/CareerPathCard.tsx
git commit -m "feat(university): make university PathStepCard tappable, navigate to detail screen"
```

---

## Task 7: University Detail Screen

**Files:**
- Create: `app/university/[key].tsx`

- [ ] Create `app/university/[key].tsx`:

```typescript
import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchUniversityInsights,
  computeQuickMatch,
} from "../../lib/universityInsights";
import type { UniversityInsights } from "../../types/university";

export default function UniversityDetailScreen() {
  const { key, facultyName, careerGoal, passionScore, futureScore, worldScore } =
    useLocalSearchParams<{
      key: string;
      facultyName: string;
      careerGoal: string;
      passionScore: string;
      futureScore: string;
      worldScore: string;
    }>();

  const universityName = decodeURIComponent(key ?? "");
  const ps = passionScore ? Number(passionScore) : null;
  const fs = futureScore ? Number(futureScore) : null;
  const ws = worldScore ? Number(worldScore) : null;
  const quickMatch = computeQuickMatch(ps, fs, ws);

  const [insights, setInsights] = useState<UniversityInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    fetchUniversityInsights({
      universityName,
      facultyName: facultyName ?? "",
      careerGoal: careerGoal ?? "",
      passionScore: ps,
      futureScore: fs,
      worldScore: ws,
    })
      .then((data) => {
        if (!cancelled) { setInsights(data); setLoading(false); }
      })
      .catch((e) => {
        if (!cancelled) { setError(e?.message ?? "โหลดไม่สำเร็จ"); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [universityName, facultyName]);

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Hero */}
      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← กลับ</Text>
        </Pressable>
        <Text style={s.heroTitle}>{universityName}</Text>
        <Text style={s.heroFaculty}>{facultyName}</Text>
        {careerGoal ? <Text style={s.heroCareer}>เส้นทาง: {careerGoal}</Text> : null}

        {/* Match pills — quick match is instant, AI match appears when loaded */}
        <View style={s.matchRow}>
          <View style={s.matchPill}>
            <Text style={s.matchPillLabel}>Match เบื้องต้น</Text>
            <Text style={s.matchPillValue}>{quickMatch}%</Text>
          </View>
          {insights?.aiMatchScore != null ? (
            <View style={[s.matchPill, s.aiMatchPill]}>
              <Text style={s.matchPillLabel}>AI Match</Text>
              <Text style={s.matchPillValue}>{insights.aiMatchScore}%</Text>
            </View>
          ) : loading ? (
            <View style={s.loadingPill}>
              <ActivityIndicator size="small" color="#BFFF00" />
              <Text style={s.loadingPillText}>คำนวณ AI...</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* AI Match Explanation */}
            {insights?.matchExplanation ? (
              <Section title="วิเคราะห์ความเหมาะสม">
                <View style={s.explanationCard}>
                  <Text style={s.explanationText}>{insights.matchExplanation}</Text>
                </View>
              </Section>
            ) : loading ? (
              <Section title="วิเคราะห์ความเหมาะสม">
                <View style={s.skeleton} />
              </Section>
            ) : null}

            {/* Admissions */}
            <Section title="การรับเข้า">
              <View style={s.statsGrid}>
                <StatBox
                  label="อัตราการรับ"
                  value={loading ? "..." : (insights?.acceptanceRate ?? "—")}
                  icon="🎯"
                />
                <StatBox
                  label="GPAX ขั้นต่ำ"
                  value={loading ? "..." : (insights?.gpaxCutoff ?? "—")}
                  icon="📊"
                />
              </View>
            </Section>

            {/* Cost */}
            <Section title="ค่าใช้จ่าย">
              <View style={s.statsGrid}>
                <StatBox
                  label="ค่าเล่าเรียน/ปี"
                  value={
                    loading
                      ? "..."
                      : insights?.tuitionPerYear
                      ? `฿${insights.tuitionPerYear.toLocaleString()}`
                      : "—"
                  }
                  icon="💰"
                />
                <StatBox
                  label="ระยะเวลา"
                  value={loading ? "..." : (insights?.duration ?? "—")}
                  icon="📅"
                />
              </View>
              {insights?.tuitionNote ? (
                <Text style={s.tuitionNote}>{insights.tuitionNote}</Text>
              ) : null}
            </Section>

            {/* Curriculum + Ranking */}
            <Section title="หลักสูตรและอันดับ">
              {insights?.ranking ? (
                <View style={s.rankingBadge}>
                  <Text style={s.rankingText}>🏆 {insights.ranking}</Text>
                </View>
              ) : null}
              {insights?.curriculumUrl ? (
                <Pressable
                  style={({ pressed }) => [s.curriculumBtn, pressed && s.pressed]}
                  onPress={() => open(insights.curriculumUrl!)}
                >
                  <Text style={s.curriculumBtnText}>ดูหลักสูตรทั้งหมด →</Text>
                </Pressable>
              ) : loading ? (
                <View style={s.skeleton} />
              ) : null}
            </Section>

            {/* Compare CTA */}
            <Section title="">
              <Pressable
                style={({ pressed }) => [s.compareBtn, pressed && s.pressed]}
                onPress={() =>
                  router.push({
                    pathname: "/university/compare",
                    params: {
                      keyA: encodeURIComponent(universityName),
                      facultyA: facultyName,
                      careerGoal,
                    },
                  })
                }
              >
                <LinearGradient
                  colors={["#BFFF00", "#A3E600"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.compareBtnGradient}
                >
                  <Text style={s.compareBtnText}>เปรียบเทียบกับมหาวิทยาลัยอื่น</Text>
                </LinearGradient>
              </Pressable>
            </Section>

            {/* People */}
            {(loading || (insights?.people?.length ?? 0) > 0) ? (
              <Section title="บุคลากร / ศิษย์เก่า">
                {loading ? (
                  <ActivityIndicator color="#8B5CF6" />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.hScroll}
                  >
                    {insights!.people.map((p, i) => (
                      <Pressable
                        key={i}
                        style={({ pressed }) => [s.personCard, pressed && s.pressed]}
                        onPress={() => open(p.url)}
                      >
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>{p.initials}</Text>
                        </View>
                        <Text style={s.personName} numberOfLines={2}>{p.name}</Text>
                        {p.role ? (
                          <Text style={s.personRole} numberOfLines={3}>{p.role}</Text>
                        ) : null}
                        <Text style={s.viewLink}>ดู →</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </Section>
            ) : null}

            {/* News */}
            {(loading || (insights?.news?.length ?? 0) > 0) ? (
              <Section title="ข่าวสาร">
                {loading ? (
                  <ActivityIndicator color="#8B5CF6" />
                ) : (
                  <View style={s.newsList}>
                    {insights!.news.map((n, i) => (
                      <Pressable
                        key={i}
                        style={({ pressed }) => [s.newsCard, pressed && s.pressed]}
                        onPress={() => open(n.url)}
                      >
                        <Text style={s.newsTitle} numberOfLines={3}>{n.title}</Text>
                        {n.snippet ? (
                          <Text style={s.newsSnippet} numberOfLines={2}>{n.snippet}</Text>
                        ) : null}
                        <Text style={s.readLink}>อ่านต่อ →</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Section>
            ) : null}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      {title ? (
        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FA" },
  hero: { paddingBottom: 24, paddingHorizontal: 24 },
  backBtn: { marginBottom: 16, alignSelf: "flex-start" },
  backBtnText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 4 },
  heroFaculty: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  heroCareer: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 },
  matchRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  matchPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  aiMatchPill: { backgroundColor: "rgba(191,255,0,0.2)" },
  matchPillLabel: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  matchPillValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loadingPillText: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20 },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionAccent: { width: 3, height: 14, backgroundColor: "#8B5CF6", borderRadius: 2 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#111", letterSpacing: 1.2 },
  explanationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
  },
  explanationText: { fontSize: 14, color: "#374151", lineHeight: 22 },
  skeleton: { height: 60, backgroundColor: "#e5e7eb", borderRadius: 12 },
  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600", textAlign: "center" },
  tuitionNote: { fontSize: 12, color: "#9CA3AF", marginTop: 8, paddingHorizontal: 4 },
  rankingBadge: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  rankingText: { fontSize: 14, fontWeight: "700", color: "#92400E" },
  curriculumBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    alignItems: "center",
  },
  curriculumBtnText: { fontSize: 14, fontWeight: "700", color: "#8B5CF6" },
  compareBtn: { borderRadius: 12, overflow: "hidden" },
  compareBtnGradient: { paddingVertical: 14, alignItems: "center", borderRadius: 12 },
  compareBtnText: { fontSize: 15, fontWeight: "700", color: "#111" },
  hScroll: { gap: 12, paddingRight: 20 },
  personCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    gap: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4C1D95",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: "#BFFF00" },
  personName: { fontSize: 13, fontWeight: "600", color: "#111", lineHeight: 18 },
  personRole: { fontSize: 11, color: "#888", lineHeight: 16, flexGrow: 1 },
  viewLink: { fontSize: 11, fontWeight: "600", color: "#8B5CF6" },
  newsList: { gap: 10 },
  newsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    gap: 6,
  },
  newsTitle: { fontSize: 14, fontWeight: "600", color: "#111", lineHeight: 20 },
  newsSnippet: { fontSize: 12, color: "#777", lineHeight: 18 },
  readLink: { fontSize: 11, fontWeight: "600", color: "#8B5CF6", alignSelf: "flex-end" },
  errorWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  errorText: { fontSize: 14, color: "#999", textAlign: "center" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
```

- [ ] Verify in simulator: tap a university step → detail screen with instant quick match pill, loading spinner, then AI match + data sections populate.

- [ ] Commit:

```bash
git add app/university/[key].tsx
git commit -m "feat(university): add university detail screen with match %, admissions, cost, research"
```

---

## Task 8: Compare Screen

**Files:**
- Create: `app/university/compare.tsx`

- [ ] Create `app/university/compare.tsx`:

```typescript
import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchUniversityInsights } from "../../lib/universityInsights";
import { MOCK_PATH_DATA } from "../../lib/mockPathData";
import type { UniversityInsights } from "../../types/university";

type UniOption = {
  label: string;
  universityName: string;
  facultyName: string;
  pathLabel: string;
  passionScore: number | null;
  futureScore: number | null;
  worldScore: number | null;
  careerGoal: string;
};

function getAllUniversityOptions(): UniOption[] {
  const options: UniOption[] = [];
  for (const path of MOCK_PATH_DATA.paths) {
    for (const step of path.steps) {
      if (step.type === "university" && step.universityMeta) {
        options.push({
          label: `${step.universityMeta.universityName} · ${step.universityMeta.facultyName}`,
          universityName: step.universityMeta.universityName,
          facultyName: step.universityMeta.facultyName,
          pathLabel: path.label,
          passionScore: path.passionScore,
          futureScore: path.futureScore,
          worldScore: path.worldScore,
          careerGoal: path.careerGoal,
        });
      }
    }
  }
  return options;
}

type InsightsState = {
  data: UniversityInsights | null;
  loading: boolean;
  error: string | null;
};

const COMPARE_ROWS: Array<{
  label: string;
  icon: string;
  getValue: (i: UniversityInsights) => string;
  higherIsBetter?: boolean;
}> = [
  {
    label: "AI Match",
    icon: "🎯",
    getValue: (i) => (i.aiMatchScore != null ? `${i.aiMatchScore}%` : "—"),
    higherIsBetter: true,
  },
  { label: "อัตราการรับ", icon: "📋", getValue: (i) => i.acceptanceRate ?? "—" },
  { label: "GPAX ขั้นต่ำ", icon: "📊", getValue: (i) => i.gpaxCutoff ?? "—" },
  {
    label: "ค่าเล่าเรียน/ปี",
    icon: "💰",
    getValue: (i) =>
      i.tuitionPerYear ? `฿${i.tuitionPerYear.toLocaleString()}` : "—",
    higherIsBetter: false,
  },
  { label: "ระยะเวลา", icon: "📅", getValue: (i) => i.duration ?? "—" },
  { label: "อันดับ", icon: "🏆", getValue: (i) => i.ranking ?? "—" },
];

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const { keyA, facultyA, careerGoal } = useLocalSearchParams<{
    keyA?: string;
    facultyA?: string;
    careerGoal?: string;
  }>();

  const allOptions = getAllUniversityOptions();

  const preselectedA = keyA
    ? (allOptions.find(
        (o) =>
          o.universityName === decodeURIComponent(keyA) &&
          o.facultyName === (facultyA ?? ""),
      ) ?? null)
    : null;

  const [selectedA, setSelectedA] = useState<UniOption | null>(preselectedA);
  const [selectedB, setSelectedB] = useState<UniOption | null>(null);
  const [insightsA, setInsightsA] = useState<InsightsState>({
    data: null, loading: false, error: null,
  });
  const [insightsB, setInsightsB] = useState<InsightsState>({
    data: null, loading: false, error: null,
  });

  async function loadInsights(option: UniOption, setter: (s: InsightsState) => void) {
    setter({ data: null, loading: true, error: null });
    try {
      const data = await fetchUniversityInsights({
        universityName: option.universityName,
        facultyName: option.facultyName,
        careerGoal: option.careerGoal,
        passionScore: option.passionScore,
        futureScore: option.futureScore,
        worldScore: option.worldScore,
      });
      setter({ data, loading: false, error: null });
    } catch (e: any) {
      setter({ data: null, loading: false, error: e?.message ?? "โหลดไม่สำเร็จ" });
    }
  }

  useEffect(() => { if (selectedA) loadInsights(selectedA, setInsightsA); }, [selectedA]);
  useEffect(() => { if (selectedB) loadInsights(selectedB, setInsightsB); }, [selectedB]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#1E0A3C", "#4C1D95"]}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← กลับ</Text>
        </Pressable>
        <Text style={s.heroTitle}>เปรียบเทียบ</Text>
        <Text style={s.heroSub}>เลือก 2 มหาวิทยาลัยเพื่อเปรียบเทียบ</Text>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pickers */}
        <View style={s.pickersRow}>
          <UniPicker
            label="มหาวิทยาลัย A"
            selected={selectedA}
            options={allOptions.filter((o) => o !== selectedB)}
            onSelect={setSelectedA}
          />
          <UniPicker
            label="มหาวิทยาลัย B"
            selected={selectedB}
            options={allOptions.filter((o) => o !== selectedA)}
            onSelect={setSelectedB}
          />
        </View>

        {/* Table — only shows when both are selected */}
        {selectedA && selectedB ? (
          <View style={s.tableWrap}>
            {/* Header */}
            <View style={s.tableHeader}>
              <View style={s.labelCol} />
              <ColHeader uni={selectedA} />
              <ColHeader uni={selectedB} />
            </View>

            {/* Rows */}
            {COMPARE_ROWS.map((row, idx) => {
              const valA = insightsA.data ? row.getValue(insightsA.data) : null;
              const valB = insightsB.data ? row.getValue(insightsB.data) : null;
              const numA = valA ? parseFloat(valA.replace(/[^0-9.]/g, "")) : NaN;
              const numB = valB ? parseFloat(valB.replace(/[^0-9.]/g, "")) : NaN;
              const aWins =
                row.higherIsBetter !== undefined &&
                !isNaN(numA) &&
                !isNaN(numB) &&
                (row.higherIsBetter ? numA > numB : numA < numB);
              const bWins =
                row.higherIsBetter !== undefined &&
                !isNaN(numA) &&
                !isNaN(numB) &&
                (row.higherIsBetter ? numB > numA : numB < numA);

              return (
                <View key={row.label} style={[s.row, idx % 2 === 0 && s.rowAlt]}>
                  <View style={s.labelCol}>
                    <Text style={s.rowIcon}>{row.icon}</Text>
                    <Text style={s.rowLabel}>{row.label}</Text>
                  </View>
                  <View style={[s.dataCol, aWins && s.winCell]}>
                    {insightsA.loading ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <Text style={[s.dataVal, aWins && s.winVal]}>{valA ?? "—"}</Text>
                    )}
                  </View>
                  <View style={[s.dataCol, bWins && s.winCell]}>
                    {insightsB.loading ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <Text style={[s.dataVal, bWins && s.winVal]}>{valB ?? "—"}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyPrompt}>
            <Text style={s.emptyPromptText}>เลือกมหาวิทยาลัย 2 แห่งเพื่อดูการเปรียบเทียบ</Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function ColHeader({ uni }: { uni: UniOption }) {
  return (
    <View style={s.colHeader}>
      <Text style={s.colHeaderUni} numberOfLines={2}>{uni.universityName}</Text>
      <Text style={s.colHeaderFaculty} numberOfLines={1}>{uni.facultyName}</Text>
    </View>
  );
}

function UniPicker({
  label,
  selected,
  options,
  onSelect,
}: {
  label: string;
  selected: UniOption | null;
  options: UniOption[];
  onSelect: (o: UniOption) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.picker}>
      <Text style={s.pickerLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [s.pickerBtn, pressed && s.pressed]}
        onPress={() => setOpen(!open)}
      >
        <Text style={s.pickerBtnText} numberOfLines={2}>
          {selected ? selected.universityName : "เลือก..."}
        </Text>
        {selected ? (
          <Text style={s.pickerFaculty} numberOfLines={1}>{selected.facultyName}</Text>
        ) : null}
      </Pressable>
      {open ? (
        <View style={s.dropdown}>
          {options.map((o, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [s.dropdownOption, pressed && s.pressed]}
              onPress={() => { onSelect(o); setOpen(false); }}
            >
              <Text style={s.dropdownOptionText} numberOfLines={1}>{o.universityName}</Text>
              <Text style={s.dropdownOptionSub} numberOfLines={1}>
                {o.facultyName} · {o.pathLabel}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FA" },
  hero: { paddingBottom: 20, paddingHorizontal: 24 },
  backBtn: { marginBottom: 14, alignSelf: "flex-start" },
  backBtnText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 4 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  pickersRow: { flexDirection: "row", gap: 12, marginBottom: 24, zIndex: 10 },
  picker: { flex: 1, zIndex: 10 },
  pickerLabel: {
    fontSize: 11, fontWeight: "700", color: "#6B7280", marginBottom: 6, letterSpacing: 0.5,
  },
  pickerBtn: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.2)", minHeight: 72,
  },
  pickerBtnText: { fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 2 },
  pickerFaculty: { fontSize: 11, color: "#8B5CF6" },
  dropdown: {
    position: "absolute", top: "100%", left: 0, right: 0,
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
    borderColor: "#e5e7eb", zIndex: 100, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  dropdownOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  dropdownOptionText: { fontSize: 13, fontWeight: "600", color: "#111" },
  dropdownOptionSub: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  tableWrap: {
    backgroundColor: "#fff", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  tableHeader: {
    flexDirection: "row", backgroundColor: "#4C1D95", paddingVertical: 14, paddingHorizontal: 12,
  },
  labelCol: { flex: 1.2, flexDirection: "row", alignItems: "center", gap: 4 },
  colHeader: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  colHeaderUni: { fontSize: 12, fontWeight: "800", color: "#fff", textAlign: "center" },
  colHeaderFaculty: { fontSize: 10, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 2 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 12,
  },
  rowAlt: { backgroundColor: "#FAFAFA" },
  rowIcon: { fontSize: 16, marginRight: 4 },
  rowLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  dataCol: { flex: 1, alignItems: "center", padding: 4 },
  dataVal: { fontSize: 14, fontWeight: "700", color: "#111", textAlign: "center" },
  winCell: { backgroundColor: "rgba(191,255,0,0.12)", borderRadius: 8 },
  winVal: { color: "#3D7A00" },
  emptyPrompt: { alignItems: "center", paddingVertical: 60 },
  emptyPromptText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  pressed: { opacity: 0.85 },
});
```

- [ ] Verify: open compare from university detail — A is pre-selected, B picker shows remaining universities from user's paths, table populates with winner highlighting.

- [ ] Commit:

```bash
git add app/university/compare.tsx
git commit -m "feat(university): add university compare screen with side-by-side table and winner highlighting"
```

---

## Task 9: Seed Script (Separate Track)

**Files:**
- Create: `scripts/seed-universities.ts`

- [ ] Create `scripts/seed-universities.ts`:

```typescript
// Run: npx tsx scripts/seed-universities.ts
// Requires EXA_API_KEY + ANTHROPIC_API_KEY set as Supabase secrets,
// and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TO_SEED = [
  { universityName: "มหาวิทยาลัยศิลปากร", facultyName: "คณะมัณฑนศิลป์", careerGoal: "UX Designer" },
  { universityName: "จุฬาลงกรณ์มหาวิทยาลัย", facultyName: "คณะพาณิชยศาสตร์และการบัญชี", careerGoal: "Product Manager" },
  { universityName: "มหาวิทยาลัยเกษตรศาสตร์", facultyName: "คณะวิทยาศาสตร์", careerGoal: "Data Scientist" },
  // Expand this list before launch
];

async function seedOne(entry: typeof TO_SEED[0]) {
  console.log(`Seeding: ${entry.universityName} / ${entry.facultyName}...`);
  const { data, error } = await supabase.functions.invoke("university-insights", {
    body: { ...entry, passionScore: 75, futureScore: 70, worldScore: 80 },
  });
  if (error) { console.error(`  ✗ ${error.message}`); return; }
  console.log(`  ✓ AI match: ${data.aiMatchScore}%`);
  // Promote to seeded with 30-day TTL
  await supabase
    .from("university_insights_cache")
    .update({
      source: "seeded",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("university_name", entry.universityName)
    .eq("faculty_name", entry.facultyName)
    .eq("career_goal", entry.careerGoal);
}

async function main() {
  for (const entry of TO_SEED) {
    await seedOne(entry);
    await new Promise((r) => setTimeout(r, 1500)); // rate limit
  }
  console.log("All done.");
}

main();
```

- [ ] Run against local Supabase (functions must be running):

```bash
npx supabase functions serve university-insights &
npx tsx scripts/seed-universities.ts
```

Expected: each row logs `✓ AI match: XX%`. Check Studio → `university_insights_cache` table shows 3 rows with `source = 'seeded'`.

- [ ] Commit:

```bash
git add scripts/seed-universities.ts
git commit -m "feat(university): add seed script for bulk university cache population"
```

---

## Big Vision (Post-MVP Backlog)

Not in scope now. Track these as future issues:

| Feature | Notes |
|---|---|
| GPAX cutoff history chart | Per-year TCAS bar chart (2562–2568), requires TCAS scraping |
| Scholarship finder | Faculty-specific scholarships, auto-matched to user profile |
| Alumni career trajectories | "People who studied here became..." |
| Save comparison snapshot | Archive compare result to user's profile in Supabase |
| Share comparison | Deep link to compare screen for friends |
| Multi-university ranking | Sort all unis across user's 3 paths by match % on a leaderboard |
| Cost of living estimate | Add housing + food to tuition for total annual cost |
| Open house booking | Link to uni's official registration page |

---

## Data Flow Summary

```
Seed script (runs once before launch)
  └─ calls university-insights edge fn for known Thai uni/faculty combos
  └─ promotes cache rows to source='seeded', TTL=30 days

User taps university PathStepCard
  └─ navigates to app/university/[key].tsx
  └─ quick match % shown instantly (client-computed from path scores)
  └─ fetchUniversityInsights() called
       └─ session cache hit? → return immediately
       └─ miss → invoke university-insights edge function
            └─ DB cache hit? → X-Cache: HIT, return instantly
            └─ DB cache miss → Exa research + Claude Haiku synthesis
                 └─ write to university_insights_cache
                 └─ return data
  └─ AI match pill + all sections populate

User taps "เปรียบเทียบ"
  └─ navigates to app/university/compare.tsx (A pre-selected)
  └─ picks B from dropdown (all unis across their 3 paths)
  └─ both sides call fetchUniversityInsights (session cache likely warm)
  └─ side-by-side table renders with winner highlighting
```
