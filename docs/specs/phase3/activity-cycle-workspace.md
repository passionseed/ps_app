# Activity — Sprint Cycle Workspace (Interactive)

**Phase:** 3 — User Testing Sprint  
**Type:** Loop (run 1–3 times)  
**Estimated time:** 2–4 hours per cycle  
**Prerequisite:** Phase 2 Evidence Pack with Proceed decision  
**Output per cycle:** Hypothesis + Pretotype + Test Evidence + Synthesis  

---

## What This Document Is

The full interactive workspace specification for one sprint cycle in Phase 3. This is not a "read then do" activity. It is a **work tool** where teams input data and receive live AI feedback. Every screen requires interaction. No passive consumption.

---

## Entry Condition

Teams enter the workspace in one of two states:

| Entry state | UI treatment |
|-------------|--------------|
| First cycle (Cycle 1) | "Start Cycle 1" button. Imports Phase 2 final pretotype as "Cycle 0 baseline." |
| Subsequent cycle (Cycle 2+) | "Start Cycle N" button. Pre-populates with prior cycle data. Shows hypothesis tracker. |

### Entry screen layout

```
┌─────────────────────────────────────────────────────────┐
│  CYCLE [N] WORKSPACE                                    │
│  ─────────────────                                      │
│  Status: [PLANNING → TESTING → SYNTHESIZING]          │
│                                                          │
│  HYPOTHESIS TRACKER                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │Cycle 1  │ │Cycle 2  │ │Cycle 3  │ ← active          │
│  │[status] │ │[status] │ │[draft]  │                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
│                                                          │
│  [Start Cycle N] ← disabled if prior cycle incomplete   │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Hypothesis Craft (Interactive)

**Goal:** Produce testable hypothesis with WHO+WILL DO+BECAUSE+MEASURED BY.

**Time:** 10–15 minutes  
**UI mode:** Form with live validation + AI coach  

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: WRITE YOUR HYPOTHESIS                            │
│ ───────────────────────────                              │
│                                                          │
│ WHO will you test?                                       │
│ ▼ [Dropdown: Phase 1 target users]                      │
│    • "University students who commute by bus"           │
│    • "High school students using tutoring apps"         │
│    • "Small restaurant owners managing inventory"       │
│    • [Custom...]                                        │
│                                                          │
│ WILL DO (specific action, not opinion):                │
│ ▼ [Template picker]                                     │
│    • "complete ___ without prompting"                  │
│    • "skip ___ and choose ___ instead"                 │
│    • "return within ___ hours unprompted"             │
│    • "forward the link to someone"                      │
│    • [Custom...]                                        │
│ [________________________________] free text             │
│                                                          │
│ BECAUSE (evidence from Phase 1):                       │
│ [Search Phase 1 quotes...] ── or ── [Write custom]     │
│ ┌─────────────────────────────────────────┐            │
│ │ "8 of 10 users said lookup takes too      │            │
│ │  many steps and they often just guess"   │ ← quote   │
│ │  [Select] [View in context]              │   card    │
│ └─────────────────────────────────────────┘            │
│                                                          │
│ MEASURED BY (observable threshold):                     │
│ ▼ [Template picker]                                     │
│    • "≥X of Y testers will ___"                        │
│    • "Time to ___ will be < Z seconds"                 │
│    • "Completion rate will be X%"                       │
│    • "Error rate will be < X%"                         │
│    • [Custom...]                                        │
│ [________________________________]                       │
│                                                          │
│ ─────────────────────────────────────────────────       │
│ 🤖 AI COACH (live):                                      │
│    ✓ WHO: specific (university students)                 │
│    ✓ WILL DO: observable action                          │
│    ✓ BECAUSE: tied to Phase 1 evidence                   │
│    ⚠ MEASURED BY: missing threshold. Add "≥4 of 5"     │
│       → See Module 2: Writing a Testable Hypothesis      │
│ ─────────────────────────────────────────────────       │
│                                                          │
│ [Save Draft]  [Submit Hypothesis]                        │
│                                                          │
│ On submit: Auto-posts to Discord ritual thread          │
└─────────────────────────────────────────────────────────┘
```

### Field behaviors

| Field | Input type | Validation | AI check |
|-------|-----------|------------|----------|
| WHO | Dropdown + custom | Required | Specific? (not "users") |
| WILL DO | Template + custom | Required | Observable action? (not "like" or "enjoy") |
| BECAUSE | Quote selector + custom | Required | Ties to Phase 1 evidence? |
| MEASURED BY | Template + custom | Required | Has threshold? (X of Y, time, rate) |

### Submit rules

- All 4 fields required
- AI checks all 4 before enabling submit
- Missing field = AI explains what's missing + links to module
- Submit = hypothesis locked for this cycle. Editable until first test session logged.
- Auto-posts to Discord public ritual thread with timestamp

---

## Step 2: Pretotype Build (Interactive)

**Goal:** Produce artifact that tests hypothesis, changes ONE variable from prior cycle.

**Time:** 30–60 minutes (off-app work) + 5 min upload  
**UI mode:** Method picker + variable isolator + artifact upload  

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ STEP 2: BUILD YOUR PRETOTYPE                             │
│ ───────────────────────────                              │
│                                                          │
│ CHOOSE METHOD:                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Wizard   │ │ Landing  │ │Concierge │ │  Paper   │   │
│ │  of Oz   │ │  Page    │ │          │ │          │   │
│ │ [i]      │ │ [i]      │ │ [i]      │ │ [i]      │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐                                 │
│ │ Digital  │ │  Other   │                                 │
│ │ Mockup   │ │          │                                 │
│ └──────────┘ └──────────┘                                 │
│                                                          │
│ WHAT ONE VARIABLE DOES THIS TEST?                        │
│ (What are you changing from last cycle?)                 │
│                                                          │
│ PRIOR CYCLE:                                             │
│ ┌─────────────────────────────────────────┐              │
│ │ Cycle 1 variable: "signup gate position"│ ← readonly │
│ │ Result: Killed — 0/5 completed signup   │              │
│ └─────────────────────────────────────────┘              │
│                                                          │
│ THIS CYCLE:                                              │
│ [________________________________________]              │
│                                                          │
│ UPLOAD ARTIFACT:                                         │
│ [Drag image/video here] or [Paste URL]                 │
│                                                          │
│ ─────────────────────────────────────────────────       │
│ 🤖 AI COACH (live):                                      │
│    ✓ Method: Landing Page fits hypothesis                │
│    ⚠ Variable: You listed 3 things:                     │
│       "changed copy, button color, form fields"         │
│       → Pick ONE. Which is most likely to move the       │
│         needle? Save others for next cycle.             │
│       → See Module 3: Single-Variable Iteration        │
│ ─────────────────────────────────────────────────       │
│                                                          │
│ [Save Draft]  [Submit Pretotype]                         │
└─────────────────────────────────────────────────────────┘
```

### Field behaviors

| Field | Input type | Validation | AI check |
|-------|-----------|------------|----------|
| Method | Visual card picker | Required | Fits hypothesis? |
| Variable | Free text | Required from Cycle 2+ | Only 1 variable named? |
| Artifact | File upload or URL | Required | Accessible? Correct type? |

### Variable isolator rules (Cycle 2+)

- App shows prior cycle variable + result
- Team must name ONE variable for this cycle
- If text mentions multiple changes, AI flags: "Pick ONE"
- Cannot submit until AI confirms single variable

---

## Step 3: User Test Capture (Interactive)

**Goal:** Produce behavioral evidence from real user session.

**Time:** 30–60 minutes (off-app test) + 10 min logging  
**UI mode:** Timer + behavior-first log + fresh-tester check  

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ STEP 3: LOG YOUR USER TEST                               │
│ ───────────────────────────                              │
│                                                          │
│ TESTER INFO:                                             │
│ Name: [________________]                                 │
│ Role: [________________]                                 │
│ Contact: [________________]                              │
│ Fresh user (not Phase 2 / prior Cycle 3)? [Y / N]     │
│                                                          │
│ SESSION:                                                 │
│ Date: [date picker]  Time: [time picker]               │
│ Duration: [___] minutes                                  │
│ Channel: ▼ [In-person / Zoom / Phone / LINE / Other]    │
│                                                          │
│ TIMER: [Start]  00:00                                    │
│                                                          │
│ BEHAVIOR LOG (primary):                                  │
│ ┌─────────────────────────────────────────┐              │
│ │ 0:00–0:30  [________________________]   │              │
│ │ 0:30–1:00  [________________________]   │              │
│ │ 1:00–1:30  [________________________]   │              │
│ │ 1:30–2:00  [________________________]   │              │
│ │ ... (auto-adds intervals)                 │              │
│ └─────────────────────────────────────────┘              │
│                                                          │
│ WHAT USER SAID UNPROMPTED:                               │
│ [________________________________________]              │
│                                                          │
│ PAINFUL DETAIL / SURPRISE (required):                    │
│ [________________________________________]              │
│ "What surprised you? What did you NOT expect?"          │
│                                                          │
│ HYPOTHESIS RESULT:                                       │
│ ○ Confirmed by behavior                                  │
│ ○ Killed by behavior                                     │
│ ○ Unclear — need more data                               │
│                                                          │
│ UPLOAD CLIP (optional, +5 video points):                │
│ [Upload 30-sec video or screenshot]                      │
│                                                          │
│ ─────────────────────────────────────────────────       │
│ 🤖 AI COACH (live):                                      │
│    ✓ Behavior log: Actions noted                         │
│    ⚠ "User said 'it looks clean'" — this is opinion.    │
│       Convert to behavior: "User scrolled through        │
│       all 3 pages without pausing, then closed tab."   │
│       → See Module 4: Behavioral Observation            │
│    ✗ Tester "Sara" appeared in Phase 2 list.           │
│       Fresh tester required for Phase 3.                 │
│       → See Module 7: Recruiting Fresh Testers          │
│ ─────────────────────────────────────────────────       │
│                                                          │
│ [Save Draft]  [Submit Test Log]                          │
│                                                          │
│ On submit: Validates ≥1 behavior entry. Updates tracker. │
└─────────────────────────────────────────────────────────┘
```

### Field behaviors

| Field | Input type | Validation | AI check |
|-------|-----------|------------|----------|
| Tester name | Free text | Required | Cross-check Phase 2 + prior cycles |
| Fresh? | Toggle | Required | Auto-suggests based on cross-check |
| Behavior log | Timed text entries | ≥1 interval required | Opinion vs behavior detection |
| Painful detail | Free text | Required | Cannot be "nothing" or "N/A" |
| Hypothesis result | Radio | Required | — |
| Clip upload | File | Optional | Video length, audio present |

### Behavior log rules

- Timer optional but encouraged. Start → log per interval.
- Primary field = "What did user DO?" Not "What did they say?"
- AI scans for opinion words: "liked", "loved", "good", "nice", "useful"
- Detects opinion → suggests behavior rewrite
- Painful detail required. Blocker: "You must name one surprise before submitting."

### Fresh tester check

- App maintains list of all Phase 2 testers + prior Phase 3 cycles
- Auto-cross-checks name. Flags: "Tester appeared in [list]. Fresh user required."
- False positive → team can override with explanation

---

## Step 4: Synthesize + Gate (Interactive)

**Goal:** Produce honest synthesis. Make gate decision. Feed into video arc.

**Time:** 15–20 minutes  
**UI mode:** Decision tree + auto-populated fields + Round 1 preview  

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ STEP 4: SYNTHESIZE + CHOOSE GATE                         │
│ ───────────────────────────────                          │
│                                                          │
│ HYPOTHESIS RESULT REVIEW:                                │
│ ┌─────────────────────────────────────────┐              │
│ │ Cycle [N] hypothesis:                   │              │
│ │ "Students will skip manual lookup..."   │ ← readonly │
│ │                                         │              │
│ │ Result: [Confirmed / Killed / Unclear]  │ ← from Step 3│
│ │                                         │              │
│ │ Key behaviors observed:                 │              │
│ │ • 0:30 paused at signup screen          │ ← from log │
│ │ • 1:00 closed tab without completing    │              │
│ │ • Said unprompted: "too many steps"      │              │
│ └─────────────────────────────────────────┘              │
│                                                          │
│ WHAT CHANGED ABOUT OUR UNDERSTANDING?                    │
│ [________________________________________]              │
│ "What did this cycle reveal that you didn't know before?"│
│                                                          │
│ COMPARE TO PRIOR CYCLE (auto-populated, editable):       │
│ ┌─────────────────────────────────────────┐              │
│ │ Cycle 1: 0/5 completed signup          │ ← readonly │
│ │ Cycle 2: 4/5 completed signup          │ ← from data│
│ │ Variable: gate position only           │              │
│ │ Change: ___ [team fills]               │              │
│ └─────────────────────────────────────────┘              │
│                                                          │
│ ONE VARIABLE TO CHANGE NEXT CYCLE (if Refine):           │
│ [________________________________________]              │
│                                                          │
│ ─────────────────────────────────────────────────       │
│ CHOOSE GATE:                                             │
│                                                          │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│ │  REFINE     │  │  PROCEED    │  │    KILL     │       │
│ │  ↻ Cycle N+1│  │  → Video    │  │  → Exit     │       │
│ └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                          │
│ ─────────────────────────────────────────────────       │
│ ROUND 1 VIDEO PREVIEW (auto from this cycle):            │
│ ┌─────────────────────────────────────────┐              │
│ │ Your video will show:                   │              │
│ │ • 0:20–0:50: Hypothesis + test clip    │              │
│ │ • 0:50–1:20: "Changed gate position"   │              │
│ │ • 1:20–1:50: Result: 4/5 completed     │              │
│ │ • 1:50–2:30: "We were wrong about..."  │              │
│ └─────────────────────────────────────────┘              │
│                                                          │
│ CYCLE SCORECARD (live):                                  │
│ Hypothesis Quality     [░░░░░]  3/3                    │
│ Variable Isolation     [░░░░░]  2/3                    │
│ Behavioral Evidence    [░░░░░]  3/3                    │
│ Tester Freshness       [░░░░░]  3/3                    │
│ Synthesis Honesty      [░░░░░]  2/3                    │
│ ─────────────────────────────────────────                │
│ CYCLE TOTAL: 13 / 15                                     │
│ RUNNING AVERAGE: 13.0                                    │
│                                                          │
│ ─────────────────────────────────────────────────       │
│ 🤖 AI COACH (live):                                      │
│    ✓ Synthesis: Names what changed                       │
│    ⚠ "What changed" = "users liked it more" — this    │
│       is opinion. Name a behavior: "4/5 completed vs     │
│       0/5 last cycle."                                  │
│    ✗ Hypothesis identical to Cycle 1? NO — it evolved. │
│       Proceed allowed.                                   │
│ ─────────────────────────────────────────────────       │
│                                                          │
│ [Save Draft]  [Confirm Gate Decision]                    │
│                                                          │
│ On confirm: Locks cycle. Updates tracker. Routes.       │
└─────────────────────────────────────────────────────────┘
```

### Field behaviors

| Field | Input type | Validation | AI check |
|-------|-----------|------------|----------|
| What changed | Free text | Required | Behavior-based, not opinion? |
| Compare to prior | Auto + editable | Auto from data | — |
| Next variable (if Refine) | Free text | Required if Refine | Only 1 named? |
| Gate decision | Button group | Required | Learning detected? |

### Gate rules

| Decision | Rule |
|----------|------|
| Refine | Increments cycle counter. Hypothesis must differ from prior. Variable must be 1. No max — teams iterate until evidence is strong or deadline arrives. |
| Proceed | Allowed if hypothesis evolved + evidence present. Routes to Round 1 Video activity. |
| Kill | Always available. Routes to exit survey. Preserves cycle log for learning. |
| Blocked | "Proceed" blocked if hypothesis identical to prior cycle. AI: "No learning detected. Revise or pick Refine." |

### Round 1 preview

Auto-generated from cycle data. Shows team what their video will contain. Updates in real-time as team fills fields.

### Cycle scorecard

Visible after synthesis submitted. 5 dimensions, 3 points each. Gamifies honest iteration.

| Dimension | 1 point | 2 points | 3 points |
|-----------|---------|----------|----------|
| Hypothesis Quality | Has 2–3 components | Has all 4, testable | Has all 4, falsifiable, Phase 1 tie |
| Variable Isolation | Named a variable | Named 1 variable | Named 1 variable, clearly isolated |
| Behavioral Evidence | Some behavior noted | Actions logged per interval | Specific timestamps, surprises noted |
| Tester Freshness | New tester | Fresh + diverse | Fresh + not from friend circle |
| Synthesis Honesty | Names what happened | Names what changed | Admits wrongness, names surprise |

---

## Exit Rules

### After Refine

- Cycle counter +1
- Prior cycle data locked (read-only)
- New cycle workspace opens with pre-populated tracker
- "Variable changed" field required and compared to prior

### After Proceed

- All cycles locked
- Routes to `activity-round-1-video.md`
- App auto-assembles video storyboard from all cycles

### After Kill

- All cycles preserved (read-only)
- Exit survey: "What would have helped?" + "Would you return?"
- Team may re-enter Phase 3 later with new idea

---

## Anti-Fraud in Design

| Risk | Structural fix |
|------|----------------|
| Hypothesis posted after test | Pre-registration ritual: timestamped Discord post BEFORE test session |
| Same hypothesis across cycles | AI blocks Proceed. Forces evolution. |
| Opinion-only test notes | Behavior-first UI. AI converts opinions. Painful detail required. |
| Phase 2 testers counted as fresh | Auto cross-check. Flag override requires explanation. |
| Backfilled data | Timestamps auto-captured. Cannot edit. |

---

## AI Mentor Integration

Every input in every step triggers AI feedback within 60 seconds:

| Trigger | Response | Severity |
|---------|----------|----------|
| Hypothesis missing MEASURED BY | Suggest threshold + link Module 2 | Blocking |
| Variable lists 3 changes | Force pick ONE + link Module 3 | Blocking |
| Behavior log has opinions | Convert to action + link Module 4 | Warning |
| Tester in Phase 2 list | Flag + link Module 7 | Blocking |
| Hypothesis identical to prior | Block Proceed + ask what changed | Blocking |
| All-positive, no nuance | "Real tests surface problems" + link Module 4 | Warning |
| 3 days no test logged | "Stuck recruiting?" + mentor flag | Info |
| Synthesis vague | "Name a behavior, not a feeling" | Warning |
| Painful detail = "nothing" | "Required. What surprised you?" | Blocking |

---

## Files Referenced

- `_loop-interactive.md` — State machine, counter rules, tracker
- `backward-design.md` — Assessment chain mapping
- `ai-mentor-prompts.md` — All trigger/response templates
- `activity-mid-phase-synthesis.md` — Day 6 forcing function
- `activity-round-1-video.md` — Auto-assembly storyboard
