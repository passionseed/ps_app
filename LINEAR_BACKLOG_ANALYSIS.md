# Linear Backlog Analysis — ps_app

**Generated:** 2026-04-27
**Team:** PS (Passionseed Main)
**Total Open Tickets:** 50

## Project Distribution

| Project | Count |
|---------|-------|
| AI & ML | ~25 |
| Growth | ~10 |
| Backend | ~7 |
| Mobile App | ~5 |
| Content | ~4 |
| Infrastructure | ~3 |

## ⚠️ Critical Issue: Heavy Duplication

All 7 dream-state areas are covered but with significant duplication:

### Duplicate Clusters

| Feature | Ticket IDs | Copies |
|---------|-----------|--------|
| ikigai calculation/snapshots | PS-24,28,46,52,54,65 | **6** |
| reflection trends + Direction Finder | PS-21,23,25,45,47,50 | **7** |
| expert conversation layer | PS-36,38,42,59 | **4** |
| PathLab / expert→seed pipeline | PS-29,34,44,56 | **4** |
| social proof + cohort comparison | PS-14,26,41,58,67 | **5** |
| Thai/English localization | PS-15,27,43,60 | **4** |
| seed ranking algorithm | PS-30,49,55 | **3** |
| profile signals schema | PS-31,48,53 | **3** |
| analytics / seed velocity | PS-13,21,40 | **3** |
| offline-first caching | PS-12,19 | **2** |
| profile reveal UI | PS-17,22 | **2** |

**Recommended action:** Triage these duplicates — keep the most complete ticket per cluster, close the rest.

## Project Assignment Changes

### Updated This Session
- **PS-52**: `[Data] Create ikigai_snapshots table` → moved from **Backend** to **AI & ML**
  - Rationale: `[Data]` prefix + ikigai purpose = AI & ML data pipeline work

## Dream State Coverage

| Dream State Item | Status | Tickets |
|-----------------|--------|---------|
| 1. Personalized seed queue (affinity + exploration gaps) | ✅ Covered | PS-30,49,55,32 |
| 2. AI-assisted PathLab (expert interview → seed) | ✅ Covered | PS-29,34,44,56 |
| 3. Real ikigai from reflection data | ✅ Covered (6 copies) | PS-24,28,46,52,54,65 |
| 4. Reflection → Direction Finder → university roadmap | ✅ Covered (7 copies) | PS-21,23,25,45,47,50 |
| 5. Expert conversation layer | ✅ Covered | PS-36,38,42,59 |
| 6. Thai/English localization | ✅ Covered | PS-15,27,43,60 |
| 7. Social proof (N students + cohort) | ✅ Covered | PS-14,26,41,58,67 |

**No new tickets needed.** All gaps are represented; the backlog just needs deduplication.

## Recommendations

1. **Deduplication sprint** — For each duplicate cluster, keep 1 canonical ticket, close others
2. **AI & ML is overloaded** (~25 tickets) — Consider splitting into "Algorithms" and "Data Pipelines" sub-projects
3. **PS-34** "Request path for Pathlab" is oddly named — verify it belongs in AI & ML
4. **Growth project** has analytics + social + push notifications — good cohesion

## Linear Projects (PS Team)

| Project ID | Name |
|-----------|------|
| 1ea9aa51-e3ec-4d34-bd98-50b18c859213 | Mobile App |
| a22f2444-7a05-45a3-a7dd-4503937304b6 | Backend |
| 1358137d-f9ef-4486-bada-c44c22c1fa87 | Infrastructure |
| 163baf10-fed5-4dc9-ab30-c0029dea9dc5 | AI & ML |
| ca0b0197-f32b-4e53-aec7-2f83f84b218a | Content |
| 9967dd59-657b-496a-b995-37efd03cc436 | Growth |
