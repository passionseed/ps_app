# Mobile Super Planner Implementation Plan

**Status:** Ready to implement  
**Estimated Time:** 14-19 hours (2-3 days)  
**Created:** 2026-03-23

## Overview

Build the complete Super Planner flow for the mobile app to match the web app's PMF discovery goals. This includes event logging, TCAS program browser, save programs, and admission plan creation.

## Prerequisites

- [ ] Web app `user_events` table migration applied (shared database)
- [ ] Access to `tcas_programs` table (verify schema)
- [ ] Existing Supabase client working

---

## Phase 1: Event Logging Infrastructure (2-3 hours)

### 1.1 Create Event Types

**File:** `types/events.ts`

```typescript
// Event type constants
export const EVENT_TYPES = {
  // Mobile-specific
  MOBILE_APP_OPENED: 'mobile_app_opened',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  INTEREST_SELECTED: 'interest_selected',
  CAREER_SELECTED: 'career_selected',
  
  // Portfolio
  PORTFOLIO_ITEM_ADDED: 'portfolio_item_added',
  PORTFOLIO_ITEM_DELETED: 'portfolio_item_deleted',
  
  // Fit scores
  FIT_SCORE_VIEWED: 'fit_score_viewed',
  
  // Programs
  PROGRAM_VIEWED: 'program_viewed',
  PROGRAM_SAVED: 'program_saved',
  PROGRAM_UNSAVED: 'program_unsaved',
  
  // Plans
  ADMISSION_PLAN_CREATED: 'admission_plan_created',
  
  // Career search
  CAREER_SEARCHED: 'career_searched',
  JOURNEY_SIMULATION_CREATED: 'journey_simulation_created',
} as const;
```

### 1.2 Create Event Logger

**File:** `lib/eventLogger.ts`

- Session management with 24-hour expiry (localStorage)
- `logEvent(eventType, eventData)` function
- Fail-silent error handling
- Uses existing `lib/supabase.ts` client

### 1.3 Integration Points

| File | Event to Log |
|------|--------------|
| `app/_layout.tsx` | `mobile_app_opened` |
| `app/onboarding/_layout.tsx` | `onboarding_started` |
| `app/onboarding/StepInterests.tsx` | `interest_selected` |
| `app/onboarding/StepCareers.tsx` | `career_selected` |
| `app/onboarding/StepProfile.tsx` | `onboarding_step_completed` |
| `app/portfolio/add.tsx` | `portfolio_item_added` |
| `app/portfolio/index.tsx` | `portfolio_item_deleted` |
| `app/fit/index.tsx` | `fit_score_viewed` |
| `app/build-path.tsx` | `career_searched`, `journey_simulation_created` |

---

## Phase 2: TCAS Program Browser (3-4 hours)

### 2.1 Create Program Search Utility

**File:** `lib/tcas.ts`

Functions:
- `searchPrograms(query, filters)` — Search by name, faculty, university
- `getProgramById(programId)` — Get program details
- `getEligiblePrograms(gpax)` — Filter by eligibility

### 2.2 Create Program List Screen

**File:** `app/programs/index.tsx`

Features:
- Search input with debounce
- Filter by round (1, 2, 3, 4, 5)
- Filter by eligibility (based on user's GPAX)
- Show fit score if portfolio exists
- Link to program detail

### 2.3 Create Program Detail Screen

**File:** `app/programs/[programId].tsx`

Features:
- Program name, faculty, university
- Admission requirements
- Fit score breakdown (if portfolio exists)
- Save/unsave button
- Link to university page

---

## Phase 3: Save Programs (2-3 hours)

### 3.1 Create Migration

**File:** `supabase/migrations/*_create_saved_programs.sql`

```sql
CREATE TABLE saved_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id TEXT REFERENCES tcas_programs(program_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);
CREATE INDEX idx_saved_programs_user ON saved_programs(user_id);
```

### 3.2 Create Saved Programs Utility

**File:** `lib/savedPrograms.ts`

Functions:
- `saveProgram(userId, programId)`
- `unsaveProgram(userId, programId)`
- `getSavedPrograms(userId)`
- `isProgramSaved(userId, programId)`

### 3.3 Create Saved Programs Screen

**File:** `app/saved/index.tsx`

Features:
- List of saved programs
- Fit scores
- Remove button
- Empty state with CTA to browse programs

---

## Phase 4: Admission Plan Creation (3-4 hours)

### 4.1 Create Migration

**File:** `supabase/migrations/*_create_admission_plans.sql`

```sql
CREATE TABLE admission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Plan',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admission_plan_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES admission_plans(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  program_id TEXT REFERENCES tcas_programs(program_id) ON DELETE CASCADE,
  priority INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, round_number, program_id)
);
CREATE INDEX idx_admission_plan_rounds_plan ON admission_plan_rounds(plan_id);
```

### 4.2 Create Admission Plans Utility

**File:** `lib/admissionPlans.ts`

Functions:
- `createPlan(userId, name)`
- `getPlans(userId)`
- `getPlanById(planId)`
- `addProgramToRound(planId, roundNumber, programId, priority)`
- `removeProgramFromRound(planId, roundNumber, programId)`
- `deletePlan(planId)`

### 4.3 Create Plans List Screen

**File:** `app/plans/index.tsx`

Features:
- List of admission plans
- Create new plan button
- Max 3 plans per user

### 4.4 Create Plan Detail Screen

**File:** `app/plans/[planId].tsx`

Features:
- View/edit admission plan
- Add programs to each round
- Reorder programs within a round
- Delete plan

### 4.5 Create Plan Creation Screen

**File:** `app/plans/create.tsx`

Features:
- Name the plan
- Select programs for each round (from saved programs or search)
- Save plan

---

## Phase 5: Integration (1-2 hours)

### 5.1 Update Discover Tab

**File:** `app/(tabs)/discover.tsx`

Add sections:
- "Programs" → `/programs`
- "Saved Programs" → `/saved`
- "My Plans" → `/plans`

### 5.2 Update My Paths Tab

**File:** `app/(tabs)/my-paths.tsx`

Add section:
- "Admission Plans" → `/plans`

---

## Testing Checklist

### Event Logging
- [ ] App opens → `mobile_app_opened` logged
- [ ] Onboarding starts → `onboarding_started` logged
- [ ] Interest selected → `interest_selected` logged
- [ ] Career selected → `career_selected` logged
- [ ] Portfolio item added → `portfolio_item_added` logged
- [ ] Fit scores viewed → `fit_score_viewed` logged

### Program Browser
- [ ] Search returns results
- [ ] Filter by round works
- [ ] Filter by eligibility works
- [ ] Program detail shows correct info
- [ ] Fit score displays if portfolio exists

### Save Programs
- [ ] Save button works
- [ ] Unsave button works
- [ ] Saved programs list shows all saved
- [ ] Remove from saved works

### Admission Plans
- [ ] Create plan works
- [ ] Add programs to rounds works
- [ ] Reorder programs works
- [ ] Delete plan works
- [ ] Max 3 plans enforced

---

## Files to Create

```
lib/
  eventLogger.ts
  tcas.ts
  savedPrograms.ts
  admissionPlans.ts

types/
  events.ts

app/
  programs/
    index.tsx
    [programId].tsx
  saved/
    index.tsx
  plans/
    index.tsx
    [planId].tsx
    create.tsx

supabase/migrations/
  *_create_saved_programs.sql
  *_create_admission_plans.sql
```

## Files to Modify

```
app/_layout.tsx
app/onboarding/_layout.tsx
app/onboarding/StepInterests.tsx
app/onboarding/StepCareers.tsx
app/onboarding/StepProfile.tsx
app/portfolio/add.tsx
app/portfolio/index.tsx
app/fit/index.tsx
app/build-path.tsx
app/(tabs)/discover.tsx
app/(tabs)/my-paths.tsx
```

---

## Dependencies

- `user_events` table from web app migration (`20260323200000_create_user_events.sql`)
- `tcas_programs` table (verify schema exists)
- `tcas_universities` table
- `tcas_admission_rounds` table
- Existing Supabase client (`lib/supabase.ts`)
- Existing design system components

---

## Notes

- Both apps share the same Supabase database
- Session ID persists for 24 hours
- Events are fail-silent (don't block user flow)
- Fit scores require portfolio data to exist
- Max 3 admission plans per user (configurable)