# Passion Seed Mobile App — Dream State & Backlog Coverage

## 12-Month Dream State

| # | Dream State Item | Tickets | Status |
|---|-----------------|---------|--------|
| 1 | Personalized seed queue ranked by profile affinity + exploration gaps | PS-55, PS-57 (Done) | ✅ Covered |
| 2 | AI-assisted PathLab generation (expert interview → seed in 1 hour) | PS-56, PS-9, PS-34 | ✅ Covered |
| 3 | Real ikigai derived from reflection data across all completed seeds | PS-46, PS-54, PS-65 | ✅ Covered |
| 4 | Reflection trends feed Direction Finder and university roadmap match | PS-54, PS-50 | ✅ Covered |
| 5 | Expert conversation layer (student can "talk" to the expert) | PS-38 | ✅ Covered |
| 6 | Fully localized seed content (Thai/English) | PS-60 | ✅ Covered |
| 7 | Social proof: "N students tried this path" + cohort comparison | PS-67, PS-58 | ✅ Covered |

**All 7 dream state items are represented in the backlog.**

---

## Project Tags

All open tickets have been verified to have correct project assignments:

| Project | Project ID | Tickets |
|---------|-----------|---------|
| Mobile App | `1ea9aa51-e3ec-4d34-bd98-50b18c859213` | PS-22, PS-32, PS-19, PS-57 (Done), PS-18 (Done), PS-16 (Done), PS-33 (Done) |
| Backend | `a22f2444-7a05-45a3-a7dd-4503937304b6` | PS-31 (In Progress), PS-66, PS-65, PS-53 |
| Infrastructure | `1358137d-f9ef-4486-bada-c44c22c1fa87` | PS-63, PS-62, PS-61 |
| AI & ML | `163baf10-fed5-4dc9-ab30-c0029dea9dc5` | PS-56, PS-55, PS-54, PS-50, PS-46, PS-39, PS-38, PS-34, PS-9 |
| Content | `ca0b0197-f32b-4e53-aec7-2f83f84b218a` | PS-60 |
| Growth | `9967dd59-657b-496a-b995-37efd03cc436` | PS-67, PS-58, PS-40, PS-21, PS-20, PS-6 |

---

## Backlog Health

- **Total tickets**: 62
- **Done**: 5 (PS-16, PS-18, PS-33, PS-51, PS-57)
- **In Progress**: 1 (PS-31 — profile signals schema)
- **Backlog**: 29 open tickets
- **Duplicate**: 27 tickets (marked as Duplicate state to avoid confusion)

### Duplicate Resolution (2026-04-19)
- PS-11 marked Duplicate of PS-22 (profile reveal UI)
- PS-12 marked Duplicate of PS-19 (offline caching)
- 26 other duplicates pre-existing (PS-51 handled prior consolidation)

### Open Tickets by Project
- **AI & ML**: 9 tickets — ikigai engine, seed ranking, PathLab pipeline, university roadmap, expert chat, parent validation
- **Mobile App**: 3 tickets — seed queue UI, profile reveal, offline caching
- **Backend**: 4 tickets — profile signals, ikigai snapshots, career-insights edge function
- **Growth**: 6 tickets — social proof (2), analytics (2), push notifications, team training
- **Infrastructure**: 3 tickets — CI/CD, Sentry, Detox
- **Content**: 1 ticket — Thai/English localization

---

## Key Dependencies

```
Profile Signals (Backend, PS-31 In Progress)
    ↓
Seed Ranking Algorithm (AI & ML, PS-55)
    ↓
Personalized Seed Queue UI (Mobile App, PS-32)
    ↓
Reflection Capture (Mobile App, PS-18 Done)
    ↓
Reflection Aggregation (AI & ML, PS-54)
    ↓
Ikigai Calculation Engine (AI & ML, PS-46)
    ↓
Direction Finder + Roadmap Match (AI & ML, PS-50, PS-54)
```

---

## Missing / Gaps

**No significant gaps identified.** All dream state items have backlog representation.

Minor observations:
- PS-6 "Train team to be AI-native" is internal ops, not a product feature
- PS-5 "About page" is PS web team scope, not ps_app
- PS-39 "Parent willingness to pay" is a growth/business validation item
