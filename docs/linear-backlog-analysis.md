# Linear Backlog Analysis

**Generated:** 2026-04-08  
**Team:** Passion Seed (PS)  
**Total Tickets:** 46 (37 open, 9 marked duplicate)

---

## Project Distribution

| Project | Tickets | % |
|---------|---------|---|
| Growth | 9 | 24% |
| Content | 8 | 22% |
| AI & ML | 7 | 19% |
| Infrastructure | 6 | 16% |
| Mobile App | 5 | 14% |
| Backend | 2 | 5% |

---

## 12-Month Dream State Coverage

All 7 dream state features have corresponding tickets:

### 1. Personalized Seed Queue ✓
- `[Edge] portfolio-fit edge function for seed → user matching` (Backend)
- `[Analytics] Seed quality scorecard and content iteration workflow` (Growth)

### 2. AI PathLab Generation ✓
- `[Content] Expert interview → seed content pipeline` (Content)
- `[AI Infra] GPU model serving for PathLab generation and expert chat` (AI & ML)

### 3. Real Ikigai from Reflections ✓
- `[AI Infra] Thai NLP pipeline for reflection sentiment and theme extraction` (AI & ML)
- `[Data] Reflection sentiment analysis pipeline` (AI & ML)
- `Ai Feedback` (AI & ML)

### 4. Direction Finder + University Roadmap ✓
- `[Mobile] Direction Finder screen with university roadmap integration` (Mobile App)
- `Reflection trends aggregation pipeline` (AI & ML)
- `[Data] TCAS program data sync and freshness monitoring` (AI & ML)

### 5. Expert Conversation Layer ✓
- `Expert conversation layer (RAG chatbot)` (AI & ML)

### 6. Full Thai/English Localization ✓
- `[i18n] Implement Thai/English localization system` (Content)
- `[Content] Seed creator CMS for expert contributors` (Content)

### 7. Social Proof + Cohort Analytics ✓
- `Cohort comparison analytics for social proof` (Growth)
- `[Analytics] Dashboard for seed velocity and completion funnel` (Growth)

---

## Foundational Infrastructure

| Ticket | Project | Priority |
|--------|---------|----------|
| `[Supabase] RLS policies for user data isolation` | Backend | P0 |
| `[Mobile] Seed completion tracking UI` | Mobile App | P1 |
| `[Mobile] Push notification integration` | Mobile App | P1 |
| `[ps_app] Build offline-first seed content caching` | Mobile App | P2 |
| `[Testing] E2E testing infrastructure with Detox` | Infrastructure | P1 |
| `[Infra] Error monitoring with Sentry integration` | Infrastructure | P1 |
| `[Infra] Feature flag system for gradual rollouts` | Infrastructure | P2 |
| `[Phase 1] MVP Launch Readiness Checklist` | Infrastructure | P0 |

---

## Gaps Identified

### Missing / Underrepresented

1. **Exploration Gap Algorithm** (Dream State #1)
   - We have affinity ranking (`portfolio-fit` edge function)
   - Missing: "exploration gaps" logic that recommends seeds outside user's comfort zone
   - **Recommendation:** Add ticket for exploration diversity algorithm

2. **Ikigai Calculation Edge Function** (Dream State #3)
   - We have Thai NLP pipeline and sentiment analysis
   - Missing: actual ikigai calculation combining all 4 quadrants
   - **Note:** PS-13/PS-25/PS-43/PS-44/PS-70/PS-71/PS-74 reference ikigai but may be duplicates
   - **Recommendation:** Verify ikigai edge function exists or create ticket

3. **Streak/Gamification System** (Retention)
   - Mentioned in push notification ticket
   - Missing: dedicated streak tracking, milestone celebrations, gamification
   - **Recommendation:** Add ticket for streak system + milestone celebrations

4. **Admin Dashboard** (Content Operations)
   - Seed quality scorecard exists (Growth)
   - Missing: unified admin dashboard for content team
   - **Recommendation:** Add ticket for admin CMS dashboard

---

## Duplicate Tickets (9 total)

These are marked as duplicates in Linear:
- PS-62: Sentry error monitoring (duplicate)
- PS-60: E2E testing with Detox (duplicate)
- PS-54: Thai/English localization (duplicate)
- PS-51: Expert interview → seed pipeline (duplicate)
- PS-52: Direction Finder screen (duplicate)
- PS-44: Ikigai visualization (duplicate)
- PS-48: Seed completion tracking UI (duplicate)
- PS-37: User onboarding flow (duplicate)
- PS-53: RLS policies (duplicate)

**Action:** Consider closing these duplicates to clean up backlog.

---

## Recommendations

1. **Close duplicate tickets** — 9 tickets marked duplicate clutter the backlog
2. **Add exploration gap algorithm** — Critical for Dream State #1
3. **Verify ikigai edge function** — Ensure PS-13/PS-25/PS-43 coverage is complete
4. **Add streak/gamification ticket** — Key for retention
5. **Prioritize MVP checklist items** — PS-67, PS-68, PS-69, PS-70/71, PS-72/73/74, PS-78, PS-80

---

## Project Tagging Status

✅ All 37 open tickets have project assignments  
✅ No tickets require re-tagging  
✅ Project distribution aligns with dream state priorities
