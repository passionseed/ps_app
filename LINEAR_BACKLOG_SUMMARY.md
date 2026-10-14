# Linear Backlog Summary

**Generated:** 2026-05-02
**Last Synced:** Sun May 03 2026 22:00 UTC
**Team:** BIG (Passion Seed)
**Total Open Issues:** 8 (gap-filling tickets only)

---

## ⚠️ IMPORTANT: Workspace State

The Linear PS team (with PS-XX tickets) described in historical docs no longer exists
in this workspace. The workspace now uses team **BIG** with tickets **BIG-50 through BIG-57**.

This sync re-populated the backlog with 8 genuine gap-filling tickets based on
codebase analysis. See `linear_duplicates.json` for historical duplicate analysis.

---

## Dream State Coverage

| Dream State Feature | Status | Ticket(s) |
|---------------------|--------|-----------|
| 1. Personalized seed queue (affinity + exploration gaps) | **MISSING** | BIG-50 |
| 2. AI-assisted PathLab generation | Partial (scripts exist, untested) | BIG-56 |
| 3. Real ikigai from reflection data | **MISSING** (uses MOCK_IKIGAI) | BIG-51 |
| 4. Reflection trends → Direction Finder | **MISSING** (no aggregation) | BIG-55 |
| 5. Expert conversation layer | **MISSING** (no chatbot/RAG) | BIG-52 |
| 6. Full Thai/English localization | **MISSING** (hardcoded Thai strings) | BIG-53 |
| 7. Social proof + cohort comparison | **MISSING** (uses MOCK_ACHIEVEMENTS) | BIG-54 |

---

## Tickets Created (This Sync)

### AI & ML (3 tickets)
| ID | Title | Description |
|----|-------|-------------|
| BIG-50 | Seed Ranking Engine | Profile affinity + exploration gap scoring; replace static seed slices |
| BIG-51 | Real Ikigai Calculation | Replace MOCK_IKIGAI with edge function calculating from reflection data |
| BIG-52 | Expert Conversation Layer | RAG chatbot per expert, Thai + English, contextual suggestions |

### Content (1 ticket)
| ID | Title | Description |
|----|-------|-------------|
| BIG-53 | Thai/English i18n System | react-i18next, all UI strings externalized, seed content bilingual |

### Growth (1 ticket)
| ID | Title | Description |
|----|-------|-------------|
| BIG-54 | Social Proof | Real enrollment counters, cohort comparison, activity feed |

### Backend (1 ticket)
| ID | Title | Description |
|----|-------|-------------|
| BIG-55 | Reflection Aggregation Pipeline | Daily aggregation, trend computation, Thai NLP for themes |

### Infrastructure (2 tickets)
| ID | Title | Description |
|----|-------|-------------|
| BIG-56 | PathLab Pipeline Testing | Unit + integration tests for generate-pathlab scripts |
| BIG-57 | E2E Testing with Detox | Core flows: onboarding, seed completion, reflection, profile |

---

## Codebase Analysis Findings

### Already Implemented (✅)
- Core app structure: onboarding, discover, seed, path, reflection screens
- `lib/pathlab.ts`: full PathLab API client (seeds, enrollments, nodes, reflections)
- `scripts/generate-pathlab/`: 5-agent orchestration for PathLab generation
- Reflection submission: `submitDailyReflection()` stores to `path_reflections` table
- Thai/English language preference stored in `profile.preferred_language`
- `components/Reflection/`: PostQuestSlider, VoiceAIReflection

### Partially Implemented (⚠️)
- **Discover screen**: UI sections exist but seeds NOT personalized (static slices)
- **Profile ikigai**: UI exists but uses `MOCK_IKIGAI` hardcoded values
- **Social features**: UI exists but uses `MOCK_ACHIEVEMENTS`, hardcoded stats
- **Language**: Thai strings hardcoded; no i18n framework

### Missing (❌)
- Seed ranking/personalization engine
- Ikigai calculation from reflection data
- Expert conversation layer (chatbot/RAG)
- i18n infrastructure
- Real social proof (enrollment counters)
- Reflection aggregation pipeline
- PathLab generation tests
- E2E test suite

---

## Project Labels Available
The following project labels exist in the BIG team:
- `AI & ML` — Intelligence: ikigai, ranking, NLP, expert chatbot
- `Backend` — Supabase: schemas, RLS, edge functions
- `Content` — Localization, seed content, i18n
- `Growth` — Analytics, social, push, retention
- `Infrastructure` — Testing, monitoring, CI/CD
- `Mobile App` — UI/screens/components (no tickets yet)
- `Growth`, `Relationship`, `Health`, `Projects`, `Classes` (existing generic labels)
- `Bug`, `Feature`, `Improvement` (existing generic labels)

---

## Dream State vs Current Codebase

| Dream State Feature | Codebase Status | Linear Ticket |
|---------------------|-----------------|---------------|
| Personalized seed queue | ⚠️ Discover exists but seeds not ranked | BIG-50 |
| AI PathLab generation | ✅ Scripts exist (5-agent) | BIG-56 (testing) |
| Real ikigai | ❌ MOCK_IKIGAI hardcoded | BIG-51 |
| Reflection → Direction Finder | ❌ No aggregation pipeline | BIG-55 |
| Expert chatbot | ❌ Not built | BIG-52 |
| Thai/English i18n | ❌ Hardcoded strings | BIG-53 |
| Social proof | ❌ MOCK_ACHIEVEMENTS | BIG-54 |

---

## 2026-05-03 Sync

- Verified all 8 feature tickets (BIG-50 through BIG-57) have correct project labels
- All 7 dream state items confirmed covered — no new tickets created
- BIG-1 through BIG-4 are workspace setup placeholders (no project label needed)
- Git pull: repo already up to date
- Updated DREAM_STATE_COVERAGE.md to reflect BIG team state

## Notes
- GitHub is up-to-date (no new commits since last sync)
- 6 PS-specific project labels exist: AI & ML, Backend, Content, Growth, Infrastructure, Mobile App
- No duplicate tickets in current BIG team
- BIG-1 through BIG-4 are original workspace setup placeholders (Done state)
