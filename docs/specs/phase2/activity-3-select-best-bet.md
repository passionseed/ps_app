# Activity 3 — Select Your Best Bet + Hypothesis

**Phase:** 2 — Ideation Sprint  
**Type:** Linear (run once on first entry; re-entered on Pivot Concept gate decision)  
**Estimated time:** 20 minutes  
**Prerequisite:** Activity 2 complete (idea shortlist submitted)  
**Output:** Selected idea + written hypothesis

---

## Purpose

Force a reasoned selection and a testable hypothesis before any prototyping begins.

This activity does two things that are often skipped:

1. It makes teams choose based on evidence, not gut feel or team politics
2. It makes teams state **what they are actually testing** before they build anything

The hypothesis is the most important output of this activity. Without it, Sprint Step C (test notes) has no anchor — teams don't know what they were trying to find out, and their synthesis in Sprint Step D will be shallow.

---

## Learning Objective

By the end of this activity, a team should have:

- one selected idea with a written rationale explaining why this one and not the others
- one specific, testable hypothesis that names a user behavior or reaction they expect to observe
- clarity on the single biggest assumption the selected idea depends on

---

## Instructions for Participants

### Step 1 — Apply the selection criteria to your shortlist

For each idea on your list, score it on these four questions (High / Medium / Low):

| Question | Why it matters |
|---|---|
| Does this idea address the leverage point from Phase 1? | Ideas disconnected from your system map will fail to solve the real problem |
| Can we build a prototype and test it before the day ends? | If you can't test it today, it doesn't help you now |
| Do we have access to users who would actually experience this problem? | The best idea is worthless if you can't test it with the right people |
| What is the single biggest assumption this idea depends on — and can we test that assumption with a prototype? | You are not testing the idea; you are testing its core assumption |

You do not need to score every idea formally. The goal is to surface which idea is the best bet for **testing today**, not which idea is the best idea in theory.

### Step 2 — Select one idea

Pick the idea that scores best on the criteria above. If two ideas are close, choose the one with the more testable core assumption.

Write one or two sentences explaining:

- why you chose this idea
- why you did not choose the runner-up

This is not a pitch. You do not need to convince anyone the idea is great. You need to show that you made a reasoned choice.

### Step 3 — Write your hypothesis

A hypothesis is a specific, testable prediction. It is not a mission statement or a description of the idea.

**Hypothesis template:**

> We believe **[target user]** will **[specific behavior or reaction]** when **[they encounter this prototype]** because **[Phase 1 finding that supports this prediction]**.

**Examples:**

Weak hypothesis:
> "Users will find our app useful because the problem is real."

Strong hypothesis:
> "We believe university students who commute will skip the manual bus-time lookup step when they see a one-tap arrival estimate on the home screen, because our interviews showed 8 of 10 users said the current lookup takes too many steps and they often just guess."

The strong hypothesis:
- names a specific user
- names a specific behavior (skip the manual step)
- names when the behavior will occur (when they see the home screen)
- connects to real Phase 1 evidence (8 of 10 users said X)

### Step 4 — Name your core assumption

Every hypothesis rests on a core assumption. Name it explicitly.

> "The core assumption in this hypothesis is: **[assumption]**. If this is wrong, the hypothesis falls apart."

Example:
> "The core assumption is that users are willing to allow location access for real-time arrival estimates. If they decline location permissions, the whole feature breaks."

This helps you know what to watch for in Sprint Step C.

### Step 5 — Submit

Submit: selected idea + rationale + hypothesis + core assumption.

---

## Re-entry: Pivot Concept

If a team returns to Activity 3 after a Pivot Concept gate decision, they are selecting a **different idea** from their original shortlist (or a new idea if the shortlist needs expanding).

When re-entering from a Pivot:

- the team's original shortlist is shown
- the team can add new ideas before selecting
- the previous cycle's sprint log is visible — teams should use what they learned to inform the new selection
- the hypothesis must be genuinely different from the previous cycle's hypothesis

A Pivot that produces the same hypothesis as the previous cycle is not a real Pivot. The AI feedback will flag this.

---

## AI Feedback

Fires within 60 seconds of submission.

**What AI checks:**

1. Is the hypothesis specific? Does it name a user, a behavior, a context, and an expected reaction?
2. Is the hypothesis testable with a low-fidelity prototype? (Or does it require a working product to test?)
3. Does the hypothesis connect to Phase 1 evidence?
4. Is the core assumption named?

**Example AI feedback responses:**

If hypothesis is vague:
> "Your hypothesis says users will 'enjoy' the experience. That's hard to observe in a prototype test. What specific action would you watch for? What would 'enjoying it' look like in behavior — would they complete the flow? Would they ask a question? Would they smile and lean in? Pick one observable thing."

If hypothesis is not testable with a prototype:
> "Your hypothesis depends on users actually using the feature over 30 days. That's not testable with a paper prototype today. What is the earliest behavior that would signal this idea has legs? What would you see in the first 60 seconds of someone using it?"

If no Phase 1 connection:
> "Your hypothesis doesn't reference anything from your Phase 1 interviews. Which finding from your Problem Proof Pack makes you predict this behavior? If none of your Phase 1 evidence points to this, you may be testing a guess rather than a hypothesis."

---

## Mentor Feedback

Mentors can comment before the team enters the sprint loop.

**What mentors should look for:**

- Is the hypothesis specific enough to test?
- Does the selected idea actually address the leverage point from Phase 1?
- Is the core assumption named and plausible?

**When to flag:**

- Hypothesis is a description of the idea, not a prediction about user behavior
- Selected idea has no connection to Phase 1 evidence
- Core assumption is unstated or untestable

---

## Grading

### Completion check (pass/fail)

| Requirement | Pass condition |
|---|---|
| Selected idea | One idea named |
| Rationale | At least one sentence explaining why this idea, not the others |
| Hypothesis | Hypothesis submitted |
| Core assumption | Core assumption named |

### Rubric dimension: Hypothesis quality

This dimension is scored per sprint cycle in the cycle-level rubric. The hypothesis from Activity 3 becomes the Cycle 1 hypothesis.

| Level | Criteria |
|---|---|
| 0 | No hypothesis stated |
| 1 | Hypothesis is vague — describes the idea, not a testable prediction |
| 2 | Hypothesis names a specific user, behavior, context, and connects to Phase 1 evidence |
| 3 | Hypothesis is specific, names what would prove or break it, and identifies the core assumption the prototype must test |

---

## Output Spec

**What the team submits:**

```
Selected idea: [idea name or one-line description]

Rationale: [1–2 sentences: why this idea, why not the runner-up]

Hypothesis:
We believe [target user] will [specific behavior or reaction]
when [they encounter this prototype]
because [Phase 1 finding].

Core assumption:
The core assumption is [assumption].
If this is wrong, [consequence for the hypothesis].
```

**What the app stores:**

- selected idea text
- rationale text
- hypothesis text (structured or free-form)
- core assumption text
- cycle number (1 on first entry, increments if re-entered from Pivot)
- timestamp
