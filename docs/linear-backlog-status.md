# Linear Backlog Status Report

**Generated:** 2026-04-01 21:00 PT  
**Team:** Passionseed (PS)  
**Total Open Issues:** 50  
**Duplicate Issues:** 11 (marked for consolidation)

---

## Project Distribution

| Project | Ticket Count | Description |
|---------|-------------|-------------|
| AI & ML | ~15 | Ikigai, ranking algorithms, Thai NLP, expert chatbot, PathLab |
| Mobile App | ~12 | UI screens, React Native components, mobile features |
| Backend | ~10 | Supabase schemas, RLS policies, edge functions |
| Infrastructure | ~8 | Testing (E2E/Detox), monitoring (Sentry), CI/CD |
| Growth | ~6 | Analytics, push notifications, retention, cohort analysis |
| Content | ~5 | Localization, seed content, CMS, Thai/English i18n |
| Hack Launch Sprint | ~4 | Legacy sprint tickets (to be reorganized) |

---

## Dream State Coverage (12-Month Vision)

### ✓ 1. Personalized seed queue ranked by profile affinity + exploration gaps
- PS-6b479eb7: Seed ranking algorithm (affinity + exploration gaps) [AI & ML]
- PS-73080bd0: Seed ranking display in Discover screen [AI & ML]

### ✓ 2. AI-assisted PathLab generation (expert interview → seed in 1 hour)
- PS-02abb321: Expert conversation layer (RAG chatbot) [AI & ML]
- PS-1863a577: Expert interview → seed content pipeline [AI & ML] [Duplicate]
- PS-fa65d88b: [AI Infra] GPU model serving for PathLab generation [AI & ML]

### ✓ 3. Real ikigai derived from reflection data across all completed seeds
- PS-e4db0c7c: Connect profile.tsx to real ikigai edge function [AI & ML]
- PS-1a84c979: Ikigai visualization component for Profile screen [Mobile App] [Duplicate]
- PS-257eb37f: Reflection trends aggregation pipeline [AI & ML]

### ✓ 4. Reflection trends feed Direction Finder and university roadmap match
- PS-da4c976e: Direction Finder screen with university roadmap integration [AI & ML] [Duplicate]
- PS-c0be80e4: [Mobile] Direction Finder screen with university roadmap [AI & ML]
- PS-a658d475: [Analytics] Track seed velocity and Direction Finder readiness [AI & ML]

### ✓ 5. Expert conversation layer (student can "talk" to the expert)
- PS-02abb321: Expert conversation layer (RAG chatbot) [AI & ML]
- PS-fa65d88b: [AI Infra] GPU model serving for expert chat [AI & ML]

### ✓ 6. Fully localized seed content (Thai/English)
- PS-b710918c: Thai/English localization system [Content] [Duplicate]
- PS-df7406bc: [i18n] Implement Thai/English localization system [Content]

### ✓ 7. Social proof: "N students tried this path" + cohort comparison
- PS-1cdf02ba: Cohort comparison analytics for social proof [Growth]
- PS-d6689ff7: [Supabase] RLS policies for user data isolation and cohort analytics [Backend]

---

## Recent Updates (2026-04-01)

### Project Reassignments (13 tickets)
The following tickets were reassigned to correct projects based on content analysis:

| Ticket | Title | Old Project → New Project |
|--------|-------|---------------------------|
| PS-e5c1f6b1 | Community Culture Design | Hack Launch Sprint → Content |
| PS-9b797bc5 | Train Group Mentor | Hack Launch Sprint → Content |
| PS-23139bbc | [Analytics] Seed quality scorecard | Growth → AI & ML |
| PS-f6493ec0 | Push notification integration | Mobile App → Growth |
| PS-da4c976e | Direction Finder screen | Mobile App → AI & ML |
| PS-c0be80e4 | Direction Finder screen (mobile) | Mobile App → AI & ML |
| PS-73080bd0 | Seed ranking display | Mobile App → AI & ML |
| PS-e4db0c7c | Ikigai edge function | Backend → AI & ML |
| PS-fa65d88b | GPU model serving | AI & ML → Infrastructure |
| PS-b37a6858 | Seed content quality metrics | Growth → AI & ML |
| PS-5903a966 | Offline-first caching | Mobile App → Backend |
| PS-a658d475 | Direction Finder analytics | Growth → AI & ML |
| PS-d6689ff7 | RLS policies + cohort | Backend → Backend (confirmed) |

### Duplicate Tickets (11 tickets marked for consolidation)
These tickets are marked as "Duplicate" state and should be merged:

| Ticket | Title | Project |
|--------|-------|---------|
| PS-c412cab9 | Sentry error monitoring integration | Infrastructure |
| PS-804da766 | E2E testing infrastructure with Detox | Infrastructure |
| PS-b710918c | Thai/English localization system | Content |
| PS-1863a577 | Expert interview → seed content pipeline | AI & ML |
| PS-da4c976e | Direction Finder screen | Mobile App |
| PS-85f2ae59 | Portfolio-fit edge function | Backend |
| PS-73080bd0 | Seed ranking display | Mobile App |
| PS-1a84c979 | Ikigai visualization component | Mobile App |
| PS-999f2607 | Seed completion tracking UI | Mobile App |
| PS-dcbd7ac8 | User onboarding flow | Backend |
| PS-cf85a308 | RLS policies | Backend |

---

## Identified Gaps

All 7 dream state areas have ticket coverage. However, the following refinements are recommended:

### No Critical Gaps Identified
The backlog comprehensively covers the 12-month vision. Focus should be on:
1. **Consolidating duplicates** - 11 tickets can be merged
2. **Prioritization** - 39 tickets in Backlog need prioritization
3. **Hack Launch Sprint cleanup** - 4 legacy tickets should be reassigned or closed

---

## Next Actions

1. [ ] Consolidate 11 duplicate tickets into primary tickets
2. [ ] Prioritize backlog tickets into Sprint-ready state
3. [ ] Close or reassign 4 Hack Launch Sprint tickets
4. [ ] Create sprint milestones for MVP launch

---

## Notes

- Project tagging rules applied based on keyword analysis
- AI & ML receives tickets with: ikigai, ranking, affinity, expert, reflection analysis, direction finder
- Backend receives: RLS, edge functions, database schemas, data caching
- Mobile App receives: UI screens, React Native components, user-facing features
- Infrastructure receives: testing, monitoring, CI/CD, GPU serving
- Growth receives: analytics, push notifications, cohort, social proof
- Content receives: localization, Thai/English, CMS, seed content
