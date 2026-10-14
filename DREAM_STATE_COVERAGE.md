# Dream State Coverage — 12-Month Roadmap

**Last Updated:** 2026-05-04
**Status:** PS team audit complete. All 7 dream state items covered by existing PS-XX tickets. No new tickets needed.

---

## Current Team: PS (Passionseed Main)

- **Team ID:** cf511658-c0c8-408e-85d7-c8f25d357366
- **Open Tickets:** 32 (Backlog + In Progress)
- **Duplicate Tickets:** ~33 (Canceled/Duplicate state — to be cleaned up)

### Open Tickets by Project

| Project | Count |
|---------|-------|
| AI & ML | 9 |
| Infrastructure | 5 |
| Growth | 5 |
| Mobile App | 5 |
| Backend | 4 |
| Content | 3 |
| PS web | 1 |

**All 32 open tickets have projects assigned — no missing project tags.**

---

## Dream State Items vs Ticket Coverage

| # | Dream State | Tickets | Coverage |
|---|-------------|---------|----------|
| 1 | Personalized seed queue ranked by profile affinity + exploration gaps | PS-24 (profile scoring), PS-55 (seed ranking algorithm), PS-32 (seed queue UI) | ✅ Covered |
| 2 | AI-assisted PathLab generation (expert interview → seed in 1 hour) | PS-9 (PathLab Business), PS-34 (PathLab request), PS-56 (PathLab pipeline) | ✅ Covered |
| 3 | Real ikigai derived from reflection data across all completed seeds | PS-24 (scoring engine), PS-46 (ikigai engine), PS-54 (reflection→ikigai), PS-65 (ikigai_snapshots table) | ✅ Covered |
| 4 | Reflection trends feed Direction Finder and university roadmap match | PS-50 (university roadmap), PS-54 (reflection→Direction Finder pipeline) | ✅ Covered |
| 5 | Expert conversation layer (student can "talk" to the expert) | PS-38 (expert conversation layer) | ✅ Covered |
| 6 | Fully localized seed content (Thai/English) | PS-60 (i18n system), PS-70 (translate all seed content) | ✅ Covered |
| 7 | Social proof: "N students tried this path" + cohort comparison | PS-14 (social proof features), PS-58 (cohort comparison), PS-67 (N students counter) | ✅ Covered |

**All 7 dream state items are represented by tickets in the PS team.**

---

## Key Observations

### Duplicate Cluster (Needs Triage)

| Feature | Ticket IDs | Copies |
|---------|-----------|--------|
| ikigai calculation/snapshots | PS-24,28,46,52,54,65 | 6 |
| reflection trends + Direction Finder | PS-21,23,25,45,47,50 | 7 |
| expert conversation layer | PS-36,38,42,59 | 4 |
| PathLab / expert→seed pipeline | PS-29,34,44,56 | 4 |
| social proof + cohort comparison | PS-14,26,41,58,67 | 5 |
| Thai/English localization | PS-15,27,43,60 | 4 |
| seed ranking algorithm | PS-30,49,55 | 3 |

**Recommendation:** Triage duplicates — keep most complete ticket per cluster, close rest.

### Potential Future Gaps (Not Yet Ticketed)

- **Direction Finder UI** — student-facing university roadmap match UI (reflection trends from PS-54 feed this, but no dedicated UI ticket in Mobile App)
- **Thai NLP for reflection themes** — mentioned in PS-54 description but not as standalone ticket
- **PathLab generation script → production deployment** — `generate:pathlab` script exists but needs production deployment pipeline

---

## Actions Taken (2026-05-04)

1. ✅ Git pull: repo already up to date (master branch)
2. ✅ Queried all 32 open tickets in PS team
3. ✅ Verified all tickets have project assignments (0 missing)
4. ✅ Confirmed all 7 dream state items have ticket coverage
5. ✅ No new tickets needed — all gaps represented
6. 📝 Updated DREAM_STATE_COVERAGE.md to reflect PS team state

---

## Project IDs (PS Team)

| Project | Project ID |
|---------|-----------|
| Mobile App | 1ea9aa51-e3ec-4d34-bd98-50b18c859213 |
| Backend | a22f2444-7a05-45a3-a7dd-4503937304b6 |
| Infrastructure | 1358137d-f9ef-4486-bada-c44c22c1fa87 |
| AI & ML | 163baf10-fed5-4dc9-ab30-c0029dea9dc5 |
| Content | ca0b0197-f32b-4e53-aec7-2f83f84b218a |
| Growth | 9967dd59-657b-496a-b995-37efd03cc436 |
