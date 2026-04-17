# Sprint Step D — Synthesize + Gate

**Phase:** 2 — Ideation Sprint  
**Type:** Loop step (repeats each sprint cycle)  
**Estimated time:** 20 minutes  
**Prerequisite:** Sprint Step C complete (test notes submitted)  
**Output:** Sprint log entry — synthesis answers + gate decision (+ new hypothesis if looping)

---

## Purpose

Turn raw test notes into a learning. Then decide what to do with it.

This is the most important step in the loop. Without it, teams accumulate observations without understanding them. They might run 3 sessions, have interesting notes, and still have no idea what they learned.

The synthesis forces the team to interpret the evidence. The gate forces them to decide what to do next based on that interpretation.

---

## Learning Objective

By the end of this step, a team should be able to say:

> "We went into this cycle believing [hypothesis]. Here is what we observed. It [supports / partially supports / breaks] the hypothesis because [specific evidence]. Based on this, we are going to [gate decision] because [reasoning]."

---

## Part 1: Synthesis

### Instructions

Work through these five questions as a team. Write your answers. Do not skip any.

---

**Question 1: What did we set out to test?**

Restate the hypothesis from this cycle in your own words.

This is not a formality. Teams often drift from their hypothesis during the session. Restating it here forces you to check whether you actually tested what you set out to test.

---

**Question 2: What specifically happened across your sessions?**

Summarize the behavioral patterns across all sessions. Not per-session — across sessions.

Ask: what did multiple users do? what did one user do that no one else did?

A pattern is something that happened in 2 or more sessions. A singleton is something that happened once. Both are worth naming. A pattern is stronger evidence. A singleton is worth watching.

---

**Question 3: What was the most surprising finding?**

Name one thing that happened that you did not predict.

If nothing surprised you, that is itself interesting — and possibly a red flag. Did users behave exactly as you predicted? Or did you not look for disconfirming evidence?

Be honest. "Nothing surprised us" is an acceptable answer, but it should prompt the question: were we looking carefully enough?

---

**Question 4: What does the evidence say about your hypothesis?**

This is the core of the synthesis. Options:

- **Supported:** the behavior you predicted was observed consistently. Users did what the hypothesis said they would do.
- **Partially supported:** the behavior was observed in some users but not others, or in a modified form. The core direction was right but the specifics need refining.
- **Broken:** the behavior did not occur, or users did something completely different from what you predicted. The hypothesis is wrong or the assumption it rests on is wrong.
- **Inconclusive:** the sessions did not produce enough behavioral data to evaluate the hypothesis. (This usually means the test was too short, too coached, or the prototype did not expose the right moment.)

Name which applies and why. Quote from your session notes.

---

**Question 5: What would you test differently next cycle if you ran one?**

Even if you are about to gate Proceed, answer this question. It forces reflection.

If you are gating Refine: your answer here becomes the new hypothesis.
If you are gating Proceed: your answer documents what you would have explored next — useful for Phase 3.
If you are gating Kill: your answer names what would have had to be different for this to work.

---

### Synthesis red flags

Watch for these patterns in your own synthesis:

- **Confirmation bias:** synthesis emphasizes evidence that supports the hypothesis and minimizes or ignores evidence that breaks it. If your sessions had mixed results but your synthesis only mentions the positive sessions, rewrite it.
- **Opinion laundering:** synthesis quotes what users said ("they said they liked it") instead of what they did. Rewrite with behavioral evidence.
- **Vague conclusion:** synthesis ends with "the prototype needs some improvements" without naming what specifically needs to change. Rewrite with specific observations.

---

## Part 2: Gate Decision

Based on your synthesis, choose one of four gate options.

---

### Gate Option 1: Refine (loop again with new hypothesis)

**When to choose this:**
- The evidence suggests the idea has signal — some users showed the behavior you predicted
- But the hypothesis was not fully supported, or the support was conditional
- You know specifically what you would test differently next time

**What you must do before re-entering the loop:**

State a new hypothesis. It must be meaningfully different from the current cycle's hypothesis. You cannot loop with the same hypothesis — that is not refinement, it is repetition.

New hypothesis format:
> "Based on what we observed in cycle [N], we now believe [new specific prediction] because [evidence from this cycle]."

The new hypothesis must incorporate something you learned from the test. If the new hypothesis is identical to the old one, the AI will flag it.

**Loop limit:** Maximum 3 cycles per idea. After 3, Refine is no longer available.

---

### Gate Option 2: Pivot Concept (new idea, new hypothesis)

**When to choose this:**
- The evidence suggests this specific idea is wrong — not because users don't have the problem, but because this solution doesn't address it well
- The Phase 1 problem is still valid, but the approach needs to change fundamentally
- You have a meaningfully different idea in mind (from the shortlist or a new one)

**What happens next:**
- You return to Activity 3
- Your shortlist is shown — you select a different idea or add a new one
- Your cycle counter resets to 0 for the new idea
- Your sprint logs from previous cycles are preserved and visible

**Note:** A Pivot is not a Refine. If you are changing the hypothesis but keeping the same idea in the same direction, that is a Refine. If you are abandoning the idea entirely and starting with a different solution model, that is a Pivot.

---

### Gate Option 3: Proceed to Phase 3

**When to choose this:**
- The hypothesis was supported across multiple sessions
- You have behavioral evidence — not just opinions — that the core assumption holds
- You know what to build: the prototype revealed what works
- You are confident enough to move into a build phase

**What you must submit:**
- Gate decision: Proceed to Phase 3
- Primary evidence: the most influential finding across all cycles that supports proceeding
- What you would build first: a one-sentence description of the first thing to build in Phase 3

**Mentor soft gate:**
A "waiting for mentor acknowledgment" indicator will appear. The mentor will receive a notification. If no mentor responds within 30 minutes, the gate auto-opens.

This is not a hard lock. It is an opportunity for the mentor to weigh in before the team moves to Phase 3.

---

### Gate Option 4: Kill

**When to choose this:**
- The evidence consistently does not support the hypothesis
- Multiple cycles of testing have not produced signal
- The problem framing from Phase 1 may be wrong, or the leverage point identified is not addressable with a product solution
- The team has run 3 cycles and has not found a path forward

**What happens next:**
- Phase 2 ends without an Evidence Pack submission
- The team may return to Phase 1 to revisit their problem framing
- Or the team exits the program

**What you must submit:**
- Gate decision: Kill
- Why: what evidence led to this decision?
- What would have had to be different for this to proceed?

Killing is not failure. Killing a bad idea before building it is the most valuable outcome Phase 2 can produce. It saves days of wasted work.

---

## AI Feedback

Fires within 60 seconds of submission.

**What AI checks:**

1. Does the synthesis address all five questions?
2. Does the evidence evaluation name specific evidence (behavioral, from the sessions)?
3. Does the gate decision match the evidence described in the synthesis?
4. If Refine: is the new hypothesis meaningfully different from the current one?
5. If Proceed: is there behavioral evidence supporting the decision?

**Example AI feedback responses:**

If synthesis is opinion-based:
> "Your synthesis says users 'responded positively.' That's an interpretation, not evidence. What did they do? Quote one thing from your session notes — a specific action, a pause, a comment — that supports the hypothesis being true or broken."

If gate decision conflicts with evidence:
> "Your synthesis says the hypothesis was 'partially supported' and that 3 of 4 users dropped off at the key moment. But your gate decision is Proceed. That's a gap worth naming. What evidence outweighs the drop-off rate? If you're proceeding anyway, say why explicitly — it will matter in your Evidence Pack."

If Refine hypothesis is too similar:
> "Your new hypothesis for cycle 2 says almost the same thing as cycle 1's hypothesis. A Refine is most useful when the new hypothesis tests something specific that you learned was missing. What from this cycle's sessions told you what to look for next? Build that into the hypothesis."

If Kill decision:
> "Killing a bad idea is the most valuable thing Phase 2 can produce. Make sure your kill rationale is specific — not 'it didn't work' but 'we tested 3 cycles and could not find a version of this idea that [specific behavior] users responded to.' That specificity will help if you return to Phase 1."

---

## Mentor Acknowledgment (Proceed only)

When the team gates Proceed to Phase 3, the mentor receives a notification and a summary of:

- the hypothesis from Activity 3
- the sprint log across all cycles
- the primary evidence cited for the Proceed decision

The mentor can:

- **Acknowledge:** confirm that the team is ready to proceed
- **Comment:** leave a note before acknowledging
- **Request one more cycle:** ask the team to run one more sprint cycle before proceeding. This resets Proceed and shows the Refine option again.

If no mentor response within 30 minutes: gate auto-opens.

---

## Grading

### Completion check (pass/fail)

| Requirement | Pass condition |
|---|---|
| All synthesis questions answered | All 5 questions have a response |
| Evidence evaluation | One of four options selected with written rationale |
| Gate decision | One of four gate options selected |
| New hypothesis (if Refine) | New hypothesis submitted that differs from current cycle |

### Rubric dimension: Synthesis quality

Scored as part of the cycle-level rubric.

| Level | Criteria |
|---|---|
| 0 | No synthesis submitted |
| 1 | Synthesis restates what happened without interpreting it. Gate decision has no connection to the evidence. |
| 2 | Synthesis names a behavioral pattern and evaluates the hypothesis against it. Gate decision follows from the evidence. |
| 3 | Synthesis names what changed between this cycle and the prior one (or what was wrong about the original hypothesis). Evidence evaluation is specific — quotes behavior from session notes. Gate decision is justified and anticipates what comes next. |

---

## Output Spec

**What the team submits:**

```
Cycle: [number]

Synthesis:

1. What we set out to test:
   [restatement of hypothesis in own words]

2. What happened across sessions:
   [behavioral patterns — what multiple users did]
   [singletons — what one user did that others didn't]

3. Most surprising finding:
   [one specific thing — or honest statement that nothing surprised]

4. Evidence evaluation:
   [ ] Supported  [ ] Partially supported  [ ] Broken  [ ] Inconclusive
   Why: [specific behavioral evidence from sessions]

5. What we would test differently:
   [answer even if not looping again]

Gate decision:
[ ] Refine (loop again)
[ ] Pivot Concept (return to Activity 3)
[ ] Proceed to Phase 3
[ ] Kill

Rationale: [2–3 sentences connecting evidence to gate decision]

[If Refine — new hypothesis:]
Based on cycle [N], we now believe [specific prediction] because [evidence from this cycle].
```

**What the app stores:**

- synthesis answers (5 fields)
- evidence evaluation choice (enum: supported / partially / broken / inconclusive)
- evidence evaluation rationale (text)
- gate decision (enum)
- gate rationale (text)
- new hypothesis text (if Refine)
- cycle number
- timestamp
- mentor acknowledgment status (if Proceed)
- mentor acknowledgment timestamp (if acknowledged)
