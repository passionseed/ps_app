# Sprint Step C — Test With Real Users

**Phase:** 2 — Ideation Sprint  
**Type:** Loop step (repeats each sprint cycle)  
**Estimated time:** 60–90 minutes  
**Prerequisite:** Sprint Step B complete (prototype artifact submitted)  
**Output:** Test notes from 3+ user sessions

---

## Purpose

Gather behavioral evidence from real people interacting with the prototype.

The prototype exists to make the hypothesis testable. This step is the test. Everything before this was preparation. Everything after this is interpretation.

The only thing that matters in this step is: **what did users actually do?**

Not what they said they would do. Not what they thought of the idea in the abstract. What they did when you put the prototype in front of them and gave them a task.

---

## Learning Objective

By the end of this step, a team should have:

- notes from at least 3 user sessions
- notes that capture behavior (actions, pauses, detours, moments of confusion) not just opinions
- at least one finding that surprised them

---

## Finding Users

This is the hardest part of Sprint Step C in a hackathon. Here is the hierarchy, from best to acceptable:

### Tier 1: Your target user (ideal)

Someone who matches the target user from Phase 1 exactly. If your problem is "university students who commute," this is a commuting university student.

How to find them:
- You already interviewed them in Phase 1 — contact the same people
- Ask your Phase 1 interviewees to refer one person they know
- Approach people at the venue who fit the profile

### Tier 2: Close match

Someone whose situation is similar enough that their behavior is informative, even if they are not an exact match. If you can't find a commuting university student, a non-commuting university student is useful. Their behavior will diverge from the target, and that divergence is itself data.

### Tier 3: Teammate-of-teammate

Your teammates' contacts — friends, family, classmates — who genuinely experience the problem. This is acceptable if they are real users of the problem, not just willing participants doing a favor.

This is **not** the same as testing with your own teammates, who know the idea and will be biased.

### Tier 4: Mentor as user

Use a mentor only if they have real experience with the problem domain. A mentor who advises education companies is useful for an education problem. A mentor who does not use commuter buses is not useful for a bus information problem, even if they are willing to try.

**Never use mentors as a substitute for real users.** Mentor feedback is valuable for judging the prototype's design or the team's approach. It is not the same as observing a real user's behavior.

### Do not use:

- Your own teammates
- People who know what the idea is before they test
- People who are testing just to be supportive

---

## Test Protocol

### Before the session

1. Re-read your hypothesis. Know exactly what you are watching for.
2. Write the task instruction you will give the user — one sentence.
3. Assign roles: one person runs the session, one person takes notes.
4. For Wizard of Oz: position the operator out of the user's sight.

**Task instruction format:**

> "Imagine you [context]. Your goal is to [task]. Go ahead."

Keep it short. Do not explain the prototype. Do not explain what you are testing. Just give the task.

**Examples:**

Weak task instruction:
> "This is our app for helping students find jobs. We want to know if the matching feature is intuitive. Can you try it out?"

Strong task instruction:
> "Imagine you just finished your third year of university and you're looking for an internship. Your goal is to find one opportunity that feels right for you. Go ahead."

The weak version explains the feature and primes the user to evaluate it. The strong version gives a goal and observes what the user does on their own.

### During the session

**Do:**
- Watch what the user does — where they go first, where they pause, where they back up
- Note what they say without prompting — not responses to your questions, but spontaneous remarks
- Let silence sit — do not fill it by explaining the prototype

**Do not:**
- Explain what anything is
- Tell the user what to do next when they are stuck
- Defend the idea when the user expresses confusion or doubt
- Ask leading questions ("Did you find that helpful?")

**If the user gets completely stuck** (cannot proceed at all): you can give one prompt — "What would you do next if this were real?" — and then observe. Do not explain. Do not show them.

**Silence is data.** A user who stares at the screen for 10 seconds without acting is telling you something. Note what they were looking at and how long the pause lasted.

### Questions to ask after the task (debrief — 3–5 minutes)

After the user completes or abandons the task, ask:

1. "Walk me through what you were thinking when you [moment of pause or confusion]."
2. "What did you expect to happen when you [action they took]?"
3. "What, if anything, confused you?"
4. "Is there anything you were looking for that you did not find?"

Do **not** ask:
- "Did you like it?"
- "Do you think this is a good idea?"
- "Would you use this?"

These questions produce opinions. You want to understand behavior and mental models.

### After each session (between sessions)

Take 5 minutes to write up the session before moving to the next one. Memory degrades fast.

Write:
- What the user did (in sequence)
- Where they paused or seemed confused
- What they said without prompting
- One thing that surprised you about this session

---

## Note-Taking Template

Use this for each session:

```
Session [number]
User description: [brief — commuting student, 22, uses public transit daily]
Task given: [exact wording]

What they did (in sequence):
1. [action]
2. [action — note any pause or confusion]
3. [action]
...

Unprompted remarks (exact quotes or close paraphrases):
- "[quote]"
- "[quote]"

Where they got stuck:
- [describe what happened and what they did next]

What surprised me:
- [one thing that was unexpected]

Debrief notes:
- Q: [question asked] / A: [user's response]
```

---

## Minimum Evidence Standard

A Sprint Step C submission is passing if it contains:

- 3 or more sessions
- Each session has: user description, task given, behavioral sequence, at least one unprompted remark
- At least one session names a surprise finding

A Sprint Step C submission is excellent if it contains:

- 3–5 sessions
- Behavioral notes are specific enough that someone who was not present could reconstruct what happened
- Multiple sessions show a consistent pattern or a clear contradiction
- The surprise finding in at least one session changes the team's view of the hypothesis

---

## Common Failure Modes

**Failure mode 1: Testing with teammates**

Teammates know the idea. They will interpret every ambiguity charitably and skip confusion that a real user would stop at. Their behavior is not representative. Do not use them.

**Failure mode 2: Opinion-only notes**

Notes that say "they liked it" or "they thought it was a good idea" are useless for Sprint Step D. You need behavior. What did they do? Where did they go? What did they say when they were not responding to a direct question?

**Failure mode 3: Coaching**

Team explains the feature to the user during the test. The user then "succeeds" because they were taught how to use it. This is not a test. It is a demonstration. The result is not evidence.

**Failure mode 4: Too few sessions**

Two sessions is not enough to distinguish a pattern from a coincidence. Three is the minimum. Five is better. If each session takes 20 minutes and you have 90 minutes, you have time for 3–4 sessions plus note-writing.

**Failure mode 5: Not watching for the hypothesis**

Team conducts the test but forgets to look for the specific behavior the hypothesis predicted. After 3 sessions they have notes about lots of things, but nothing about whether the hypothesis held. Re-read the hypothesis before each session.

---

## AI Feedback

Fires within 60 seconds of submission.

**What AI checks:**

1. Are 3+ sessions submitted?
2. Do the notes contain behavioral language (actions, pauses, sequence) or only opinion language?
3. Is at least one surprise finding named?
4. Does any session note connect back to the hypothesis?

**Example AI feedback responses:**

If notes contain only opinions:
> "Your notes say users 'liked it' and 'found it useful.' That's what people say when they are being polite. What did they do? Where did they pause? When did they go somewhere you didn't expect? Rewrite at least one session note with the sequence of what actually happened — start with 'First they..., then they..., then they...'"

If surprise finding is missing:
> "No surprise noted across 3 sessions. If nothing surprised you, one of two things happened: the prototype was perfect on the first try (rare), or you were looking for confirmation rather than disconfirmation. Before writing your synthesis, ask yourself: was there any moment where a user did something you didn't expect? Even a small thing counts."

If notes look strong:
> "Your notes have behavioral detail and at least one pattern worth investigating. One question before your synthesis: did the behavior you observed match what your hypothesis predicted? Be specific — not 'yes it worked' but 'user skipped the pricing step, which is what we predicted' or 'user completed the task but not via the path we expected.'"

---

## Mentor Feedback

Mentors can review test notes and flag insights or concerns. Non-blocking.

**What to look for:**

- Are the notes behavioral or opinion-only?
- Did the team test with real users (not teammates)?
- Is there a surprise finding?
- Do the notes address the hypothesis?

**When to flag:**

- All notes say users "liked it" with no behavioral detail
- Sessions were clearly with teammates or biased participants
- The hypothesis was not addressed in any session

---

## Grading

### Completion check (pass/fail)

| Requirement | Pass condition |
|---|---|
| Session count | 3 or more sessions submitted |
| Session content | Each session has user description, task, and behavioral notes |
| Surprise finding | At least one surprise finding named across all sessions |

### Rubric dimension: Test evidence quality

Scored as part of the cycle-level rubric.

| Level | Criteria |
|---|---|
| 0 | No test notes, or notes from teammates only |
| 1 | Notes capture opinions only ("they said they liked it") — no behavioral sequence |
| 2 | Notes capture specific behaviors: actions, pauses, confusions, sequence. At least one session names a surprise. |
| 3 | Notes are specific enough to reconstruct what happened. Multiple sessions show a consistent pattern or clear contradiction. Surprise findings change the team's view of the hypothesis. |

---

## Output Spec

**What the team submits:**

```
Cycle: [number]
Sessions: [number of sessions conducted]

Session 1:
  User: [brief description]
  Task given: [exact wording]
  Behavioral sequence: [numbered list]
  Unprompted remarks: [quotes]
  Stuck points: [description]
  Surprise: [one thing]
  Debrief notes: [Q&A]

Session 2: [same format]

Session 3: [same format]

[Session 4–5 optional]
```

**What the app stores:**

- array of session objects per cycle
- each session: user description, task text, behavioral notes (text), surprise finding (text)
- cycle number
- session count
- timestamp
