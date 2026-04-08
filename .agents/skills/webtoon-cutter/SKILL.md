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

For each chunk, use curl with service role key:

```bash
curl -X POST "https://{project-ref}.supabase.co/storage/v1/object/webtoons/{story-id}/{filename}" \
  -H "Authorization: Bearer {service-role-key}" \
  -H "Content-Type: image/png" \
  --data-binary "@{local-path}"
```

Public URL format:
```
https://{project-ref}.supabase.co/storage/v1/object/public/webtoons/{story-id}/{filename}
```

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