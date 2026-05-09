#!/usr/bin/env bash
# =============================================================================
# SolarCRM - Daily Database Backup Script
# =============================================================================
# Run via cron: 0 2 * * * /opt/solarcrm/scripts/backup.sh >> /var/log/solarcrm/backup.log 2>&1
#
# Features:
# - pg_dump with compression
# - Daily retention (7 days)
# - Weekly retention (4 weeks) — every Sunday backup is also kept as weekly
# - Optional upload to Cloudflare R2
# - Email/webhook notification on failure
# =============================================================================

set -euo pipefail

# ─── CONFIGURATION ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Directories
BACKUP_DIR="$PROJECT_DIR/backups"
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"

# Retention
DAILY_RETENTION=${BACKUP_RETENTION_DAILY:-7}
WEEKLY_RETENTION=${BACKUP_RETENTION_WEEKLY:-4}

# Database credentials (from .env)
DB_NAME="${POSTGRES_DB:-solarcrm}"
DB_USER="${POSTGRES_USER:-solarcrm_app}"
DB_CONTAINER="solarcrm-postgres"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday

# ─── FUNCTIONS ───────────────────────────────────────────────────────────────

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "❌ ERROR: $1"
    # Uncomment to send failure notifications:
    # curl -s -X POST "$WEBHOOK_URL" -H 'Content-Type: application/json' \
    #   -d "{\"text\":\"⚠️ SolarCRM backup failed: $1\"}" || true
    exit 1
}

# ─── PRE-FLIGHT CHECKS ──────────────────────────────────────────────────────

# Ensure backup directories exist
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

# Check if PostgreSQL container is running
if ! docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null | grep -q true; then
    error "PostgreSQL container '$DB_CONTAINER' is not running"
fi

# ─── CREATE BACKUP ───────────────────────────────────────────────────────────

BACKUP_FILE="solarcrm_${TIMESTAMP}.sql.gz"
BACKUP_PATH="$DAILY_DIR/$BACKUP_FILE"

log "🔄 Starting database backup..."
log "   Database: $DB_NAME"
log "   Container: $DB_CONTAINER"
log "   Output: $BACKUP_PATH"

# Run pg_dump inside the container, compress with gzip
# WHY pg_dump (not pg_dumpall): We only need one database, not the entire cluster
# WHY --no-owner: Makes the dump portable across different PostgreSQL users
# WHY --format=plain: Human-readable SQL, compresses well with gzip
docker exec "$DB_CONTAINER" \
    pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-privileges \
        --format=plain \
        --verbose \
    2>/dev/null \
    | gzip -9 > "$BACKUP_PATH"

# Verify backup was created and is non-empty
if [ ! -s "$BACKUP_PATH" ]; then
    error "Backup file is empty or was not created"
fi

BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
log "✅ Daily backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# ─── WEEKLY BACKUP (Sunday) ─────────────────────────────────────────────────

if [ "$DAY_OF_WEEK" -eq 7 ]; then
    WEEKLY_FILE="solarcrm_weekly_${TIMESTAMP}.sql.gz"
    cp "$BACKUP_PATH" "$WEEKLY_DIR/$WEEKLY_FILE"
    log "✅ Weekly backup created: $WEEKLY_FILE"
fi

# ─── CLEANUP OLD BACKUPS ────────────────────────────────────────────────────

log "🧹 Cleaning up old backups..."

# Remove daily backups older than retention period
find "$DAILY_DIR" -name "solarcrm_*.sql.gz" -type f -mtime +$DAILY_RETENTION -delete
DAILY_COUNT=$(find "$DAILY_DIR" -name "solarcrm_*.sql.gz" -type f | wc -l)
log "   Daily backups remaining: $DAILY_COUNT (retention: $DAILY_RETENTION days)"

# Remove weekly backups older than retention period
WEEKLY_DAYS=$((WEEKLY_RETENTION * 7))
find "$WEEKLY_DIR" -name "solarcrm_weekly_*.sql.gz" -type f -mtime +$WEEKLY_DAYS -delete
WEEKLY_COUNT=$(find "$WEEKLY_DIR" -name "solarcrm_weekly_*.sql.gz" -type f | wc -l)
log "   Weekly backups remaining: $WEEKLY_COUNT (retention: $WEEKLY_RETENTION weeks)"

# ─── OPTIONAL: UPLOAD TO CLOUDFLARE R2 ──────────────────────────────────────

if [ "${BACKUP_R2_ENABLED:-false}" = "true" ]; then
    log "☁️  Uploading backup to Cloudflare R2..."

    # Requires aws-cli configured with R2 credentials
    # AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from .env
    export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
    export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
    R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    aws s3 cp "$BACKUP_PATH" \
        "s3://${R2_BUCKET_NAME:-solarcrm-backups}/backups/daily/$BACKUP_FILE" \
        --endpoint-url "$R2_ENDPOINT" \
        --quiet

    if [ "$DAY_OF_WEEK" -eq 7 ]; then
        aws s3 cp "$WEEKLY_DIR/$WEEKLY_FILE" \
            "s3://${R2_BUCKET_NAME:-solarcrm-backups}/backups/weekly/$WEEKLY_FILE" \
            --endpoint-url "$R2_ENDPOINT" \
            --quiet
    fi

    log "✅ Backup uploaded to R2"

    # Clean up old R2 backups (keep same retention)
    # R2 lifecycle rules are recommended instead — configure in Cloudflare Dashboard
fi

# ─── SUMMARY ─────────────────────────────────────────────────────────────────

log "🎉 Backup completed successfully"
log "   File: $BACKUP_FILE"
log "   Size: $BACKUP_SIZE"
log "   Daily backups: $DAILY_COUNT"
log "   Weekly backups: $WEEKLY_COUNT"
