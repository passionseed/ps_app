# Sprint Step B — Build the Prototype

**Phase:** 2 — Ideation Sprint  
**Type:** Loop step (repeats each sprint cycle)  
**Estimated time:** 90–120 minutes (hard cap: 2 hours)  
**Prerequisite:** Sprint Step A complete (method + rationale submitted)  
**Output:** Prototype artifact — photo, link, or written description

---

## Purpose

Create a testable artifact — fast.

The prototype exists for one reason: to make the hypothesis testable. It is not a product demo, not a pitch deck, and not a design portfolio piece. It is a tool for learning.

The bias here is strongly toward speed over polish. A rough prototype that gets in front of users in 2 hours is worth more than a polished prototype that takes 2 days.

---

## Learning Objective

By the end of this step, a team should have:

- a prototype that can be put in front of a user who has no prior context
- an artifact that exposes only what the current hypothesis requires
- confidence that a user can interact with it without being coached through it

---

## Instructions for Participants

### The 2-hour rule

You have 2 hours maximum. Set a timer.

At the 90-minute mark, ask: "Can we put this in front of a user right now?" If yes, stop building and go test. If no, spend the remaining 30 minutes on the minimum changes needed to make it testable — not on polish.

### What to build

Build only what the hypothesis requires. If your hypothesis is about the onboarding flow, build the onboarding flow. Do not build the settings screen, the profile page, or anything else.

Ask before adding each element: "Does this help us test the hypothesis, or are we adding it because it feels incomplete?"

If it does not help test the hypothesis, do not add it.

### Per-method build guide

---

#### Paper Prototype

**What to build:**
- Draw each screen on a separate sheet of paper or index card
- Include the key UI elements — buttons, text fields, labels — at roughly the right size
- Make at least one version of each screen state the user will encounter in your test scenario

**What not to build:**
- Every screen in the app
- Pixel-perfect layouts
- Anything the user will not reach in the test scenario

**Testing setup:**
- Assign one team member as the "computer" — they hold the pages and swap them when the user "taps" an element
- Assign one team member as the observer — they watch what the user does without explaining anything

**Artifact to submit:** Photo of all screens, fanned out or laid flat. One photo is fine. Clarity matters more than composition.

---

#### Wizard of Oz

**What to build:**
- A front-end interface the user will interact with — this can be a simple form, a mock chat window, or a basic web page
- A back-channel for the operator — a second device, a separate tab, or a shared document
- A brief script for the operator: what responses are possible? what's the response time target?

**What not to build:**
- The actual AI/backend system
- Anything on the backend that is not visible to the user

**Testing setup:**
- User sits at the front-end interface
- One team member operates the back-channel in another room or out of sight
- One team member runs the session with the user

**Artifact to submit:** Written description of the setup: what the user sees, what the operator does, and the response script. A screenshot of the front-end interface if one exists.

---

#### Figma / Slides Clickthrough

**What to build:**
- Static screens linked by clickable hotspots
- Cover the exact flow your hypothesis requires
- Use placeholder content — lorem ipsum, generic images — if real content would take too long

**What not to build:**
- Screens outside the test scenario
- Micro-interactions or animations
- Real data or dynamic content

**Testing setup:**
- Share a link or use Present mode
- One team member observes; the other may run the session

**Artifact to submit:** Figma share link set to view-only, or a link to the slides in Present mode.

---

#### Concierge MVP

**What to build:**
- A clear description of what service you are offering and how you will deliver it manually
- A simple way for users to request the service (DM, form, chat message, email)
- A protocol for how the team responds: turnaround time, format of the output

**What not to build:**
- Any automated backend
- A product or app

**Testing setup:**
- Reach out to users and offer the service
- Deliver it manually and observe whether they use the output

**Artifact to submit:** Written description of the service, the manual process, and the delivery format. Screenshots of any communication with users if available.

---

#### Storyboard / Role Play

**What to build:**
- 6–12 sketched frames showing the user journey
- Each frame: a scene, the user's action, and the system's or service's response
- Enough detail that a user reading it can follow the story without explanation

**For role play:**
- A scenario script: who plays what role, what the user's goal is, what events happen during the play
- Props if needed — printed cards, physical objects

**What not to build:**
- Polished illustrations
- Fully scripted dialogue

**Testing setup:**
- Walk the user through the storyboard and ask what they think happens at each step
- Or: run the role play and let the user participate as the protagonist

**Artifact to submit:** Photo of the storyboard frames. Or a written scenario script for the role play.

---

### Test-readiness check

Before submitting the artifact, run this check:

- [ ] Could someone with no context interact with this prototype?
- [ ] Does the prototype surface the thing the hypothesis predicts will happen?
- [ ] Is the core assumption exposed — not hidden behind a screen the user never reaches?
- [ ] Can the test be run in under 20 minutes per user?

If any of these fail, fix it before testing. Do not fix it after.

---

## Common Failure Modes

**Failure mode 1: Over-building**

Team spends the full 2 hours building a polished prototype and runs out of time to test. The prototype is useless if it is never tested.

If you are at the 90-minute mark and still building: stop. Submit what you have. Go test.

**Failure mode 2: The untestable prototype**

Prototype is complete but a user cannot interact with it without a team member explaining what it is. Fix: add a one-sentence task instruction that you will give users at the start of the test. Then check whether the prototype makes that task completable without further explanation.

**Failure mode 3: Hypothesis drift**

Team starts building and gradually adds features that were not in the hypothesis. Halfway through, the prototype is testing 4 different things and none of them well. Fix: re-read the hypothesis every 30 minutes and delete anything that does not serve it.

**Failure mode 4: The Figma trap (for Wizard of Oz hypotheses)**

Team chooses Wizard of Oz in Sprint Step A, then spends the build time making a polished Figma prototype instead of setting up the back-channel. The back-channel is the whole point of Wizard of Oz. A static Figma prototype cannot test AI behavior.

---

## AI Feedback

Fires within 60 seconds of artifact submission.

**What AI checks:**

1. Was an artifact submitted? (Photo, link, or written description present?)
2. Does the description suggest the prototype is test-ready?
3. For Wizard of Oz: is the back-channel setup described?
4. For Concierge MVP: is the manual process described?

**Example AI feedback:**

If artifact appears polished but hypothesis is simple:
> "Your prototype looks detailed. Before testing: can a user complete the core scenario without any explanation from you? If they need you to explain what anything is, that's coaching — and coaching invalidates the test. Try doing a dry run with a teammate playing the user. Say nothing and watch what they do."

If artifact is very rough (good):
> "Rough is fine. The question is whether it's testable. One thing to check: does your prototype expose the moment where your hypothesis predicts [behavior]? If that moment isn't reachable in the test, you won't get the evidence you need."

If Wizard of Oz description is missing the back-channel:
> "Your Wizard of Oz prototype needs a back-channel setup — who is the operator, where are they, and what are the possible responses? Without that, the test will stall the moment a user interacts with the 'smart' part."

---

## Mentor Feedback

Mentors can preview the artifact and leave a note. Non-blocking.

**What to look for:**

- Is the prototype testable without coaching?
- Does it expose the core assumption?
- Is it appropriate for the method chosen in Sprint Step A?
- Did the team over-build (polished but late) or under-build (too rough to test)?

---

## Grading

### Completion check (pass/fail)

| Requirement | Pass condition |
|---|---|
| Artifact submitted | Photo, link, or written description present |
| Method-specific requirements | Described in the per-method guide above |

### Rubric dimension: Prototype test-readiness

Scored as part of the cycle-level rubric.

| Level | Criteria |
|---|---|
| 0 | No artifact submitted |
| 1 | Artifact exists but a user could not interact with it without coaching |
| 2 | A user with no context could engage with the prototype and produce observable behavior |
| 3 | Prototype isolates the hypothesis cleanly — exposes the core assumption, nothing extra, test can run in under 20 minutes per user |

---

## Output Spec

**What the team submits:**

For Paper Prototype:
```
Cycle: [number]
Method: Paper Prototype
Artifact: [photo upload]
Test scenario: [one sentence — what task will you give the user?]
```

For Wizard of Oz:
```
Cycle: [number]
Method: Wizard of Oz
Front-end description: [what the user sees]
Back-channel setup: [who operates it, from where, with what response options]
Artifact: [screenshot of front-end if available]
Test scenario: [one sentence]
```

For Figma:
```
Cycle: [number]
Method: Figma Clickthrough
Link: [view-only share link]
Test scenario: [one sentence]
```

For Concierge MVP:
```
Cycle: [number]
Method: Concierge MVP
Service description: [what you are offering]
Manual process: [how you deliver it]
Request channel: [how users reach you]
Test scenario: [one sentence]
```

For Storyboard / Role Play:
```
Cycle: [number]
Method: Storyboard / Role Play
Artifact: [photo upload or written scenario script]
Test scenario: [one sentence]
```

**What the app stores:**

- method (foreign key to Sprint Step A record)
- artifact type (photo / link / text)
- artifact content or URL
- test scenario text
- cycle number
- timestamp
