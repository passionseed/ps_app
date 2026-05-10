# Phase 3 App Learning Block

**Version:** 1.0
**Date:** 2026-05-09
**Format:** Self-paced micro-modules in Self-Learning Platform
**Audience:** All Phase 3 participants (HS + University tracks)

---

## What This Document Is

Specification for the methodology textbook of Phase 3. Workshop is the trailer; this is the movie. Modules teach the technique workshop only anchors. Modules unlock pre-workshop, available 24/7 throughout Phase 3.

---

## Job

Workshop cannot teach iteration discipline in 60 min. Methodology lives here, on-demand, bingeable, repeatable. Teams reach for modules when stuck mid-cycle.

Modules also serve as the basis for AI mentor feedback: when AI flags a check-in, it links to the relevant module with the correction.

---

## Format Standard

Each module:
- 2–5 min reading time + optional 1–2 min video
- One core concept, one example, one anti-example, one application prompt
- Embedded interactive check (1–2 questions, instant feedback)
- "Apply now" button linking to current cycle's daily check-in or hypothesis ritual

Style: like Phase 2 activity docs. Concrete examples. No filler.

---

## Module Index

| # | Title | Length | Unlocks |
|---|---|---|---|
| 1 | Phase 3 = Phase 2 Sprint Loop, Sharper | 3 min | Pre-May 11 (gates workshop entry) |
| 2 | Writing a Testable Hypothesis | 5 min | Pre-May 11 (gates workshop entry) |
| 3 | Single-Variable Iteration | 4 min | May 11 (post-workshop) |
| 4 | Behavioral Observation: Shut Up and Watch | 4 min | May 11 (post-workshop) |
| 5 | Said / Did / Paid Signal Hierarchy | 3 min | May 12 |
| 6 | Refine / Pivot / Kill Decision Tree | 4 min | May 13 |
| 7 | Recruiting Fresh Testers in 10 Days | 5 min | May 12 |
| 8 | Capturing the Iteration Arc for Video | 5 min | May 18 |
| 9 | Anti-Fraud: What We Will Catch | 3 min | May 11 (post-workshop) |

Total content time: ~36 min. Most teams binge in one sitting.

---

## Module 1: Phase 3 = Phase 2 Sprint Loop, Sharper

**Goal:** Teams understand Phase 3 is execution of Phase 2 methodology, not a new framework.

**Content:**
- Phase 2 sprint loop diagram (re-shown)
- "You ran this loop 1–3 times in Phase 2. Phase 3 = run it 2–3 more times. Same loop, sharper hypotheses, fresh testers, judging stakes."
- What's new in Phase 3: fresh testers (not Phase 2 sample), single-variable discipline, daily check-ins, public hypothesis pre-registration, mid-phase synthesis, video evidence requirements
- What's unchanged: hypothesis-driven cycles, behavioral observation, Refine/Pivot/Kill gate

**Interactive check:**
- Q: True or false — Phase 3 introduces a brand-new methodology unrelated to Phase 2.
  - A: False. Phase 3 deepens Phase 2.

**Apply:** Review your Phase 2 Evidence Pack. Note which hypothesis held. That's your Phase 3 starting point.

---

## Module 2: Writing a Testable Hypothesis

**Goal:** Teams write hypotheses that AI mentor will accept (specific user behavior, falsifiable claim, ties to a Phase 1/2 finding).

**Content:**
- Anatomy of a testable hypothesis:
  - WHO (specific user type)
  - WILL DO / WILL NOT DO (behavior)
  - BECAUSE (reason tied to evidence)
  - MEASURED BY (observable signal)
- Examples:
  - **Bad:** "users will like our app"
    - Why bad: vague, no behavior, no measure, no falsifiability
  - **Better:** "users will sign up after seeing one free answer"
    - Why better: specific behavior, but no "because," no measure
  - **Good:** "high school students will sign up for the AI tutor after seeing one free answer because they don't trust unknown brands until they see value, measured by completion rate of signup flow when free-answer-first vs signup-first"
    - Why good: WHO + WILL DO + BECAUSE + MEASURED BY all present, falsifiable
- Common hypothesis traps:
  - Future-tense opinions ("users would use it")
  - Internal beliefs ("we think it's good")
  - Compound hypotheses (testing 3 things at once)
  - Unfalsifiable claims ("users will value our solution")

**Interactive check:**
- Paste your hypothesis. AI feedback returns within 30 sec:
  - Testable: Y / N
  - Has WHO: Y / N
  - Has WILL DO: Y / N
  - Has BECAUSE: Y / N
  - Has MEASURED BY: Y / N
  - Suggested rewrite: ___

This interactive check reuses the daily check-in AI mentor pipeline.

**Apply:** Write Cycle 1 hypothesis. Submit to interactive check until all 5 boxes Y. Then post in your team's public hypothesis ritual thread.

---

## Module 3: Single-Variable Iteration

**Goal:** Teams change ONE thing between cycles. Isolate signal.

**Content:**
- The variable problem: "we tested, users were confused, so we changed copy + button + flow + colors. Cycle 2 went better. What worked?" Answer: nobody knows.
- The discipline: between cycles, identify ONE variable to change. Hold everything else constant. Test. Compare to prior cycle.
- Case study (3 cycles):
  - Cycle 1: signup-before-free-answer. 1/5 completed signup.
  - Hypothesis: signup gate is the blocker.
  - Variable changed: gate position only (signup AFTER free answer). Same copy, same flow, same design.
  - Cycle 2: 4/5 completed signup. Variable confirmed.
  - Hypothesis sharpened: but 1/5 still abandoned. Why?
  - Variable changed: signup form length (5 fields → 2 fields).
  - Cycle 3: 5/5 completed. Both variables now isolated and validated.
- What if you have multiple ideas? Stack them. Test in priority order across cycles. 3 cycles = 3 isolated variables = 3 confirmed insights.
- When NOT to single-variable: catastrophic pretotype failure (nobody could even use it). Reset to Phase 2 Pivot.

**Interactive check:**
- Q: Last cycle, 4/5 users got stuck. You want to fix copy, redesign the button, and add a video tutorial. What do you do this cycle?
  - A: Pick the ONE most likely cause. Test it alone. Save the others for Cycle 3 and 4.

**Apply:** Open your Phase 2 sprint log. List variables you changed between cycles. Were they isolated? If not, what would you do differently in Phase 3?

---

## Module 4: Behavioral Observation: Shut Up and Watch

**Goal:** Teams capture what users DO, not what they say.

**Content:**
- The opinion trap: users say what they think you want to hear. Especially Thai cultural context (kreng jai). Polite "yes" tells you nothing.
- The behavior signal: what users DO under observation is uncontaminated.
- The protocol:
  1. Frame: "show me how you'd accomplish [task]. Don't explain, just do it."
  2. Stay silent while user works. Note timestamps of: pauses, wrong clicks, frustration, abandonment, completion.
  3. After: ask ONE open question: "what was that like?" Listen.
  4. Never ask: "do you like it?" "would you use it?" "does this make sense?"
- Video examples (clip from workshop big demo):
  - Bad test: instructor pitches, user says "yeah it's nice." Useless data.
  - Good test: instructor silent, user fumbles, abandons, says "I don't sign up before knowing what it is." Goldmine.
- Capture template fields tied to behavior:
  - Time to first action
  - Where they paused (timestamp)
  - What they clicked that you didn't expect
  - Where they failed
  - What they said unprompted

**Interactive check:**
- Q: Which is behavioral evidence?
  - (a) "User said the design looked clean."
  - (b) "User scrolled past the CTA twice without clicking, then closed the tab." ✓

**Apply:** In your next test session, log behavior in 5-min increments. No opinion fields.

---

## Module 5: Said / Did / Paid Signal Hierarchy

**Goal:** Teams trust the right signals. Stop celebrating compliments.

**Content:**
- Three signal levels, weakest to strongest:
  1. **SAID** — verbal positive. "Great idea, I'd use it." Worth ~0. Politeness is free.
  2. **DID** — behavior. Completed the flow without prompting. Came back unprompted. Forwarded the link. Worth a lot.
  3. **PAID** — committed something costly. Gave email when asked once. Pre-paid. Scheduled callback. Showed up to test session 2. Strongest possible signal in pretotype phase.
- Why this matters for video: judges trained to recognize signal strength. "5 users said yes" = unimpressive. "3 users completed the full flow unprompted, 1 asked when launch is, 1 gave email for early access" = strong evidence.
- How to engineer Paid signals into testing:
  - Ask for email after positive test
  - Offer waitlist signup
  - Ask for referral to similar user
  - Ask "would you pay [specific amount]" with concrete commitment device

**Interactive check:**
- Q: Which is the strongest signal?
  - (a) User said "I'd definitely use this."
  - (b) User asked when it launches and gave their email. ✓

**Apply:** Next test session, design ONE Paid signal capture into the protocol.

---

## Module 6: Refine / Pivot / Kill Decision Tree

**Goal:** Teams make honest gate decisions at end of each cycle. Extend Phase 2 Sprint Step D.

**Content:**
- Decision tree:
```
                    Cycle complete
                          │
              Did hypothesis hold?
              ┌───────────┼───────────┐
              ▼           ▼           ▼
            YES         UNCLEAR      NO
              │           │           │
              ▼           ▼           ▼
       Sharper hyp?    Refine      Same idea?
       ┌──┴──┐         (one         ┌──┴──┐
       Y      N        more         Y      N
       │      │        cycle)       │      │
       ▼      ▼                     ▼      ▼
     Refine  Proceed              Pivot   Kill
                                  Concept
```
- When to Refine: hypothesis partially confirmed, sharper version available, cycles remain.
- When to Pivot: same idea fundamentally not working OR sharper hypothesis points to a different solution.
- When to Kill: pain not real, or solution space exhausted, restart from Phase 1.
- When to Proceed: hypothesis confirmed, ready for video evidence pack.
- The honesty test: if you wouldn't bet your own money on the next cycle, don't Proceed.

**Interactive check:**
- Q: Cycle 2 result: 5/5 users completed flow but 0 gave email. Hypothesis "users want this" partially holds. Best next move?
  - A: Refine. Hypothesis sharpened — they tolerate it but don't want it. Cycle 3 tests willingness signal.

**Apply:** End of each Phase 3 cycle, fill the decision tree with your data before choosing.

---

## Module 7: Recruiting Fresh Testers in 10 Days

**Goal:** Teams find 3 (HS) / 5 (Uni) NEW testers, not Phase 2 sample.

**Content:**
- Why fresh: Phase 2 testers know your story. Fresh users find new bugs.
- Diversity rule: not all from same friend group. Different ages/contexts.
- Channels (with templates):
  - Reddit: r/Thailand, r/Bangkok, r/AskThailand — DM template provided
  - Discord: course servers, hobby servers, Thai community servers
  - LINE OpenChat: search by topic
  - Cold DM on IG: target by hashtag/community
  - Family + extended family (low-friction starter)
  - Professors / TAs (good for expert-flavored students, but they ARE testers if they have the pain)
- Time math: 5 sessions × 30 min = 150 min over 10 days. Trivial. No excuses.
- DM template:
```
Hi [name], I'm [name] from [school]. I'm in a hackathon and built
a tool to [solve specific pain]. 10-min Zoom call to watch you try
it would help us a lot. Free, no pitch, no signup. Available [3
specific times this week]?
```
- Recruitment goal per cycle, not total: each cycle needs fresh users.

**Interactive check:**
- Q: True or false — your Phase 2 testers can count toward Phase 3 minimums.
  - A: False. Fresh users only.

**Apply:** Today, send 5 recruitment DMs. Aim for 3 confirmed sessions.

---

## Module 8: Capturing the Iteration Arc for Video

**Goal:** Teams produce Round 1 video that shows the arc, not just final state.

**Content:**
- The arc structure (3-min video version):
  - 0:00–0:20 — Problem + Phase 1 evidence (1 user pain quote)
  - 0:20–0:50 — Cycle 1: hypothesis stated, test clip shown (15 sec real user), result with number
  - 0:50–1:20 — ONE variable changed, why, with reasoning
  - 1:20–1:50 — Cycle 2: hypothesis stated, test clip shown (15 sec real user), result with improvement
  - 1:50–2:30 — Synthesis: what we learned, what changed about our hypothesis
  - 2:30–3:00 — Pretotype demo + roadmap
- Required elements (from submission gate):
  - ≥2 raw user clips, ≥20 sec each, real user speaking or interacting
  - User name + role on screen
  - At least one moment where team admits something they were wrong about
  - Pretotype change attributed to specific user behavior
- What NOT to include:
  - Polished testimonials
  - Generic "users loved it" claims
  - Hypothetical "would" statements
  - Stock footage of "users"
- Production tips:
  - Record screens during user tests (Zoom + record permission). Cheap.
  - Record audio at minimum if video uncomfortable. Strong signal still.
  - Letterbox 16:9. Subtitles in Thai + English required.

**Interactive check:**
- Q: Your video has 5 minutes. 4 minutes is your team explaining the app, 1 minute is one user clip. What's wrong?
  - A: Inverted. Aim for 60% real user content, 40% team narration.

**Apply:** Storyboard your video before May 21. Use the 3-min structure above.

---

## Module 9: Anti-Fraud: What We Will Catch

**Goal:** Total transparency on fraud detection. Set game theory baseline.

**Content:**
- The grading pipeline:
  1. AI Pass 1 (Gemini Flash): transcribes video, extracts every user clip, flags red signals (generic praise, future tense, identical user voice signature, AI-voice synthesis artifacts, copy-paste interview logs)
  2. AI Pass 2 (Claude Opus / Gemini Pro): scores rubric, applies red-flag checklist, computes suspicion score 0–10
  3. Human reviewer: spot-checks 20% random + all top finalists + all flagged
- Spot-check protocol: organizers contact your listed testers. "Did Team X actually interview you about Y?" One lie found = team DQ + public announcement in Discord.
- Red flags AI catches:
  - All user clips have same voice signature
  - User quotes are generic ("great idea," "would use")
  - No specific painful detail in any quote
  - Iteration log has no attribution to user behavior
  - Hypothesis identical across cycles (no learning)
  - Daily check-ins backfilled (timestamps clustered)
  - Submitted clips have AI voice synthesis markers
- What we DON'T catch (so don't try):
  - You can't fake a real interview cheaper than running one
  - 30 min real test < 30 min faking convincing fake
  - Fakes get caught at scale; real testing scales

**Interactive check:**
- Q: True or false — small fakes are tolerated since organizers can't check every team.
  - A: False. Random spot-check + AI scan = high catch rate. Caught teams DQ'd publicly.

**Apply:** Don't fake. Run real tests. They're easier and they win.

---

## Module Gating

| Module | Unlock | Required Before |
|---|---|---|
| 1 | Pre-May 11 | Workshop entry |
| 2 | Pre-May 11 | Workshop entry + first hypothesis post |
| 3 | May 11 post-workshop | Cycle 2 begins |
| 4 | May 11 post-workshop | First test session |
| 5 | May 12 | Cycle 1 synthesis |
| 6 | May 13 | Cycle 1 gate decision |
| 7 | May 12 | First test session |
| 8 | May 18 | Video production |
| 9 | May 11 post-workshop | Always available, mandatory pre-submission |

Round 1 submission requires 100% module completion + quiz pass.

---

## AI Feedback Integration

Modules 2 (hypothesis writing) uses the same AI pipeline as the daily check-in AI mentor. Single backend, two surfaces.

When AI flags a check-in entry, response includes a deep link to the relevant module: "Your hypothesis isn't testable. See Module 2 → Anatomy of a Testable Hypothesis."

Modules drift over Phase 3 if needed. Updates pushed instantly.

---

## Open Decisions

- D13 (open): Module content production — internal write vs hire instructional designer?
- D14 (open): Video clips inside modules — produce custom or reuse workshop clips?
- D15 (open): Translation strategy — Thai-first or English-first authoring?
- D16 (open): Module completion enforcement at submission — hard gate (cannot submit) or soft gate (visible warning)?
