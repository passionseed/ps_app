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