# Phase 3 Grading and Enforcement — Submission Gate, Judge Brief, AI Grading Pipeline, DQ Policy, Spot-Check

**Version:** 1.0
**Date:** 2026-05-09
**Active dates:** May 22 (submission) through May 26 (judging)
**Audience:** Organizers, judges, AI grading operators

---

## What This Document Is

Specification for the integrity layer of Phase 3 / Round 1. This is what makes real testing the path of least resistance and faking the path of greatest risk.

Five components:
1. Submission Gate — what must be present in submission
2. Judge Brief — how judges score with evidence weighting
3. AI Grading Pipeline — three-pass video scoring
4. DQ Policy — what gets a team disqualified
5. Spot-Check Protocol — random verification at scale

---

## 1. Submission Gate

Round 1 submission deadline: May 22, 23:59.

### Required artifacts

Submission portal accepts only when ALL of the following are present:

| # | Artifact | Detail |
|---|---|---|
| 1 | Round 1 Video | 3–5 min, MP4, ≤200 MB |
| 2 | Pitch deck | PDF, optional but recommended |
| 3 | Pretotype | Live link or recorded demo |
| 4 | Phase 3 sprint logs | All cycles' hypotheses, tests, syntheses |
| 5 | Tester contact list | Name + role + contact channel for ALL Phase 3 testers |
| 6 | Daily check-in record | ≥7 of 10 days submitted |
| 7 | Mid-phase synthesis | Submitted May 17 |
| 8 | Public hypothesis ritual | ≥2 cycle hypotheses pre-registered in Discord |
| 9 | App learning module completion | 100% of 9 modules + quiz pass |
| 10 | Track minimums | HS: ≥3 fresh testers. Uni: ≥5 fresh testers. (Beyond Phase 2 sample.) |

### Video requirements

Inside the video:
- ≥2 raw user clips, ≥20 sec each, real user voice or interaction
- Each clip captioned with user name + role
- Iteration arc visible: Cycle 1 hypothesis → test → ONE variable changed → Cycle 2 → result
- At least one moment where team admits something they were wrong about

### Soft gate vs hard gate

- Hard gate (cannot submit): items 1, 4, 5, 7, 9, 10
- Soft gate (submission accepted but Problem Statement + Solution Effectiveness scores capped at 50% of weight): items 2, 3, 6, 8 + video requirements

Cap structure means missing soft requirements lose roughly 12.5 / 25 = 12.5 points of total score. Massive structural penalty; clever teams cannot win without all items.

### Submission portal mechanics

- Built into Self-Learning Platform
- Pre-validation runs automatically: checks file types, durations, presence of required fields
- Integration check: pulls daily check-in count, hypothesis ritual posts, module completion from platform DB
- Confirmation email with submission receipt + summary of what gates passed/failed

---

## 2. Judge Brief

Distributed to all Round 1 judges before review begins. One page. Top of every scoring sheet.

### Cover page

```
ROUND 1 JUDGING — EVIDENCE-WEIGHTED SCORING

Round 1 evaluation rewards EVIDENCE quality, not pretotype polish.
Within Problem Statement (25%) and Solution Effectiveness (25%),
weight HOW judging by what the team showed:

POSITIVE SIGNALS (score higher)
✓ Real user clips with user name + role displayed
✓ Specific painful detail in user quotes (numbers, time, money,
  frustration)
✓ User quote contradicts team's initial hypothesis
✓ Team admits something they were wrong about
✓ Pretotype change attributed to specific user behavior
✓ ≥2 cycles shown with ONE variable changed between

NEGATIVE SIGNALS (score lower)
✗ Generic "would use this" testimonials
✗ All user clips have similar voice or wording
✗ No specific painful details
✗ Hypothesis identical across cycles
✗ Pretotype changes not tied to user behavior
✗ Team makes claims with no supporting clip

RED-FLAG CHECKLIST (tick boxes per video)
[ ] ≥2 real user clips shown
[ ] ≥1 specific painful detail quoted
[ ] Team admits a wrongness
[ ] Pretotype change attributed to user feedback
[ ] No generic future-tense "would" testimonials

0 BOXES TICKED → Problem Statement + Solution Effectiveness CAPPED
AT 50% of weight.

This is mechanical. No interpretation fight.

The AI grading pipeline runs first. You see AI scores + summary
+ red-flag checklist + suspicion score before scoring. Trust your
own judgment. AI is advisory.
```

### Judge calibration call

30-min calibration call before review begins. Show 3 example videos:
- High-evidence example
- Low-evidence (vanity prototype) example
- Suspicious example (potential fraud)

Walk through scoring each. Align judges on signal strength.

---

## 3. AI Grading Pipeline

### Three-pass design

```
┌────────────────────────────────────────────────────────────┐
│ PASS 1 — Extractor                                         │
│ Model: Gemini 2.5 Flash (cheap)                            │
│ Cost: ~$0.05 per video                                     │
├────────────────────────────────────────────────────────────┤
│ Input: video file + tester contact list + sprint logs +    │
│        daily check-ins + hypothesis ritual posts           │
│ Output JSON:                                                │
│   - transcript with speaker labels and timestamps          │
│   - user_clips: [{timestamp, duration, speaker, quote,     │
│       has_user_name_caption}]                              │
│   - team_claims: list of every assertion team makes        │
│   - red_flags: [generic_praise, future_tense_only,         │
│       identical_user_voice, no_painful_detail,             │
│       no_admitted_wrong, ai_voice_signature,               │
│       hypothesis_identical_across_cycles,                  │
│       no_iteration_attribution]                            │
│   - rubric_evidence: per criterion, raw quotes mapped      │
│   - cross_check: tester names match contact list? T/F      │
│   - cross_check: tester names overlap Phase 2 list? T/F    │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│ PASS 2 — Scrutinizer                                       │
│ Model: Claude Opus 4.7 OR Gemini 2.5 Pro                   │
│ Cost: ~$0.40 per video                                     │
├────────────────────────────────────────────────────────────┤
│ Input: Pass 1 JSON + raw video + Round 1 rubric +          │
│        judge brief                                          │
│ Output:                                                     │
│   - score per criterion (0–100) with citation timestamps   │
│   - red_flag_checklist: 5 boxes Y/N                        │
│   - cap_applied: T/F (if 0 boxes ticked)                   │
│   - suspicion_score: 0–10                                  │
│   - 200-word summary for human reviewer                    │
│   - confidence: high / med / low                           │
│   - key_evidence: top 3 quotes/moments supporting score    │
│   - missing_evidence: top 3 gaps                           │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│ PASS 3 — Human Reviewer                                    │
│ Time: ~5 min per video on average                          │
├────────────────────────────────────────────────────────────┤
│ Reviews:                                                    │
│   - All low-confidence Pass 2 outputs                      │
│   - All suspicion_score ≥ 6                                │
│   - All borderline (top 30 cutoff ± 5 points)              │
│   - Random 20% audit of remaining                          │
│ Time budget: ~25 videos × 5 min = ~2 hours                 │
└────────────────────────────────────────────────────────────┘
```

### Cost estimate

- Pass 1: $0.05 × 80 = $4
- Pass 2: $0.40 × 80 = $32
- Pass 3 (human): time only
- **Total AI cost: ~$36**

### Calibration

Before live grading, run 5 calibration videos through pipeline:
- 2 known-good examples (high evidence)
- 2 known-bad examples (vanity prototype)
- 1 planted fake (AI-generated user clips)

Tune Pass 2 prompt until pipeline correctly distinguishes all 5. Document AI as advisory; human is final.

### Pipeline implementation

Build steps:
1. Video upload to Supabase storage on submission
2. Trigger Pass 1 via Cloudflare Workers / Vercel function
3. Pass 1 output stored in DB
4. Trigger Pass 2 via API call (Claude / Gemini)
5. Pass 2 output stored, judge dashboard updated
6. Human reviewer queue auto-prioritized by confidence + suspicion

Effort: ~2 days engineering, given existing platform.

### Failure handling

- If Pass 1 fails (video unparseable): fall back to manual transcription, flag team for technical issue
- If Pass 2 fails: queue for direct human review, no AI score
- If suspicion_score = 10 (likely full fake): auto-route to spot-check immediately, do not score

---

## 4. DQ Policy

### What gets DQ

Disqualification triggers (any one):

1. **Faked user evidence** — spot-check confirms a listed tester has no recollection of the test session OR was misrepresented OR is fictional
2. **AI-generated user clips presented as real** — AI grading detects voice synthesis with high confidence + human reviewer confirms
3. **Backfilled daily check-ins** — timestamp tampering detected
4. **Cross-team copy-paste** — vector similarity check finds team's submitted text materially copied from another team's
5. **Plagiarized pretotype** — clear copy of another submission

### What does NOT get DQ

- Honest mistakes (mislabeled tester, missing field, late submission within grace window)
- Weak evidence (low score, not zero score)
- Hypothesis that turned out wrong (this is honest science)
- Killed cycles (this is honest science)
- Failure to recruit minimum testers (capped score, not DQ)

### DQ procedure

1. AI flags or spot-check finds suspected fraud
2. Organizer investigates within 48 hours: contact testers, review timestamps, examine evidence
3. If fraud confirmed, organizer notifies team via email with evidence
4. Team has 24 hours to respond with explanation or appeal
5. Final decision by organizer panel (3 organizers, simple majority)
6. If DQ confirmed:
   - Team removed from Round 1
   - Public announcement in Discord (no shaming language, factual): "Team X disqualified for fabricated user evidence per policy."
   - Team cannot appeal further within Round 1; can re-enter future hackathons

### Why public DQ matters

Game theory anchor. One public DQ mid-Phase 3 (if fraud caught early) resets every team's calculus. Without public consequence, fraud risk-reward favors fakers.

If no fraud detected, no DQ. That's also fine — sets precedent that policy is real but rarely needed.

---

## 5. Spot-Check Protocol

### Strategy: Random 20% + Winner Audit

**Phase 1 — Random sample during Phase 3**
- Randomly select 20% of teams (~13 of 65) for full tester contact verification
- Done during Phase 3 (May 14–18 window), not after submission
- Why during Phase 3: catches fraud early, allows public DQ to reset incentives mid-stream

**Phase 2 — Winner audit post-submission**
- All top-30 advancing teams (HS 20 + Uni 10) get full audit before final selection
- Any fraud found removes team, replaces with next-ranked

**Phase 3 — Flagged team audit**
- Any team with AI suspicion_score ≥ 6 audited regardless of random selection
- Any team flagged by mentor digest audited

### Verification protocol

For each audited team:

1. Pull team's tester contact list from submission
2. For each listed tester, send template message:

```
Hi [name], I'm [organizer name] from the [Hackathon] organizing team.

Team [Team Name] listed you as a user testing participant for their
project on [date]. We're conducting standard verification.

Could you confirm:
1. Did Team [Name] interview/test with you on [date]?
2. Did they show you a prototype related to [topic]?
3. Did the session last roughly [X] minutes?

This is a yes/no/don't-remember check. No detailed feedback needed.
Reply when convenient. Thanks for supporting the hackathon.
```

3. Tally responses:
   - All confirmed: clear
   - Some "don't remember": probe further with team
   - Any "no, didn't happen": fraud likely, escalate

### Resource estimate

- 20% sample: ~13 teams × 5 testers × 5 min = ~5.5 hours
- Winner audit: ~30 teams × 5 testers × 5 min = ~12.5 hours
- Flagged audits: variable, ~5 hours estimated
- **Total spot-check labor: ~25 hours, distributed across 2–3 organizers over 2 weeks**

### Privacy

Testers consented to spot-check via team's recruiting protocol (Module 7 includes consent line in DM template). Organizers identified, polite, brief, no detailed questions. Data stored max 30 days.

---

## Integration with Submission

```
May 22 23:59 — Submission deadline
    │
    ▼
Submission portal validates hard gates (refuses incomplete)
    │
    ▼
Soft gate items checked, score caps applied where needed
    │
    ▼
Video uploaded → AI Pipeline Pass 1 + Pass 2 (auto, ~30 min/video)
    │
    ▼
Judge dashboard populated with AI scores + summaries
    │
    ▼
May 23 — Judge calibration call
    │
    ▼
May 23–25 — Judges score with red-flag checklist
    │
    ▼
Concurrent: Human Pass 3 review of flagged + borderline videos
    │
    ▼
Concurrent: Winner audit spot-checks on top-30
    │
    ▼
May 26 — Final scoring meeting
    │
    ▼
Round 1 selections announced:
    HS Track: 20 teams advance to Round 2
    Uni Track: 10 teams advance to Round 2
```

---

## Open Decisions

- D22 (open): Submission portal — Self-Learning Platform native vs Google Form fallback?
- D23 (open): AI grading model stack — Gemini-only vs Claude-only vs hybrid?
- D24 (open): Judge calibration delivery — live call vs recorded async?
- D25 (open): Spot-check timing — start mid-Phase 3 (May 14) vs all post-submission?
- D26 (open): DQ panel composition — 3 organizers vs include external advisor?
- D27 (open): Public DQ announcement language — strict factual ("Team X DQ'd for fabricated evidence") vs softer ("Team X removed from Round 1 per policy")?
- D28 (open): Score cap percentage — 50% as designed vs 70% softer vs 0% (full DQ for missing soft gate items)?
