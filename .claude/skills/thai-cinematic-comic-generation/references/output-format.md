# Output Format

Use this response shape by default.

## Concept

One short paragraph:

- what the learner experiences
- what changes across the comic
- why the sequence works visually

## Panel script

For each panel include:

### Panel N

- Purpose: short phrase
- Thai caption: one sentence
- Visual: one-sentence scene description
- Prompt: one English production-ready image prompt

## Generation notes

Include:

- portrait ratio
- style consistency notes
- recurring character/environment anchors
- caption placement guidance if relevant

## Hackathon payload

When the request is hackathon-related, add this section:

- Activity title
- Activity instructions
- Content title
- Content body
- Metadata JSON

Prefer a directly usable payload shape, not prose.

## Example

```markdown
## Concept
This comic starts in uncertainty and ends in clarity. The learner sees how scattered signals become a focused, validated problem worth solving.

## Panel 1
- Purpose: setup the confusion
- Thai caption: หลายทีมเริ่มจากไอเดียที่ยังกว้างเกินไป
- Visual: a founder surrounded by scattered notes, tabs, and half-formed assumptions
- Prompt: Cinematic semi-real comic illustration of ...

## Panel 2
- Purpose: reveal real evidence
- Thai caption: แต่ความจริงจะชัดขึ้น เมื่อเราเริ่มฟังสิ่งที่คนเจอจริง
- Visual: ...
- Prompt: ...

## Generation Notes
- Portrait ratio: 9:16
- Keep the same founder across all panels
- Reserve lower-third negative space for Thai caption overlay
```

## Hackathon payload example (Caption Comic)

```json
{
  "activity": {
    "title": "What You'll Walk Away With",
    "instructions": "By the end of Phase 1, you'll know how to find a good problem, validate a real pain point, and define the right target user with our guide."
  },
  "content": {
    "content_type": "text",
    "content_title": "What You'll Walk Away With",
    "content_body": "By the end of this phase, you'll know how to find a good problem, validate a real pain point, and define the right target user with our guide.",
    "metadata": {
      "variant": "evidence_first",
      "panels": [
        {
          "id": "setup",
          "order": 1,
          "headline": "หลายทีมเริ่มจากโจทย์ที่ยังกว้างเกินไป",
          "body": "เรายังไม่รู้ว่าปัญหานี้เจ็บจริงกับใคร",
          "image_key": "phase1-setup",
          "accent": "amber"
        }
      ]
    }
  }
}
```

## Hackathon payload example (Webtoon)

```json
{
  "activity": {
    "title": "What You'll Walk Away With",
    "instructions": "By the end of Phase 1, you'll know how to find a good problem, validate a real pain point, and define the right target user with our guide."
  },
  "content": {
    "content_type": "webtoon",
    "content_title": "What You'll Walk Away With",
    "content_body": null,
    "metadata": {
      "variant": "webtoon",
      "chunks": [
        { "id": "c1", "order": 1, "image_key": "webtoon1-1" },
        { "id": "c2", "order": 2, "image_key": "webtoon1-2" }
      ]
    }
  }
}
```

## Thai copy guidance

When brainstorming captions:

- write them as finished app copy, not notes
- keep them short enough to read in one glance
- favor rhythm and clarity over literal translation
