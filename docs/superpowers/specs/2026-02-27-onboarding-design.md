# Onboarding Feature Design
**Date:** 2026-02-27
**Project:** Passion Seed Mobile App

---

## Overview

A first-time onboarding flow shown immediately after a user's first login. It is a hard gate — the app's main tabs are inaccessible until onboarding completes. The flow collects profile data, learns about the user via a Gemini-powered chat, generates personalized interest categories, captures career goals, and sets mobile preferences.

---

## Goals

- Collect missing profile data (education level, school, language, date of birth)
- Use Gemini 2.5 Flash to learn the user's personality and interests through conversational chat
- Generate personalized interest categories with statement cards, store selections in DB
- Capture career goals (AI-suggested + freetext)
- Set mobile settings (push notifications, reminder time, theme)
- Resume gracefully if the user closes the app mid-onboarding

---

## Data Model

### Migrations (in pseed/supabase/migrations)

#### Alter `profiles`
```sql
ALTER TABLE public.profiles
  ADD COLUMN school_name        text null,
  ADD COLUMN is_onboarded       boolean not null default false,
  ADD COLUMN onboarded_at       timestamptz null,
  ADD COLUMN mobile_settings    jsonb null;
```

`mobile_settings` shape:
```json
{
  "push_enabled": true,
  "reminder_time": "09:00",
  "theme": "light"
}
```

#### New table: `user_interests`
```sql
CREATE TABLE public.user_interests (
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
```

#### New table: `career_goals`
```sql
CREATE TABLE public.career_goals (
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
```

#### New table: `onboarding_state`
```sql
CREATE TABLE public.onboarding_state (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  current_step    text not null default 'profile'
                    check (current_step in ('profile','chat','interests','careers','settings')),
  chat_history    jsonb not null default '[]',
  collected_data  jsonb not null default '{}',
  updated_at      timestamptz not null default now()
);

ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own onboarding state"
  ON public.onboarding_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Onboarding Flow

### Gate
`app/_layout.tsx` fetches the user's profile after auth resolves. If `!profile.is_onboarded`, routes to `/onboarding` instead of `/(tabs)/discover`. The tab screens are unreachable until `is_onboarded = true`.

### Steps

```
Step 1 — Profile (no AI, card selectors + inputs)
  - Education level: cards → high_school / university / unaffiliated
  - School name: text input (optional, skippable)
  - Language: cards → TH / EN
  - Date of birth: date picker (optional, skippable)
  → Saves to profiles table, upserts onboarding_state.current_step = 'chat'

Step 2 — Chat (Gemini 2.5 Flash via Edge Function)
  - AI greets user by first name
  - Asks 2–4 open-ended conversational questions about personality, passions, and what they enjoy doing
  - AI decides when it has enough context and signals transition via action field
  → Saves chat_history to onboarding_state continuously
  → Transitions to Step 3 when action = "transition_to_interests"

Step 3 — Interests (AI-generated, card selection)
  - Edge Function returns 3–4 interest categories, each with 5–7 statement cards
  - Each category has a heading (e.g. "Political System Maker")
  - User selects up to 2 statements per category (optional per category)
  → Saves to user_interests table, upserts onboarding_state.current_step = 'careers'

Step 4 — Careers (AI-suggested + freetext)
  - Edge Function suggests 6–8 career names based on selected interest statements
  - User taps to select any from suggestions
  - User can also type custom career names
  - No minimum selection required
  → Saves to career_goals table, upserts onboarding_state.current_step = 'settings'

Step 5 — Settings (no AI)
  - Push notifications toggle (default: on)
  - Daily reminder time picker (default: 09:00)
  - Theme selector: light / dark (default: light)
  - "Let's go" button
  → Saves mobile_settings to profiles
  → Sets profiles.is_onboarded = true, profiles.onboarded_at = now()
  → Deletes onboarding_state row (no longer needed)
  → Navigates to /(tabs)/discover
```

### Resumability
On every step completion and every chat message, `onboarding_state` is upserted. When `_layout.tsx` detects `!profile.is_onboarded`, it also reads `onboarding_state` to restore `current_step` and `chat_history`, resuming exactly where the user left off.

---

## Architecture

### New Files (mobile app)

```
app/onboarding/
  index.tsx           — step controller, reads/writes onboarding_state
  StepProfile.tsx     — card selectors + text inputs for profile fields
  StepChat.tsx        — chat bubble UI, calls Edge Function
  StepInterests.tsx   — renders AI-generated category + statement cards
  StepCareers.tsx     — career chip selection + freetext input
  StepSettings.tsx    — notifications, reminder time, theme

lib/onboarding.ts     — DB helpers:
                          getOnboardingState()
                          upsertOnboardingState()
                          saveProfileStep()
                          saveInterests()
                          saveCareers()
                          completeOnboarding()
```

### Supabase Edge Function: `onboarding-chat`
Location: `pseed/supabase/functions/onboarding-chat/index.ts`

**Request:**
```ts
{
  chat_history: { role: 'user' | 'model', parts: [{ text: string }] }[],
  user_context: {
    name: string,
    education_level: string,
    selected_interests?: string[]   // sent when requesting career suggestions
  },
  mode: 'chat' | 'generate_interests' | 'suggest_careers'
}
```

**Response:**
```ts
{
  message: string,
  action: null | 'transition_to_interests' | 'show_interest_categories' | 'show_career_suggestions',
  action_data?: {
    categories?: { name: string, statements: string[] }[],
    careers?: string[]
  }
}
```

**Behavior by mode:**
- `chat` — normal conversation, AI decides when to signal `transition_to_interests`
- `generate_interests` — AI generates 3–4 categories with 5–7 statements each, returns `show_interest_categories`
- `suggest_careers` — AI generates career list based on selected interest statements, returns `show_career_suggestions`

The Gemini API key is stored as a Supabase secret (`GEMINI_API_KEY`), never in the mobile app.

---

## Types (mobile app)

```ts
// types/onboarding.ts
export type OnboardingStep = 'profile' | 'chat' | 'interests' | 'careers' | 'settings'

export type ChatMessage = {
  role: 'user' | 'model'
  text: string
}

export type InterestCategory = {
  id?: string           // uuid once saved to DB
  category_name: string
  statements: string[]
  selected: string[]
}

export type CareerGoal = {
  career_name: string
  source: 'ai_suggested' | 'user_typed'
}

export type MobileSettings = {
  push_enabled: boolean
  reminder_time: string   // "HH:MM"
  theme: 'light' | 'dark'
}
```

---

## UI Notes

- Onboarding screen uses the same dark theme as the landing page (`#0a0514` background, glass card)
- Progress indicator at top (5 dots, one per step)
- Chat bubbles: AI on left (glass style), user on right (accent `#BFFF00`)
- Card selectors: same pill/chip style as existing seed cards, accent highlight when selected
- All text uses `Orbit_400Regular`
- Step transitions animate with a horizontal slide

---

## Out of Scope

- Editing onboarding answers after completion (profile screen handles updates later)
- Multi-language AI responses (Thai support in Gemini prompts is a future concern)
- Skipping onboarding entirely
