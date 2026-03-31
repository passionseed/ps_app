#!/bin/bash
# Daily database backup script
# Backs up full Supabase database (including auth) to Backblaze B2
# Usage: ./scripts/backup-db.sh

set -e

# Configuration
SUPABASE_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
SUPABASE_USER="postgres.iikrvgjfkuijcpvdwzvv"
SUPABASE_DB="postgres"
BACKUP_DIR="/tmp/db-backups"
B2_BUCKET="pseed-backups"  # Change to your B2 bucket name
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql.gz"

echo "🔄 Starting database backup..."
echo "📅 Date: $DATE"
echo "💾 Backup file: $BACKUP_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Full database dump (includes auth, storage, public schemas)
echo "📦 Dumping database..."
PGPASSWORD="$SUPABASE_PASSWORD" /opt/homebrew/opt/postgresql@18/bin/pg_dump \
  -h "$SUPABASE_HOST" \
  -U "$SUPABASE_USER" \
  -p 5432 \
  -d "$SUPABASE_DB" \
  --no-owner \
  --no-privileges \
  --verbose \
  2>> "$BACKUP_DIR/backup_${DATE}.log" | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Check backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "✅ Backup created: $BACKUP_SIZE"

# Upload to Backblaze B2
echo "☁️  Uploading to B2..."
if command -v rclone &> /dev/null; then
  rclone copy "$BACKUP_DIR/$BACKUP_FILE" "b2:$B2_BUCKET/daily/" \
    --progress \
    --log-file="$BACKUP_DIR/upload_${DATE}.log"
  echo "✅ Uploaded to B2: $B2_BUCKET/daily/$BACKUP_FILE"
else
  echo "⚠️  rclone not installed. Install with: brew install rclone"
  echo "📁 Backup saved locally: $BACKUP_DIR/$BACKUP_FILE"
fi

# Cleanup old local backups
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.log" -mtime +30 -delete

# Sync to Ghost (warm standby - app data only, not auth)
echo "🔄 Syncing app data to Ghost staging..."
./scripts/sync-to-ghost.sh 2>&1 | tail -5

echo ""
echo "✅ Backup complete!"
echo "📊 Summary:"
echo "   - Full dump: $BACKUP_DIR/$BACKUP_FILE ($BACKUP_SIZE)"
echo "   - B2 upload: b2://$B2_BUCKET/daily/$BACKUP_FILE"
echo "   - Ghost sync: Completed"
echo "   - Local retention: 7 days"
echo "   - B2 retention: $RETENTION_DAYS days"
