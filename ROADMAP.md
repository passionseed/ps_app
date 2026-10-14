# Passion Seed Mobile App - Product Roadmap

**Last updated:** April 20, 2026  
**GitHub:** https://github.com/passionseed/ps_app  
**Linear:** PS team (tickets PS-XX)

---

## 12-Month Dream State

1. **Personalized seed queue** ranked by profile affinity + exploration gaps
2. **AI-assisted PathLab generation** (expert interview → seed in 1 hour)
3. **Real ikigai** derived from reflection data across all completed seeds
4. **Reflection trends** feed Direction Finder and university roadmap match
5. **Expert conversation layer** (student can "talk" to the expert)
6. **Fully localized seed content** (Thai/English)
7. **Social proof**: "N students tried this path" + cohort comparison

---

## Active Backlog Summary (76 open tickets)

| Project | Count | Key Tickets |
|---------|-------|-------------|
| AI & ML | 27 | PS-1 Ikigai, PS-9 PathLab gen, PS-15 seed ranking, PS-21 Direction Finder, PS-29 reflection trends, PS-81 expert chat |
| Growth | 17 | PS-7 social proof, PS-8 university roadmap, PS-19 analytics, PS-20 push notifications |
| Mobile App | 10 | PS-14 profile ikigai, PS-16 discover ranking, PS-37 onboarding, PS-84 push |
| Content | 10 | PS-3 localization, PS-59 seed CMS, PS-100 translation |
| Backend | 7 | PS-11 migrations, PS-12 profile signals, PS-13 ikigai edge, PS-47 portfolio-fit |
| Infrastructure | 8 | PS-34 edge deploy, PS-50 feature flags, PS-83 MVP readiness |

*Full ticket list in Linear: https://linear.app/passionseed/team/PS/all*

---

## Current Sprint: Sprint 1 (Foundation Kickoff)

**Ticket:** PS-41

### Priority Focus
1. **Profile signals collection** - PS-68 (onboarding), PS-67 (RLS)
2. **Ikigai calculation** - PS-70 (visualization), PS-71 (integration), PS-74 (edge fn)
3. **Seed ranking** - PS-72 (algorithm), PS-73 (UI), PS-74 (portfolio-fit)
4. **Localization** - PS-78 (i18n system)

### Blockers
- Need MVP scope definition (PS-58) before sprint planning
- Need testing infrastructure (PS-79) for confident shipping
- Need error monitoring (PS-80) for production readiness

---

## Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Daily Active Users | 100+ | - |
| Seed Completion Rate | 60%+ | - |
| Reflection Completion | 80%+ | - |
| Time to First Seed | < 5 min | - |
| Week 1 Retention | 40%+ | - |

---

## Notes

- All tickets tracked in Linear (PS team)
- Documentation lives in this repo
- Shared Supabase with web project (~/dev/pseed)
- Key edge functions: career-insights, portfolio-fit, score-engine, push-notifications

---

## Changelog

### April 20, 2026 - Backlog Cleanup

**Open backlog:** 79 → 76 tickets (closed 4 duplicates, created 1 new)

**Closed as Duplicate:**
| Ticket | Canonical | Reason |
|--------|-----------|--------|
| PS-45 | PS-16 | Both cover seed ranking display in Discover screen |
| PS-72 | PS-15 | Identical title: "Seed ranking algorithm (affinity + exploration gaps)" |
| PS-75 | PS-29 | Reflection trends aggregation — PS-29 has full scope description |
| PS-82 | PS-22 | Cohort comparison analytics — PS-22 is primary |

**Updated:**
- PS-9: Clarified expert interview → seed in ~1 hour PathLab workflow (full pipeline: interview → Thai NLP → seed structure → CMS review → publish)

**Created:**
- PS-101: University roadmap matching algorithm (AI & ML) — closes gap in Dream State #4: reflection trends + Direction Finder → ranked university program matches. Integrates with PS-29, PS-21, PS-66, PS-57.

### March 28, 2026 - PM (Cron Job)

**Duplicate Cleanup Complete:** Marked 14 duplicate tickets and moved to "Duplicate" state:

| Duplicate | Canonical | Topic |
|-----------|-----------|-------|
| PS-67 | PS-53 | RLS policies |
| PS-68 | PS-37 | Profile onboarding |
| PS-69 | PS-48 | Seed completion UI |
| PS-70 | PS-44 | Ikigai visualization |
| PS-73 | PS-45 | Seed ranking display |
| PS-74 | PS-47 | Portfolio-fit edge fn |
| PS-76 | PS-52 | Direction Finder |
| PS-77 | PS-51 | Expert interview pipeline |
| PS-78 | PS-54 | Localization |
| PS-79 | PS-60 | E2E testing |
| PS-80 | PS-62 | Sentry |
| PS-42 | PS-53 | RLS (older duplicate) |
| PS-39 | PS-54 | Localization (older) |
| PS-40 | PS-82 | Cohort segmentation |

**Total active backlog:** 50 tickets → 36 unique after deduplication

**Dream State Coverage** (as of April 20, 2026):

| # | Dream State Item | Primary Tickets |
|---|-----------------|-----------------|
| 1 | Personalized seed queue (affinity + exploration gaps) | PS-15 (algorithm), PS-16 (Discover UI), PS-47 (portfolio-fit edge) |
| 2 | AI-assisted PathLab (expert interview → seed in 1 hr) | PS-9 (generator, updated), PS-26 (pipeline), PS-65 (GPU serving) |
| 3 | Real ikigai from reflection data | PS-1, PS-13 (edge fn), PS-43 (calculation pipeline), PS-44+PS-14+PS-32 (visualization) |
| 4 | Reflection trends → Direction Finder + university match | PS-29 (trends pipeline), PS-28 (→Direction Finder), PS-101 (university roadmap algo, NEW) |
| 5 | Expert conversation layer (RAG chatbot) | PS-10, PS-27 (Phase 2), PS-81 (RAG chatbot) |
| 6 | Fully localized seed content (Thai/English) | PS-3 (i18n system), PS-31 (contributor workflow), PS-100 (translation) |
| 7 | Social proof: N students tried + cohort comparison | PS-7 (counters), PS-22 (cohort analytics), PS-30 (segmentation) |

### March 28, 2026 - Ticket Creation Sprint

Created 20 new tickets to close gaps between current state and 12-month dream:

**Phase 1 MVP Foundation (8 tickets):**
- PS-67: RLS policies for user data isolation [Urgent]
- PS-68: User onboarding flow for profile signals collection [Urgent]
- PS-69: Seed completion tracking UI and progress indicators [High]
- PS-70: Ikigai visualization component for Profile screen [High]
- PS-71: Connect profile.tsx to real ikigai edge function [High]
- PS-72: Seed ranking algorithm (affinity + exploration gaps) [Urgent]
- PS-73: Seed ranking display in Discover screen [High]
- PS-74: Portfolio-fit edge function for seed → user matching [Urgent]

**Phase 2 Intelligence & Insights (4 tickets):**
- PS-75: Reflection trends aggregation pipeline [Medium]
- PS-76: Direction Finder screen with university roadmap integration [High]
- PS-77: Expert interview → seed content pipeline [Medium]
- PS-78: Thai/English localization system [High]

**Infrastructure (4 tickets):**
- PS-79: E2E testing infrastructure with Detox [High]
- PS-80: Sentry error monitoring integration [High]
- PS-83: [Phase 1] MVP Launch Readiness Checklist [Urgent]
- PS-84: Push notification integration for daily seed reminders [High]
- PS-85: GPU model serving monitoring dashboard [Medium]

**Phase 3 Social & Expert Layers (2 tickets):**
- PS-81: Expert conversation layer (RAG chatbot) [Medium]
- PS-82: Cohort comparison analytics for social proof [Medium]

**Analytics (1 ticket):**
- PS-86: Seed quality scorecard and content iteration workflow [Medium]
