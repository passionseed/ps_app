# Linear Gap Analysis — Passion Seed Mobile

**Date:** 2026-03-27  
**Updated:** 2026-03-28 04:37 (cron job — verified Linear state, backlog unchanged, no gaps found)  
**Analysis:** Dream State vs Current Tickets vs Implemented

---

## Current Linear State (Verified 2026-03-28 03:30)

**Team:** Passion Seed (key: PS)  
**Team ID:** ace4cb8d-f6ff-435f-addb-7c72fe45dd48  
**Total Open Issues:** 17 (all in Backlog)  
**Big Team:** 0 open issues (all completed/migrated)

### Active Backlog Tickets (by priority)

**P1 — Foundation (8 tickets):**
| ID | Title | Dream State Coverage |
|----|-------|---------------------|
| PS-1 | Implement real Ikigai calculation from reflection data | #3 |
| PS-2 | Add profile affinity scoring to seed ranking | #1 |
| PS-3 | Create seed content localization system (TH/EN) | #6 |
| PS-4 | Seed queue personalization ranking algorithm | #1 |
| PS-11 | Database migrations for Phase 1 | Foundation |
| PS-12 | Create user_profile_signals table for tracking affinity data | #1 |
| PS-13 | Build career-insights edge function for ikigai calculation | #3 |
| PS-14 | Connect profile.tsx to real ikigai edge function | #3 |

**P2 — Personalization (7 tickets):**
| ID | Title | Dream State Coverage |
|----|-------|---------------------|
| PS-5 | Build exploration gap detection system | #1 |
| PS-6 | Build reflection trends dashboard | #4 |
| PS-7 | Add social proof counters to seed cards | #7 |
| PS-8 | Build university roadmap matching engine | #4 |
| PS-15 | Implement seed ranking algorithm (affinity + exploration gaps) | #1 |
| PS-16 | Update discover.tsx to use ranked seed endpoint | #1 |
| PS-17 | Add exploration gap tracking to profile signals | #1 |

**P3 — Expert/Social Layer (2 tickets):**
| ID | Title | Dream State Coverage |
|----|-------|---------------------|
| PS-9 | AI-assisted PathLab seed generator | #2 |
| PS-10 | Expert conversation layer (chat with expert avatar) | #5 |

---

## 12-Month Dream State Coverage

| # | Dream State Item | Canonical Ticket(s) | Status |
|---|------------------|---------------------|--------|
| 1 | Personalized seed queue (profile affinity + exploration gaps) | PS-2, PS-4, PS-12, PS-15, PS-16, PS-17 | ✓ Covered |
| 2 | AI-assisted PathLab generation (expert interview → seed) | PS-9 | ✓ Covered |
| 3 | Real ikigai from reflection data | PS-1, PS-13, PS-14 | ✓ Covered |
| 4 | Reflection trends → Direction Finder | PS-6, PS-8 | ✓ Covered |
| 5 | Expert conversation layer | PS-10 | ✓ Covered |
| 6 | Thai/English localization | PS-3 | ✓ Covered |
| 7 | Social proof (cohort comparison) | PS-7 | ✓ Covered |

**Verdict:** All 7 dream state items have tickets. No new tickets needed.

---

## Current Implementation Status (from codebase audit)

### ✅ Implemented
- **Mobile app initialized** — Expo RN 0.83.2, React 19, pnpm (BIG-13 done)
- **Onboarding flow** — Profile, interests, career goals collection (BIG-31 done)
- **Seed/path enrollment** — Browse, enroll, track progress (BIG-14 partial)
- **Reflection capture UI** — Energy/confusion/interest + open response (BIG-29 done)
- **Profile screen** — Mock ikigai display (UI ready, needs real data)

### ❌ Not Implemented (Foundation Gaps)
1. **Profile signals schema** — BIG-15 (P1) — Need DB schema for storing computed profile signals
2. **Seed ranking algorithm** — BIG-16 (P1) — No ranking logic, seeds shown unsorted
3. **Ikigai calculation engine** — BIG-18/BIG-23 (P1/P2) — Profile screen shows mock data
4. **Reflection aggregation** — BIG-24 (P1) — No pipeline to aggregate reflection trends
5. **Direction Finder integration** — BIG-22 (P2) — Reflection data not feeding recommendations

### ❌ Not Implemented (Advanced Layers)
6. **Expert interview pipeline** — BIG-17 (P1) — No expert interview system
7. **Expert conversation layer** — BIG-19/BIG-35 (P2) — No chat-with-expert feature
8. **Localization system** — BIG-20/BIG-33 (P1) — App is English-only
9. **Social proof features** — BIG-21/BIG-34 (P2) — No cohort data display

---

## Ticket Hygiene Issues

**Status:** ✓ Clean — no duplicates found in current Linear state.

The previously documented duplicates (BIG-12 through BIG-38 range) do not exist in Linear.
Current tickets BIG-39 through BIG-48 are unique and well-scoped.

---

## Recommended Priority Order

### Phase 1: Foundation (Weeks 1-4)
1. **BIG-15** — Define profile signals schema (blocks everything else)
2. **BIG-24** — Build reflection aggregation pipeline (data collection)
3. **BIG-18/BIG-23** — Implement ikigai calculation (first personalization)
4. **BIG-16** — Build seed ranking algorithm (personalized queue)

### Phase 2: Integration (Weeks 5-8)
5. **BIG-22** — Connect reflection trends to Direction Finder
6. **BIG-17** — Build expert interview → PathLab pipeline
7. **BIG-20/BIG-33** — Implement Thai/English localization

### Phase 3: Social & Expert (Weeks 9-12)
8. **BIG-19/BIG-35** — Build expert conversation layer
9. **BIG-21/BIG-34** — Add social proof features
10. **BIG-36** — Seed velocity analytics dashboard

---

## Immediate Actions (Updated 2026-03-28)

1. **Start BIG-39** — Define profile signals schema (foundation, blocks everything else)
2. **Start BIG-40** — Build reflection aggregation pipeline (can run parallel with BIG-39)
3. **No duplicates to close** — Ticket hygiene is clean
4. **No new tickets needed** — All 7 dream state items covered by BIG-39 through BIG-48

### Suggested Sub-issues (optional, for better tracking)

**BIG-39 (Profile signals schema):**
- Design schema for interest affinities
- Design schema for exploration history
- Design schema for skill signals
- Create Supabase migration

**BIG-42 (Seed ranking algorithm):**
- Define affinity scoring formula
- Implement exploration gap detection
- Build ranking API endpoint (Edge Function)
- Update discover.tsx to consume ranked queue

---

## Notes

- **No new tickets needed** — All 7 dream state items covered by BIG-39 through BIG-48
- **No deduplication needed** — Ticket hygiene is clean (previous doc referenced non-existent tickets)
- **Foundation first** — BIG-39 (profile signals) and BIG-40 (reflection aggregation) block personalization
- **Mock data exists** — Profile screen ikigai is mocked; needs BIG-41 (ikigai calculation engine)
- **Team name** — Tickets are in "Big" team, not "ps" team (uses BIG-XX prefix)
- **Priority order is correct** — P1 tickets are foundation, P2 are integration, P3 is analytics
