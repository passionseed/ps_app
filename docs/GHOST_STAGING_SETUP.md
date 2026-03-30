# Ghost Staging Database Setup

## Overview

This project uses **Ghost** (ghost.build) as a staging/backup database environment. Ghost provides managed Postgres databases with hard cost caps and easy forking.

## Database Environments

| Environment | Platform | Connection | Purpose |
|-------------|----------|------------|---------|
| **Production** | Supabase | `iikrvgjfkuijcpvdwzvv.supabase.co` | Live user data |
| **Staging** | Ghost | `avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com:35761` | Testing, previews |

## Staging Database Details

- **Database ID**: `avbdofkis9`
- **Name**: `passion-seed-clone`
- **Connection String**: 
  ```
  postgresql://tsdbadmin:kgf1vrbzlwpvc910@avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com:35761/tsdb
  ```
- **Size**: ~277MB (as of initial sync)
- **Last Sync**: Initial clone completed

### Imported Data Summary

| Table | Row Count | Status |
|-------|-----------|--------|
| profiles | 564 | ✅ |
| seeds | 14 | ✅ |
| path_enrollments | 14 | ✅ |
| paths | 11 | ✅ |
| path_days | 40 | ✅ |
| path_activities | 46 | ✅ |
| path_content | 63 | ✅ |
| path_assessments | 3 | ✅ |

**Total**: 39,641 rows imported successfully across 186 tables
**Errors**: 4,638 (mostly missing extension-dependent tables like `tcas_programs`, `learning_maps`)

## Syncing Production to Staging

### Automatic Sync Script

```bash
# From the project root
./scripts/sync-to-ghost.sh
```

This script:
1. Dumps schema from production Supabase
2. Filters out Supabase-specific features (RLS, auth schema, etc.)
3. Dumps data from public schema
4. Imports everything to Ghost staging

### Manual Sync

```bash
# 1. Dump from production
cd /Users/bunyasit/dev/pseed
npx supabase db dump --linked -f /tmp/prod_schema.sql
npx supabase db dump --linked --data-only -f /tmp/prod_data.sql

# 2. Import to Ghost (schema)
PGPASSWORD='kgf1vrbzlwpvc910' psql \
  -h avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com \
  -U tsdbadmin -p 35761 -d tsdb \
  -f /tmp/ghost_schema_filtered.sql

# 3. Import to Ghost (data)
PGPASSWORD='kgf1vrbzlwpvc910' psql \
  -h avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com \
  -U tsdbadmin -p 35761 -d tsdb \
  -f /tmp/ghost_data_import.sql
```

## Using Staging in the App

### Option 1: Environment Variable Override

Create `.env.staging`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com:35761
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-ghost-key-if-needed>
EXPO_PUBLIC_PROJECT_ID=baca732a-c7d8-4bd2-9742-48cc2a5e939f
EXPO_PUBLIC_USE_GHOST=true
```

### Option 2: Runtime Toggle

Add a staging toggle in developer settings (coming soon).

## Ghost CLI Commands

```bash
# List all databases
ghost list

# View staging database
ghost status avbdofkis9

# Get connection string
ghost connect avbdofkis9

# Create a fork for testing
ghost fork avbdofkis9 --name test-branch

# Pause staging (save costs)
ghost pause avbdofkis9

# Resume staging
ghost resume avbdofkis9

# Delete and recreate
ghost delete avbdofkis9 --confirm
ghost create --name passion-seed-clone
```

## Important Notes

### What's Synced
- ✅ All public schema tables
- ✅ Application data (users, paths, enrollments, etc.)
- ✅ Learning maps and nodes
- ✅ PathLab content

### What's NOT Synced
- ❌ Auth schema (Supabase-specific)
- ❌ RLS policies (Ghost doesn't use Supabase auth)
- ❌ Storage buckets (use Ghost's storage or S3)
- ❌ Edge functions (deploy separately)
- ❌ `tcas_*` tables (can be added if needed)

### Vector Support ✅

Ghost supports `pgvector` extension! It's already enabled:

```sql
-- Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Returns: vector 0.8.2 ✅

-- Add vector columns to tables
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS interest_embedding vector(1024);
```

### Known Limitations

1. **Supabase-specific features**: Auth schema, RLS policies
2. **Foreign key dependencies**: Some tables reference missing tables

For staging purposes, the core PathLab system is fully functional.

### User Authentication

Since Ghost doesn't have Supabase Auth, staging users need to:
1. Use test accounts created directly in the database
2. Or implement a simple auth bypass for staging

### Cost Management

Ghost free tier includes:
- 100 compute hours/month
- 1TB storage
- Unlimited databases

**Pause staging when not in use:**
```bash
ghost pause avbdofkis9
```

## Troubleshooting

### Import fails with "role does not exist"
The schema filter should remove role-specific grants. Re-run the sync script.

### Data import errors
Check `/tmp/data_import_log.txt` for details. Some tables may fail due to foreign key constraints - run the import twice.

### Connection refused
Verify Ghost database is running:
```bash
ghost list
ghost resume avbdofkis9  # if paused
```

## Migration Back to Production

⚠️ **Never push staging data directly to production.**

To migrate changes:
1. Test thoroughly in staging
2. Create migrations in `/supabase/migrations`
3. Apply to production via Supabase CLI
4. Sync production back to staging to verify

```bash
# Apply migration to production
cd /Users/bunyasit/dev/pseed
npx supabase db push

# Sync back to staging
cd /Users/bunyasit/dev/ps_app
./scripts/sync-to-ghost.sh
```
