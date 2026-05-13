# Activity — Mid-Phase Synthesis (May 17, Day 6)

**Phase:** 3 — User Testing Sprint  
**Type:** Synthesis checkpoint (run once, Day 6)  
**Estimated time:** 30–45 minutes  
**Prerequisite:** Cycle 1 complete. Cycle 2 in progress or complete.  
**Output:** Synthesis paragraph + current state + confidence score. Becomes video spine.

---

## What This Document Is

The Day 6 forcing function. Catches stuck or dishonest teams with 5 days left before Round 1 submission. Also becomes the narrative spine of the Round 1 video's iteration arc section.

Unlike Phase 2's "submit a reflection form," this is an **auto-generated draft that the team edits**. The app does the hard work of synthesis; the team verifies, corrects, and owns it.

---

## Purpose

1. **Catch problems early.** Teams who have not tested honestly, or who are stuck, surface now — not on May 21.
2. **Produce the video spine.** The edited synthesis becomes the "what we learned" section of the Round 1 video.
3. **Force comparison.** Teams must compare Cycle 1 vs Cycle 2 explicitly. No hiding from the arc.
4. **Calibrate confidence.** Team rates 1–10 confidence for Round 1. Low scores trigger mentor support.

---

## Entry Condition

| State | UI treatment |
|-------|--------------|
| Cycle 1 complete, Cycle 2 not started | "You have 1 cycle. Synthesize what you learned so far." |
| Cycle 1 + 2 complete | "You have 2 cycles. Compare them. What's the pattern?" |
| Cycle 1 incomplete | "Finish Cycle 1 before synthesizing." (blocked) |

---

## Interactive Workspace

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ MID-PHASE SYNTHESIS — DAY 6                              │
│ ───────────────────────────                              │
│ Due: May 17, 22:00                                       │
│                                                          │
│ AUTO-GENERATED DRAFT (from your cycle data):             │
│ ┌─────────────────────────────────────────────────────────┐
│ │                                                          │
│ │ WHAT WE'VE LEARNED SO FAR:                              │
│ │ ─────────────────────────                               │
│ │ [Auto from Cycle 1 + 2 synthesis fields]               │
│ │                                                          │
│ │ Cycle 1: We tested [hypothesis]. Result: [result].     │
│ │ Key finding: [from "painful detail" field].            │
│ │                                                          │
│ │ Cycle 2: We tested [hypothesis]. Result: [result].     │
│ │ Key finding: [from "painful detail" field].            │
│ │                                                          │
│ │ Pattern detected: [AI-generated pattern across cycles]   │
│ │                                                          │
│ │ [Edit this section →]                                   │
│ │                                                          │
│ │ ─────────────────────────                               │
│ │ WHAT WE'VE CHANGED IN OUR PRETOTYPE:                   │
│ │ [Auto from "variable changed" fields across cycles]    │
│ │                                                          │
│ │ • Cycle 1→2: [variable]                                 │
│ │ • Cycle 2→3: [variable, if exists]                    │
│ │                                                          │
│ │ [Edit this section →]                                   │
│ │                                                          │
│ │ ─────────────────────────                               │
│ │ WHAT WE WERE WRONG ABOUT:                               │
│ │ [Auto from "what changed" + "painful detail" fields]   │
│ │                                                          │
│ │ • We thought [X], but evidence showed [Y].              │
│ │                                                          │
│ │ [Edit this section →]                                   │
│ │                                                          │
│ │ ─────────────────────────                               │
│ │ NEXT CYCLE'S HYPOTHESIS (if applicable):               │
│ │ [Auto-drafted from Cycle 2 result + pattern]           │
│ │                                                          │
│ │ [Edit this section →]                                   │
│ │                                                          │
│ │ ─────────────────────────                               │
│ │ CURRENT PRETOTYPE STATE:                                │
│ │ [Auto from last pretotype artifact]                     │
│ │                                                          │
│ │ [Edit this section →]                                   │
│ │                                                          │
│ │ ─────────────────────────                               │
│ │ CONFIDENCE FOR ROUND 1 (1–10):                         │
│ │ [Slider: 1 ←——————→ 10]                               │
│ │                                                          │
│ └─────────────────────────────────────────────────────────┘
│                                                          │
│ ─────────────────────────────────────────────────       │
│ 🤖 AI COACH (live, while editing):                       │
│    ✓ Synthesis references specific behaviors             │
│    ⚠ "What we were wrong about" = "we underestimated       │
│       user patience" — this is vague. Name a behavior:  │
│       "We thought users would complete signup in 2       │
│       steps. Evidence: 0/5 completed. They closed at    │
│       step 3."                                          │
│    ✗ Pattern not named. AI suggests: "Both cycles       │
│       show users abandon at the commitment step.       │
│       The problem is not the idea — it's the trust      │
│       gap before value is shown."                        │
│ ─────────────────────────────────────────────────       │
│                                                          │
│ [Save Draft]  [Submit Synthesis]                           │
│                                                          │
│ On submit: Auto-posts to Discord thread. AI scores.    │
│ Bottom 20% → mentor 1:1 scheduled within 24h.            │
└─────────────────────────────────────────────────────────┘
```

---

## Auto-Generation Rules

The app drafts each section from cycle data. Team edits. Nothing starts blank.

### Section 1: What We've Learned

**Auto-from:**
- Cycle 1 hypothesis + result + "what changed" field
- Cycle 2 hypothesis + result + "what changed" field
- AI pattern detection across both cycles

**AI pattern detection:**
- Same failure mode across cycles? → "Consistent blocker at [step]"
- Improvement from Cycle 1→2? → "Variable isolation worked: [X] improved from [Y] to [Z]"
- Inconclusive both cycles? → "Hypothesis needs sharpening. Evidence is mixed."
- Surprise finding? → "Unexpected pattern: [description]"

**Team edit task:** Verify accuracy. Add nuance. Correct AI if wrong.

### Section 2: What We Changed

**Auto-from:**
- "Variable changed" field from Cycle 1→2 transition
- "Variable changed" field from Cycle 2→3 (if exists)

**Format:**
```
• Cycle 1→2: Changed [variable]. Why: [reason from synthesis].
• Cycle 2→3: Changed [variable]. Why: [reason from synthesis].
```

**Team edit task:** Confirm reasoning is accurate. Add "what we expected vs what happened."

### Section 3: What We Were Wrong About

**Auto-from:**
- "Painful detail" fields where hypothesis was killed or unclear
- "What changed" fields where understanding shifted
- AI-suggested wrongness if team hasn't named any

**Team edit task:** Must name ≥1 thing. Cannot submit "nothing." AI enforces.

### Section 4: Next Cycle Hypothesis

**Auto-from:**
- Cycle 2 result + pattern + remaining cycles budget

**Rules:**
- If 2 cycles done, suggests Cycle 3 hypothesis
- If 1 cycle done, suggests Cycle 2 hypothesis
- If team has completed ≥3 cycles, app highlights accumulated evidence but does not hide the section

**Team edit task:** Sharpen, challenge, or rewrite. Must pass interactive hypothesis check (Step 1 rules).

### Section 5: Current Pretotype State

**Auto-from:**
- Last pretotype artifact uploaded
- Link auto-populated

**Team edit task:** Update link if changed. Add screenshot.

### Section 6: Confidence Score

**Input:** Slider 1–10

**UI behavior:**
- 1–3: Red zone. "Low confidence. What's missing?" + auto-suggests mentor 1:1.
- 4–6: Yellow zone. "Moderate. What would push you to 8?"
- 7–10: Green zone. "Strong. Make sure your evidence backs this up."

**Post-submit:** Confidence feeds mentor digest. Low scores prioritized.

---

## AI Scoring (Post-Submit)

AI scores synthesis on 3 dimensions. Bottom 20% auto-scheduled mentor 1:1.

### Dimension 1: Pattern Detection (0–3)

| Score | Criteria |
|-------|----------|
| 0 | No pattern named. Just lists cycle results. |
| 1 | Names a result per cycle but no cross-cycle insight. |
| 2 | Names a pattern ("users consistently drop at step X"). |
| 3 | Pattern connects to Phase 1 evidence and explains why it matters. |

### Dimension 2: Wrongness Honesty (0–3)

| Score | Criteria |
|-------|----------|
| 0 | Nothing named as wrong. |
| 1 | Vague wrongness ("we underestimated"). |
| 2 | Specific wrongness with evidence ("We thought X. Data showed Y."). |
| 3 | Wrongness changed the team's core understanding. |

### Dimension 3: Evidence Specificity (0–3)

| Score | Criteria |
|-------|----------|
| 0 | No numbers, names, or behaviors. Generic claims only. |
| 1 | Some numbers but thin ("most users liked it"). |
| 2 | Specific behaviors with counts ("4/5 completed"). |
| 3 | Specific behaviors + timestamps + quotes + comparison across cycles. |

**Total: 9 points.**

**Bottom 20% threshold:** ≤4 points triggers mentor 1:1.

---

## Public Display

On submit:
1. Auto-posts to team's Discord thread: `#team-name-phase3`
2. Visible to all teams. Other teams see the bar.
3. AI posts feedback reply in thread (same as daily check-in format).
4. Leaderboard updates: "Mid-phase synthesis submitted" badge.

---

## Mentor Digest Integration

```
PHASE 3 MENTOR DIGEST — May 17

SYNTHESIS SUBMITTED: [N] teams

BOTTOM 20% (auto-schedule 1:1):
• Team X — Score 2/9. No wrongness named. No pattern.
• Team Y — Score 3/9. Generic evidence. "Users liked it."

STRONG SYNTHESES (recognition):
• Team A — Score 9/9. Clear pattern, honest wrongness, specific quotes.

STUCK TEAMS (0 cycles complete):
• Team Z — No synthesis submitted. 0 testers logged.
```

---

## Connection to Round 1 Video

Mid-phase synthesis is the **spine** of the video's iteration arc section.

| Video timestamp | Source |
|-----------------|--------|
| 1:50–2:30 "What we learned" | Mid-phase synthesis Section 1 |
| 2:30–2:45 "What we were wrong about" | Mid-phase synthesis Section 3 |
| 2:45–3:00 "What we're building first" | Mid-phase synthesis Section 4 (Next cycle hypothesis → refined) |

App auto-tags synthesis sections for video assembly. Team can reorder or emphasize in video editor.

---

## Open Decisions

- D1: Should auto-generated draft be "bullet points" or "full sentences"?
- D2: Should AI pattern detection be visible to team before editing, or hidden until after submit?
- D3: Should low-confidence scores (1–3) block proceeding to Cycle 3, or just warn?
- D4: Should mid-phase synthesis be required for Round 1 submission (hard gate), or soft gate (cap score)?
