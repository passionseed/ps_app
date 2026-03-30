#!/bin/bash
# Sync production Supabase data to Ghost staging database
# Usage: ./scripts/sync-to-ghost.sh

set -e

GHOST_DB_ID="avbdofkis9"
GHOST_CONN="postgresql://tsdbadmin:kgf1vrbzlwpvc910@avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com:35761/tsdb"
SUPABASE_PROJECT_REF="iikrvgjfkuijcpvdwzvv"

echo "🔄 Syncing production data to Ghost staging..."
echo "Ghost DB: $GHOST_DB_ID"
echo ""

# Navigate to pseed project for Supabase CLI
cd /Users/bunyasit/dev/pseed

# Dump schema
echo "📦 Dumping schema..."
npx supabase db dump --linked -f /tmp/staging_schema.sql 2>/dev/null

# Filter out Supabase-specific features
echo "🔧 Filtering schema for Ghost compatibility..."
cat /tmp/staging_schema.sql | \
  grep -v "^CREATE ROLE" | \
  grep -v "^GRANT" | \
  grep -v "^ALTER DEFAULT PRIVILEGES" | \
  grep -v "^CREATE POLICY" | \
  grep -v "^DROP POLICY" | \
  grep -v "^ALTER TABLE.*ENABLE ROW LEVEL SECURITY" | \
  grep -v "^REVOKE" | \
  grep -v "^CREATE PUBLICATION" | \
  grep -v "^ALTER PUBLICATION" | \
  grep -v "auth\.uid()" | \
  grep -v "auth\.role()" | \
  grep -v "extensions\.uuid_generate_v4" | \
  grep -v "tsdbexplorer" | \
  sed 's/"extensions"\."uuid_generate_v4"()/gen_random_uuid()/g' \
  > /tmp/ghost_schema_filtered.sql

# Import schema
echo "📥 Importing schema to Ghost..."
PGPASSWORD='kgf1vrbzlwpvc910' psql -h avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com -U tsdbadmin -p 35761 -d tsdb -f /tmp/ghost_schema_filtered.sql > /tmp/import_log.txt 2>&1 || true

# Dump data (public schema only)
echo "📦 Dumping data..."
npx supabase db dump --linked --data-only -f /tmp/staging_data.sql 2>/dev/null

# Extract public schema data
echo "🔧 Extracting public schema data..."
awk '/^COPY "public"/{flag=1} flag; /^\\.$/{flag=0}' /tmp/staging_data.sql > /tmp/ghost_data.sql

# Import data
echo "📥 Importing data to Ghost..."
PGPASSWORD='kgf1vrbzlwpvc910' psql -h avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com -U tsdbadmin -p 35761 -d tsdb -f /tmp/ghost_data.sql >> /tmp/import_log.txt 2>&1 || true

echo ""
echo "✅ Sync complete!"
echo "Check /tmp/import_log.txt for details"
echo ""
echo "Ghost staging connection:"
echo "  postgresql://tsdbadmin:kgf1vrbzlwpvc910@avbdofkis9.ovud6z028c.tsdb.cloud.timescale.com:35761/tsdb"
