# Phase 3 User Testing — Main Loop Document

**Version:** 1.0
**Date:** 2026-05-09
**Status:** READY TO BUILD
**Connects to:** Phase 2 Ideation Sprint Spec (2026-04-15), Round 1 Submission (2026-05-22)

---

## What This Document Is

Orchestration document for Phase 3. Defines the system architecture, component responsibilities, timeline, and how each piece connects. Individual component specs live alongside this file.

Core thesis: workshop alone cannot teach iteration discipline. Real behavior change happens during the 10 days teams are alone with users. System distributes teaching across multiple media, each doing what it is best at.

---

## Goal

Teams ship Round 1 video May 22 with real hypothesis-test-iterate evidence arc. Round 1 evaluation rewards user evidence quality inside Problem Statement (25%) and Solution Effectiveness (25%) criteria. Vanity prototypes lose. Real testing wins.

---

## System Architecture

```
                   GOAL: Round 1 video May 22
                   with real iteration evidence
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
   IGNITION              METHODOLOGY             ENFORCEMENT
       │                      │                      │
   Workshop May 11        App Learning           Submission Gate
   Clips drumbeat         AI Mentor at scale     Judge Brief
   Public commit          Daily check-ins        AI Grading Pipeline
                          Mid-phase synthesis    DQ Policy
                          Public hypothesis      Spot-check
                            ritual
```

Each medium does one job. Workshop = emotion + identity shift. App = on-demand methodology. Clips = repetition. Dailies + AI mentor = behavior shaping at scale. Gate + grading = forcing function.

No single point of failure. Teams who skip workshop catch up via clips + app. Teams who skip app caught by AI mentor on daily check-ins. Teams who fake caught by mid-synthesis + spot-check + AI grading.

---

## Phase 2 → Phase 3 Continuity

Phase 3 is not a new methodology. It is execution of the Phase 2 sprint loop with sharper hypotheses, fresh users, and judging stakes.

Teams enter Phase 3 with:
- Prototype Evidence Pack from Phase 2
- Final pretotype from last Phase 2 sprint cycle
- A hypothesis that held in Phase 2 testing
- Mentor Proceed decision

Phase 3 = run 2–3 more sprint cycles, each with:
- A new or sharper hypothesis
- ONE controlled variable changed from prior cycle
- Fresh testers (not the Phase 2 sample)
- Behavioral observation, not opinion collection
- Synthesis that names what was learned

Phase 3 ends with Round 1 video submission containing the iteration arc.

---

## Component Index

| File | Component | Job |
|---|---|---|
| `workshop.md` | Workshop May 11 + Clips drumbeat | Ignition + repetition |
| `app-learning-block.md` | Self-paced methodology modules | Textbook |
| `daily-system.md` | Daily check-ins + AI mentor + mid-phase synthesis + public hypothesis ritual | Behavior shaping at scale |
| `grading-and-enforcement.md` | Submission gate + judge brief + AI grading pipeline + DQ policy + spot-check | Forcing function + integrity |

---

## Timeline

```
PRE-MAY 11      MAY 11          MAY 12-21              MAY 22       MAY 23-26
                                                                      
App modules  →  Workshop     →  Daily check-ins   →  Submit    →  AI grading
unlock          (ignition)      + AI mentor                         (3-pass)
                + clips drop    + daily clip         Gate           + human
                                + leaderboard        enforces       review
                                + public             all evidence
                                  hypothesis
                                + mid-synthesis
                                  (May 17)
                                + DQ sword
```

### Detailed schedule

| Date | Event | Required |
|---|---|---|
| Pre-May 11 | App learning modules unlock. Teams complete before workshop. | Module 1 + 2 done before workshop entry |
| May 11 | Workshop (60 min, live + recorded). | Attend live OR watch all 8 daily clips + pass quiz before submission |
| May 11 evening | Discord public commitment posted by every team | Cycle 1 hypothesis + first tester name + test date booked |
| May 12 | Day 1: clip drops, first daily check-in due 22:00 | Cycle 1 hypothesis published in Discord ritual thread |
| May 13 | Day 2: clip drops, daily check-in due | First test session run with fresh tester |
| May 14 | Day 3: clip drops, daily check-in due | |
| May 15 | Day 4: clip drops, daily check-in due | Cycle 1 synthesis |
| May 16 | Day 5: clip drops, daily check-in due | Cycle 2 hypothesis published |
| May 17 | Day 6: clip drops, daily check-in due, mid-phase synthesis due 22:00 | Mid-phase synthesis paragraph + current pretotype state link |
| May 18 | Day 7: clip drops, daily check-in due | Cycle 2 testing |
| May 19 | Day 8: clip drops (anti-fraud reminder), daily check-in due | |
| May 20 | Day 9: daily check-in due | Cycle 2 synthesis. Optional Cycle 3 starts |
| May 21 | Day 10: daily check-in due (final) | All testing complete. Video production. |
| May 22 | Round 1 submission deadline 23:59 | Submission gate enforces all evidence requirements |
| May 23–26 | AI grading + judge review | Spot-check 20% of teams + winner audit |

---

## Sticky Phrases (memetic payload)

Three phrases drilled across all media. Teams should hear them in their sleep by May 22.

1. **"Pretotype is the question. User is the answer."** — Reframe: builders → scientists.
2. **"One variable per cycle."** — Iteration discipline. Change one thing, isolate signal.
3. **"Shut up and watch."** — Observation discipline. Behavior beats opinion.

Workshop anchors them. Clips repeat them. Daily AI mentor uses them as feedback language. Modules teach them. Judge brief rewards evidence of them.

---

## Design Principles

### Workshop is ignition, not teaching
60 min cannot teach iteration discipline. Workshop's job is identity shift, emotional stakes, sticky phrases, public commitment. Methodology lives in app.

### Methodology is on-demand, not delivered
Teams reach for app modules when stuck. Self-paced beats lecture for technique transfer.

### AI mentor is the biggest leverage point
50–80 teams × 10 days = 500–800 team-days. Zero human capacity. AI fills it. Daily check-in feedback within 60 sec extends Phase 2 mentor model to scale.

### Public > private
Hypothesis ritual, leaderboard, mid-phase synthesis — all public in Discord. Peer signal does work mentors cannot.

### Pre-registration beats post-hoc
Teams publish cycle hypothesis BEFORE running the test. Cannot retrofit success. Academic-grade rigor for hackathon. Cheap, massive integrity dividend.

### Integrity is structural, not aspirational
Don't ask teams to be honest. Make faking harder than testing. AI grading + spot-check + DQ policy make real testing the path of least resistance.

### Redundancy beats single channel
Every key teach lands in 3+ places: workshop + clip + module + AI feedback. Teams who skip one channel get the same content via another.

---

## Grading Framework — Phase 3

Phase 3 does not have its own end-of-phase rubric. The Round 1 submission video is the artifact. AI grading + judges score it on the contest rubric. See `grading-and-enforcement.md`.

Phase 3 internal rubric (used by AI mentor + mid-phase synthesis grading) extends Phase 2 dimensions:

| Dimension | What it measures |
|---|---|
| Hypothesis quality | Each cycle has a specific testable claim (Phase 2 D1) |
| Iteration discipline | ONE variable changed per cycle (NEW for Phase 3) |
| Behavioral evidence | Captures user actions, not opinions (Phase 2 D4) |
| Tester freshness | New users in Phase 3 cycles, not Phase 2 sample (NEW) |
| Synthesis arc | Learning evolves cycle to cycle (Phase 2 D5 + Evidence Pack D2) |
| Decision honesty | Synthesis can name what was wrong (Phase 2 Evidence Pack D4) |

These dimensions feed the AI grading pipeline scorecard.

---

## Connection to Phase 2 and Round 1

### From Phase 2

Entry condition: Phase 2 Evidence Pack submitted with Proceed decision.

Phase 2 evidence base still applies:
- Phase 1 user research (named target user, pain quotes, system map)
- Phase 2 sprint cycles (hypothesis evolution, prior tests, prior pretotype iterations)

Phase 3 does not replace Phase 2 evidence. It deepens it.

### To Round 1 (May 22)

Round 1 submission inherits Phase 3 outputs:
- Final pretotype (last Phase 3 cycle)
- Phase 3 sprint logs (cycles, hypotheses, tests)
- Mid-phase synthesis
- Daily check-ins log
- Public hypothesis pre-registration thread
- Tester contact list
- Raw user video/audio clips
- Iteration arc story

Submission gate enforces presence of all of the above. See `grading-and-enforcement.md`.

---

## Open Decisions

- D1 (DECIDED): System scope = full system (workshop + app + dailies + AI mentor + grading + DQ).
- D2 (DECIDED): Workshop format = 60 min live + recorded + 8 daily clips.
- D3 (DECIDED): Workshop focus = controlled iteration discipline (hypothesis + single-variable + behavioral observation), NOT customer discovery redo.
- D4 (DECIDED): HS min 3 fresh testers, Uni min 5 fresh testers per Phase 3 (beyond Phase 2 sample).
- D5 (DECIDED): DQ policy active. Public DQ for fake evidence.
- D6 (open): Spot-check scale strategy — random 20% + winner audit (recommended) vs tiered all-team check.
- D7 (open): Mentor digest delivery — daily email vs Slack channel vs Discord DM.
- D8 (open): Public hypothesis ritual — Discord pinned thread per team vs central pre-registration channel.
