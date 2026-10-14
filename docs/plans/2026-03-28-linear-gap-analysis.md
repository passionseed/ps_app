# Linear Gap Analysis — Passion Seed Mobile

**Date:** 2026-03-28  
**Analysis:** Dream State vs Current Tickets vs Infrastructure Gaps  
**Cron Job:** Automated gap identification and ticket creation

---

## Current Linear State (Verified 2026-03-28 12:38)

**Team:** Passion Seed (key: PS)  
**Team ID:** ace4cb8d-f6ff-435f-addb-7c72fe45dd48  
**Total Open Issues:** 66 (all in Backlog)

### Ticket Distribution by Priority

| Priority | Count | Focus |
|----------|-------|-------|
| P0 | 3 | Sprint planning, MVP scope |
| P1 | 20 | Foundation (profile signals, ikigai, localization) |
| P2 | 30 | Personalization, analytics, content pipeline |
| P3 | 13 | Social proof, expert layer, advanced features |

---

## 12-Month Dream State Coverage

| # | Dream State Item | Canonical Tickets | Status |
|---|------------------|-------------------|--------|
| 1 | Personalized seed queue (profile affinity + exploration gaps) | PS-2, PS-4, PS-12, PS-15, PS-16, PS-17, PS-24, PS-47 | ✓ Covered |
| 2 | AI-assisted PathLab generation (expert interview → seed) | PS-9, PS-26, PS-51, PS-59, **PS-65** | ✓ Covered |
| 3 | Real ikigai from reflection data | PS-1, PS-13, PS-14, PS-25, PS-42, PS-43, PS-44, **PS-63** | ✓ Covered |
| 4 | Reflection trends → Direction Finder | PS-6, PS-8, PS-21, PS-28, PS-29, PS-52, PS-55, **PS-66** | ✓ Covered |
| 5 | Expert conversation layer | PS-10, PS-27, **PS-65** | ✓ Covered |
| 6 | Thai/English localization | PS-3, PS-31, PS-39, PS-54 | ✓ Covered |
| 7 | Social proof (cohort comparison) | PS-7, PS-22, PS-30, PS-40, PS-64 | ✓ Covered |

**Verdict:** All 7 dream state items have tickets. 4 new infrastructure tickets created today (PS-63 through PS-66).

---

## Infrastructure Gaps Identified (2026-03-28)

### PS-63: Thai NLP Pipeline (P1)
**Gap:** Ikigai calculation needs Thai-language sentiment and theme extraction. Current Thai Whisper infra handles ASR but not NLP analysis.

**Solution:** Deploy Thai NLP pipeline using existing Qwen infrastructure (port 8083) for:
- Sentiment analysis on reflection text
- Theme extraction (interests, skills, values)
- Energy/confusion signal validation

**Blocks:** PS-13 (ikigai calculation), PS-29 (trends aggregation)

---

### PS-64: Seed Quality Metrics (P2)
**Gap:** No systematic way to measure seed effectiveness or identify content needing improvement.

**Solution:** Track seed-level metrics:
- Completion rate per seed
- Average reflection sentiment
- Drop-off points by day
- Post-seed actions

**Feeds:** PS-51 (expert pipeline), PS-59 (seed creator CMS)

---

### PS-65: GPU Model Serving (P2)
**Gap:** AI PathLab generation and expert conversation layer need dedicated LLM infrastructure.

**Current Infra:**
- 2× RTX A5500 (48GB VRAM each)
- Qwen3.5-27B on port 8083 (~25 tok/s)
- Thai Whisper on port 8081

**Solution:**
- Dedicated Thai-language chat model
- Inference API with rate limiting
- VRAM management dashboard
- Cost tracking per feature

**Blocks:** PS-26 (AI PathLab), PS-27 (expert conversation RAG)

---

### PS-66: TCAS Data Freshness (P2)
**Gap:** University recommendations depend on accurate TCAS data. Programs change yearly.

**Solution:**
- Weekly automated TCAS sync
- Freshness monitoring (alert if >6 months old)
- Version tracking for program changes
- Manual override workflow

**Feeds:** PS-52 (Direction Finder), PS-8 (university matching)

---

## Current Implementation Status

### ✅ Implemented
- Mobile app initialized — Expo RN 0.83.2, React 19, pnpm
- Onboarding flow — Profile, interests, career goals collection
- Seed/path enrollment — Browse, enroll, track progress
- Reflection capture UI — Energy/confusion/interest + open response
- Profile screen — Mock ikigai display (UI ready, needs real data)

### ❌ Not Implemented (Foundation Gaps)
1. **Profile signals schema** — PS-42 (P0) — Need DB schema for storing computed profile signals
2. **Seed ranking algorithm** — PS-15, PS-24 (P1) — No ranking logic, seeds shown unsorted
3. **Ikigai calculation engine** — PS-13, PS-25 (P1) — Profile screen shows mock data
4. **Reflection aggregation** — PS-43 (P0) — No pipeline to aggregate reflection trends
5. **Thai NLP** — PS-63 (P1) — NEW: Blocks accurate ikigai for Thai users

### ❌ Not Implemented (Advanced Layers)
6. **Expert interview pipeline** — PS-51, PS-59 (P1/P2) — No expert interview system
7. **Expert conversation layer** — PS-27 (P3) — No chat-with-expert feature
8. **Localization system** — PS-54 (P1) — App is English-only
9. **Social proof features** — PS-22, PS-64 (P2/P3) — No cohort data display
10. **GPU model serving** — PS-65 (P2) — NEW: Blocks AI features

---

## Recommended Priority Order

### Phase 1: Foundation (Weeks 1-4)
1. **PS-42** — user_profile_signals table schema (blocks everything else)
2. **PS-43** — Reflection → ikigai calculation pipeline
3. **PS-63** — Thai NLP pipeline (NEW, blocks accurate ikigai)
4. **PS-15/PS-24** — Seed ranking algorithm
5. **PS-54** — Thai/English localization system

### Phase 2: Integration (Weeks 5-8)
6. **PS-55/PS-61** — Analytics dashboards
7. **PS-51/PS-59** — Expert interview → seed pipeline
8. **PS-65** — GPU model serving (NEW, enables AI features)
9. **PS-66** — TCAS data sync (NEW, ensures data quality)

### Phase 3: Social & Expert (Weeks 9-12)
10. **PS-27** — Expert conversation layer (RAG chatbot)
11. **PS-22/PS-64** — Social proof + cohort analytics
12. **PS-52** — Direction Finder with university roadmap

---

## Ticket Hygiene

**Status:** ✓ Clean — no duplicates found.

All tickets are well-scoped and organized by phase. New tickets (PS-63 through PS-66) address infrastructure gaps that would have blocked dream state delivery.

---

## Summary of Changes (2026-03-28 Cron)

| Action | Details |
|--------|---------|
| Git pull | Already up to date |
| Linear query | 62 existing tickets verified |
| New tickets created | PS-63, PS-64, PS-65, PS-66 |
| Documentation | Updated gap analysis (this file) |
| Dream state coverage | 7/7 items covered |

---

## Notes

- All 7 dream state items have ticket coverage
- 4 new infrastructure tickets created to unblock AI features and data quality
- Foundation tickets (PS-42, PS-43, PS-63) should be prioritized first
- Team uses PS-XX prefix (not BIG-XX — that was old documentation)
- Shared Supabase with web project (~/dev/pseed)
