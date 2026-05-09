#!/usr/bin/env bash
# =============================================================================
# SolarCRM - Database Restore Script
# =============================================================================
# Usage:
#   ./restore.sh                           # List available backups
#   ./restore.sh daily/solarcrm_20260510.sql.gz  # Restore specific backup
#   ./restore.sh latest                    # Restore most recent backup
#
# CAUTION: This DROPS and recreates the database. All current data is replaced.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

BACKUP_DIR="$PROJECT_DIR/backups"
DB_NAME="${POSTGRES_DB:-solarcrm}"
DB_USER="${POSTGRES_USER:-solarcrm_app}"
DB_CONTAINER="solarcrm-postgres"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ─── LIST BACKUPS ────────────────────────────────────────────────────────────

list_backups() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo " Available Backups"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "📅 DAILY:"
    if [ -d "$BACKUP_DIR/daily" ]; then
        ls -lh "$BACKUP_DIR/daily/"*.sql.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'  || echo "  (none)"
    fi
    echo ""
    echo "📅 WEEKLY:"
    if [ -d "$BACKUP_DIR/weekly" ]; then
        ls -lh "$BACKUP_DIR/weekly/"*.sql.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'  || echo "  (none)"
    fi
    echo ""
    echo "Usage: $0 <backup-file-path>"
    echo "  e.g.: $0 daily/solarcrm_20260510_020000.sql.gz"
    echo "  or:   $0 latest"
    echo ""
}

# ─── FIND LATEST BACKUP ─────────────────────────────────────────────────────

find_latest() {
    local latest
    latest=$(find "$BACKUP_DIR" -name "solarcrm_*.sql.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -z "$latest" ]; then
        echo ""
    else
        echo "$latest"
    fi
}

# ─── MAIN ────────────────────────────────────────────────────────────────────

# No args — list backups
if [ $# -eq 0 ]; then
    list_backups
    exit 0
fi

# Resolve backup file path
BACKUP_INPUT="$1"

if [ "$BACKUP_INPUT" = "latest" ]; then
    BACKUP_FILE=$(find_latest)
    if [ -z "$BACKUP_FILE" ]; then
        log "❌ No backups found in $BACKUP_DIR"
        exit 1
    fi
    log "📂 Latest backup: $BACKUP_FILE"
elif [ -f "$BACKUP_DIR/$BACKUP_INPUT" ]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_INPUT"
elif [ -f "$BACKUP_INPUT" ]; then
    BACKUP_FILE="$BACKUP_INPUT"
else
    log "❌ Backup file not found: $BACKUP_INPUT"
    list_backups
    exit 1
fi

# ─── SAFETY CONFIRMATION ────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " ⚠️  DATABASE RESTORE WARNING"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo " Backup file: $(basename "$BACKUP_FILE")"
echo " File size:   $(du -sh "$BACKUP_FILE" | cut -f1)"
echo " Database:    $DB_NAME"
echo " Container:   $DB_CONTAINER"
echo ""
echo " THIS WILL DROP AND RECREATE THE DATABASE."
echo " ALL CURRENT DATA WILL BE REPLACED."
echo ""
echo "══════════════════════════════════════════════════════════════"
echo ""
read -p " Type 'RESTORE' to confirm: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
    log "❌ Restore cancelled"
    exit 1
fi

# ─── PRE-RESTORE BACKUP ─────────────────────────────────────────────────────

log "📦 Creating pre-restore safety backup..."
PRE_RESTORE_FILE="$BACKUP_DIR/daily/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"

docker exec "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges --format=plain \
    2>/dev/null | gzip -9 > "$PRE_RESTORE_FILE"

log "✅ Safety backup created: $PRE_RESTORE_FILE"

# ─── STOP BACKEND ───────────────────────────────────────────────────────────

log "🔌 Stopping backend to prevent writes during restore..."
docker stop solarcrm-backend 2>/dev/null || true

# ─── RESTORE DATABASE ───────────────────────────────────────────────────────

log "🔄 Restoring database from backup..."

# Drop and recreate the database
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
    "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
    "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null

# Pipe the decompressed backup into psql
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" --quiet 2>/dev/null

log "✅ Database restored successfully"

# ─── RESTART BACKEND ────────────────────────────────────────────────────────

log "🚀 Restarting backend..."
docker start solarcrm-backend

# Wait for backend to be healthy
log "⏳ Waiting for backend health check..."
for i in {1..30}; do
    if docker exec solarcrm-backend wget -q --spider http://localhost:4000/api/health 2>/dev/null; then
        log "✅ Backend is healthy"
        break
    fi
    sleep 2
done

log "🎉 Restore completed successfully!"
log "   Restored from: $(basename "$BACKUP_FILE")"
log "   Safety backup: $(basename "$PRE_RESTORE_FILE")"
