# Hackathon Phase 1 Comic Promise Page Design

**Goal:** Turn Phase 1 Activity 1 into an evidence-first promise page that shows participants where customer discovery leads before they start the deeper work.

**Status:** Approved in-session on 2026-04-03.

## Problem

Phase 1 Activity 1 is live as `Show the Outcome`, but the current content row is `npc_chat`, and the hackathon activity screen renders `npc_chat` as a generic placeholder. The result is a broken promise:

- the activity title says outcome-first
- the content model implies a future-self conversation
- the runtime shows “Coming soon”

This weakens the first impression of the hackathon and hides the actual payoff of the phase.

## Product Direction

The first activity should not feel like founder theater or a motivational speech. It should feel evidence-first.

The participant should understand, in under a minute:

- most teams start with noise and vague ideas
- good problems are found through repeated evidence, not guesses
- a validated pain point has a clear target user and concrete context
- this phase gives them a guide to reach that state

## Experience Concept

Use a hybrid comic:

- generated illustrated panels carry the emotional and visual narrative
- Skia adds frames, connectors, glow, pacing, and subtle motion
- short captions keep the experience scannable

This avoids a boring text wall while also avoiding the cost and fragility of drawing the entire screen in Skia.

## Narrative Structure

The comic is four stacked panels.

### Panel 1: Noise

Headline:
`Most teams start with a vague idea.`

Supporting line:
`Trends, guesses, and half-formed assumptions all sound important at first.`

Visual:
A messy desk or wall of sticky notes, competing arrows, broad themes, and unclear signals.

### Panel 2: Evidence

Headline:
`Real interviews reveal repeated pain.`

Supporting line:
`Patterns matter more than opinions. We look for friction people already feel.`

Visual:
Interview scenes, quotes, observation notes, and recurring pain markers surfacing from multiple conversations.

### Panel 3: Validation

Headline:
`A good problem becomes specific.`

Supporting line:
`One clear person. One real pain. One concrete context.`

Visual:
Messy evidence tightening into one target user, one pain point, and one crisp problem frame.

### Panel 4: Outcome

Headline:
`By the end of Phase 1, you leave with evidence.`

Supporting line:
`A validated pain point, a clear target user, and a guide for what to do next.`

Visual:
A resolved evidence board or worksheet showing a validated pain point and target user, with the guide visible as the next-step tool.

## Visual System

### Tone

- analytical, tense, and deliberate
- not playful cartoon energy
- not dreamy founder aspiration

### Palette

- deep navy / near-black base
- cyan and ice-blue signal accents
- restrained white text
- occasional warning amber for “noise” or uncertainty

### Layout

- four vertically stacked panels
- asymmetric crops to avoid generic card rhythm
- each panel framed like an editorial comic cell
- a connective “evidence path” runs through the sequence

### Motion

Use subtle motion only:

- a slow scanline or light sweep across active panel surfaces
- ambient panel glow breathing very gently
- no bouncing, popping, or novelty transitions

## Runtime Design

Activity 1 should become a dedicated direct-activity content renderer rather than another special case of `npc_chat`.

### Content model

Add a new direct activity content type for the screen to render, for example:

- `infographic_comic`

This row remains in `hackathon_phase_activity_content`, but its `metadata` becomes the source of truth for the comic experience.

Suggested metadata shape:

```json
{
  "variant": "evidence_first",
  "panels": [
    {
      "id": "noise",
      "headline": "Most teams start with a vague idea.",
      "body": "Trends, guesses, and half-formed assumptions all sound important at first.",
      "image_key": "phase1-noise",
      "accent": "amber"
    },
    {
      "id": "evidence",
      "headline": "Real interviews reveal repeated pain.",
      "body": "Patterns matter more than opinions. We look for friction people already feel.",
      "image_key": "phase1-evidence",
      "accent": "cyan"
    },
    {
      "id": "validation",
      "headline": "A good problem becomes specific.",
      "body": "One clear person. One real pain. One concrete context.",
      "image_key": "phase1-validation",
      "accent": "blue"
    },
    {
      "id": "outcome",
      "headline": "By the end of Phase 1, you leave with evidence.",
      "body": "A validated pain point, a clear target user, and a guide for what to do next.",
      "image_key": "phase1-outcome",
      "accent": "cyan"
    }
  ]
}
```

### Rendering boundaries

- React Native handles the main screen layout, scrolling, and text blocks
- Skia handles panel framing, accents, linework, glow, and motion
- generated image assets render inside each panel body

This keeps readability and responsiveness simple while still making the page feel crafted.

## Asset Strategy

Use the `imagegen` skill to create four coordinated panel illustrations.

Requirements for the asset set:

- same visual language across all four panels
- editorial / semi-real comic treatment
- evidence artifacts visible inside the art
- no childish cartoon styling
- no superhero framing
- no in-image text that the app depends on

Store outputs in a stable project path so seeds and metadata can point at them consistently.

## Data Ownership

This request is a cross-layer sync:

- direct activity live content changes
- destructive phase activity seed alignment
- additive seed alignment
- preview fallback alignment
- frontend runtime update

The direct activity layer owns the experience shown in:

- `/(hackathon)/phase/[phaseId]`
- `/(hackathon)/activity/[nodeId]`

The playlist/module orchestration layer is not the right owner for this change.

## Verification Standard

### Data

- live Phase 1 Activity 1 row uses the intended content type
- metadata contains all four panels in correct order
- seed files match the live intent
- preview fallback matches the same narrative

### Frontend

- activity detail screen renders the comic block instead of a placeholder
- captions are readable on mobile widths
- images hold aspect ratio correctly
- Skia effects remain subtle and performant
- the rest of the activity screen still works for non-comic content

## Non-Goals

- building a generic chat interface for this page
- turning every activity type into a fully custom Skia scene
- changing Phase 1 module orchestration or playlist UX
- changing submission behavior

## Recommendation

Implement the hybrid comic as a reusable direct-activity renderer with data-driven panel metadata. This fixes the current broken `npc_chat` outcome experience, keeps the content maintainable in seeds and production, and creates a stronger format for future infographic-style hackathon activities.
