# Linear Project Tagging Audit

**Date:** 2026-04-06  
**Audit Type:** Automated project tag verification and correction

## Summary

- **Total tickets reviewed:** 96
- **Tickets updated:** 5
- **Dream state coverage:** 100% (all 7 categories covered)

## Project Definitions

| Project | Scope |
|---------|-------|
| Mobile App | UI screens, React Native components, mobile features |
| Backend | Supabase: database schemas, RLS policies, edge functions, migrations |
| Infrastructure | DevOps: testing (E2E, Detox), monitoring (Sentry), CI/CD, deployment |
| AI & ML | Intelligence: ikigai calculation, seed ranking algorithms, Thai NLP, AI PathLab, expert chatbot |
| Content | Localization, seed content, CMS, content quality, Thai/English i18n |
| Growth | Analytics, push notifications, retention, social features, cohort analysis |

## Tickets Updated

| Ticket | Title | Old Project | New Project |
|--------|-------|-------------|-------------|
| PS-86 | [Analytics] Seed quality scorecard and content iteration | AI & ML | Growth |
| PS-84 | [Mobile] Push notification integration for daily seed reminders | Growth | Mobile App |
| PS-64 | [Analytics] Seed content quality metrics and iteration | AI & ML | Growth |
| PS-55 | [Analytics] Track seed velocity and Direction Finder reach | AI & ML | Growth |
| PS-52 | [Mobile] Direction Finder screen with university roadmap integration | AI & ML | Mobile App |

## Dream State Coverage

All 7 dream state categories have active tickets:

1. ✓ **Personalized seed queue** (ranking + affinity) — PS-72, PS-73, PS-58, PS-56, etc.
2. ✓ **AI-assisted PathLab generation** (expert → seed) — PS-77, PS-65, PS-63, etc.
3. ✓ **Ikigai from reflection data** — PS-71, PS-70, PS-43, PS-14, etc.
4. ✓ **Reflection trends → Direction Finder + university roadmap** — PS-76, PS-75, PS-52, etc.
5. ✓ **Expert conversation layer** (RAG chatbot) — PS-81, PS-27, PS-26, etc.
6. ✓ **Fully localized content** (Thai/English) — PS-78, PS-54, PS-39, PS-31, etc.
7. ✓ **Social proof + cohort comparison** — PS-82, PS-40, PS-34, PS-7, etc.

## Notes

- All 96 tickets now have project assignments
- No duplicate tickets created (existing backlog is comprehensive)
- Next audit: weekly via cron
