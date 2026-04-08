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