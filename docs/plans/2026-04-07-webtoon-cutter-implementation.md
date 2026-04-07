# Webtoon Cutter Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a skill that cuts long webtoon images into fixed-height chunks, uploads to Supabase storage, and generates DB-ready metadata.

**Architecture:** Skill guides agent to use ImageMagick via bash for cutting, Supabase storage API for upload, and produces JSON payload matching existing webtoon schema.

**Tech Stack:** ImageMagick (CLI), Supabase Storage API, Bash commands

---

## Prerequisites Check

Before starting, verify:
- ImageMagick installed: `convert --version`
- Supabase credentials available in `.env` or environment

---

### Task 1: Create Skill Directory Structure

**Files:**
- Create: `.claude/skills/webtoon-cutter/SKILL.md`
- Create: `.claude/skills/webtoon-cutter/references/supabase-storage.md`
- Create: `.claude/skills/webtoon-cutter/references/db-payload.md`

**Step 1: Create directory**

```bash
mkdir -p .claude/skills/webtoon-cutter/references
```

**Step 2: Create SKILL.md**

```markdown
---
name: webtoon-cutter
description: Cut long webtoon images into fixed-height chunks, upload to Supabase storage, and generate DB-ready metadata for hackathon activities. Use when you have a tall webtoon image that needs to be sliced into mobile-friendly vertical chunks.
---

# Webtoon Cutter

## Overview

Cut long webtoon images into fixed-height chunks, upload to Supabase storage, and generate DB-ready metadata for hackathon activities.

## Prerequisites

- ImageMagick installed (`brew install imagemagick` on macOS)
- Supabase project with storage enabled
- Service role credentials (SUPABASE_SERVICE_ROLE_KEY)
- Source image file (PNG recommended)

## Workflow

### 1. Gather inputs

Ask user for:
- Source image path (e.g., `/path/to/phase1-act1.png`)
- Story ID (e.g., `phase1-act1`)
- Chunk height (default: 1280px)

### 2. Analyze source image

```bash
identify -format "%w %h" {source-path}
```

Parse output to get width and height.

### 3. Calculate chunks

- Number of chunks = ceil(height / chunk_height)
- Last chunk height = height - (chunks - 1) * chunk_height

### 4. Cut into chunks

For evenly divisible height:
```bash
convert {source} -crop {width}x{chunk_height} +repage +adjoin {story-id}-%02d.png
```

For uneven height, cut each chunk with offset:
```bash
convert {source} -crop {width}x{chunk_height}+0+0 {story-id}-01.png
convert {source} -crop {width}x{chunk_height}+0+{chunk_height} {story-id}-02.png
# ... continue for each chunk
convert {source} -crop {width}x{last_chunk_height}+0+{offset} {story-id}-{last}.png
```

### 5. Upload to Supabase storage

For each chunk:
```bash
# Using curl with service role key
curl -X POST "https://{project-ref}.supabase.co/storage/v1/object/webtoons/{story-id}/{filename}" \
  -H "Authorization: Bearer {service-role-key}" \
  -H "Content-Type: image/png" \
  --data-binary "@{local-path}"
```

Or use Supabase client if available in script.

### 6. Generate DB-ready payload

Construct JSON payload matching webtoon schema:

```json
{
  "content_type": "webtoon",
  "metadata": {
    "variant": "webtoon",
    "originalWidth": {width},
    "originalHeight": {height},
    "panelWidth": {width},
    "panelHeight": {chunk_height},
    "chunks": [
      { "id": "c1", "order": 1, "imageKey": "{story-id}-01", "imageUrl": "{url}" },
      { "id": "c2", "order": 2, "imageKey": "{story-id}-02", "imageUrl": "{url}" }
    ]
  }
}
```

### 7. Output result

Return:
- List of uploaded URLs
- Full DB-ready payload
- Optional: Patch live DB if user requests

## Commands Reference

### ImageMagick

```bash
# Get dimensions
identify -format "%w %h" image.png

# Crop evenly
convert image.png -crop 720x1280 +repage +adjoin output_%02d.png

# Crop with offset
convert image.png -crop 720x1280+0+2560 output_03.png
```

### Supabase Storage

```bash
# Upload via API
curl -X POST "https://{ref}.supabase.co/storage/v1/object/webtoons/{path}" \
  -H "Authorization: Bearer {key}" \
  -H "Content-Type: image/png" \
  --data-binary "@file.png"

# Get public URL
https://{ref}.supabase.co/storage/v1/object/public/webtoons/{path}
```

## Failure Modes

- **ImageMagick not found**: Guide user to install with `brew install imagemagick`
- **Upload fails**: Check bucket exists, verify service role key
- **Uneven chunks**: Handle last chunk with remaining height
- **DB write fails**: Verify activity ID, check permissions

## References

- [supabase-storage.md](references/supabase-storage.md) - Storage setup and upload patterns
- [db-payload.md](references/db-payload.md) - Payload structure and writeback workflow
```

**Step 3: Create references/supabase-storage.md**

```markdown
# Supabase Storage Setup

## Bucket Creation

Run in Supabase SQL editor or add to migration:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('webtoons', 'webtoons', true);
```

Or via Supabase dashboard:
1. Go to Storage
2. Create new bucket named `webtoons`
3. Enable public access

## Upload Methods

### Method 1: curl with Service Role Key

```bash
curl -X POST "https://{project-ref}.supabase.co/storage/v1/object/webtoons/{folder}/{filename}" \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: image/png" \
  --data-binary "@{local-file-path}"
```

### Method 2: Supabase CLI

```bash
supabase storage upload webtoons {filename} --path {folder}/{filename}
```

### Method 3: JavaScript Client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supabase.storage
  .from('webtoons')
  .upload('{folder}/{filename}', file, {
    contentType: 'image/png',
    upsert: true
  })
```

## Public URL Format

```
https://{project-ref}.supabase.co/storage/v1/object/public/webtoons/{folder}/{filename}
```

## Folder Structure

```
webtoons/
├── phase1-act1/
│   ├── phase1-act1-01.png
│   ├── phase1-act1-02.png
│   └── phase1-act1-03.png
├── phase1-act2/
│   └── ...
```

## Credentials

Required:
- `SUPABASE_URL` - Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for storage uploads)

Get from:
- Supabase dashboard → Settings → API
- Or `.env` file in project
```

**Step 4: Create references/db-payload.md**

```markdown
# DB Payload Structure

## Full Payload Schema

```json
{
  "content_type": "webtoon",
  "content_title": "{Story Title}",
  "content_body": null,
  "metadata": {
    "variant": "webtoon",
    "originalWidth": 720,
    "originalHeight": 5120,
    "panelWidth": 720,
    "panelHeight": 1280,
    "chunks": [
      {
        "id": "c1",
        "order": 1,
        "imageKey": "{story-id}-01",
        "imageUrl": "https://{ref}.supabase.co/storage/v1/object/public/webtoons/{story-id}/{story-id}-01.png"
      },
      {
        "id": "c2",
        "order": 2,
        "imageKey": "{story-id}-02",
        "imageUrl": "https://{ref}.supabase.co/storage/v1/object/public/webtoons/{story-id}/{story-id}-02.png"
      }
    ]
  }
}
```

## Chunk Fields

- `id` - Unique chunk identifier (e.g., `c1`, `c2`)
- `order` - Sequence order (1, 2, 3...)
- `imageKey` - Key for local fallback (matches filename without extension)
- `imageUrl` - Full Supabase storage public URL

## Metadata Fields

- `variant` - Always `webtoon` for this content type
- `originalWidth` / `originalHeight` - Source image dimensions
- `panelWidth` / `panelHeight` - Chunk dimensions (used for aspect ratio)

## Writeback Workflow

### 1. Query target activity

```sql
SELECT id, title FROM hackathon_phase_activities 
WHERE id = '{activity-id}';
```

### 2. Query content row

```sql
SELECT id FROM hackathon_phase_activity_content 
WHERE activity_id = '{activity-id}' AND content_type = 'webtoon';
```

### 3. Patch content row

```sql
UPDATE hackathon_phase_activity_content 
SET metadata = '{json-payload}'::jsonb
WHERE id = '{content-id}';
```

### 4. Verify

```sql
SELECT metadata FROM hackathon_phase_activity_content WHERE id = '{content-id}';
```

## TypeScript Types

From `types/hackathon-phase-activity.ts`:

```typescript
interface HackathonWebtoonContent {
  variant: string;
  originalWidth: number | null;
  originalHeight: number | null;
  panelWidth: number | null;
  panelHeight: number | null;
  chunks: HackathonWebtoonChunk[];
}

interface HackathonWebtoonChunk {
  id: string;
  order: number;
  imageKey: string | null;
  imageUrl?: string;
}
```
```

**Step 5: Commit**

```bash
git add .claude/skills/webtoon-cutter/
git commit -m "feat: add webtoon-cutter skill"
```

---

### Task 2: Create Supabase Storage Bucket Migration

**Files:**
- Create: `supabase/migrations/20260407000000_create_webtoons_bucket.sql`

**Step 1: Create migration file**

```sql
-- Create webtoons storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('webtoons', 'webtoons', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'webtoons');

-- Grant service role write access
CREATE POLICY "Service role write access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'webtoons' AND auth.role() = 'service_role');

CREATE POLICY "Service role update access" ON storage.objects
  FOR UPDATE USING (bucket_id = 'webtoons' AND auth.role() = 'service_role');

CREATE POLICY "Service role delete access" ON storage.objects
  FOR DELETE USING (bucket_id = 'webtoons' AND auth.role() = 'service_role');
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260407000000_create_webtoons_bucket.sql
git commit -m "feat: add webtoons storage bucket migration"
```

---

### Task 3: Update AGENTS.md with Skill Reference

**Files:**
- Modify: `AGENTS.md`

**Step 1: Add skill to project-local skills section**

Add after the existing skill entry:

```markdown
## Project-local skills

Skills with repo-specific guidance live under `.claude/skills/<name>/SKILL.md`. 

- **`webtoon-cutter`** — Cut long webtoon images into chunks, upload to Supabase storage, generate DB-ready metadata. Path: `.claude/skills/webtoon-cutter/SKILL.md`.
- **`@shopify/react-native-skia`** (Canvas, shaders, jank-safe animation with Reanimated) — **`react-native-skia`** — path: `.claude/skills/react-native-skia/SKILL.md`.
```

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add webtoon-cutter to AGENTS.md"
```

---

### Task 4: Push to ps-skills Repository

**Files:**
- External: `https://github.com/passionseed/ps-skills`

**Step 1: Clone ps-skills if not already**

```bash
cd /tmp
git clone https://github.com/passionseed/ps-skills.git
cd ps-skills
```

**Step 2: Copy skill to ps-skills**

```bash
mkdir -p webtoon-cutter/references
cp /Users/bunyasit/dev/passionseed/ps_app/.claude/skills/webtoon-cutter/SKILL.md webtoon-cutter/
cp /Users/bunyasit/dev/passionseed/ps_app/.claude/skills/webtoon-cutter/references/*.md webtoon-cutter/references/
```

**Step 3: Update ps-skills README**

Add to skills table:

```markdown
| `webtoon-cutter` | Cut long webtoon images into chunks, upload to Supabase storage, generate DB-ready metadata |
```

Add install section:

```markdown
#### webtoon-cutter

droid skills add webtoon-cutter https://github.com/passionseed/ps-skills/tree/main/webtoon-cutter
```

**Step 4: Commit and push**

```bash
git add webtoon-cutter/ README.md
git commit -m "feat: add webtoon-cutter skill"
git push origin main
```

---

### Task 5: Verify Skill Works

**Step 1: Check ImageMagick is installed**

```bash
convert --version
```

Expected: Version info output

**Step 2: Test with sample image**

Use existing webtoon panels to create a test tall image:

```bash
# Create a test tall image from existing panels
cd assets/webtoon/phase1-act1
convert panel-00.png panel-01.png panel-02.png -append test-tall.png
identify test-tall.png
```

**Step 3: Test cutting**

```bash
# Cut into chunks
convert test-tall.png -crop 720x1280 +repage +adjoin test-chunk-%02d.png
ls test-chunk-*.png
```

Expected: Multiple chunk files created

**Step 4: Clean up test files**

```bash
rm test-tall.png test-chunk-*.png
```

---

## Summary

Tasks completed:
1. ✅ Create skill directory and files
2. ✅ Create Supabase storage bucket migration
3. ✅ Update AGENTS.md
4. ✅ Push to ps-skills repository
5. ✅ Verify skill works locally

The skill is ready for use. Agent can invoke it to cut webtoon images and generate DB-ready payloads.