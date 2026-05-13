# Phase 3 — Backward Design

**Version:** 1.0  
**Date:** May 2026  
**Method:** Backward design. Start from Round 1 video requirements. Derive cycle outputs. Derive interactive steps. Derive pre-Phase 3 prerequisites.

---

## Stage 1: Desired Results (End Point)

### Round 1 Video (3–5 min, MP4 ≤200MB)

**Must contain:**

| Timestamp | Content | Source in Phase 3 |
|-----------|---------|-------------------|
| 0:00–0:20 | Problem + Phase 1 evidence (1 pain quote) | Phase 2 Evidence Pack (imported) |
| 0:20–0:50 | Cycle 1: hypothesis stated → test clip (≥15 sec real user) → result with number | Cycle 1 workspace submissions |
| 0:50–1:20 | ONE variable changed, why, reasoning | "Variable changed" field from Cycle 1→2 transition |
| 1:20–1:50 | Cycle 2: hypothesis stated → test clip (≥15 sec) → result with improvement | Cycle 2 workspace submissions |
| 1:50–2:30 | Synthesis: what learned, how hypothesis evolved | Mid-phase synthesis |
| 2:30–3:00 | Pretotype demo + first Phase 3 build move | Final cycle pretotype artifact |

**Required elements (hard gate):**
- ≥2 raw user clips, ≥20 sec each, real user voice/interaction
- Each clip captioned: user name + role
- ≥1 moment where team admits wrongness
- Pretotype change attributed to specific user behavior
- Iteration arc visible: hypothesis → test → variable change → result

**Judge scoring (evidence-weighted):**
- Problem Statement (25%): real user pain, specific detail, behavioral evidence
- Solution Effectiveness (25%): iteration arc, variable isolation, honest synthesis
- Innovation (20%): creativity of solution
- Feasibility (15%): buildability
- Presentation (15%): clarity, engagement

Teams cannot score >50% on Problem Statement + Solution Effectiveness without showing the iteration arc. Vanity prototypes lose. Real testing wins.

---

## Stage 2: Acceptable Evidence (Cycle Outputs)

Round 1 video is assembled from cycle outputs. Each cycle must produce evidence that maps directly to video sections.

### Cycle 1 Required Outputs

| Output | Maps to video | Quality bar |
|--------|---------------|-------------|
| Hypothesis with WHO+WILL DO+BECAUSE+MEASURED BY | Hypothesis stated in video | Testable, specific, tied to Phase 1 evidence |
| Pretotype artifact (link/image/video) | Not shown directly; referenced | Tests hypothesis, isolates one variable |
| Test session log: behavior, not opinion | Test clip + result number | ≥1 fresh tester, ≥15 min session, behavioral notes |
| Synthesis: what happened, what learned | Result with number | Honest: names what didn't work too |
| Variable changed (for Cycle 2) | ONE variable changed section | ONE thing, named explicitly |

### Cycle 2 Required Outputs

Same as Cycle 1, plus:

| Output | Maps to video | Quality bar |
|--------|---------------|-------------|
| Hypothesis must differ from Cycle 1 | Shows learning arc | Evolved based on Cycle 1 evidence |
| Test clip (optional upload, required for video) | Raw user clip in video | ≥20 sec, real user, captioned |
| Synthesis: compare Cycle 1 vs Cycle 2 | Improvement number | Specific: "Cycle 1: 1/5 completed. Cycle 2: 4/5." |

### Cycle 3 (Optional / Forced by Cap)

If Cycle 2 is inconclusive or team wants stronger evidence:

| Output | Maps to video | Quality bar |
|--------|---------------|-------------|
| Hypothesis sharpens further | Deepens arc | Tests edge case or refines variable |
| Additional test clip | More evidence | Fresh tester |
| Final synthesis | Concludes arc | Clear Proceed or Kill decision |

### Mid-Phase Synthesis (May 17, Day 6)

**Purpose:** Forcing function. Catches stuck/lying teams 5 days before submission. Becomes video spine.

**Required outputs:**
- 2–3 sentences: what learned so far (specific evidence)
- Specific changes attributed to user behavior
- ≥1 thing they were wrong about
- Next cycle hypothesis
- Current pretotype state (link/screenshot)
- Confidence 1–10 for Round 1

**Auto-generated from cycles:**
App drafts this from Cycle 1 + 2 data. Team edits. AI scores. Bottom 20% auto-scheduled mentor 1:1.

---

## Stage 3: Interactive Steps (How Teams Produce Evidence)

Each cycle has 4 interactive steps. No read-only pages. Every screen requires input.

### Step 1: Hypothesis Craft

**Goal:** Produce testable hypothesis that will be stated in video.

**Interactive elements:**
- WHO dropdown: suggests Phase 1 target users (auto from Phase 2 Evidence Pack)
- WILL DO field: template picker — "complete ___" / "skip ___" / "choose ___" / custom
- BECAUSE field: autocomplete from Phase 1 interview quotes. Team clicks quote, app formats: "Because Phase 1 showed [quote]"
- MEASURED BY field: template — "≥X of Y testers will ___" / "Time to ___ will be < Z seconds" / custom
- Live AI check: validates all 4 components present. Blocks submit if missing.
- One-click post: submits → auto-posts to Discord public ritual thread

**Backwards from:** Video section "hypothesis stated" must be specific, testable, with evidence tie.

### Step 2: Pretotype Build

**Goal:** Produce artifact that tests hypothesis, isolates one variable.

**Interactive elements:**
- Method picker cards: visual, with examples. Wizard of Oz, Landing Page, Concierge, Paper, Digital Mockup.
- Variable isolator: "What ONE thing are you changing from last cycle?" Diff view shows prior vs current.
- Artifact upload: drag-drop or URL. AI checks: is it accessible? Is it the right type?
- Constraint check: if team lists >1 variable, AI forces pick: "Which is primary? Test that alone."

**Backwards from:** Video section "ONE variable changed" must be clean, named, isolated.

### Step 3: User Test Capture

**Goal:** Produce behavioral evidence that becomes test clip + result number in video.

**Interactive elements:**
- Session timer: optional, runs during note-taking. Nudges: "Log behavior in real-time."
- Tester fields: name, role, contact, fresh? Y/N. Auto-cross-checks with Phase 2 list + prior cycles.
- Behavior-first UI: primary field = "What did user DO?" Secondary = "What did they say unprompted?"
- Timed log: 0:00–0:30, 0:30–1:00, etc. Team fills actions per interval.
- Pain capture: "What surprised you?" Required. No "nothing" allowed.
- Clip upload: optional. Nudge: "Upload 30-sec clip for +5 video points."
- AI coach: converts opinions to behaviors. "'Liked it' → 'user smiled, tapped next within 3 sec'"

**Backwards from:** Video requires ≥2 raw user clips, ≥20 sec, behavioral, captioned. Result needs numbers.

### Step 4: Synthesize + Gate

**Goal:** Produce honest synthesis that becomes video's learning arc.

**Interactive elements:**
- Decision tree: "Did hypothesis hold? → Yes / No / Unclear → [next question] → [gate]"
- Auto-populated: "What changed" pulls from behavior log diffs. Team edits.
- Gate blocker: AI prevents Proceed if hypothesis identical to prior cycle. "No learning detected. Required."
- Round 1 preview: shows what video sections auto-generate from this cycle. "Your video will show: [storyboard snippet]"
- Score preview: live scorecard updates. Gamifies honest iteration.

**Backwards from:** Video requires honest synthesis, admits wrongness, shows learning arc.

---

## Stage 4: Pre-Phase 3 Prerequisites (What Teams Need Before Entry)

### From Phase 2

| Prerequisite | Why needed | How used in Phase 3 |
|--------------|-----------|---------------------|
| Phase 2 Evidence Pack with Proceed | Entry gate | Imported as Phase 3 starting evidence base |
| Named target user | WHO field | Auto-suggests in hypothesis dropdown |
| System map + leverage point | BECAUSE field | Auto-suggests quotes and findings |
| ≥5 interviews worth of evidence | Testable hypotheses | Evidence base for all hypotheses |
| Final pretotype from last Phase 2 cycle | Starting artifact | Pretotype Step 2 auto-imports as "Cycle 0" |
| Proceed or Pivot decision | Entry routing | Pivot teams get revised framing message |

### App Prerequisites (Pre-May 11)

| Module | Gates | Why |
|--------|-------|-----|
| Module 1: Phase 3 = Phase 2, Sharper | Workshop entry | Prevents "this is new, I'm lost" panic |
| Module 2: Writing a Testable Hypothesis | First hypothesis post | Teams enter workspace knowing the format |

Teams cannot start Cycle 1 until both modules complete + quiz pass.

---

## Stage 5: Assessment Mapping (Full Chain)

```
ROUND 1 JUDGE RUBRIC
│
├── Problem Statement (25%)
│   └── Requires: ≥1 specific pain quote from Phase 1
│       └── From: Phase 2 Evidence Pack (imported)
│           └── Phase 2 prerequisite: Problem Proof Pack submitted
│
├── Solution Effectiveness (25%)
│   └── Requires: iteration arc visible in video
│       └── From: Cycle 1 + Cycle 2 + Cycle 3 outputs
│           └── Each cycle produces: hypothesis + test + synthesis
│               └── Interactive steps: Step 1→2→3→4 per cycle
│                   └── Step 3 requires: behavioral evidence
│                       └── Step 3 UI: behavior-first capture
│
├── Innovation (20%)
│   └── Requires: creative solution
│       └── From: Phase 2 ideation (already done)
│
├── Feasibility (15%)
│   └── Requires: buildable first move
│       └── From: Cycle 3 synthesis "What we build first"
│           └── Step 4 auto-field: "First Phase 3 move"
│
└── Presentation (15%)
    └── Requires: clear, engaging video
        └── From: auto-assembled storyboard + team voiceover
            └── App provides: storyboard template, required clips checklist
```

Every judge rubric dimension traces back to a specific interactive step. No gap.

---

## Stage 6: Anti-Fraud by Design (Backward from DQ Policy)

DQ policy requires structural honesty, not aspirational honesty.

| Fraud vector | Structural fix in design |
|--------------|--------------------------|
| Faked user clips | Pre-registration ritual: hypothesis posted BEFORE test. Cannot retrofit. Spot-check 20%. AI voice detection. |
| Backfilled check-ins | Timestamp auto-captured. Cannot edit. AI flags clustered timestamps. |
| Copied from other team | Vector similarity on submitted text. Cross-team copy flagged. |
| Phase 2 testers reused as Phase 3 "fresh" | Auto-cross-check. Fresh-tester flag. |
| Hypothesis identical across cycles | AI blocks Proceed. Forces learning. |
| Generic praise only | Behavior-first UI. Opinion fields secondary, AI-converts to action. |

Faking is harder than testing. Real testing is the path of least resistance.

---

## Stage 7: Build Sequence (Backward from May 22 Deadline)

```
May 22: Round 1 video due
│
May 21: Final check-in. Video production day.
│       App provides auto-assembled storyboard. Team narrates.
│
May 17: Mid-phase synthesis due (Day 6)
│       Auto-generated from Cycle 1+2. Team edits. AI scores.
│       Bottom 20% → mentor 1:1 within 24h.
│
May 12–16: Cycle 1 + Cycle 2
│       Daily check-ins. AI mentor feedback within 60 sec.
│       Public hypothesis ritual. Leaderboard.
│
May 11: Workshop (60 min) + clips start
│       Ignition. Identity shift. Sticky phrases. Public commit.
│
Pre-May 11: App modules unlock
│       Module 1 + 2 required before workshop entry.
```

---

## Stage 8: Open Decisions

- D1: App nudge strategy after N cycles? (milestone reminder vs self-regulated)
- D2: Auto-assemble video storyboard, or template only?
- D3: Per-cycle scorecard visible to team only, or public?
- D4: AI mentor tone: coach (suggestive) or instructor (directive)?
- D5: Kill available Cycle 1, or only from Cycle 2?
- D6: Mid-phase synthesis auto-generated quality threshold — draft vs full sentences?
- D7: Video clip upload optional or required per cycle?
