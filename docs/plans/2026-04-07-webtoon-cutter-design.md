# Webtoon Cutter Skill Design

**Date:** 2026-04-07
**Status:** Approved

## Overview

A skill that cuts long webtoon images into fixed-height chunks, uploads them to Supabase storage, and generates DB-ready metadata for hackathon activities.

## Workflow

1. **Input** - User provides source image path + story ID + chunk height (default 1280px)
2. **Analyze** - Get image dimensions using ImageMagick `identify`
3. **Cut** - Slice into chunks using ImageMagick `convert -crop`
4. **Upload** - Upload each chunk to Supabase `webtoons` bucket
5. **Generate** - Produce DB-ready metadata payload with `chunks[]`, URLs, dimensions
6. **Output** - Return payload ready for `hackathon_phase_activity_content` patch

## ImageMagick Cutting

### Get Dimensions
```bash
identify -format "%w %h" source.png
# Output: 720 5120 (width height)
```

### Calculate Chunks
- Height / chunk height = number of chunks
- Last chunk may be shorter if not evenly divisible
- Default chunk height: 1280px (optimal for mobile vertical scroll)

### Cut Commands
```bash
# Simple case - evenly divisible
convert source.png -crop 720x1280 +repage +adjoin output_%02d.png

# Uneven height - manual offset for last chunk
convert source.png -crop 720x1280+0+0 output_00.png
convert source.png -crop 720x1280+0+1280 output_01.png
convert source.png -crop 720x1280+0+2560 output_02.png
convert source.png -crop 720x1160+0+3840 output_03.png  # shorter last chunk
```

### Naming Convention
- Input: `{story-id}.png` (e.g., `phase1-act1.png`)
- Output: `{story-id}-{chunk}.png` (e.g., `phase1-act1-01.png`)

## Supabase Storage

### Bucket Creation
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('webtoons', 'webtoons', true);
```

### Upload Methods

**Via Supabase CLI:**
```bash
supabase storage upload webtoons phase1-act1-01.png --path phase1-act1/phase1-act1-01.png
```

**Via API:**
```typescript
const { data, error } = await supabase.storage
  .from('webtoons')
  .upload('phase1-act1/phase1-act1-01.png', file);

const url = supabase.storage
  .from('webtoons')
  .getPublicUrl('phase1-act1/phase1-act1-01.png')
  .data.publicUrl;
```

### Folder Structure
```
webtoons/
├── phase1-act1/
│   ├── phase1-act1-01.png
│   ├── phase1-act1-02.png
│   ├── phase1-act1-03.png
│   └── phase1-act1-04.png
├── phase1-act2/
│   └── ...
```

### Public URL Format
```
https://{project-ref}.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-01.png
```

## DB-Ready Payload

### Output Structure
```json
{
  "content_type": "webtoon",
  "content_title": "Phase 1 Act 1 Webtoon",
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
        "imageKey": "phase1-act1-01",
        "imageUrl": "https://...supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-01.png"
      },
      {
        "id": "c2",
        "order": 2,
        "imageKey": "phase1-act1-02",
        "imageUrl": "https://...supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-02.png"
      }
    ]
  }
}
```

### Usage
- Agent can directly patch `hackathon_phase_activity_content` row
- `imageKey` matches existing pattern for local fallback
- `imageUrl` is the Supabase storage public URL

### Optional Live Writeback
1. Query target activity row from `hackathon_phase_activities`
2. Patch `hackathon_phase_activity_content` with new metadata
3. Read back to verify

## Skill File Structure

```
.claude/skills/webtoon-cutter/
├── SKILL.md                    # Main skill documentation
└── references/
    ├── supabase-storage.md     # Storage bucket setup, upload patterns
    └── db-payload.md           # Payload structure, writeback workflow
```

### SKILL.md Sections
1. Overview - what the skill does
2. Prerequisites - ImageMagick installed, Supabase credentials
3. Workflow - step-by-step process
4. Commands - ImageMagick cutting commands reference
5. Upload - Supabase storage upload patterns
6. Payload - DB-ready output format
7. Writeback - Optional live DB patch workflow
8. Failure modes - common issues and fixes

## Prerequisites

- ImageMagick installed (`brew install imagemagick` on macOS)
- Supabase project with storage enabled
- Service role credentials for storage uploads
- Source image file (PNG recommended)

## Failure Modes

- **ImageMagick not installed** - Guide user to install
- **Uneven chunk height** - Handle last chunk with remaining height
- **Upload fails** - Check bucket exists, credentials valid
- **DB write fails** - Verify activity ID exists, check permissions

## Implementation Approach

**Approach A: Skill + Bash/ImageMagick**

- Skill guides agent to use `convert` via bash commands
- Agent handles cutting, uploading, payload generation
- No new package dependencies
- Portable across agent environments

## Next Steps

1. Create skill files (SKILL.md + references)
2. Create Supabase storage bucket migration
3. Test with sample webtoon image
4. Push to ps-skills repository