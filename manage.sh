#!/usr/bin/env bash
# =============================================================================
# SolarCRM - Quick Commands Helper
# =============================================================================
# Use this script for common deployment and management tasks
#
# Usage:
#   ./manage.sh start          - Start all services
#   ./manage.sh stop           - Stop all services
#   ./manage.sh logs           - View real-time logs
#   ./manage.sh status         - Show service status
#   ./manage.sh rebuild        - Rebuild and restart
#   ./manage.sh backup         - Backup database
#   ./manage.sh restore <file> - Restore from backup
#   ./manage.sh shell backend  - Enter backend container shell
#   ./manage.sh shell db       - Enter database shell
# =============================================================================

set -e

PROJECT_DIR="/opt/solarcrm"
CD_TO_INFRASTRUCTURE="${PROJECT_DIR}/infrastructure"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Commands
case "${1:-help}" in
    start)
        info "Starting SolarCRM services..."
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose up -d
        log "Services started!"
        docker-compose ps
        ;;
    stop)
        info "Stopping SolarCRM services..."
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose down
        log "Services stopped"
        ;;
    restart)
        info "Restarting SolarCRM services..."
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose restart
        log "Services restarted"
        ;;
    logs)
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose logs -f "${2:-}"
        ;;
    status)
        info "Service Status:"
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose ps
        echo ""
        info "Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}" | head -6
        ;;
    build)
        info "Rebuilding images..."
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose build --no-cache
        log "Build complete"
        ;;
    rebuild)
        info "Rebuilding and restarting..."
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose build --no-cache
        docker-compose up -d
        log "Restart complete!"
        ;;
    backup)
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="/opt/solarcrm/backups/backup_${TIMESTAMP}.sql"
        mkdir -p /opt/solarcrm/backups
        info "Backing up database to $BACKUP_FILE..."
        docker exec solarcrm-postgres pg_dump -U solarcrm_user solarcrm > "$BACKUP_FILE"
        log "Backup complete: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
        ;;
    restore)
        if [ -z "$2" ]; then
            err "Usage: ./manage.sh restore <backup_file>"
        fi
        if [ ! -f "$2" ]; then
            err "Backup file not found: $2"
        fi
        info "Restoring from $2..."
        docker exec -i solarcrm-postgres psql -U solarcrm_user solarcrm < "$2"
        log "Restore complete"
        ;;
    shell)
        if [ "$2" = "backend" ]; then
            info "Entering backend container shell (Node.js)..."
            docker exec -it solarcrm-backend /bin/sh
        elif [ "$2" = "db" ] || [ "$2" = "postgres" ]; then
            info "Entering database shell (PostgreSQL)..."
            docker exec -it solarcrm-postgres psql -U solarcrm_user -d solarcrm
        elif [ "$2" = "nginx" ]; then
            info "Entering nginx container shell..."
            docker exec -it solarcrm-nginx /bin/sh
        else
            err "Unknown shell: $2. Options: backend, db, nginx"
        fi
        ;;
    update)
        info "Updating SolarCRM from repository..."
        cd "$PROJECT_DIR"
        git fetch origin main
        git reset --hard origin/main
        info "Rebuilding images with latest code..."
        cd "$CD_TO_INFRASTRUCTURE"
        docker-compose build --no-cache
        docker-compose up -d
        log "Update complete!"
        ;;
    clean)
        info "Cleaning up old Docker images and dangling containers..."
        docker image prune -af --filter "until=24h"
        docker container prune -f
        log "Cleanup complete"
        ;;
    help|*)
        echo ""
        echo -e "${BLUE}SolarCRM Management Commands${NC}"
        echo ""
        echo "  start              Start all services"
        echo "  stop               Stop all services"
        echo "  restart            Restart all services"
        echo "  logs [service]     View logs (default: all)"
        echo "  status             Show service status and resource usage"
        echo "  build              Build Docker images"
        echo "  rebuild            Build images and restart services"
        echo "  backup             Backup database"
        echo "  restore <file>     Restore database from backup"
        echo "  shell <container>  Enter container shell (backend|db|nginx)"
        echo "  update             Update from git and restart"
        echo "  clean              Clean up old Docker images"
        echo "  help               Show this help message"
        echo ""
        echo -e "${BLUE}Examples:${NC}"
        echo "  ./manage.sh logs backend"
        echo "  ./manage.sh shell db"
        echo "  ./manage.sh backup"
        echo "  ./manage.sh restore backups/backup_20231215_120000.sql"
        echo ""
        ;;
esac
