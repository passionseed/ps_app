# Spec: Phase 1 Systems Thinking Sprint

**Version:** 2.0  
**Date:** April 7, 2026  
**Status:** READY TO BUILD  
**Owner:** Product + Engineering + Content  
**Deadline:** Ship this week

---

## 1. Executive Summary

Phase 1 should stop teaching a fake linear method for wicked problems.

We are removing unnecessary activities and rebuilding Phase 1 around one core loop:

**see the system → gather evidence → map the system → decide**

This phase is for **871 high school participants**. They do not need more busywork. They need a simple, strong structure that helps them understand a real-world system, identify leverage points, and decide whether a problem is worth solving.

---

## 2. Why We Are Changing Direction

### What was wrong

The prior Phase 1 design had too many steps and taught the wrong mental model:

- too linear
- too much task completion
- too much duplication
- too much “content about process” instead of real sensemaking
- 5 Whys is too narrow for wicked problems

### Core decision

We are explicitly dropping **5 Whys as a central method**.

For wicked problems, participants need:

- actors
- incentives
- bottlenecks
- workarounds
- feedback loops
- unintended consequences
- leverage points

That means **systems thinking**, not root-cause theater.

---

## 3. Product Goal for Phase 1

At the end of Phase 1, a team should be able to say:

> We understand the system around this problem, we have evidence from real people, and we know whether this is worth solving.

Phase 1 is successful if teams leave with a **Problem Proof Pack** containing:

1. **Target user**
2. **System map**
3. **Interview evidence**
4. **Problem statement**
5. **Proceed / Pivot / Kill decision**

---

## 4. Ruthless Scope Rule

If an activity does **not** help a team make a better **Proceed / Pivot / Kill** decision, cut it.

This rule overrides nice-to-have content.

---

## 5. New Phase 1 Structure

Phase 1 should have **7 core activities max**.

### Activity 1 — What You’ll Walk Away With

**Purpose**  
Set the promise and frame the phase correctly.

**Key message**  
You are not here to find an idea quickly. You are here to understand a system well enough to choose a meaningful problem.

**Format**  
Webtoon / comic / short intro visual.

**Output**  
Motivation and orientation only.

---

### Activity 2 — See the System, Not Just the Symptom

**Purpose**  
Teach a simple systems-thinking lens.

**Participants should learn to look for:**

- who is involved
- what happens first, next, and after that
- where the friction appears
- what workaround people use
- what incentives keep the problem alive
- what happens when someone tries to fix it
- where loops or repeated patterns exist

**Format**  
Interactive lesson, lightweight visual explainer, or guided tool walkthrough.

**Preferred tool**  
Loopy or a similarly simple causal loop mapping tool.

**Output**  
Rough System Map v1.

---

### Activity 3 — Interview Real Humans

**Purpose**  
Gather evidence from reality, not opinions.

**Interview design principle**  
Do not teach 5 Whys. Teach students to trace the system.

**Question patterns should focus on:**

- what happened last time
- what they did step by step
- who else was involved
- what made it difficult
- what workaround they used
- what tradeoff they made
- what happened after the workaround
- what made the problem continue

**Avoid:**

- leading questions
- pitching the solution
- abstract opinions without behavior

**Output**  
5–10 real interviews.

---

### Activity 4 — Upload Evidence

**Purpose**  
Force teams to ground their claims in evidence.

**Accepted inputs**

- interview notes
- clips
- audio
- observations
- screenshots of field notes

**Output**  
Evidence bundle.

---

### Activity 5 — Map the System

**Purpose**  
Turn raw evidence into structure.

**Team should produce:**

- key actors
- recurring pain points
- existing workarounds
- incentives and constraints
- reinforcing or balancing loops
- possible leverage points

**Format**  
Team synthesis activity.

**Output**  
System Map v2.

---

### Activity 6 — 🚦 Decision Gate: Proceed / Pivot / Kill

**Purpose**  
Make the team decide what the evidence actually means.

**Decision options**

- **Proceed** — strong enough evidence, clear leverage point
- **Pivot** — problem is real but framing or user focus is wrong
- **Kill** — weak evidence or low-value problem

**Required reflection**

Teams must answer:

1. What is the strongest evidence this problem is real?
2. What keeps this problem alive in the system?
3. Where is the leverage point?
4. Why are we proceeding, pivoting, or killing?

**Output**  
Decision with reasoning.

---

### Activity 7 — Submit Problem Proof Pack

**Purpose**  
Finalize the Phase 1 artifact.

**Required contents**

1. **Target User**
   - who specifically
   - context
   - why this group matters

2. **System Map**
   - actors
   - loops
   - bottlenecks
   - leverage point

3. **Evidence Summary**
   - 5–10 interviews
   - strongest patterns
   - surprising findings
   - workarounds observed

4. **Problem Statement**
   - specific
   - evidence-backed
   - grounded in system behavior

5. **Decision**
   - Proceed / Pivot / Kill
   - why

---

## 6. Optional Activity

### Mentor Review

This is optional as a learning activity and should be treated as support / review workflow, not core pedagogy.

If included, it comes **after** the Problem Proof Pack.

---

## 7. What We Are Cutting

The following should be removed from the core Phase 1 learning flow:

- Mascot 5-Whys
- 5 Whys as a named methodology
- separate persona-first exercise before evidence exists
- duplicate AI feedback steps
- NotebookLM guideline as a required activity
- trustful sources submission as a separate learning milestone
- mentor booking as a core learning activity

These may be:

- deleted
- merged into another activity
- moved to optional support content
- moved to later phases if still useful

---

## 8. New Learning Model

### Old model

Problem → ask why → find root cause → define problem

### New model

Messy situation → understand the system → gather evidence → find loops and leverage points → define the right problem → decide whether to continue

This is the core pedagogical shift.

---

## 9. Loopy / Systems Mapping Tool Requirements

We want a lightweight system-mapping tool experience.

### If using Loopy or equivalent, participants should be able to:

- name actors and elements
- connect cause/effect relationships
- show reinforcing loops
- show balancing loops
- mark bottlenecks
- identify possible intervention points

### Important constraint

Do **not** turn this into formal systems theory.

Students do not need academic vocabulary. They need practical prompts:

- What keeps this problem going?
- Who is stuck in it?
- What are they optimizing for?
- What workaround makes it worse?
- Where could a small intervention change a lot?

---

## 10. Desired Outcomes

At the end of Phase 1, teams should be able to:

### Core capability

Prove they understand a **real, specific, system-shaped problem**.

### Observable outcomes

#### A. Systems understanding

- identify the relevant actors
- describe the sequence of events in the system
- identify incentives and constraints
- explain at least one loop or pattern that keeps the problem alive
- identify a plausible leverage point

#### B. Evidence quality

- gather 5–10 real interviews
- capture behavior, not just opinions
- surface recurring pain points and workarounds
- identify surprising findings

#### C. Problem clarity

- define a specific target user
- write a sharp, evidence-backed problem statement
- explain why this problem matters

#### D. Decision readiness

- decide Proceed / Pivot / Kill
- justify the decision with evidence and system understanding

---

## 11. Technical Product Requirements

### Runtime structure

The activity engine should render a trimmed Phase 1 flow with 7 core activities.

### Required content types

- webtoon / intro visual
- text / explainer
- interview instructions
- file upload
- system-map submission or attachment
- decision-gate reflection
- final Problem Proof Pack submission

### Assessment requirements

At minimum we need:

1. **Evidence upload**
2. **System map submission**
3. **Decision gate reflection**
4. **Problem Proof Pack submission**

### Data expectations

The Phase 1 seed should be rewritten to reflect the new 7-step structure.

The previous 19-activity decision-gate version should no longer be the target structure.

---

## 12. Team Deliverables by Function

### Product

- finalize the 7-step flow
- approve exact activity names
- define Proceed / Pivot / Kill rubric

### Content

- create intro webtoon
- create systems thinking primer
- create interview guide for system tracing
- create system-mapping instructions

### Engineering

- replace current Phase 1 seed with trimmed structure
- ensure uploads and submissions work
- confirm activity UI supports the reduced flow cleanly

### AI

- only add AI where it clearly reduces confusion
- do not add AI activities that duplicate reflection
- optional: AI support for interview synthesis or system-map prompting

### Ops / Mentors

- align mentor review with the Problem Proof Pack
- coach mentors to respond to Proceed / Pivot / Kill decisions

---

## 13. Build Priorities

### P0 — Must ship this week

1. Intro promise page
2. Systems thinking primer
3. Interview guide
4. Evidence upload
5. System map activity
6. Decision gate
7. Problem Proof Pack submission

### P1 — Nice if time permits

1. Better visual system-map support
2. Mentor review workflow
3. AI-assisted synthesis

### P2 — Defer

1. extra AI commentary
2. extra polishing content
3. non-essential research rituals

---

## 14. Success Criteria

Phase 1 is successful if:

- teams can explain the system, not just the symptom
- teams upload real interview evidence
- teams identify a leverage point
- teams make a reasoned Proceed / Pivot / Kill decision
- mentors can quickly assess whether a team understands the problem

---

## 15. Immediate Next Steps

1. Rewrite the Phase 1 SQL seed from 19 activities to 7 core activities
2. Update the spec/source-of-truth docs to match this systems-thinking version
3. Build the intro webtoon
4. Draft the systems-thinking primer
5. Draft the interview guide
6. Define the Problem Proof Pack submission fields

---

## 16. Source of Truth

This document replaces the previous Phase 1 decision-gates spec as the current product direction for Phase 1.
