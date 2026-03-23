# Planning Feature — Phase 1: Real Score Engine

**Date**: 2026-03-22
**Status**: Ready to implement

---

## Goal

Replace mock ikigai scores with **real LLM-powered passion extraction** from Seeds reflection data.

---

## Why This Matters

Currently:
- Ikigai Compass shows **randomized mock scores**
- Journey scores don't update based on actual student behavior
- Direction Finder can't ship because it needs real data

After Phase 1:
- Ikigai scores derived from **actual reflection text** students write
- Journey scores update automatically as students complete Seeds
- Foundation for Direction Finder recommendations

---

## What Gets Built

### 1. Score Engine Edge Function

**Location**: `supabase/functions/score-engine/index.ts`

**Inputs**:
- Reflection `open_response` text (what student wrote about their experience)
- Reflection ratings (energy, confusion, interest 1-10)
- Activity completion data

**Process**:
1. LLM analyzes reflection text for passion signals
2. Extracts: what energized them, what drained them, what surprised them
3. Maps to ikigai dimensions:
   - **Passion** — What they love (energy + interest signals)
   - **Mission** — What world needs (from seed category)
   - **Vocation** — What they're good at (low confusion + high completion)
   - **Profession** — What pays (from career path data)

**Outputs**:
- Passion score (1-10)
- Mission score (1-10)
- Vocation score (1-10)
- Profession score (1-10)
- Overall ikigai score (weighted average)

### 2. Database Schema

**New table**: `score_events`
```sql
CREATE TABLE score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES student_journeys(id),
  reflection_id UUID REFERENCES path_reflections(id),
  passion_score DECIMAL(3,2),
  mission_score DECIMAL(3,2),
  vocation_score DECIMAL(3,2),
  profession_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  signal_data JSONB, -- LLM extraction details
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Client Integration

**Updated**: `app/activity/[activityId].tsx`
- After reflection submission, call score engine
- Update journey scores in real-time

**Updated**: `app/(tabs)/profile.tsx`
- Show real ikigai scores instead of mock data
- Display score timeline

---

## Acceptance Criteria

- [ ] Reflection `open_response` sent to score engine on submit
- [ ] LLM extracts passion signal from text (Thai + English support)
- [ ] Journey scores update within 5s of reflection submission
- [ ] Ikigai Compass shows real scores (not mock)
- [ ] Score timeline visible per journey
- [ ] Scores persist in `score_events` table

---

## Technical Details

### LLM Prompt Design

```
You are analyzing a student's career exploration reflection.

Reflection text: "{open_response}"
Energy level: {energy}/10
Confusion level: {confusion}/10
Interest level: {interest}/10
Career path: {seed_title}

Extract passion signals:
1. What energized them? (quote + score 1-10)
2. What drained them? (quote + score 1-10)
3. What surprised them? (quote)
4. Overall passion for this path: (1-10)

Return JSON:
{
  "passion_signals": [...],
  "energy_quotes": [...],
  "drain_quotes": [...],
  "surprise_quote": "...",
  "passion_score": 8.5
}
```

### Score Calculation

```typescript
// Weighted by data quality
const weights = {
  passion: 0.35,    // Most important — what they love
  mission: 0.25,    // Purpose alignment
  vocation: 0.25,   // Skill fit
  profession: 0.15  // Practical viability
};

const overall = 
  passion * weights.passion +
  mission * weights.mission +
  vocation * weights.vocation +
  profession * weights.profession;
```

---

## Files to Create/Modify

### Create
- `supabase/functions/score-engine/index.ts`
- `supabase/migrations/20260322100000_create_score_events.sql`
- `lib/scoreEngine.ts` — Client helper functions

### Modify
- `app/reflection/[enrollmentId].tsx` — Call score engine after submit
- `app/(tabs)/profile.tsx` — Show real scores
- `app/ikigai/` — Create drill-down screens (optional)

---

## Testing Plan

### Manual Test Flow
1. Complete a Seed Day 1 reflection
2. Write detailed open_response
3. Submit reflection
4. Check `score_events` table for new record
5. Navigate to Profile → Ikigai Compass
6. Verify scores updated (not mock)

### Database Checks
```sql
-- Check score events
SELECT journey_id, passion_score, mission_score, overall_score, created_at
FROM score_events
ORDER BY created_at DESC
LIMIT 10;

-- Check score timeline for a journey
SELECT passion_score, mission_score, vocation_score, profession_score, overall_score, created_at
FROM score_events
WHERE journey_id = '...'
ORDER BY created_at ASC;
```

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Ikigai scores | Mock/random | Real LLM extraction |
| Score updates | Never | After each reflection |
| Thai language support | N/A | ✅ Supported |
| Data source | Hardcoded | Student reflection text |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM API slow | Poor UX | Add loading state, timeout fallback |
| Thai text not parsed well | Wrong scores | Test with Thai prompts, adjust prompt |
| Cost per call | High at scale | Cache results, batch processing |
| No journey exists | Can't save score | Create default journey on first reflection |

---

## Next Steps (After Phase 1)

1. **Phase 2**: AI Journey Generation — Auto-build 3 journeys from career goal
2. **Phase 3**: Direction Finder — Ship recommendation engine
3. **Phase 4**: TCAS Round 2+3 Scoring — Extend beyond portfolio round

---

## Related Files

- `docs/planning-feature.md` — Full Planning roadmap
- `types/pathlab.ts` — Reflection types
- `lib/pathlab.ts` — Reflection submission API
- `app/(tabs)/profile.tsx` — Current mock ikigai display
