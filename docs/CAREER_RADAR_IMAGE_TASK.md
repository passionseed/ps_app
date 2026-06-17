# TASK: Generate & attach Career Radar images

For an image-generation agent. Goal: turn the `image_prompt`s produced by the
research agent into real images, upload them, and write the URLs into the DB so
the Explore feed + carousels render with art.

## Inputs

- Research JSON per field: `scripts/radar/output/<slug>.json`
  (schema in `docs/CAREER_RADAR_RESEARCH_BRIEF.md`).
- Prompts live at these JSON paths:
  - `hero_image.image_prompt`            → field hero (tile + carousel intro)
  - `what_it_is.image_prompt`            → a card
  - `day_in_life.image_prompt`           → a card
  - (any other section with `image_prompt`)
- DB tables: `radar_fields`, `radar_cards` (see `docs/CAREER_RADAR_SCHEMA.md`).

## Image specs

- **Style:** bold editorial poster, cinematic, high-contrast, single focal
  subject. Consistent set per field (same lighting/palette across that field's images).
- **No text in the image** — the app overlays copy.
- **People:** Thai / SEA young adults where a person appears. No stock-y fake smiles.
- **Palette:** harmonize with the field's `color` hex (from the JSON).
- **Aspect ratios:**
  - hero: **4:5** (tile) — also fine to reuse for carousel.
  - card images: **9:16** (full-screen poster).
- **Format:** PNG or WEBP. Target < 500 KB each (compress).

## Steps per field

1. Read `scripts/radar/output/<slug>.json`. Collect every `image_prompt` with its
   location key (`hero`, `what_it_is`, `day_in_life`, ...).
2. If a location has a usable `image_source.url` (real/licensed) AND license is
   clear → you may use it instead of generating. Otherwise generate.
3. Generate each image to spec.
4. Upload to Supabase Storage bucket **`radar-images`** (public read), path
   convention: `radar-images/<slug>/<location>.png`
   e.g. `radar-images/ai-business/hero.png`, `.../day_in_life.png`.
5. Record the public URL + license for each.
6. Update the DB (below).

## Bucket setup (one-time, if missing)

```sql
-- create public bucket
insert into storage.buckets (id, name, public)
values ('radar-images','radar-images', true)
on conflict (id) do nothing;
```

Public-read policy (anon) so the app can load images.

## DB updates

Use the service-role key (NOT anon). Connect with `EXPO_PUBLIC_SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` (local values are in `.env.local`).

### Field hero
```sql
update radar_fields set
  hero_image_url     = :url,
  hero_image_license = :license,   -- 'generated' | 'unsplash' | 'cc0' | ...
  hero_image_credit  = :credit     -- attribution if real photo, else null
where slug = :slug;
```

### Card images
Cards are matched by `field_id` + `position`. Map location → card position
(per the seed mapping in `scripts/radar/seed-from-research.ts`):

| location key   | card position | kind  |
|----------------|---------------|-------|
| (hero)         | 0             | hook  |
| what_it_is     | 2             | text  |
| day_in_life    | (only if a dayInLife card exists) | dayInLife |

> Current seed generates kinds: hook, fantasyReality, text, jobs, list, text,
> text, text, cta. So today only `hero`→pos0 and `what_it_is`→pos2 have a home.
> Attach those two; hold the rest until the deeper card kinds ship.

```sql
update radar_cards set
  image_url     = :url,
  image_license = :license,
  image_credit  = :credit
where field_id = (select id from radar_fields where slug = :slug)
  and position = :position;
```

## Mandatory rules

- **`*_image_license` must be non-empty** before publish. No license → don't attach.
- Generated images → `license = 'generated'`.
- Real/licensed images → keep `credit` + correct `license`; only host in the
  bucket if the license permits mirroring, else regenerate.
- Re-runnable: overwrite by `slug/<location>` path; updates are idempotent.

## Done = checklist

- [ ] hero image for the field, uploaded, `hero_image_url` set, license set
- [ ] pos0 (hook) + pos2 (text) card images set, license set
- [ ] all URLs resolve publicly (anon GET 200)
- [ ] images match style spec (no text, correct aspect, palette)

## Fields to process

Run per field as research JSON lands in `scripts/radar/output/`:
- ai-business (first)
- (others as researched)
