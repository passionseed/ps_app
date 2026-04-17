# Phase 2 Ideation Sprint — Main Loop Document

**Version:** 1.0  
**Date:** April 15, 2026  
**Status:** READY TO BUILD  
**Connects to:** Phase 1 Systems Thinking Spec (2026-04-07), Phase 3 (TBD)

---

## What This Document Is

This is the orchestration document for Phase 2. It defines:

- the full loop structure and how activities connect
- the navigation rules (how gate decisions route)
- the grading framework across the whole phase
- the evidence accumulation model
- the mentor review guide
- timing guidance for hackathon context
- how Phase 2 connects to Phase 1 and Phase 3

Individual activity docs live alongside this file. This doc is the skeleton. The activity docs are the flesh.

---

## The Full Loop

```
╔══════════════════════════════════════════════════════════════╗
║                    PHASE 2: IDEATION SPRINT                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ENTRY CONDITION: Phase 1 Problem Proof Pack submitted       ║
║  with Proceed decision (or Pivot with revised framing)       ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [LINEAR ENTRY — run once]                                   ║
║                                                              ║
║  Activity 1 ──► Activity 2 ──► Activity 3                    ║
║  Orientation    Generate       Select Best Bet               ║
║                 Many Ideas     + Hypothesis                  ║
║                                      │                       ║
║                                      ▼                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [PROTOTYPE SPRINT LOOP — 1 to 3 cycles]                     ║
║                                                              ║
║              ┌──────────────────────────┐                    ║
║              │                          │                    ║
║              ▼                          │                    ║
║     Sprint Step A                       │                    ║
║     Choose Method                       │                    ║
║          │                              │                    ║
║          ▼                              │                    ║
║     Sprint Step B                       │                    ║
║     Build Prototype                     │  Loop again        ║
║          │                              │  (Refine)          ║
║          ▼                              │                    ║
║     Sprint Step C                       │                    ║
║     Test With Real Users                │                    ║
║          │                              │                    ║
║          ▼                              │                    ║
║     Sprint Step D ──── Refine ──────────┘                    ║
║     Synthesize + Gate                                        ║
║          │                                                   ║
║          ├── Pivot Concept ──► back to Activity 3            ║
║          │                                                   ║
║          ├── Kill ──► Exit Phase 2 (go to Phase 1 or stop)   ║
║          │                                                   ║
║          └── Proceed ──► Activity 4 (Evidence Pack)          ║
║                                                              ║
║  [Max 3 cycles. After 3, must Proceed or Kill.]              ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [EXIT — run once]                                           ║
║                                                              ║
║  Activity 4                                                  ║
║  Submit Prototype Evidence Pack                              ║
║                                                              ║
║  EXIT CONDITION: Evidence Pack submitted with decision       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Navigation Rules

### Entry

Teams enter Phase 2 from Phase 1 in one of two states:

| Phase 1 exit | Phase 2 entry |
|---|---|
| Proceed | Enter Activity 1 with clean Problem Proof Pack |
| Pivot | Enter Activity 1 with revised problem framing. The revised framing is the starting hypothesis. The Phase 1 evidence base still applies. |
| Kill | Do not enter Phase 2 |

### Within the linear entry

Activities 1 → 2 → 3 run in sequence. No skipping.

Activity 3 produces a selected idea and a named hypothesis. Both are required before the sprint loop can begin.

### Within the sprint loop

- Teams enter Sprint Step A at the start of each cycle.
- Steps A → B → C → D run in sequence within each cycle.
- At Sprint Step D, the team selects a gate decision:

| Gate decision | Routes to |
|---|---|
| Refine (loop again) | Sprint Step A, next cycle. Team must state a new or refined hypothesis before re-entering. |
| Pivot Concept | Activity 3. Team selects a different idea from the shortlist (or generates new ones) and states a new hypothesis. Pivot resets the cycle counter to 0. |
| Kill | Exit Phase 2. No Evidence Pack submitted. Team returns to Phase 1 or exits the program. |
| Proceed to Phase 3 | Activity 4 (Evidence Pack). |

### Loop limit

Maximum 3 sprint cycles per idea. After 3 cycles, the gate forces Proceed or Kill. No more Refine options are shown.

If a Pivot Concept occurs, the cycle counter resets. The new idea gets its own 3-cycle budget.

### Exit

Activity 4 is the exit point. Teams submit the Prototype Evidence Pack and receive a final phase grade.

---

## Feedback Layer Summary

Every sprint step and Activity 3 have a two-layer feedback loop.

### Layer 1: AI feedback (immediate)

Fires within 60 seconds of each submission. Non-blocking. Appears as a feedback card below the confirmation.

AI feedback never scores. It asks questions and surfaces patterns.

| Step | What AI checks |
|---|---|
| Activity 3 | Is the hypothesis specific? Is it testable with a prototype? |
| Sprint Step A | Does the method match the hypothesis? |
| Sprint Step B | Is the prototype test-ready? Can a user interact without coaching? |
| Sprint Step C | Are test notes behavioral (not just opinion)? Any patterns? What's missing? |
| Sprint Step D | Does the evidence actually support the gate decision? |

### Layer 2: Human feedback (async, non-blocking)

Mentors and peers can comment on any step. Team proceeds without waiting.

Mentor actions per step: comment, thumbs-up, flag for attention.

Sprint Step D with Proceed to Phase 3 shows a "waiting for mentor acknowledgment" indicator. Soft gate: auto-opens after 30 minutes if no response.

---

## Grading Framework

### Overview

Phase 2 grading has three layers:

1. **Step-level completion checks** — did the team submit what was required at each step?
2. **Cycle-level rubric** — how well did the team execute each sprint cycle?
3. **Phase-level rubric** — what is the quality of the Evidence Pack and the final decision?

### Grading scale

All rubric dimensions use a 4-level scale:

| Level | Label | Meaning |
|---|---|---|
| 0 | Missing | Not submitted or not attempted |
| 1 | Developing | Submitted but does not meet the standard |
| 2 | Solid | Meets the standard clearly |
| 3 | Excellent | Exceeds the standard with notable depth or honesty |

### Step-level completion checks (pass/fail)

These are binary. A step is complete or it is not.

| Step | Required to pass |
|---|---|
| Activity 2 | Minimum 5 distinct ideas submitted |
| Activity 3 | One selected idea + one hypothesis statement submitted |
| Sprint Step A | Prototype method named with rationale |
| Sprint Step B | Prototype artifact submitted (photo / link / description) |
| Sprint Step C | Test notes from 3+ sessions submitted |
| Sprint Step D | Sprint log entry submitted with gate decision |
| Activity 4 | Evidence Pack submitted with all required sections |

An incomplete step blocks progression in the app. A mentor can override a block if there is a documented reason.

### Cycle-level rubric

Applied once per sprint cycle by the mentor (or auto-assessed by AI as a draft for mentor review).

#### Dimension 1: Hypothesis quality

| Level | Criteria |
|---|---|
| 0 | No hypothesis stated |
| 1 | Hypothesis is vague — "we think users will like it" |
| 2 | Hypothesis names a specific user action or reaction — "we think users will drop off at the pricing step because they don't trust the source" |
| 3 | Hypothesis is specific, names what would prove or break it, and connects to a Phase 1 finding |

#### Dimension 2: Method-hypothesis fit

| Level | Criteria |
|---|---|
| 0 | Method not chosen or rationale missing |
| 1 | Method chosen without regard to hypothesis |
| 2 | Method is appropriate for what the hypothesis requires |
| 3 | Method is the fastest possible way to test this specific hypothesis |

#### Dimension 3: Prototype test-readiness

| Level | Criteria |
|---|---|
| 0 | No artifact submitted |
| 1 | Artifact exists but a user could not interact with it without coaching |
| 2 | A user with no context could engage with the prototype and produce observable behavior |
| 3 | Prototype isolates the hypothesis cleanly — nothing extra is in it |

#### Dimension 4: Test evidence quality

| Level | Criteria |
|---|---|
| 0 | No test notes or notes from teammates only |
| 1 | Notes capture opinions only ("they said they liked it") |
| 2 | Notes capture specific behaviors ("user paused at step 3, asked what this button does, then left the flow") |
| 3 | Notes capture behavior, surprise, and at least one unexpected finding that changed the team's view |

#### Dimension 5: Synthesis quality

| Level | Criteria |
|---|---|
| 0 | No synthesis submitted |
| 1 | Synthesis restates what happened without interpreting it |
| 2 | Synthesis names a pattern and evaluates the hypothesis against the evidence |
| 3 | Synthesis names what changed between this cycle and the prior one (or what was wrong about the original hypothesis) and explains the gate decision clearly |

**Cycle-level total: 15 points max per cycle.**

### Phase-level rubric (Evidence Pack)

Applied once at the end of Phase 2.

#### Dimension 1: Idea grounding

| Level | Criteria |
|---|---|
| 0 | No idea shortlist or rationale |
| 1 | Shortlist exists but ideas are variations of one concept |
| 2 | Multiple distinct ideas, selected idea connected to Phase 1 evidence |
| 3 | Multiple distinct ideas, selected idea is clearly the best bet given Phase 1 evidence, rejection of other ideas is explained |

#### Dimension 2: Loop honesty

| Level | Criteria |
|---|---|
| 0 | Only one cycle run with no explanation |
| 1 | Multiple cycles but each one tests the same thing |
| 2 | Each cycle tests a specific, named hypothesis that evolved from the previous cycle |
| 3 | The sprint log shows a clear learning arc — the team can explain how their understanding changed with each cycle |

#### Dimension 3: Evidence quality

| Level | Criteria |
|---|---|
| 0 | No test evidence |
| 1 | Evidence from teammates or from leading questions |
| 2 | Evidence from real users, behavioral, with at least one surprise finding |
| 3 | Evidence across multiple cycles, showing pattern consistency or contradiction, with clear interpretation |

#### Dimension 4: Decision quality

| Level | Criteria |
|---|---|
| 0 | No decision stated |
| 1 | Decision stated without evidence support |
| 2 | Decision supported by evidence from the sprint log |
| 3 | Decision integrates evidence across all cycles, names the most influential finding, and states what would change the decision |

**Phase-level total: 12 points max.**

### Final grade composition

| Component | Weight |
|---|---|
| Step completion (all steps pass/fail) | Required — no weight, but gates submission |
| Average cycle rubric score | 50% |
| Evidence Pack rubric score | 50% |

**Total phase score: 0–100 normalized from the rubric totals.**

Conversion:
- Cycle rubric avg: (sum across cycles / number of cycles / 15) × 100 × 0.5
- Evidence Pack: (Evidence Pack score / 12) × 100 × 0.5

### Grade thresholds

| Score | Outcome |
|---|---|
| 80–100 | Excellent — strong signal, ready for Phase 3 |
| 60–79 | Solid — proceed with mentor guidance |
| 40–59 | Developing — recommend additional sprint cycle before Phase 3 |
| Below 40 | Not yet — revisit problem framing before continuing |

Thresholds are advisory. Mentors can override with written rationale.

---

## Evidence Accumulation Model

Phase 2 produces a layered evidence record. Each cycle adds to it.

```
Cycle 1 ──► Hypothesis 1 + Prototype 1 + Test Notes 1 + Sprint Log 1
                                                │
                                                ▼
Cycle 2 ──► Hypothesis 2 + Prototype 2 + Test Notes 2 + Sprint Log 2
                                                │
                                                ▼
Cycle 3 ──► Hypothesis 3 + Prototype 3 + Test Notes 3 + Sprint Log 3
                                                │
                                                ▼
                             Evidence Pack = synthesis across all cycles
```

The Evidence Pack is not a summary of the last cycle. It is a synthesis across all cycles. Mentors and reviewers should be able to trace the learning arc from Cycle 1 to the final decision.

---

## Mentor Review Guide

### What mentors are assessing

Mentors are not assessing whether the idea is good. They are assessing whether the team learned.

The key question: **did the team's understanding change across cycles?**

A team that ran one cycle and got lucky with a great prototype is weaker than a team that ran two cycles, changed their hypothesis, and can explain why.

### What to look for per cycle

- Does the hypothesis name a specific user behavior or reaction?
- Did the prototype actually test that hypothesis?
- Do the test notes capture what users did (not just what they said)?
- Does the synthesis connect the evidence to the hypothesis honestly?
- Is the gate decision the right one given the evidence?

### Red flags

- Hypothesis is the same in cycle 1 and cycle 2 (team is not learning)
- Test notes contain only positive reactions (team is pitching, not testing)
- Gate decision is Proceed but the synthesis names no supporting evidence
- All test users are teammates or close friends of the team

### When to comment vs flag vs thumbs-up

- **Thumbs-up:** step is solid, keep going
- **Comment:** something to note — not blocking but worth discussing
- **Flag:** the team should not proceed past this step without addressing this

Use flag sparingly. It is a signal, not a block.

### Mentor timing expectations in hackathon context

- Sprint Step D acknowledgment: ideally within 15 minutes
- General comments: within 30 minutes
- If no response in 30 minutes, the gate auto-opens and the team proceeds

Mentors are not gatekeepers. They are coaches with real-time visibility.

---

## Timing Guide

Phase 2 is designed for hackathon Day 2–3.

### Minimum viable Phase 2 (1 sprint cycle)

| Activity | Time |
|---|---|
| Activity 1 (Orientation) | 10 min |
| Activity 2 (Generate Ideas) | 30 min |
| Activity 3 (Select + Hypothesis) | 20 min |
| Sprint Step A (Choose Method) | 15 min |
| Sprint Step B (Build Prototype) | 90–120 min |
| Sprint Step C (Test With Users) | 60–90 min |
| Sprint Step D (Synthesize + Gate) | 20 min |
| Activity 4 (Evidence Pack) | 30 min |
| **Total** | **~5 hours** |

### Target Phase 2 (2 sprint cycles)

| Activity | Time |
|---|---|
| Linear entry (Activities 1–3) | 60 min |
| Sprint Cycle 1 | 3–4 hours |
| Sprint Cycle 2 (tighter — hypothesis is sharper) | 2–3 hours |
| Activity 4 (Evidence Pack) | 30 min |
| **Total** | **~7–8 hours** |

Two cycles in a day is achievable. Three is possible if the team is fast and evidence is clear.

---

## Connection to Phase 1 and Phase 3

### From Phase 1

The Problem Proof Pack is the input. Phase 2 assumes:

- a named target user
- a system map
- at least 5 interviews worth of evidence
- a leverage point
- a Proceed or Pivot decision

Teams that Pivoted arrive with a revised problem frame, not a blank slate. Their Phase 1 evidence still matters.

### To Phase 3

Phase 3 is the build phase. Teams enter Phase 3 with:

- the Prototype Evidence Pack
- the final prototype from the last sprint cycle
- a clear hypothesis that held across testing
- a Proceed decision from the mentor

Phase 2 ends when the team knows **what to build and why it works**. Phase 3 begins when they start building it.

---

## Activity Index

| File | Activity | Type |
|---|---|---|
| `activity-1-orientation.md` | What You'll Walk Away With | Linear |
| `activity-2-generate-ideas.md` | Generate Many Ideas, Judge None Yet | Linear |
| `activity-3-select-best-bet.md` | Select Your Best Bet + Hypothesis | Linear |
| `sprint-step-a-choose-method.md` | Choose Your Prototype Method | Loop |
| `sprint-step-b-build-prototype.md` | Build the Prototype | Loop |
| `sprint-step-c-test-users.md` | Test With Real Users | Loop |
| `sprint-step-d-synthesize-gate.md` | Synthesize + Gate | Loop |
| `activity-4-evidence-pack.md` | Submit Prototype Evidence Pack | Exit |
