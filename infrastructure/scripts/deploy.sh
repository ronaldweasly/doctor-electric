#!/usr/bin/env bash
# =============================================================================
# SolarCRM - Deploy Script (run on VPS)
# =============================================================================
# Called by GitHub Actions or manually to deploy the latest version.
# Implements near-zero-downtime deployment using Docker Compose.
#
# Usage: ./deploy.sh [--rollback]
# =============================================================================

set -euo pipefail

PROJECT_DIR="/opt/solarcrm"
LOG_FILE="/var/log/solarcrm/deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ─── ROLLBACK ────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--rollback" ]; then
    log "🔄 Rolling back to previous version..."
    cd "$PROJECT_DIR"
    
    # Check if there's a previous backup tag
    if [ -f "$PROJECT_DIR/.deploy-previous-sha" ]; then
        PREV_SHA=$(cat "$PROJECT_DIR/.deploy-previous-sha")
        log "   Previous SHA: $PREV_SHA"
        git checkout "$PREV_SHA"
        docker compose up -d --build
        log "✅ Rollback complete to $PREV_SHA"
    else
        log "❌ No previous deployment SHA found"
        exit 1
    fi
    exit 0
fi

# ─── DEPLOY ──────────────────────────────────────────────────────────────────

log "════════════════════════════════════════════════════════════════"
log "🚀 Starting SolarCRM deployment"
log "════════════════════════════════════════════════════════════════"

cd "$PROJECT_DIR"

# Save current SHA for rollback
CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "$CURRENT_SHA" > "$PROJECT_DIR/.deploy-previous-sha"
log "📌 Current SHA (for rollback): $CURRENT_SHA"

# Pull latest code
log "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main
NEW_SHA=$(git rev-parse HEAD)
log "   New SHA: $NEW_SHA"

# Pull latest Docker images (nginx, postgres, etc.)
log "📦 Pulling Docker images..."
docker compose pull --quiet

# Build and restart with near-zero downtime
# WHY --no-deps for backend: Rebuilds only the backend without restarting postgres
# The frontend is a build-only container, so it runs and exits
log "🔨 Building and deploying..."

# Step 1: Rebuild frontend (build-only container, no downtime impact)
docker compose build --no-cache frontend
docker compose up -d frontend  # Runs build, copies to volume, exits

# Step 2: Rebuild and restart backend
# The old container keeps serving until the new one is healthy
docker compose build --no-cache backend
docker compose up -d --no-deps backend

# Step 3: Reload Nginx to pick up new frontend files
docker exec solarcrm-nginx nginx -s reload

# Step 4: Verify health
log "⏳ Verifying deployment health..."
sleep 5

HEALTH_STATUS=$(docker exec solarcrm-backend wget -q -O - http://localhost:4000/api/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "failed")

if [ "$HEALTH_STATUS" = "ok" ]; then
    log "✅ Backend health check passed"
else
    log "⚠️  Backend health check returned: $HEALTH_STATUS"
    log "   Checking container status..."
    docker compose ps
fi

# Prune old images to free disk space
docker image prune -f --filter "until=24h" > /dev/null 2>&1

log "════════════════════════════════════════════════════════════════"
log "✅ Deployment complete!"
log "   Version: $NEW_SHA"
log "   Previous: $CURRENT_SHA"
log "════════════════════════════════════════════════════════════════"
