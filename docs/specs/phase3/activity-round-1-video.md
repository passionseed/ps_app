# Activity — Round 1 Video Assembly

**Phase:** 3 — Exit  
**Type:** Auto-assembly + team narration  
**Estimated time:** 2–3 hours (editing + recording)  
**Prerequisite:** ≥1 cycle complete with Proceed gate. Mid-phase synthesis submitted.  
**Output:** 3–5 min MP4 video, ≤200MB, with iteration arc evidence

---

## What This Document Is

The Round 1 video is not "start from blank page." It is **auto-assembled from the workspace** and then edited/narrated by the team. The app produces a storyboard with all required elements pre-filled. The team's job is to narrate, refine, and add voiceover.

This doc specifies:
1. Auto-assembly logic (what pulls from where)
2. Storyboard template
3. Required elements checklist
4. Video editor UI in the app
5. Submission gate integration

---

## Auto-Assembly Logic

### Data sources

| Video section | Source in Phase 3 workspace |
|---------------|----------------------------|
| 0:00–0:20 Problem + Phase 1 evidence | Phase 2 Evidence Pack (imported) |
| 0:20–0:50 Cycle 1: hypothesis + test + result | Cycle 1 Step 1 (hypothesis) + Step 3 (test log + clip) + Step 4 (synthesis) |
| 0:50–1:20 ONE variable changed + reasoning | Cycle 1→2 transition: "variable changed" field + "what changed" synthesis |
| 1:20–1:50 Cycle 2: hypothesis + test + result | Cycle 2 Step 1 + Step 3 + Step 4 |
| 1:50–2:30 Synthesis: what learned, wrongness | Mid-phase synthesis Sections 1 + 3 |
| 2:30–3:00 Pretotype demo + first build move | Final pretotype artifact + Cycle 3/next hypothesis |

### Assembly rules

- App pulls text directly from workspace fields. No retyping.
- Clips uploaded in Step 3 auto-place in storyboard at correct timestamp.
- If clip missing, storyboard shows "[Upload 20-sec clip here]" placeholder.
- If cycle incomplete, storyboard shows "[Complete Cycle X to fill this section]" blocker.
- Hypothesis text auto-formatted for video: "We believed [WHO] would [WILL DO]..."

---

## Storyboard Template

The app presents a linear storyboard. Teams drag/reorder sections. Cannot delete required sections.

```
┌─────────────────────────────────────────────────────────┐
│ ROUND 1 VIDEO STORYBOARD                                 │
│ ───────────────────────                                  │
│ Total: 3:00 / 5:00 max                                   │
│                                                          │
│ ┌─────────────────────────────────────────────────────────┐
│ │ SECTION 1: PROBLEM (0:00–0:20)                           │
│ │ ───────────────────────────                              │
│ │ [Auto from Phase 2 Evidence Pack]                      │
│ │                                                          │
│ │ "[User quote from Phase 1 interview]"                  │
│ │ — [User name], [role]                                  │
│ │                                                          │
│ │ [Upload B-roll: photo of user context]                  │
│ │ [Record voiceover: "This is the problem we set out..."]│
│ │                                                          │
│ │ [✓] Required: ≥1 pain quote with name + role           │
│ └─────────────────────────────────────────────────────────┘
│                                                          │
│ ┌─────────────────────────────────────────────────────────┐
│ │ SECTION 2: CYCLE 1 (0:20–0:50)                           │
│ │ ───────────────────────────                              │
│ │ Hypothesis: "We believed [WHO] would [WILL DO]..."      │
│ │                                                          │
│ │ [Clip slot: 0:20–0:35]                                  │
│ │ [Upload or auto from Step 3]                            │
│ │                                                          │
│ │ Result: "[X of Y testers] [did / didn't] [WILL DO]"   │
│ │                                                          │
│ │ [Record voiceover: "Our first test showed..."]        │
│ │                                                          │
│ │ [✓] Required: Hypothesis stated                          │
│ │ [✓] Required: Test clip ≥15 sec, real user             │
│ │ [✓] Required: Result with number                       │
│ └─────────────────────────────────────────────────────────┘
│                                                          │
│ ┌─────────────────────────────────────────────────────────┐
│ │ SECTION 3: THE VARIABLE (0:50–1:20)                        │
│ │ ───────────────────────────                              │
│ │ "We changed ONE thing: [variable from workspace]"      │
│ │                                                          │
│ │ Before: [pretotype artifact from Cycle 1]               │
│ │ After: [pretotype artifact from Cycle 2]                │
│ │                                                          │
│ │ "Why: [reasoning from 'what changed' field]"           │
│ │                                                          │
│ │ [Record voiceover: "Based on this, we decided..."]     │
│ │                                                          │
│ │ [✓] Required: ONE variable named                         │
│ │ [✓] Required: Before/after visible                       │
│ └─────────────────────────────────────────────────────────┘
│                                                          │
│ ┌─────────────────────────────────────────────────────────┐
│ │ SECTION 4: CYCLE 2 (1:20–1:50)                           │
│ │ ───────────────────────────                              │
│ │ Hypothesis: "We believed [WHO] would [WILL DO]..."    │
│ │                                                          │
│ │ [Clip slot: 1:20–1:35]                                  │
│ │ [Upload or auto from Step 3]                            │
│ │                                                          │
│ │ Result: "[X of Y testers] [did / didn't] [WILL DO]"   │
│ │                                                          │
│ │ [Record voiceover: "In our second test..."]             │
│ │                                                          │
│ │ [✓] Required: Hypothesis stated (must differ from C1)  │
│ │ [✓] Required: Test clip ≥15 sec, real user             │
│ │ [✓] Required: Result with number, shows improvement    │
│ └─────────────────────────────────────────────────────────┘
│                                                          │
│ ┌─────────────────────────────────────────────────────────┐
│ │ SECTION 5: SYNTHESIS (1:50–2:30)                         │
│ │ ───────────────────────────                              │
│ │ "What we learned: [from mid-phase synthesis]"           │
│ │                                                          │
│ │ "What we were wrong about: [from synthesis Section 3]"│
│ │                                                          │
│ │ [Record voiceover: "This taught us that..."]           │
│ │                                                          │
│ │ [✓] Required: ≥1 honest wrongness                        │
│ │ [✓] Required: Specific behavior or quote                │
│ └─────────────────────────────────────────────────────────┘
│                                                          │
│ ┌─────────────────────────────────────────────────────────┐
│ │ SECTION 6: DEMO + NEXT MOVE (2:30–3:00)                   │
│ │ ───────────────────────────                              │
│ │ [Pretotype demo screen recording or walkthrough]        │
│ │                                                          │
│ │ "First thing we build: [from final cycle synthesis]"   │
│ │                                                          │
│ │ [Record voiceover: "Here's what we're building..."]     │
│ │                                                          │
│ │ [Optional: Roadmap slide]                               │
│ │                                                          │
│ │ [✓] Required: Pretotype demo visible                     │
│ │ [✓] Required: First build move named                    │
│ └─────────────────────────────────────────────────────────┘
│                                                          │
│ [Add optional section: Team intro, thank you, etc.]       │
│                                                          │
│ ─────────────────────────────────────────────────       │
│ HARD GATE CHECKLIST:                                     │
│ [✓] Video 3–5 min, MP4, ≤200MB                          │
│ [✓] ≥2 raw user clips, ≥20 sec each                     │
│ [✓] Each clip: user name + role caption                 │
│ [✓] ≥1 moment admitting wrongness                       │
│ [✓] Pretotype change tied to user behavior              │
│ [✓] Iteration arc visible                               │
│                                                          │
│ [Preview Video]  [Export MP4]  [Submit Round 1]        │
└─────────────────────────────────────────────────────────┘
```

---

## Required Elements Checklist

The app enforces these before allowing submission. No exceptions.

### Hard gate (cannot submit without)

| # | Element | Auto-check | Team action |
|---|---------|-----------|-------------|
| 1 | Video file: MP4, 3–5 min, ≤200MB | File validation | Upload or record in-app |
| 2 | ≥2 raw user clips, ≥20 sec each | Clip duration auto-detected | Upload clips in storyboard |
| 3 | User name + role caption per clip | Text overlay required | Add captions in editor |
| 4 | ≥1 moment admitting wrongness | AI scans audio/transcript | Record voiceover or show text |
| 5 | Pretotype change tied to user behavior | "Variable changed" field linked | Narrate connection |
| 6 | Iteration arc visible | ≥2 cycles with hypothesis + result | Auto from workspace |

### Soft gate (submission allowed, but caps score)

| # | Element | Penalty |
|---|---------|---------|
| 7 | Pitch deck PDF | Problem Statement + Solution capped at 50% weight |
| 8 | Live pretotype link | Same cap |
| 9 | ≥7 of 10 daily check-ins | Same cap |
| 10 | Mid-phase synthesis | Same cap |
| 11 | ≥2 public hypothesis ritual posts | Same cap |
| 12 | Tester contact list complete | Same cap |

---

## Video Editor UI

The app does not need to be DaVinci Resolve. It needs:

### Basic tools

- **Reorder sections:** Drag sections in storyboard. Cannot delete required sections.
- **Trim clips:** Simple in/out trim on uploaded clips.
- **Add captions:** Text overlay on clips. Template: "[Name], [Role]"
- **Record voiceover:** In-app audio recording per section. Or upload MP3.
- **Add slides:** Upload image/PDF for "before/after" or roadmap.
- **Preview:** Play full video with transitions.

### Auto-narration (optional)

- App can generate draft voiceover script from workspace text.
- Team records over it. Or replaces entirely.
- Script template per section auto-generated.

### Export

- One-click export to MP4 (H.264, 1080p, ≤200MB).
- Auto-trims to 5:00 if over.
- Validates all hard gates on export.

---

## Submission Flow

```
[Export MP4]
    │
    ▼
[Auto-validation]
    ├── Hard gates pass → Upload to Supabase storage
    │   ├── File size, format, duration
    │   ├── Clip count, duration
    │   ├── Caption presence (AI OCR on frames)
    │   └── Audio presence
    │
    └── Hard gates fail → Show missing items. Block.
    │
    ▼
[Submission portal]
    ├── Auto-pulls from platform DB:
    │   ├── Daily check-in count
    │   ├── Hypothesis ritual posts
    │   ├── Module completion %
    │   ├── Mid-phase synthesis score
    │   └── Tester contact list (assembled from check-ins)
    │
    ├── Soft gate check → Cap scores where missing
    │
    └── Team confirms + submits
    │
    ▼
[Confirmation email]
    ├── Receipt with submission ID
    ├── Summary: gates passed / failed
    └── "Your video will be reviewed by [date]."
    │
    ▼
[AI Pipeline triggered]
    ├── Pass 1: Extractor (transcript, clips, flags)
    ├── Pass 2: Scrutinizer (scores, suspicion)
    └── Pass 3: Human review of flagged/borderline
```

---

## Anti-Fraud in Video Assembly

| Risk | Structural fix |
|------|----------------|
| Faked clips | Pre-registration ritual. Spot-check 20%. AI voice detection. |
| Clips from stock footage | AI checks: real user voice, environment consistency, challenge-response |
| Wrongness is fake/performative | AI checks against synthesis + behavior logs. Inconsistent = flag. |
| No iteration arc (single cycle) | Storyboard requires ≥2 cycles. Auto from workspace. Cannot bypass. |
| Hypothesis retrofitted | Timestamped ritual posts. Cannot post after test. |
| Team didn't test, just narrated | Spot-check contacts testers. AI checks clip authenticity. |

---

## Integration with Other Components

| Component | Connection |
|-----------|-----------|
| `daily-system.md` | Daily check-in count feeds submission gate. |
| `grading-and-enforcement.md` | AI pipeline runs on submitted video. Spot-check triggers. |
| `app-learning-block.md` | Module 8 teaches "Capturing Iteration Arc for Video." |
| `workshop.md` | Workshop Module 5 shows "What good evidence looks like in video." |
| `activity-cycle-workspace.md` | All video sections auto-populated from cycle data. |
| `activity-mid-phase-synthesis.md` | Synthesis Section 5 + 6 feed video Section 5. |

---

## Open Decisions

- D1: In-app video editor scope — trim/caption/voiceover only, or also transitions/music?
- D2: Auto-narration script — generated as draft or full read-aloud?
- D3: Video export quality — 1080p required or 720p acceptable?
- D4: Clip upload during Step 3 vs direct in video editor — which is primary?
- D5: Should app enforce "wrongness moment" via AI audio check, or self-reported?
