# Sprint Step A — Choose Your Prototype Method

**Phase:** 2 — Ideation Sprint  
**Type:** Loop step (repeats each sprint cycle)  
**Estimated time:** 15 minutes  
**Prerequisite:** Activity 3 complete (idea + hypothesis submitted)  
**Output:** Named prototype method + rationale tied to the current cycle's hypothesis

---

## Purpose

Match the prototype method to what is being tested this cycle.

Teams who skip this step default to Figma for everything — including ideas that would be better tested with a Wizard of Oz setup or a Concierge MVP. The method should follow the hypothesis. Not the other way around.

In subsequent cycles, the method may change if the hypothesis changed.

---

## Learning Objective

By the end of this step, a team should be able to say:

> "We are testing [hypothesis]. The fastest way to test that is [method] because [one-sentence reason]."

---

## Instructions for Participants

### Step 1 — Re-read your hypothesis

Your hypothesis from Activity 3 (or from the previous cycle's gate decision) is shown at the top of this step.

Ask: **what is the single thing this hypothesis requires the user to do or react to?**

That thing is what your prototype must make possible. Everything else is optional.

### Step 2 — Choose the method that tests that thing the fastest

**The five methods:**

---

#### Paper Prototype

Draw screens on paper. Flip between them manually during user testing.

- **Best for:** apps, dashboards, multi-step flows
- **Time to build:** 1–2 hours
- **How to test:** sit with the user, ask them to "tap" the paper — you flip the pages
- **What it reveals:** whether the flow makes sense, where users get confused, what they expect to happen next
- **Limitation:** cannot test dynamic content or personalized responses

---

#### Wizard of Oz

A team member secretly operates the "intelligence" behind the scenes while the user thinks it is real.

- **Best for:** AI features, smart recommendations, chatbots, personalization
- **Time to build:** 30–60 min (mostly setting up the back-channel)
- **How to test:** user interacts with the front-end; one teammate monitors and responds manually in real time
- **What it reveals:** whether the experience works — does the user get value from it? does the response pattern feel right?
- **Limitation:** requires at least 2 team members: one running the session, one operating behind the scenes

**Example setup:** user sends a message to a "chatbot" in a mock interface → team member on a separate tab reads the message and types a response → response appears in the interface within a few seconds → user believes it is automated.

---

#### Figma / Slides Clickthrough

Static screens linked together. No real logic — just navigation.

- **Best for:** visual flows, onboarding sequences, UI interactions, remote testing
- **Time to build:** 2–4 hours
- **How to test:** share a link or sit with the user and watch them navigate
- **What it reveals:** whether users can find what they need, whether the visual hierarchy makes sense
- **Limitation:** cannot test anything that requires real content, data, or personalization

---

#### Concierge MVP

Do the service manually for real users — no automation, no product.

- **Best for:** marketplaces, matching services, curation, recommendation engines, any "we will connect you" feature
- **Time to build:** 15–30 min (design the manual process, brief the team)
- **How to test:** offer the service to real users and deliver it manually; observe whether they use it and whether the output satisfies them
- **What it reveals:** does anyone actually want this? is the output valuable even when you know a human produced it?
- **Limitation:** does not test the product — only the underlying service model

**Example:** instead of building a job-matching algorithm, a team member reads user profiles and DMs tailored job suggestions. Users get real value; the team learns whether the model works.

---

#### Storyboard / Role Play

Sketch the user journey as a comic strip, or act it out physically.

- **Best for:** physical products, service design experiences, multi-person interactions, future-state scenarios
- **Time to build:** 30–60 min (sketch 6–12 frames or design the role play)
- **How to test:** walk users through the storyboard, or set up the role play and let them participate
- **What it reveals:** whether the experience resonates, whether the emotional arc is right, whether users see themselves in the scenario
- **Limitation:** abstract — does not test actual usability or interaction detail

---

### Method selection guide

| If your hypothesis requires testing... | Use this method |
|---|---|
| A screen-by-screen flow or navigation | Paper Prototype or Figma |
| An AI or smart system response | Wizard of Oz |
| Demand for a service (will anyone pay / use it?) | Concierge MVP |
| A physical or multi-step experience | Storyboard / Role Play |
| Visual hierarchy or UI clarity, to be shared remotely | Figma Clickthrough |

### Step 3 — Write your method rationale

One sentence: why this method for this hypothesis?

> "We chose [method] because our hypothesis tests [what the user will do], and [method] is the fastest way to make that observable."

### Step 4 — Submit

Submit: method name + rationale.

---

## In Subsequent Cycles

If the team is entering Sprint Step A for cycle 2 or 3:

- the previous cycle's method is shown
- the current cycle's hypothesis is shown (from Sprint Step D's gate decision)
- the team must decide whether the new hypothesis requires a different method

The app will prompt: "Your hypothesis changed. Does your prototype method still match it?"

---

## AI Feedback

Fires within 60 seconds of submission.

**What AI checks:**

Is the method a good match for the hypothesis?

**Known mismatches to flag:**

| Hypothesis type | Method chosen | AI response |
|---|---|---|
| Testing an AI/smart feature | Paper Prototype | "Paper prototypes can't test AI behavior. To test whether a smart response feels useful, try Wizard of Oz — a team member can play the AI live." |
| Testing demand / "will anyone use this" | Figma Clickthrough | "Figma tests usability, not demand. If you want to know whether people want the service, a Concierge MVP will tell you faster — offer it manually and see who takes you up on it." |
| Testing a simple screen flow | Wizard of Oz | "Wizard of Oz is usually for testing AI or complex logic. For a screen flow, paper prototype is faster to build and easier to run." |
| Testing a physical product or experience | Figma | "Figma shows screens but can't test physical interactions. A storyboard or role play would let users engage with the experience more directly." |

If the method matches the hypothesis: no intervention. The AI confirms: "Good match — [method] is appropriate for testing [hypothesis type]."

---

## Mentor Feedback

Mentors can comment on the method choice. Non-blocking.

**What to look for:**

- Is the method appropriate for the hypothesis?
- Is the team defaulting to Figma out of habit?
- Does the method require a team member to operate a back-channel (Wizard of Oz)? If so, does the team have the capacity?

---

## Grading

### Completion check (pass/fail)

| Requirement | Pass condition |
|---|---|
| Method chosen | One of the five methods selected |
| Rationale | One sentence connecting method to hypothesis |

### Rubric dimension: Method-hypothesis fit

Scored as part of the cycle-level rubric.

| Level | Criteria |
|---|---|
| 0 | Method not chosen or rationale missing |
| 1 | Method chosen without regard to hypothesis (e.g., Figma for an AI feature) |
| 2 | Method is appropriate for what the hypothesis requires |
| 3 | Method is the fastest possible way to test this specific hypothesis; rationale explicitly connects method to the core assumption being tested |

---

## Output Spec

**What the team submits:**

```
Cycle: [number]
Prototype method: [Paper / Wizard of Oz / Figma / Concierge MVP / Storyboard]
Rationale: [one sentence connecting method to hypothesis]
```

**What the app stores:**

- method name
- rationale text
- cycle number
- hypothesis ID (foreign key to Activity 3 or previous gate output)
- timestamp
