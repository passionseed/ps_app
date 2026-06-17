# Career Radar — Data Schema & Creation Guide

Status: **proposed** (current data is hardcoded in `lib/radar.ts`). This doc
specifies the Supabase schema to make the Explore feed + carousels DB-driven.

## Why move to DB

- Edit careers without shipping an app build.
- Add fields / flip "coming soon" → live from an admin tool.
- A/B copy, track which card students drop at, localize per market.
- Non-engineers (you) author content.

## What's modeled

Three tables map 1:1 to the current code:

| Code (`lib/radar.ts`) | Table |
|---|---|
| `RadarField` (tile + container) | `radar_fields` |
| `RadarCard` (carousel slide) | `radar_cards` |
| `COLLECTIONS` (chips) | `radar_collections` |

Everything is **public read** (anon + authenticated) — career content is not
PII. Writes are admin-only. Matches `scripts/sql/allow-anon-read-seeds.sql`.

---

## Tables

### `radar_collections` — filter chips

```sql
CREATE TABLE radar_collections (
  key        text PRIMARY KEY,              -- 'high-pay', 'ai-proof', ...
  label_th   text NOT NULL,                 -- '💰 รายได้ดี'
  label_en   text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true
);
```

`radar_fields.tags` references these `key`s (loose ref, not FK, so tags survive
collection edits).

### `radar_fields` — career tile + carousel container

```sql
CREATE TABLE radar_fields (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,         -- 'ai-business' (route param)
  name_th      text NOT NULL,
  name_en      text NOT NULL,
  tagline_th   text NOT NULL,
  tagline_en   text NOT NULL,
  emoji        text NOT NULL DEFAULT '✨',
  color        text NOT NULL,                -- tile bg hex, e.g. '#1E1B4B'
  tile_size    text NOT NULL DEFAULT 'md'
                 CHECK (tile_size IN ('sm','md','lg')),
  tags         text[] NOT NULL DEFAULT '{}', -- collection keys
  is_published boolean NOT NULL DEFAULT false,-- = old `ready`; gates carousel
  sort_order   int NOT NULL DEFAULT 0,        -- feed order
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX radar_fields_published_idx ON radar_fields (is_published, sort_order);
```

### `radar_cards` — carousel slides

The `RadarCard` is a discriminated union with very different shapes per `kind`
(`hook`, `fantasyReality`, `text`, `jobs`, `list`, `cta`). Normalizing every
variant into columns means lots of nullable sprawl. Use **JSONB per locale**:
`kind` + `position` stay as columns (ordering, querying); the variant payload
lives in `content_th` / `content_en`.

```sql
CREATE TABLE radar_cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id   uuid NOT NULL REFERENCES radar_fields(id) ON DELETE CASCADE,
  position   int  NOT NULL,                  -- 0-based order in carousel
  kind       text NOT NULL CHECK (kind IN
               ('hook','fantasyReality','text','jobs','list','cta')),
  content_th jsonb NOT NULL,                 -- variant payload, Thai
  content_en jsonb,                          -- variant payload, English (nullable)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, position)
);

CREATE INDEX radar_cards_field_idx ON radar_cards (field_id, position);
```

#### `content_*` JSONB shape per `kind`

The payload is exactly the `RadarCard` variant **minus** `kind` (which is the
column). Resolver in code re-attaches `kind`.

```jsonc
// kind = 'hook'
{ "eyebrow": "...", "title": "...", "body": "...", "stat": "30k–150k+", "statLabel": "บาท/เดือน" }

// kind = 'fantasyReality'
{ "eyebrow": "...", "title": "...", "fantasy": "...", "reality": "..." }

// kind = 'text'
{ "eyebrow": "...", "title": "...", "body": "..." }

// kind = 'jobs'
{ "eyebrow": "...", "title": "...",
  "jobs": [ { "title": "AI Product Manager", "salary": "60k–150k+" } ],
  "note": "..." }

// kind = 'list'
{ "eyebrow": "...", "title": "...", "items": ["...", "...", "..."] }

// kind = 'cta'
{ "eyebrow": "...", "title": "...", "body": "...", "button": "เข้าร่วม 7-Day Squad" }
```

> `salary` / `stat` are strings (ranges like `"30k–150k+"`), not numbers — keep
> them strings so copy stays flexible.

### Squad signup URL

`SQUAD_SIGNUP_URL` is global, not per-field. Either keep in code, or add a
per-field override column so each career can route to its own form:

```sql
ALTER TABLE radar_fields ADD COLUMN squad_url text;  -- nullable; falls back to app default
```

---

## Triggers

Reuse the existing `touch_updated_at()` (defined in
`20260612233000_public_profiles.sql`):

```sql
CREATE TRIGGER radar_fields_updated_at BEFORE UPDATE ON radar_fields
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER radar_cards_updated_at BEFORE UPDATE ON radar_cards
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

## RLS

Public content. Anon + authenticated read; only published fields/cards are
visible. Writes restricted to service role (admin tooling) — no client write
policy, so RLS denies by default.

```sql
ALTER TABLE radar_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_fields      ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_cards       ENABLE ROW LEVEL SECURITY;

-- collections: read active
CREATE POLICY "read active collections" ON radar_collections
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- fields: read published
CREATE POLICY "read published fields" ON radar_fields
  FOR SELECT TO anon, authenticated USING (is_published = true);

-- cards: read cards of published fields
CREATE POLICY "read cards of published fields" ON radar_cards
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM radar_fields f
            WHERE f.id = radar_cards.field_id AND f.is_published = true)
  );
```

> Tradeoff: the Explore grid currently shows "coming soon" tiles for
> unpublished fields. Under the policy above, unpublished fields are invisible
> to clients. To keep teaser tiles, either (a) set `is_published = true` and
> gate the carousel separately with a `has_cards` boolean, or (b) add a
> `is_teaser` column and a policy `USING (is_published OR is_teaser)`.
> Recommended: add `has_content boolean` for carousel-gating, publish teasers.

```sql
ALTER TABLE radar_fields ADD COLUMN has_content boolean NOT NULL DEFAULT false;
-- tile shows always (is_published=true); carousel opens only if has_content
```

---

## Migration file

Create `supabase/migrations/<timestamp>_career_radar.sql` with: the three
`CREATE TABLE`s, indexes, triggers, RLS enable + policies above. Then apply:

```bash
# local
npx supabase db reset           # or: psql $DATABASE_URL -f <file>.sql
# remote: Supabase Dashboard → SQL Editor, paste + run
```

## Seed example (AI x Business)

```sql
INSERT INTO radar_collections (key,label_th,label_en,sort_order) VALUES
  ('all','ทั้งหมด','All',0),
  ('high-pay','💰 รายได้ดี','💰 High pay',1),
  ('ai-proof','🤖 รอดยุค AI','🤖 AI-proof',2),
  ('trending','🔥 มาแรง','🔥 Trending',3),
  ('creative','🎨 สายครีเอทีฟ','🎨 Creative',4),
  ('global','🌏 ทำงานทั่วโลก','🌏 Global',5);

INSERT INTO radar_fields
  (slug,name_th,name_en,tagline_th,tagline_en,emoji,color,tile_size,tags,is_published,has_content,sort_order)
VALUES
  ('ai-business','AI x ธุรกิจ','AI x Business',
   'คู่แข่งน้อย รายได้มั่นคง','Low competition, stable pay',
   '🤖','#1E1B4B','lg',ARRAY['high-pay','ai-proof','trending','global'],true,true,0);

-- cards (position-ordered)
INSERT INTO radar_cards (field_id,position,kind,content_th)
SELECT id,0,'hook',
  '{"eyebrow":"เส้นทางที่คนมองข้าม","title":"AI x ธุรกิจ","body":"คู่แข่งน้อย รายได้มั่นคง...","stat":"30k–150k+","statLabel":"บาท/เดือน"}'::jsonb
FROM radar_fields WHERE slug='ai-business';
-- repeat for positions 1..8 (fantasyReality, text, jobs, list, text, text, text, cta)
```

Full seed lives in `supabase/seed/career_radar_seed.sql` (author there, matching
`lib/radar.ts` content verbatim for the first migration).

---

## Code changes (replace hardcoded lib)

Keep the `RadarField` / `RadarCard` TS types in `lib/radar.ts` — they stay the
client contract. Replace the hardcoded arrays with Supabase fetches.

```ts
// lib/radar.ts (new fetch layer)
import { supabase } from "./supabase";

type Lang = "th" | "en";

export async function fetchRadarFields(): Promise<RadarField[]> {
  const { data, error } = await supabase
    .from("radar_fields")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map(rowToField);
}

export async function fetchRadarField(
  slug: string,
  lang: Lang,
): Promise<RadarField | null> {
  const { data: f } = await supabase
    .from("radar_fields").select("*").eq("slug", slug).single();
  if (!f) return null;
  const { data: cards } = await supabase
    .from("radar_cards").select("*").eq("field_id", f.id).order("position");
  return { ...rowToField(f), cards: (cards ?? []).map((c) => rowToCard(c, lang)) };
}

// rowToCard: pick content_<lang> (fallback content_th), spread + attach kind
function rowToCard(row: any, lang: Lang): RadarCard {
  const content = (lang === "en" ? row.content_en : null) ?? row.content_th;
  return { kind: row.kind, ...content };
}
```

Then:
- `app/(tabs)/explore.tsx` — `useEffect` → `fetchRadarFields()` into state, with
  loading skeleton + cached fallback (mirror existing `lib/pathlab.ts` patterns).
- `app/radar/[field].tsx` — `fetchRadarField(slug, lang)` on mount.
- Pick `lang` from `useAuth().appLanguage`.

**Caching:** career content changes rarely. Cache fetched fields in AsyncStorage /
SQLite (the app already uses `expo-sqlite`) and revalidate on app open, so the
Explore tab opens instantly offline. Match whatever `lib/pathlab.ts` does.

---

## Admin authoring (later)

Options, cheapest first:
1. **Supabase Table Editor** — paste JSONB directly. Works day one, ugly.
2. **SQL seed files** in `supabase/seed/` — version-controlled, reviewable.
3. **Internal admin screen** (`app/admin/`) — there's already an `app/admin/`
   dir; add a radar editor that writes via service role / RPC. Build when you
   have >5 fields and edit weekly.

## Depth, Sources & Images (research-driven)

Career content must be **deep, cited, and visual**. A deep-research agent produces
one rich JSON blob per field (see `CAREER_RADAR_RESEARCH_BRIEF.md`); cards are
generated from it. Schema additions below.

### Raw research blob (source of truth)

Store the agent's full output so re-generating cards never loses data:

```sql
ALTER TABLE radar_fields ADD COLUMN research jsonb;        -- full research JSON
ALTER TABLE radar_fields ADD COLUMN researched_at timestamptz;
ALTER TABLE radar_fields ADD COLUMN research_model text;   -- e.g. 'deep-research-v1'
```

Cards in `radar_cards` are the *presentation* slice; `research` is the *archive*
(extra facts, all sources, raw numbers). Cards link claims back to sources.

### Sources (normalized, citable)

```sql
CREATE TABLE radar_sources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id     uuid NOT NULL REFERENCES radar_fields(id) ON DELETE CASCADE,
  ref          int  NOT NULL,                  -- per-field citation number [1],[2]
  title        text NOT NULL,
  publisher    text,                           -- 'JobsDB Thailand', 'WEF', ...
  url          text NOT NULL,
  published_at date,                           -- when source was published
  accessed_at  date NOT NULL,
  tier         text CHECK (tier IN ('primary','secondary','tertiary')),
  quote_th     text,                           -- supporting excerpt
  quote_en     text,
  UNIQUE (field_id, ref)
);

ALTER TABLE radar_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read sources of published fields" ON radar_sources
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM radar_fields f
            WHERE f.id = radar_sources.field_id AND f.is_published = true)
  );
```

Cards cite by ref number inside their JSONB:

```jsonc
// any card's content_th may carry:
{ "...": "...", "source_refs": [1, 4] }   // -> radar_sources.ref for this field
```

The carousel renders a small "ที่มา" affordance per card; a final **Sources card**
lists all refs with links. Numbers without a `source_refs` = flag in review.

### Images (prompt + source per card and field)

Every field has a hero image; every card may have one. Support both
**AI-generated** (store the prompt) and **real/licensed** (store URL + credit/license).

```sql
-- field hero
ALTER TABLE radar_fields
  ADD COLUMN hero_image_url     text,
  ADD COLUMN hero_image_prompt  text,          -- for (re)generation
  ADD COLUMN hero_image_credit  text,          -- attribution if real photo
  ADD COLUMN hero_image_license text,          -- 'unsplash','cc0','generated',...
  ADD COLUMN hero_image_alt_th  text,
  ADD COLUMN hero_image_alt_en  text;

-- per card
ALTER TABLE radar_cards
  ADD COLUMN image_url     text,
  ADD COLUMN image_prompt  text,
  ADD COLUMN image_credit  text,
  ADD COLUMN image_license text,
  ADD COLUMN image_alt_th  text,
  ADD COLUMN image_alt_en  text;
```

Storage: generated images go to a Supabase Storage bucket (`radar-images`,
public read), `*_url` points there. Real photos may hot-link if license allows,
else mirror into the bucket. Licensing is mandatory — `image_license` NOT empty
before publish.

### New / deeper card kinds

The research blob unlocks richer slides. Extend the `kind` CHECK + `RadarCard`
union as these get built (each needs a renderer in `app/radar/[field].tsx`):

| kind | shows | key fields |
|---|---|---|
| `dayInLife` | hour-by-hour timeline | `steps:[{time,label}]` |
| `salaryProgression` | junior→senior pay curve | `levels:[{level,years,min,max}]` |
| `aiImpact` | augmented vs automated | `augmented:[],automated:[],verdict` |
| `marketThailand` | who's hiring, openings | `body,companies:[],openings` |
| `entryRoutes` | how to get in | `routes:[{label,cost,time}]` |
| `risks` | honest downsides | `items:[]` |
| `realPeople` | actual practitioners | `people:[{role,background,source_ref}]` |

Migrate the CHECK:

```sql
ALTER TABLE radar_cards DROP CONSTRAINT radar_cards_kind_check;
ALTER TABLE radar_cards ADD CONSTRAINT radar_cards_kind_check CHECK (kind IN
  ('hook','fantasyReality','text','jobs','list','cta',
   'dayInLife','salaryProgression','aiImpact','marketThailand',
   'entryRoutes','risks','realPeople','sources'));
```

Build renderers incrementally — start with the 6 shipped kinds + `sources`, add
depth kinds as content demands.

## Build order

1. Migration (tables + RLS + triggers).
2. Seed AI x Business (verbatim from `lib/radar.ts`) + 7 teaser fields.
3. Fetch layer + wire the two screens, keep types.
4. Delete hardcoded arrays from `lib/radar.ts` (keep types + `SQUAD_SIGNUP_URL`).
5. Verify anon read on device (guest mode must see tiles).
6. Admin tooling — only when authoring cadence demands it.
```
