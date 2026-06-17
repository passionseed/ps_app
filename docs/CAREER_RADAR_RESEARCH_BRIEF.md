# Career Radar — Deep Research Brief

Feed this to a deep-research agent **once per career field**. Output is one JSON
object matching the schema below. It loads into `radar_fields.research` and
generates the carousel cards (see `CAREER_RADAR_SCHEMA.md`).

Product context: Passion Seed helps Thai grade 9–12 students test whether a
career path fits them. The Explore feed shows "underrated + low-competition +
fits-you + stable-money" career paths as TikTok-style swipe carousels. Tone =
honest, specific, motivating. Audience = Thai teenagers. Primary language Thai,
English parallel.

---

## The prompt (paste, fill `{{FIELD}}`)

> You are a career research analyst. Research the career path **{{FIELD}}** for
> Thai students aged 15–18 deciding their future. Produce a deep, fully-cited,
> JSON profile.
>
> Goals:
> 1. **Depth over fluff.** Real numbers, real companies, real day-to-day, real
>    entry routes. Specific beats generic.
> 2. **Every factual/numeric claim must cite a source.** No source → don't claim
>    it, or mark `"confidence":"low"`.
> 3. **Thailand-first, global second.** Salaries in THB/month. Name Thai
>    companies hiring. Then note remote/global opportunity.
> 4. **Honest.** Include downsides and who this path is NOT for.
> 5. **Bilingual.** Every student-facing string has `th` and `en`. Thai must read
>    naturally for a teenager, not translated-stiff.
> 6. **Image direction.** For the hero and each major section, give an
>    `image_prompt` (for AI generation) and, when a strong real/licensed image
>    exists, an `image_source` with URL + license.
>
> Sourcing rules:
> - Prefer **primary** (gov labor stats, official salary reports, company pages)
>   and reputable **secondary** (JobsDB/LinkedIn/WEF/McKinsey reports, major
>   news). Avoid SEO blog spam and undated content.
> - Salary & market-demand sources must be **≤ 2 years old**. Note the date.
> - Thai sources encouraged: สำนักงานสถิติแห่งชาติ, กระทรวงแรงงาน, สภาพัฒน์
>   (NESDC), JobsDB Thailand, JobThai, LinkedIn Talent, set-listed company reports.
> - Give 8–15 sources. Number them `ref:1..N`. Tag each `tier`
>   (primary/secondary/tertiary). Attach a short supporting `quote`.
> - Cite every section that makes a claim via `source_refs:[ref,...]`.
> - If a number is an estimate/range, say so. Never invent precision.
>
> Output: **only** the JSON object below. No prose around it.

---

## Output JSON schema

```jsonc
{
  "slug": "ai-business",                       // kebab, stable, = route param
  "name":    { "th": "AI x ธุรกิจ", "en": "AI x Business" },
  "tagline": { "th": "คู่แข่งน้อย รายได้มั่นคง", "en": "Low competition, stable pay" },
  "emoji": "🤖",
  "color": "#1E1B4B",                          // dark hex, poster bg
  "tags": ["high-pay","ai-proof","trending","global"],  // from COLLECTIONS keys
  "tile_size": "lg",                           // sm | md | lg (feed weight)

  "hero_image": {
    "image_prompt": "Bold editorial poster, a young Thai professional...",
    "image_source": { "url": "", "license": "", "credit": "" }, // optional, real photo
    "alt": { "th": "", "en": "" }
  },

  "summary": { "th": "2–3 ประโยคสรุปว่าทางนี้คืออะไร ทำไมน่าสน", "en": "" },

  "what_it_is": {
    "th": "", "en": "",
    "source_refs": [1],
    "image_prompt": ""
  },

  "fantasy_vs_reality": {
    "fantasy": { "th": "ภาพในหัวที่คนเข้าใจผิด", "en": "" },
    "reality": { "th": "ของจริงที่เกิดขึ้น", "en": "" },
    "source_refs": [2]
  },

  "day_in_life": {
    "steps": [
      { "time": "09:00", "label": { "th": "", "en": "" } }
    ],
    "image_prompt": ""
  },

  "jobs": [
    {
      "title": "AI Product Manager",
      "salary_thb_month": { "min": 60000, "max": 150000 },
      "salary_note": { "th": "จบใหม่เริ่ม ~40k", "en": "" },
      "demand": "high",                        // high | medium | low
      "source_refs": [3,4]
    }
  ],

  "salary_progression": {
    "levels": [
      { "level": "junior", "years": "0–2", "thb_month": { "min": 30000, "max": 45000 } },
      { "level": "mid",    "years": "3–5", "thb_month": { "min": 50000, "max": 90000 } },
      { "level": "senior", "years": "6+",  "thb_month": { "min": 90000, "max": 200000 } }
    ],
    "source_refs": [3]
  },

  "skills": [
    { "skill": { "th": "", "en": "" }, "why": { "th": "", "en": "" } }
  ],

  "ai_impact": {
    "augmented": [ { "th": "", "en": "" } ],   // what AI makes you stronger at
    "automated": [ { "th": "", "en": "" } ],   // what AI replaces
    "verdict":   { "th": "", "en": "" },       // net: safer or riskier, why
    "source_refs": [5,6]
  },

  "market_thailand": {
    "body": { "th": "", "en": "" },
    "hiring_companies": ["", ""],              // real names
    "openings_estimate": { "th": "เช่น ~2,000 ตำแหน่งบน JobsDB", "en": "" },
    "source_refs": [7]
  },

  "market_global": {
    "body": { "th": "", "en": "" },
    "remote_friendly": true,
    "source_refs": [8]
  },

  "proof_to_build": [
    { "project": { "th": "", "en": "" }, "difficulty": "easy" }  // easy|medium|hard
  ],

  "entry_routes": [
    { "route": { "th": "ปริญญาตรี ...", "en": "" }, "cost": "", "time": "" }
  ],

  "risks": [ { "th": "ข้อเสีย/ความจริงที่ต้องรู้", "en": "" } ],

  "not_for_you_if": [ { "th": "", "en": "" } ],

  "real_people": [
    { "role": "", "background": { "th": "", "en": "" }, "source_ref": 9 }
  ],

  "sources": [
    {
      "ref": 1,
      "title": "",
      "publisher": "",
      "url": "",
      "published_at": "2025-03",          // YYYY-MM
      "tier": "primary",                   // primary|secondary|tertiary
      "quote": { "th": "", "en": "" }
    }
  ]
}
```

### Rules the agent must satisfy (validation checklist)

- [ ] Every `*_thb_month`, `demand`, `openings_estimate` carries `source_refs`.
- [ ] `sources` has 8–15 entries; every `source_refs` number exists in `sources`.
- [ ] Salary/market sources `published_at` within 24 months.
- [ ] `hiring_companies` are real, named, Thai-relevant.
- [ ] Every student-facing string has both `th` and `en`.
- [ ] `risks` ≥ 3 and `not_for_you_if` ≥ 2 (honesty gate).
- [ ] `color` is a dark hex (carousel uses white text).
- [ ] `tags` ⊂ COLLECTIONS keys: high-pay, ai-proof, trending, creative, global.
- [ ] `image_prompt` present for hero + ≥3 sections.

---

## Image generation guidance

When generating from `image_prompt`:
- **Style:** bold editorial poster, cinematic, high-contrast, single focal
  subject. Consistent across the field so the carousel feels like one set.
- **No text in the image** (copy is overlaid by the app).
- **Aspect:** vertical 9:16 (full-screen card) for card images; 4:5 for hero tile.
- **People:** depict Thai/SEA young adults where a person appears; avoid stock-y
  fake smiles.
- **Palette:** harmonize with the field `color`.

Licensing (`image_license`) is mandatory before publish:
- `generated` — AI-made, store in `radar-images` bucket.
- `unsplash` / `pexels` / `cc0` — free; keep `credit`.
- Anything else → mirror into bucket only if license permits; else regenerate.

---

## After research → DB

1. Save raw JSON → `radar_fields.research`, set `researched_at`, `research_model`.
2. Upsert `radar_fields` columns (name/tagline/emoji/color/tags/tile_size/hero_*).
3. Insert `radar_sources` (one row per `sources[]`, by `ref`).
4. Generate `radar_cards` from the blob (mapping below), each card copying its
   `source_refs` into `content_*` and image fields.
5. Generate/fetch images → bucket → fill `*_image_url`.
6. Set `has_content = true`, publish.

A transform script (`scripts/radar/seed-from-research.ts`) does steps 1–4
deterministically. Card mapping:

| Card position | kind | from research |
|---|---|---|
| 0 | hook | name + tagline + top salary range |
| 1 | fantasyReality | fantasy_vs_reality |
| 2 | text | what_it_is |
| 3 | jobs | jobs[] |
| 4 | salaryProgression | salary_progression |
| 5 | list | skills[] |
| 6 | aiImpact | ai_impact |
| 7 | marketThailand | market_thailand |
| 8 | dayInLife | day_in_life |
| 9 | entryRoutes | entry_routes |
| 10 | risks | risks + not_for_you_if |
| 11 | realPeople | real_people |
| 12 | text | proof_to_build |
| 13 | cta | fixed squad CTA |
| 14 | sources | sources[] |

Trim/reorder per field — not every field needs all 15. Hook, jobs, aiImpact,
marketThailand, cta, sources are the non-negotiable core.
