# Phase 3 — Interactive Sprint Loop (Loop-Based Architecture)

**Version:** 1.0  
**Date:** May 2026  
**Status:** READY TO BUILD  
**Connects to:** Phase 2 Ideation Sprint Spec  

---

## Core Difference from Phase 2

| Phase 2 | Phase 3 |
|---------|---------|
| Linear entry → Loop → Exit | Pure loop from entry |
| "Read instructions, then do" | "Do while guided" — interactive workspace |
| One-shot hypothesis | Hypothesis evolves each cycle, tracked |
| Mentor reviews after submission | AI mentor reviews during the work |
| Graded at phase end | Scored per-iteration, cumulative arc |

Phase 3 is **not a sequence of activities**. It is a **single interactive workspace** where teams run sprint cycles until they have strong evidence or hit the program deadline. Each cycle builds on the last, with the app guiding them live.

---

## The Interactive Loop

```
╔══════════════════════════════════════════════════════════════╗
║           PHASE 3: INTERACTIVE SPRINT WORKSPACE              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ENTRY: Phase 2 Evidence Pack + Proceed decision             ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  ITERATION COUNTER: 1 of 3                             │  ║
║  │  HYPOTHESIS STATUS: [draft → tested → revised]         │  ║
║  │  CYCLE STATE: [planning / testing / synthesizing]      │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                         │                                    ║
║                         ▼                                    ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  STEP 1: HYPOTHESIS CRAFT (Interactive)                │  ║
║  │  ─────────────────────────────────────────────────     │  ║
║  │  • WHO: ___ [dropdown: user type from Phase 1]         │  ║
║  │  • WILL DO: ___ [guided: specific action, not opinion] │  ║
║  │  • BECAUSE: ___ [auto-suggests Phase 1 evidence]     │  ║
║  │  • MEASURED BY: ___ [template: "X of Y testers..."]   │  ║
║  │                                                        │  ║
║  │  🤖 AI Check (live): "Has WHO+WILL DO+BECAUSE+MEASURED │  ║
║  │     BY. Missing: MEASURED BY. Add threshold."          │  ║
║  │                                                        │  ║
║  │  [Submit Hypothesis] → Auto-posts to Discord ritual    │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                         │                                    ║
║                         ▼                                    ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  STEP 2: PRETOTYPE BUILD (Interactive)                 │  ║
║  │  ─────────────────────────────────────────────────     │  ║
║  │  • Method picker: [Wizard of Oz / Landing Page /      │  ║
║  │    Concierge / Paper / Digital Mockup / Other]        │  ║
║  │  • "What ONE variable does this test?" [free text]     │  ║
║  │  • Upload/link pretotype artifact [drag-drop or URL]  │  ║
║  │                                                        │  ║
║  │  🤖 AI Check: "Method fits hypothesis? Yes. Variable   │  ║
║  │     isolation: You named 2 variables. Pick ONE."      │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                         │                                    ║
║                         ▼                                    ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  STEP 3: USER TEST (Interactive Capture)               │  ║
║  │  ─────────────────────────────────────────────────     │  ║
║  │  • Tester: [name, role, contact, fresh? Y/N]           │  ║
║  │  • Session date/time: [picker]                         │  ║
║  │  • Task given to user: "Show me how you'd..."           │  ║
║  │  • BEHAVIOR LOG (timed):                               │  ║
║  │    0:00-0:30 ___ [what user did]                       │  ║
║  │    0:30-1:00 ___                                       │  ║
║  │    ...                                                 │  ║
║  │  • What user said UNPROMPTED: ___                      │  ║
║  │  • Painful detail / surprise: ___                      │  ║
║  │  • Upload clip/screenshot (optional)                   │  ║
║  │                                                        │  ║
║  │  🤖 AI Check: "Behavior log has opinions ("liked it"). │  ║
║  │     Convert to action: "user scrolled past CTA twice." │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                         │                                    ║
║                         ▼                                    ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  STEP 4: SYNTHESIZE + GATE (Interactive Decision)      │  ║
║  │  ─────────────────────────────────────────────────     │  ║
║  │  • Hypothesis result: [Confirmed / Killed / Unclear]   │  ║
║  │  • What changed about our understanding: ___            │  ║
║  │  • ONE variable to change next cycle: ___               │  ║
║  │  • Or: [Proceed to Video] / [Kill — exit]              │  ║
║  │                                                        │  ║
║  │  🤖 AI Check: "Hypothesis identical to Cycle 1? No    │  ║
║  │     learning detected. Required before gating."       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                         │                                    ║
║                         ├── Refine → Iteration Counter +1   ║
║                         ├── Proceed → Round 1 Video Pack    ║
║                         └── Kill → Exit with log            ║
║                                                              ║
║  [Cycles continue until Proceed, Kill, or deadline.]       ║
╚══════════════════════════════════════════════════════════════╝
```

---

## The Iteration Counter

The iteration counter is the central state machine.

```
Cycle 1: Hypothesis 1 → Build 1 → Test 1 → Synthesize 1
   │                                              │
   │ Refine                                       │
   ▼                                              ▼
Cycle 2: Hypothesis 2 → Build 2 → Test 2 → Synthesize 2
   │                                              │
   │ Refine                                       │
   ▼                                              ▼
Cycle 3: Hypothesis 3 → Build 3 → Test 3 → Synthesize 3
   │                                              │
   ├── Proceed ──► Round 1 Video                  │
   └── Kill ──► Exit                              │
```

### Counter Rules

| Rule | Behavior |
|------|----------|
| Max cycles | 3 per team |
| Cycle reset | Only on "Pivot Concept" (rare in Phase 3) |
| Hypothesis evolution | Each cycle's hypothesis must differ from prior. AI enforces. |
| Variable isolation | "ONE variable changed" field is required from Cycle 2+. AI checks. |
| Fresh testers | Each cycle requires ≥1 new tester not used in prior Phase 3 cycles. |

### Hypothesis Tracker

A visible, persistent element in the workspace:

```
┌─────────────────────────────────────────┐
│ HYPOTHESIS EVOLUTION                     │
│                                          │
│ Cycle 1: "Students will skip manual     │
│   lookup when they see one-tap estimate" │
│   Result: Killed — 0/5 used it         │
│                                          │
│ Cycle 2: "Students will use it if      │
│   shown free answer BEFORE signup"      │
│   Result: Confirmed — 4/5 completed     │
│   Variable changed: gate position only   │
│                                          │
│ Cycle 3: [drafting...]                   │
│   Variable: form length (5→2 fields)     │
└─────────────────────────────────────────┘
```

This tracker is **auto-populated** from prior cycle submissions. Teams cannot delete history. It is the spine of the Evidence Pack.

---

## Interactive Workspace Design

### Principle: No Read-Only Pages

Every screen in Phase 3 requires input. The app is a **work tool**, not a textbook.

| Anti-pattern (Phase 2 style) | Phase 3 replacement |
|------------------------------|---------------------|
| "Read these instructions, then submit" | Guided form with live AI checks |
| "Here is the hypothesis template" | Interactive builder with autocomplete from Phase 1 evidence |
| "Submit your test notes" | Timed behavior log with real-time coaching |
| "Mentor will review later" | AI mentor responds within 60 sec of every input |
| "Review the rubric" | Score preview updates live as you fill the form |

### Interactive Elements per Step

#### Step 1: Hypothesis Craft
- **Dropdown**: WHO field suggests Phase 1 target user personas
- **Autocomplete**: BECAUSE field suggests Phase 1 interview quotes
- **Template picker**: MEASURED BY offers "X of Y" / "time to ___" / "completion rate" / custom
- **Live validation**: AI checks all 4 components before allowing submit
- **One-click post**: Submit → auto-posts to Discord public ritual thread

#### Step 2: Pretotype Build
- **Method picker**: Visual cards with examples (Wizard of Oz, Landing Page, etc.)
- **Variable isolator**: "What are you changing from last cycle?" with diff view
- **Artifact uploader**: Drag-drop or link. AI checks file type (image, URL, video)
- **Constraint check**: "You changed 3 variables. Pick ONE primary."

#### Step 3: User Test Capture
- **Timer**: Session timer runs during note-taking (optional, but encouraged)
- **Behavior-first UI**: "What did user DO?" is the primary field. "What did they say?" is secondary.
- **Fresh-tester check**: Auto-crosses names with Phase 2 tester list + prior cycles
- **Clip upload**: Optional but nudges: "Upload 30-sec clip for +5 video points"
- **Pain capture**: "What surprised you?" — required field. No "nothing surprised me" allowed.

#### Step 4: Synthesize + Gate
- **Decision tree**: Interactive flowchart. Teams click through: "Did hypothesis hold? → Yes/No/Unclear → [next question]"
- **Auto-populated fields**: "What changed" pulls from behavior log diffs
- **Gate blocker**: AI prevents "Proceed" if hypothesis is identical to prior cycle
- **Round 1 preview**: Shows what video sections will auto-generate from this cycle's data

---

## Assessment Architecture

### No End-of-Phase Rubric

Phase 3 does not have a separate "grade this phase" moment. Assessment is:

1. **Per-cycle scoring** (AI + self-assessment)
2. **Cumulative arc scoring** (mid-phase synthesis)
3. **Round 1 video grading** (external judges + AI pipeline)

### Per-Cycle Scorecard (Auto-Generated)

After each cycle, the app produces:

```
┌─────────────────────────────────────────┐
│ CYCLE 1 SCORECARD                       │
│                                          │
│ Hypothesis Quality     [░░░░░]  3/3    │
│   └─ Specific, testable, tied to evidence│
│                                          │
│ Variable Isolation     [░░░░░]  2/3    │
│   └─ Changed 1 variable? No → 2 listed   │
│                                          │
│ Behavioral Evidence    [░░░░░]  3/3    │
│   └─ Actions logged, not opinions        │
│                                          │
│ Tester Freshness       [░░░░░]  3/3    │
│   └─ New tester, not Phase 2 sample      │
│                                          │
│ Synthesis Honesty      [░░░░░]  2/3    │
│   └─ Named what didn't work? Partially   │
│                                          │
│ ───────────────────────────────────────  │
│ CYCLE TOTAL: 13 / 15                     │
│ RUNNING AVERAGE: 13.0                    │
│ PROJECTED ROUND 1 SCORE: 87/100        │
└─────────────────────────────────────────┘
```

This is **visible to the team** after each synthesis. It gamifies honest iteration.

### Cumulative Arc Assessment (Mid-Phase Synthesis)

On May 17 (Day 6), the app auto-generates a synthesis draft from all cycles:

```
AUTO-GENERATED DRAFT:

What we've learned:
• Cycle 1: [hypothesis] was [result]. Key finding: [auto from behavior log]
• Cycle 2: [hypothesis] was [result]. Key finding: [auto from behavior log]
• Pattern: [AI-detected pattern across cycles]

What we were wrong about:
• [Auto from "surprise" fields in Cycle 1 and 2]

Team edits this draft. AI scores the final synthesis on:
- Pattern detection (did team see the arc?)
- Wrongness honesty (did they admit at least one failure?)
- Evidence specificity (names, numbers, behaviors)
```

### Round 1 Video as Final Assessment

The video is not separate work. It is **auto-assembled** from the workspace:

| Video Section | Source |
|---------------|--------|
| Problem + Phase 1 evidence | Pre-populated from Phase 2 Evidence Pack |
| Cycle 1 hypothesis → test → result | Auto from Cycle 1 submissions |
| ONE variable changed | Auto from "variable changed" field |
| Cycle 2 hypothesis → test → result | Auto from Cycle 2 submissions |
| Synthesis | Auto from mid-phase synthesis |
| Pretotype demo | Final artifact from Cycle 2 or 3 |

Teams **edit and narrate** the auto-assembled story. The app provides:
- Storyboard template
- "Where to add your voiceover" markers
- "Required clips" checklist (≥2 raw user clips, ≥20 sec each)

---

## Feedback Layer

### AI Mentor (Real-Time, Every Input)

Unlike Phase 2's "submit then wait for mentor," Phase 3 AI responds continuously:

| Trigger | AI Response |
|---------|-------------|
| Hypothesis missing MEASURED BY | "Add a threshold. How many testers need to do X for this to hold?" |
| Behavior log has opinions | "Convert to action. Instead of 'liked it,' write 'user smiled and tapped next within 3 sec.'" |
| Variable field lists 3 changes | "Pick ONE. Science requires isolation. Save the others for the next cycle." |
| Hypothesis identical to prior cycle | "No learning detected. What did Cycle 1 reveal that changes your prediction?" |
| Tester appears in Phase 2 list | "Fresh tester required. This user already knows your story." |
| All signals positive, no nuance | "Real tests surface problems. Are you collecting honest signals?" |
| 3 days no test session logged | "Stuck recruiting? See Module 7. Mentor flag raised." |

### Peer Signal (Public Leaderboard)

Real-time ranking visible to all teams:

```
#phase3-leaderboard

🏆 Top by Cycles Completed
1. Team Alpha — 2 cycles, 6 fresh testers
2. Team Beta — 2 cycles, 5 fresh testers
...

📊 This Week's Movers
• Team Gamma: +3 testers (recruiting surge)
• Team Delta: Completed Cycle 2 synthesis

⚠️ Needs Attention
• Team Epsilon: 0 testers logged (Day 4)
```

### Human Mentor (Exception-Only)

Human mentors are not in the daily loop. They are triggered by:
- AI flags 3+ times on one team
- Team misses 2 consecutive daily check-ins
- Mid-phase synthesis score in bottom 20%
- Spot-check finds suspicious data

Mentor interaction: 1:1 call, not async comments. 30 min, scheduled within 24h of flag.

---

## State Machine: Team Status

```
                    ┌─────────────────┐
                    │   NOT STARTED   │
                    │  (pre-May 11)   │
                    └────────┬────────┘
                             │ Workshop / Module 1+2
                             ▼
                    ┌─────────────────┐
                    │   IN CYCLE 1    │
                    │  (planning)     │
                    └────────┬────────┘
                             │ Hypothesis submitted
                             ▼
                    ┌─────────────────┐
                    │   IN CYCLE 1    │
                    │  (testing)      │
                    └────────┬────────┘
                             │ Test session logged
                             ▼
                    ┌─────────────────┐
                    │   IN CYCLE 1    │
                    │ (synthesizing)  │
                    └────────┬────────┘
                             │ Gate decision
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ REFINE  │    │ PROCEED │    │  KILL   │
        │(Cycle 2)│    │(Video)  │    │ (Exit)  │
        └────┬────┘    └────┬────┘    └────┬────┘
             │              │              │
             ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ CYCLE 2 │    │ ROUND 1 │    │  DONE   │
        │(repeat) │    │ VIDEO   │    │         │
        └────┬────┘    └─────────┘    └─────────┘
             │
             ▼
        ┌─────────┐
        │ CYCLE 3 │
        │(repeat) │
        └────┬────┘
             │
             ▼
        ┌─────────┐
        │ PROCEED │
        │ or KILL │
        │(forced) │
        └─────────┘
```

Each state transition is **logged and visible** to the team and mentors.

---

## Files to Create

| File | Job |
|------|-----|
| `activity-cycle-interactive.md` | Full interactive workspace spec for one sprint cycle |
| `activity-mid-phase-synthesis.md` | Auto-generated synthesis + team editing interface |
| `activity-round-1-video.md` | Auto-assembly storyboard + required elements |
| `ai-mentor-prompts.md` | All AI feedback triggers and response templates |
| `state-machine.md` | Technical spec for status transitions |

---

## Open Decisions

- D1: Should the app nudge teams to Proceed after N cycles, or let them self-regulate?
- D2: Should the app auto-assemble video storyboard, or provide template only?
- D3: Should per-cycle scorecard be visible to team only, or public on leaderboard?
- D4: Should AI mentor tone be coach (suggestive) or instructor (directive)?
- D5: Should "Kill" option be available in Cycle 1, or only from Cycle 2?
