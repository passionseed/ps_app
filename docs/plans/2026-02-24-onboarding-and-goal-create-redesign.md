# Onboarding Chat + Goal Creation Redesign

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

Two linked changes:
1. **Chat-based onboarding** that builds a user profile (direction, ambitions, values, blockers, availability) — stored and used to grade goal Relevance.
2. **Simplified goal creation** — single text input with AI extracting frequency/duration; no steppers. SMART scoring improved to use proof type for M and user profile for R.

---

## Part 1: Onboarding Chat

### Routing

- After auth, `RootNavigator` checks `user_profiles.onboarding_done`.
- If `false` (or profile row missing) → route to `/onboarding`.
- If `true` → route to `/(tabs)/goals` as today.
- New screen registered in `app/_layout.tsx` as `<Stack.Screen name="onboarding" />`.

### Screen: `app/onboarding.tsx`

**5 fixed topics in sequence:**

| Step | Prompt | Extracts |
|------|--------|----------|
| 1 | "What areas of life do you most want to improve right now?" | life areas |
| 2 | "What does success look like for you in the next 6–12 months?" | ambitions / direction |
| 3 | "What matters most to you — your core values?" | values |
| 4 | "What's getting in your way right now?" | blockers |
| 5 | "How much time can you realistically commit to new habits per week?" | weekly availability |

**Per-topic flow:**
1. App shows topic prompt as a chat bubble.
2. User types free-form answer and taps Send.
3. One Gemini call (`onboarding-followup` edge function) generates a warm 1-sentence follow-up question based on the answer.
4. User answers follow-up, taps "Next →" to advance to the next topic.
5. Progress shown as 5 dots at the top.

**After step 5:**
- Single Gemini call (`onboarding-extract` edge function) receives all 10 messages (5 answers + 5 follow-up answers) and returns structured JSON:
```json
{
  "lifeAreas": ["health", "career", "learning"],
  "direction": "string",
  "values": "string",
  "blockers": "string",
  "weeklyHours": 5
}
```

### Output / Edit screen

Summary card displayed after extraction:

```
Your direction
──────────────────────────
🎯 Focus areas    Health · Career · Learning   [tap to edit]
✨ Ambitions      [editable text]
💡 Values         [editable text]
⚡ Blockers       [editable text]
⏱ Weekly time    ~5 hrs / week                [tap to edit]
```

- Tapping any row opens inline text edit within the card (no new screen).
- "Looks good →" button saves to Supabase `user_profiles` and routes to `/(tabs)/goals`.

### Supabase: `user_profiles` table

Columns needed:
- `user_id` (FK to auth.users)
- `onboarding_done` boolean
- `life_areas` text[]
- `direction` text
- `values` text
- `blockers` text
- `weekly_hours` integer

### Edge functions

**`onboarding-followup`**
- Input: `{ topic: string, answer: string }`
- Output: `{ followUp: string }` — one warm, relevant follow-up question
- Model: gemini-2.5-flash-lite

**`onboarding-extract`**
- Input: `{ messages: Array<{ topic: string, answer: string, followUpAnswer: string }> }`
- Output: `{ lifeAreas, direction, values, blockers, weeklyHours }`
- Model: gemini-2.5-flash-lite

### AI calls total
5 (follow-ups) + 1 (extraction) = **6 calls per onboarding**

---

## Part 2: Simplified Goal Creation

### What's removed
- Frequency stepper (count + day/week/month)
- Duration stepper (weeks/months or end date)
- Summary box

### New `goal-parse` edge function
- Input: `{ goalText: string }`
- Output: `{ frequencyCount: number | null, frequencyUnit: string | null, durationValue: string | null }`
- Fires in parallel with `smart-grade` on blur.
- If frequency found, shows confirmation chip below the input:
  ```
  📅  3× per week  ·  interpreted from your goal   ✕
  ```
- Chip is dismissable. If dismissed or nothing extracted, T scores low.

### Revised SMART scoring (`smart-grade` edge function)

The edge function now receives additional context:

**Input:**
```json
{
  "goalText": string,
  "proofTypes": string[],        // e.g. ["photo", "video"]
  "proofDescription": string,    // optional
  "userProfile": {               // from stored user_profiles, null if no onboarding
    "lifeAreas": string[],
    "direction": string,
    "values": string
  },
  "parsedFrequency": string | null  // e.g. "3x per week", from goal-parse result
}
```

**Output:**
```json
{
  "score": number,
  "scores": {
    "specific": number,
    "measurable": number,   // 0 if no proof selected yet
    "achievable": number,
    "relevant": number,     // 0 if no user profile
    "time_bound": number    // 0 if no frequency extracted
  },
  "tips": {
    "specific": string | null,
    "measurable": string | null,  // "Select a proof type to grade this" if no proof
    "achievable": string | null,
    "relevant": string | null,    // "Complete onboarding to grade this" if no profile
    "time_bound": string | null   // "Add a frequency, e.g. '3× a week'" if not extracted
  }
}
```

### Grading logic per dimension

| Dim | Feeds from | Low score tip |
|-----|-----------|--------------|
| S | goal text | "Be more specific about what exactly you'll do" |
| M | proof types + description | "Select a proof type to grade this" |
| A | goal text + extracted frequency | "Is this realistic given your schedule?" |
| R | goal text vs. user profile | "Complete onboarding to grade this" |
| T | parsedFrequency | "Add a frequency, e.g. '3× a week'" |

### Updated `SmartGradeResult` type (`lib/ai.ts`)

Add `time_bound` to `scores`:
```ts
scores: {
  specific: number;
  measurable: number;
  achievable: number;
  relevant: number;
  time_bound: number;
}
```

### Updated goal creation flow

1. **Goal text** — single input, natural language with frequency embedded.
   - On blur: fires `goal-parse` + `smart-grade` in parallel.
   - Shows parse chip if frequency extracted.
   - Shows SMART grade card (S/M/A/R/T bars) — M/R/T may show low with tips.

2. **Proof type + description** — appears after goal text entered (same as today).
   - Selecting proof type re-fires `smart-grade` with proof context → M score updates.

3. **Reality check** — uses `parsedFrequency` result (not steppers).
   - If no frequency extracted, Reality Check button still shows but passes null frequency.

4. **Invite + Start** — unchanged.

---

## Files to create / modify

| File | Action |
|------|--------|
| `app/onboarding.tsx` | Create — onboarding chat screen |
| `app/_layout.tsx` | Modify — add onboarding route + routing logic |
| `app/goal-create.tsx` | Modify — remove steppers, add parse chip, update SMART display to include T |
| `lib/ai.ts` | Modify — add `onboardingFollowUp`, `onboardingExtract`, `parseGoal` functions; update `SmartGradeResult` type |
| `supabase/functions/smart-grade/index.ts` | Modify — accept proof + profile + frequency context, grade all 5 dims |
| `supabase/functions/goal-parse/index.ts` | Create — extract frequency/duration from goal text |
| `supabase/functions/onboarding-followup/index.ts` | Create — generate follow-up question |
| `supabase/functions/onboarding-extract/index.ts` | Create — extract structured profile from conversation |
| `lib/auth.tsx` | Modify — expose user profile alongside session |
| Supabase migration | Create — `user_profiles` table |
