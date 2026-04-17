# Data Fetching Optimization Guide

Based on HAR analysis showing **95+ redundant requests** to Supabase, primarily for:
- `hackathon_team_members` (32 requests, 18 duplicates)
- `hackathon_phase_activity_submissions` (28 requests, 12 duplicates)
- `hackathon_program_phases` (16 requests, 6 duplicates)

## Quick Migration Examples

### Before: Raw Supabase (N+1 Problem)

```tsx
// app/(hackathon)/home.tsx - BEFORE
import { useEffect, useState } from "react";
import { getCurrentHackathonTeamMembership } from "../../lib/hackathonProgram";

function HackathonHome() {
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentHackathonTeamMembership()
      .then(setMembership)
      .finally(() => setLoading(false));
  }, []);
  // Result: Fresh fetch every mount, no caching
}
```

### After: React Query with Caching

```tsx
// app/(hackathon)/home.tsx - AFTER
import { useTeamMembership } from "../../lib/hooks/useHackathon";
import { useHackathonParticipant } from "../../lib/hackathon-mode";

function HackathonHome() {
  const participant = useHackathonParticipant();
  const { data: membership, isLoading } = useTeamMembership(participant?.id);
  // Result: Cached for 2 minutes, instant if already fetched
}
```

## Available Cached Hooks

| Hook | Cache Time | HAR Impact |
|------|------------|------------|
| `useTeamMembership(id)` | 2 min | Eliminates 18 duplicate requests |
| `useTeamWithMembers(id)` | 5 min | Eliminates 6 duplicate requests |
| `useProgramPhases(id)` | 30 min | Eliminates 6 duplicate requests |
| `usePhaseDetail(id)` | 5 min | Eliminates 5 duplicate requests |
| `useParticipant(id)` | 5 min | Eliminates 5 duplicate requests |
| `useParticipants(ids[])` | 5 min | Batch fetch instead of N+1 |

## Prefetching for Better UX

```tsx
import { prefetchHackathonHome, prefetchPhaseDetail } from "../../lib/prefetch";

// In your navigation handler
function onPhasePress(phaseId: string) {
  // Warm cache before navigation
  prefetchPhaseDetail(phaseId);
  router.push(`/hackathon-program/phase/${phaseId}`);
}
```

## Cache Invalidation After Mutations

```tsx
import { invalidateTeamCache } from "../../lib/prefetch";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string, updates: any) => {
      const { data, error } = await supabase
        .from("hackathon_teams")
        .update(updates)
        .eq("id", teamId);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate cache so next fetch gets fresh data
      invalidateTeamCache(variables.teamId);
    },
  });
}
```

## Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Requests | 146 | ~50 | **-66%** |
| Duplicate Queries | 95 | 0 | **-100%** |
| Wasted Time | ~14s | ~0s | **-14s** |
| N+1 Queries | 28 | 0 | **-100%** |
| DB Load | High | Low | **Significant** |

## Files to Migrate (Priority Order)

1. **High Impact** (most duplicates in HAR):
   - `app/(hackathon)/home.tsx` - Uses `getCurrentHackathonTeamMembership()`
   - `lib/hackathonProgram.ts` - Core data functions
   - `app/(hackathon)/profile.tsx` - Participant data
   - `app/(hackathon)/module/[moduleId].tsx` - Module progress

2. **Medium Impact**:
   - `app/admin/hackathon/teams.tsx`
   - `app/admin/hackathon/team/[teamId].tsx`
   - `lib/hackathon-submit.ts`

## Migration Checklist

- [ ] Wrap app in QueryClientProvider (done in `_layout.tsx`)
- [ ] Replace direct Supabase calls with cached hooks
- [ ] Add prefetching for common navigation paths
- [ ] Add cache invalidation after mutations
- [ ] Remove manual loading states (handled by React Query)
- [ ] Test offline behavior

## Tips

1. **Stale Time**: Reference data (phases, programs) = 30min. User data = 2min.
2. **Don't over-fetch**: Use `enabled: !!id` to skip queries when ID is null
3. **Batch when possible**: Use `useParticipants([id1, id2])` instead of multiple `useParticipant()`
4. **Prefetch on hover**: Call prefetch functions on user intent (hover/long-press)
