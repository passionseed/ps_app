# Prompt Patterns

Use this file when the comic needs stronger scene construction or the source material is vague.

## Base formula

Build each panel prompt with this shape:

`[subject + action], [environment], [camera framing], [lighting], [mood], [comic rendering style], [portrait composition], [negative space for caption], [continuity anchors]`

## Portrait anchors

Include at least one of:

- `vertical portrait composition`
- `tall mobile-first frame`
- `9:16 portrait illustration`
- `important subject centered for phone viewing`

## Cinematic style anchors

Useful phrases:

- `cinematic semi-real comic illustration`
- `premium editorial comic frame`
- `dramatic but grounded lighting`
- `high contrast atmosphere`
- `volumetric light and subtle filmic haze`
- `clean focal hierarchy`
- `designed for mobile reading`

## Camera patterns

Use variety across panels:

- setup: `wide vertical frame`
- tension: `medium shot` or `over-the-shoulder`
- realization: `close portrait`
- payoff: `heroic low angle` or `still centered medium-wide`

## Negative space patterns

Use when captions will be overlaid in the app:

- `leave clean negative space in the lower third for caption overlay`
- `avoid clutter near the bottom of the frame`
- `keep faces and key objects away from the caption area`

## Continuity anchors

Repeat across prompts when needed:

- character age, hairstyle, wardrobe
- same room or same city location
- same palette family
- same time of day or lighting logic

## Good prompt skeleton

```text
Cinematic semi-real comic illustration of a young founder pausing in a dim co-working space, staring at messy interview notes pinned across a glass wall, medium vertical frame, cool blue practical lighting with warm rim light, tense evidence-seeking mood, designed for mobile reading, leave clean negative space in the lower third for Thai caption overlay, consistent wardrobe and grounded editorial comic style
```

## Bad prompt pattern

Avoid:

- style-only prompts with no scene action
- generic `comic book style` with no camera or mood
- long lists of conflicting adjectives
- multiple emotional beats in one panel
