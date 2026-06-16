# TODOS

## Reconcile `status='explored'` readers with the completion ledger
**What:** Audit every surface that reads `path_enrollments.status='explored'` (seed recommendations, My Paths, social proof, velocity analytics, the existing growth RPC) and decide, per reader, whether it migrates to the completion ledger or stays on `status`.
**Why:** Phase 3 introduces a server-owned completion ledger as the trusted completion signal for evolution. The existing surfaces keep reading `status`, so "completed" will mean two different things depending on the screen — a slow split-brain that's painful to debug later.
**Pros:** One consistent definition of "completed" across the app; removes a class of "why does X say done but Y doesn't" bugs.
**Cons:** Cross-cutting touch across recommendations/analytics/profile; some readers may legitimately want the looser `status` semantics.
**Context:** Surfaced by Codex finding #13 in the 2026-06-12 eng review of the Class taxonomy plan (`~/.gstack/projects/passionseed-ps_app/ceo-plans/2026-06-12-class-taxonomy-rpg.md`). Start point: grep for `'explored'` across lib/ and supabase/functions/ once T3a (the ledger RPC) exists.
**Effort estimate:** M (human) → S (CC)
**Priority:** P2
**Depends on / blocked by:** T3a completion ledger (Phase 3a).

## AI class-inference for onboarding (propose-then-confirm)
**What:** Upgrade the reshaped onboarding's Class reveal from rule-mapped (tap interests → Class via a static map) to AI-inferred: the model proposes a best-fit Class from the student's signal and they confirm or change it.
**Why:** v1 uses a deterministic tap→Class map because cold start means no exploration data exists yet. Once class-pick distribution + real exploration behavior accumulate, AI inference becomes meaningfully better than the static map.
**Pros:** Sharper, more personal reveal; uses signal the static map throws away.
**Cons:** Needs accumulated pick/exploration data to beat the rule map; adds an LLM call + its failure modes to the onboarding hot path.
**Context:** Deferred during the 2026-06-12 CEO review of the Class taxonomy + onboarding rethink (`~/.gstack/projects/passionseed-ps_app/ceo-plans/2026-06-12-class-taxonomy-rpg.md`). v1 ships the tap-picker → rule-mapped Class reveal. Start point: once the `classes`/`subclasses` tables + class-pick metric exist and have data.
**Effort estimate:** M (human) → S (CC)
**Priority:** P2
**Depends on / blocked by:** Class taxonomy v1 + reshaped onboarding + class-pick distribution data.

## Career Dreamer — identity statement + skills-based career web
**What:** Borrow Google Career Dreamer's two larger patterns: (1) a narrative "career identity statement" built from the student's interests/experience, and (2) a full skills-based, navigable web of related careers.
**Why:** The survival-verdict work (scope C) already introduces `escape_route_slug`, which creates a tiny career-to-career graph. These patterns are the full version of that idea — exploration by hopping between related careers instead of quiz-and-done.
**Pros:** Differentiated exploration UX; reuses the adjacency edges seeded by survival escape routes; matches the "personalized fusion" moat.
**Cons:** Large feature — needs a relatedness graph across many careers, plus identity-statement generation. Well beyond the survival verdict.
**Context:** Raised during the 2026-06-12 eng review of the Job Explorer Survival Verdict design (`~/.gstack/projects/passionseed-ps_app/bunyasit-main-design-20260612-120924.md`). Start point: once `career_survival` rows + `escape_route_slug` exist, the adjacency graph is partially seeded — extend it to a browsable web.
**Depends on / blocked by:** career_survival table + escape_route_slug (scope C, T1).

## Passion Profile — Expression layer (P2)
**What:** Self-expression customization on the passion-identity profile: passion-tag sticker chips, banner/vibe theme picker, and an archetype-tied avatar frame.
**Why:** GenZ expects to own and decorate their profile, not just receive generated stats. Turns the card from "generated" into "mine."
**Pros:** Strong GenZ retention/ownership lever; makes share cards more distinctive.
**Cons:** New customization UI + storage for user choices; layered on top of the v1 archetype-generated look.
**Context:** Deferred during the 2026-06-12 CEO review of the Passion-Identity Profile (`~/.gstack/projects/passionseed-ps_app/ceo-plans/2026-06-12-passion-identity-profile.md`). v1 ships the archetype-generated look only. Start point: the `public_profiles` table gets columns for tags/theme/frame once it exists.
**Effort estimate:** M (human) → S (CC)
**Priority:** P2
**Depends on / blocked by:** Passion-identity profile v1 + `public_profiles` table.

## Squad feature — interest-matched 5-person explore-together squads (P3)
**What:** The full squad feature: match students into 5-person squads by interest/passion overlap and let them explore seeds together (shared exploration, group surface). Includes the squad data model, matching logic, and squad rooms. The CEO-reviewed profile work deliberately did NOT build this — it only kept the passion-identity object clean enough to attach to.
**Why:** Squads are the core social/retention bet ("explore together"); the profile is the identity node squads are built from.
**Pros:** Reuses `SquadConstellation` viz + the passion archetype + `public_profiles` as the matching substrate; turns solo exploration into a group experience.
**Cons:** Large feature — matching algorithm, group state, real-time/shared exploration, moderation for minors. Net-new social graph (no follow/friend tables exist today).
**Context:** Deferred during the 2026-06-12 CEO review (`~/.gstack/projects/passionseed-ps_app/ceo-plans/2026-06-12-passion-identity-profile.md`). User intent: interest-matched groups of 5 exploring seeds together. Start point: once `public_profiles` + a universal ikigai-derived archetype exist, the matching substrate is partially seeded.
**Effort estimate:** XL (human) → L (CC)
**Priority:** P1 (next major bet after profile)
**Depends on / blocked by:** Passion-identity profile v1, `public_profiles` table, universal archetype derivation, and a new squad/social-graph data model.

## Passion Profile — square 1:1 share export
**What:** Add a 1:1 square export of the passion-identity share card alongside the v1 9:16 story format.
**Why:** Lets students post to feed/grid, not just stories — more reach for the identity card.
**Pros:** Wider sharing surface; cheap once the 9:16 card exists.
**Cons:** Second layout to keep in sync with the story card; doubles share QA.
**Context:** Deferred during the 2026-06-12 design review (D4 chose 9:16 story-first). Start point: once the 9:16 share card ships, fork a square composition from the same data.
**Effort estimate:** S (human) → S (CC)
**Priority:** P3
**Depends on / blocked by:** Passion-identity 9:16 share card (T5).

## Passion Profile — regenerate design mockups when OpenAI org verified
**What:** Run /plan-design-review mockup generation for the passion-identity profile once the gstack designer works (OpenAI org verification was blocking image generation on 2026-06-12).
**Why:** The design decisions (hybrid layout, archetype system, states) were spec'd text-only; real mockups would de-risk before/during build.
**Pros:** Visual reference for the implementer; catches slop the text review can't see.
**Cons:** None material — just needs the API unblocked.
**Context:** Designer returned "OpenAI organization verification required" during the 2026-06-12 design review. Verify at platform.openai.com/settings/organization.
**Effort estimate:** S (human) → S (CC)
**Priority:** P2
**Depends on / blocked by:** OpenAI org verification.

## 6-Class RPG career taxonomy (Class → Subclass → Path → Quest → Squad) — its own plan
**What:** The full RPG-style career taxonomy: 6 Classes (Builder, Strategist, Creator, Analyst, Healer, Producer) × 5 subclasses, each Path(seed) carrying 6 stats (Growth, Stability, Creativity, Human Contact, Technical Depth, Projectability), a class-evolution mechanic (Class→Subclass→Path advances via completed quests), and a Browse homepage restructure (6 class cards → subclass detail → path detail). Class assignment = explicit student pick in Browse.
**Why:** This is the identity backbone the passion-identity profile reads. The profile's Class hero is blocked on it (currently renders Seedling until it exists).
**Pros:** Concrete, opinionated identity system students want to wear; powers profile evolution + squad matching; one career-attribute model.
**Cons:** Large — net-new schema (class/subclass/6-stat/evolution metadata on seeds, class↔seed FK, taxonomy versioning), career_survival→Growth/Stability mapping, ~30 subclass content entries, Browse rework. No schema exists today (codex #8,#9,#10).
**Context:** Surfaced + scoped during the 2026-06-12 eng review of the passion-identity profile (`~/.gstack/projects/passionseed-ps_app/ceo-plans/2026-06-12-passion-identity-profile.md`). User is committed to building it. Decision D8: design it as its own CEO+eng plan FIRST; profile ships Class-independent v1 meanwhile. Unify the 6 stats with career_survival (single source of truth — survival tier feeds Growth/Stability).
**Effort estimate:** XL (human) → L (CC)
**Priority:** P1 (gates the profile's Class identity)
**Depends on / blocked by:** career_survival table; a career→seed mapping (does not exist yet).

## Passion Profile — public viewer hardening (rate limits, blocking, link revocation)
**What:** Beyond the v1 handle/viewer: rate limiting, non-enumerable handles, user blocking, abuse reporting, search-engine controls, and share-link revocation for the public profile.
**Why:** Public surfaces for minors need a real threat model, not just RLS (codex #5). v1 ships private/share-only default; this hardens the public viewer before it scales.
**Pros:** Makes the public surface safe to broaden; addresses the scrapeable-minors-dataset risk.
**Cons:** Real security/infra work; some needs an edge function or gateway (RLS can't rate-limit).
**Context:** From the 2026-06-12 eng review (codex outside voice #5). v1 default is private/share-only (D5); broadening to public needs this first.
**Effort estimate:** L (human) → M (CC)
**Priority:** P2
**Depends on / blocked by:** public_profiles + handle/viewer v1 (ET1, ET5).

## Survival DB hardening — tier CHECK + aliases GIN index
**What:** Add a Postgres CHECK/enum constraint on `career_survival.tier` (growing|shifting|exposed) and a GIN index on `aliases text[]`.
**Why:** CHECK stops a typo'd tier from ever being inserted (defense in depth on the trust-critical field, beyond the client guard from CQ2). GIN index keeps the alias lookup (`aliases @> array[name]`) fast as the table grows past a few dozen rows.
**Pros:** Near-free hardening; bad data can't reach a student; alias lookup stays fast at scale.
**Cons:** None material — small migration. Index is premature at ~20 rows.
**Context:** From eng review 2026-06-12. Client-side tier validation (CQ2 option A) ships in v1; this is the DB-level backstop (CQ2 option C) deferred.
**Depends on / blocked by:** career_survival table (scope C, T1).
