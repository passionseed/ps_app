# Phase 3 Daily System — Check-ins, AI Mentor, Mid-Phase Synthesis, Public Hypothesis Ritual

**Version:** 1.0
**Date:** 2026-05-09
**Active dates:** May 12–21 (10 days)
**Audience:** All Phase 3 participants

---

## What This Document Is

Specification for the highest-leverage component in Phase 3. Workshop is ignition, app is textbook, but this is where teaching actually happens — daily, at scale, alone with users.

50–80 teams × 10 days = 500–800 team-days. Zero human mentor capacity for that. AI mentor fills the gap. This doc defines how.

---

## Components

| Component | Frequency | Surface |
|---|---|---|
| Daily check-in | Once per day (due 22:00) | Self-Learning Platform form |
| AI mentor feedback | Within 60 sec of each check-in | Inline + push notification |
| Public hypothesis ritual | Once per cycle (before testing) | Discord pinned thread per team |
| Public leaderboard | Real-time | Discord channel + platform widget |
| Mid-phase synthesis | Once, due May 17 22:00 | Self-Learning Platform form + public posting |
| Mentor digest | Daily 23:00 to organizers | Email + Discord DM |

---

## 1. Daily Check-in

### Form fields

```
DAILY CHECK-IN — DAY ___ (auto-numbered)
Team: ___ (auto-filled)
Date: ___ (auto-filled)

CYCLE NUMBER: ___ (1, 2, or 3)
CYCLE STATE: [planning / testing / synthesizing]

CURRENT HYPOTHESIS (this cycle):
___

ONE VARIABLE CHANGED FROM LAST CYCLE:
___ (required from Cycle 2 onward; "first cycle" allowed for Cycle 1)

TEST SESSIONS RUN TODAY: ___ (number)

USERS TESTED TODAY:
[for each user]
- Name: ___
- Role: ___
- Contact: ___
- Channel: ___ (in-person / Zoom / phone / Line call)
- Duration: ___ min
- Fresh user (not Phase 2 sample)? [Y / N]

WHAT USERS DID (behavior, not opinion):
___

WHAT USERS SAID UNPROMPTED:
___

HYPOTHESIS RESULT:
[ ] Confirmed by behavior
[ ] Killed by behavior
[ ] Unclear — need more data

IF UNCLEAR OR KILLED, NEXT CYCLE'S HYPOTHESIS:
___

WHAT YOU CHANGED IN PRETOTYPE TODAY (if anything):
___
```

### Submission rules

- Due daily at 22:00. Late submissions accepted until 06:00 next day with auto-flag.
- Empty submission allowed (some days = no testing) but must include "no test today because ___" reason.
- Check-in count toward submission gate: ≥7 of 10 days submitted required.

---

## 2. AI Mentor Pipeline

### What it does

Within 60 sec of every check-in submission, AI processes the entry and returns inline feedback. Single surface, not separate channel — sits below the form.

### Feedback categories

**1. Hypothesis quality check**
- Is hypothesis testable? Has WHO, WILL DO, BECAUSE, MEASURED BY?
- If failing, returns rewrite suggestion + link to Module 2.

**2. Single-variable check (Cycle 2+)**
- Compares "ONE variable changed" to previous cycles.
- If multiple variables detected (long answer mentioning multiple changes), flags: "you may have changed more than one variable. Which is the primary? Test that alone next cycle."

**3. Behavioral evidence check**
- Compares "what users DID" vs "what users SAID."
- If "DID" field contains opinions ("liked it," "thought it was good"), flags: "this looks like opinion, not behavior. Try: time-to-first-action, where they paused, what they clicked unexpectedly."

**4. Stagnation check**
- Compares current hypothesis to previous days' hypotheses.
- If identical for 3+ days without testing, flags: "no testing happening. Stuck? See Module 7 (recruiting). Mentor flag raised."

**5. All-positive check**
- If hypothesis "confirmed" and all signals positive across multiple users with no nuance, flags: "real testing usually surfaces problems. Are you collecting honest signals? See Module 4."

**6. Tester freshness check**
- Cross-references submitted user names with team's Phase 2 tester list + prior Phase 3 entries.
- If repeated user, flags: "this tester appeared in [Phase 2 / Day X]. Phase 3 requires fresh users. New tester needed."

**7. Suspicion check (low priority but logged)**
- Patterns: backfilled timestamps, identical wording across team's check-ins, unrealistic session counts.
- Flags privately to mentor digest, not visible to team.

### Feedback format

```
🤖 AI MENTOR — Day 4 check-in

✓ Behavioral evidence captured well — specific actions noted.
⚠ Hypothesis hasn't changed since Day 2. Are you stuck recruiting,
  or did Day 2 hypothesis hold and you're testing it harder?
  → Module 7: Recruiting Fresh Testers
  → Module 6: Refine / Pivot / Kill
✗ "Variable changed" lists 3 things: copy, button, flow. Pick ONE
  to isolate. Save the others for Cycle 2/3.
  → Module 3: Single-Variable Iteration

Strongest signal today: user closed tab at signup. Real behavior. Use it.
```

Tone: Phase 2 mentor voice. Not punitive. Coaches. Links to specific module sections.

### Pipeline implementation

```
Check-in submitted
       │
       ▼
[Pass 1: Cheap classifier — flag categories]
       │  (Gemini Flash, ~$0.001/entry)
       ▼
[Pass 2: Coaching response generation]
       │  (Claude Sonnet or Gemini Pro, ~$0.01/entry)
       ▼
Returned to team within 60 sec
       │
       ▼
Logged to mentor digest if flag count ≥ 2
```

Cost: ~$0.01/check-in × 80 teams × 10 days = $8 total. Trivial.

### Anti-gaming

- AI scans for cross-team copy-paste (vector similarity check on submitted text)
- AI flags if "what users said" contains AI-generated phrasing patterns (Module 9 transparency: teams told this is checked)
- Suspicious entries flagged to mentor digest, not bounced — false positive cost too high

---

## 3. Public Hypothesis Ritual

### Mechanic

Each team gets a pinned Discord thread: `Team [Name] — Phase 3 Hypothesis Log`.

Before running ANY test session, team must post in their thread:

```
CYCLE ___ HYPOTHESIS — pre-registration

WHO: ___
WILL DO / WILL NOT DO: ___
BECAUSE: ___
MEASURED BY: ___
TESTING TODAY/TOMORROW WITH: ___ (tester name + role)
```

### Why pre-register

1. **Anti-fraud** — cannot retrofit "this is what we predicted" after the fact
2. **Public quality bar** — other teams see good hypotheses, copy the format
3. **AI feedback public** — AI bot replies in thread with hypothesis quality assessment
4. **Mentor visibility** — organizers scan threads, intervene where bar low

### Bot integration

Discord bot watches each team thread. On hypothesis post:
- Within 30 sec, posts AI feedback reply (same hypothesis pipeline as Module 2 / daily check-in)
- Pins the most recent hypothesis at top of thread

### Bot example reply

```
🤖 Hypothesis check — Cycle 2

✓ WHO specific (high school students Bangkok)
✓ WILL DO observable (will sign up)
⚠ BECAUSE thin — "they want it" doesn't tie to evidence
✗ MEASURED BY missing — what's the success threshold?

Suggested rewrite:
"High school students in Bangkok will complete the signup flow
within 2 minutes after seeing one free answer, because Phase 1
showed they distrust unknown brands until proven, measured by
≥4 of 5 testers completing without prompting."

Module 2 → Anatomy of a Testable Hypothesis
```

---

## 4. Public Leaderboard

### Display

Discord channel `#phase3-leaderboard` + platform widget.

### Metrics ranked

| Rank by | Why |
|---|---|
| Total cycles completed | Progress signal |
| Distinct fresh testers logged | Recruiting signal |
| Hypotheses pre-registered | Discipline signal |
| Mid-phase synthesis quality (post-May 17) | Synthesis signal |

### Anti-gaming

- Tester count requires logged contact (verified later via spot-check)
- Cycle completion requires hypothesis + test + synthesis all submitted
- Not a sum-of-parts gameable — each metric capped per cycle

### Why public

Peer signal. Team ranked low on Day 5 with 0 testers vs leader at 5 testers = motivation to recruit. Mentors can't generate this pressure at scale.

---

## 5. Mid-Phase Synthesis — May 17

### Why this exists

Critical Day 6 forcing function. Catches stuck/lying teams 5 days before submission. Becomes part of video story arc.

### Form

```
MID-PHASE SYNTHESIS — Team [Name]
Due May 17, 22:00

WHAT WE'VE LEARNED IN PHASE 3 SO FAR:
(2–3 sentences, specific evidence)
___

WHAT WE'VE CHANGED IN OUR PRETOTYPE OR HYPOTHESIS:
(specific changes attributed to user behavior)
___

WHAT WE WERE WRONG ABOUT:
(at least one — if you can't name one, you haven't tested honestly)
___

NEXT CYCLE'S HYPOTHESIS:
___

CURRENT PRETOTYPE STATE:
[link to live pretotype or screenshot]

CONFIDENCE FOR ROUND 1 SUBMISSION (1–10):
___
```

### Grading

AI grades on Phase 2 Dimension 5 (Synthesis Quality) + new dimension "wrongness honesty." Bottom 20% of teams auto-scheduled for mentor 1:1 within 24 hours.

### Public display

Synthesis posted in team's Discord thread. Visible to all. Other teams see the bar. AI replies with feedback.

### Boomerang to video

Mid-phase synthesis becomes the spine of the Round 1 video's iteration arc section.

---

## 6. Mentor Digest

### Daily delivery

Each evening 23:00, organizers receive a digest:

```
PHASE 3 MENTOR DIGEST — Day ___ (Date)

TEAMS REQUIRING ATTENTION (high priority)
1. Team X — flagged 4x today: stagnant hypothesis, no testers logged, suspicious copy-paste
2. Team Y — flagged 3x today: all-positive signals, no behavior captured
3. Team Z — missed check-in 2 days running

TEAMS PROGRESSING WELL (recognition opportunity)
- Team A: completed Cycle 2 with clear variable isolation
- Team B: strong behavioral capture, quality hypotheses

LEADERBOARD MOVEMENT
- Top 5 by cycles: A, B, C, D, E
- Bottom 5 by testers: X, Y, Z, W, V

NEW SUSPICION FLAGS (private, organizer eyes only)
- Team Q: tester names match Phase 2 list (4/5)
- Team R: check-in timestamps backfilled

ACTION QUEUE
[ ] Schedule mentor 1:1 with Team X
[ ] Spot-check Team Q (priority)
```

### Allocation

- Daily digest review: ~15 min/day for one organizer
- Mentor 1:1 calls: ~30 min × 3–5/week scheduled
- Spot-checks: random 20% over Phase 3 + all flagged

Total mentor capacity needed: ~10 hours/week organizer time. Fits a single point-person role.

---

## Daily Schedule

### Team daily routine

| Time | Activity |
|---|---|
| 09:00 | Daily clip drops in Discord (auto) |
| Anytime | App learning module review (as needed) |
| Anytime | Test sessions with users (if scheduled) |
| Before testing | Pre-register cycle hypothesis in Discord thread |
| 22:00 | Daily check-in due |
| Within 60 sec of check-in | AI mentor feedback returned |
| 23:00 (organizer side) | Mentor digest delivered |

### Special days

- May 17: Mid-phase synthesis due 22:00 (in addition to daily check-in)
- May 21: Final daily check-in due
- May 22: No daily check-in. Round 1 video due 23:59.

---

## Submission Gate Integration

Daily system feeds 5 of the submission gate requirements:

1. ≥7 of 10 daily check-ins submitted
2. Mid-phase synthesis on file
3. Public hypothesis ritual posts (≥2 cycles)
4. Tester contact list (assembled from check-ins)
5. Module completion (gate before submission accepted)

Missing any = submission blocked OR Problem Statement + Solution Effectiveness scores capped at 50%. See `grading-and-enforcement.md`.

---

## Privacy + Consent

Tester names + contacts are sensitive. Storage:

- Visible to: team itself, organizers, AI grading pipeline
- Not visible to: other teams, public Discord
- Consent: teams must obtain tester consent for spot-check contact (template provided in Module 7)
- Retention: deleted 30 days post-Round 1 unless tester opts in to follow-up

---

## Open Decisions

- D17 (open): Daily check-in form host — Self-Learning Platform native vs Google Form vs Notion?
- D18 (open): AI mentor model choice — Gemini Flash + Pro stack vs Claude Haiku + Sonnet stack?
- D19 (open): Discord bot vs custom platform integration for hypothesis ritual?
- D20 (open): Mentor digest delivery channel — email vs Slack vs Discord DM?
- D21 (open): How public is the public leaderboard — visible to all teams (peer pressure) vs visible to team itself only (avoid demoralizing bottom)?
