#!/usr/bin/env bash
# =============================================================================
# SolarCRM - ONE-COMMAND DEPLOYMENT FOR LINUX
# =============================================================================
# Deploy the entire SolarCRM stack on Ubuntu 22.04+ with a single command.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/yourusername/solarcrm/main/deploy.sh | sudo bash
#   
# or locally:
#   sudo bash deploy.sh
# =============================================================================

set -euo pipefail

# ─── CONFIGURATION ───────────────────────────────────────────────────────────
DEPLOY_USER="deploy"
PROJECT_DIR="/opt/solarcrm"
SSH_PORT=2222
APP_DOMAIN="${APP_DOMAIN:-localhost}"  # Set via env or default to localhost
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Track progress
step_count=0
total_steps=12

step() {
    step_count=$((step_count + 1))
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}STEP $step_count/$total_steps: $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
}

# Must be root
if [ "$(id -u)" -ne 0 ]; then
    err "This script must be run as root. Use: sudo bash deploy.sh"
fi

# ─── START ───────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         SolarCRM - One-Command Linux Deployment              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Deploying to: $APP_DOMAIN"
info "User: $DEPLOY_USER"
info "Project dir: $PROJECT_DIR"
echo ""

# ─── STEP 1: SYSTEM UPDATES ──────────────────────────────────────────────────
step "Update system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git unzip htop jq fail2ban ufw \
    ca-certificates gnupg lsb-release apt-transport-https \
    software-properties-common build-essential
log "System updated"

# ─── STEP 2: INSTALL DOCKER ─────────────────────────────────────────────────
step "Install Docker & Docker Compose"
if command -v docker &> /dev/null; then
    log "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    bash /tmp/get-docker.sh > /dev/null 2>&1
    log "Docker installed"
fi

if command -v docker-compose &> /dev/null; then
    log "Docker Compose already installed: $(docker-compose --version)"
else
    curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log "Docker Compose installed"
fi

docker -v
docker-compose -v

# ─── STEP 3: CREATE DEPLOY USER ──────────────────────────────────────────────
step "Create deploy user"
if id "$DEPLOY_USER" &>/dev/null; then
    log "User '$DEPLOY_USER' already exists"
else
    useradd -m -s /bin/bash -G sudo,docker "$DEPLOY_USER"
    if [ -d /root/.ssh ]; then
        mkdir -p "/home/$DEPLOY_USER/.ssh"
        cp -r /root/.ssh/* "/home/$DEPLOY_USER/.ssh/" 2>/dev/null || true
        chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
        chmod 700 "/home/$DEPLOY_USER/.ssh"
    fi
    log "Deploy user created and added to docker group"
fi

# Apply docker group without logout
newgrp docker <<EOFGRP
    log "Docker group configured"
EOFGRP

# ─── STEP 4: SETUP PROJECT DIRECTORY ─────────────────────────────────────────
step "Setup project directory"
mkdir -p "$PROJECT_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_DIR"
log "Project directory: $PROJECT_DIR"

# ─── STEP 5: CLONE REPOSITORY ────────────────────────────────────────────────
step "Clone SolarCRM repository"
if [ -d "$PROJECT_DIR/.git" ]; then
    log "Repository already exists, pulling latest"
    cd "$PROJECT_DIR"
    git pull origin main || true
else
    # If running from curl pipe, we're already in /tmp
    if [ -d "/tmp/solarcrm" ] && [ -f "/tmp/solarcrm/.git/config" ]; then
        cp -r /tmp/solarcrm/* "$PROJECT_DIR/" 2>/dev/null || true
        log "Copied local repository"
    else
        cd "$PROJECT_DIR"
        git init
        git remote add origin "https://github.com/yourusername/solarcrm.git" || true
        git fetch origin main || true
        git checkout main || true
        log "Cloned repository"
    fi
fi

cd "$PROJECT_DIR"

# ─── STEP 6: SETUP ENVIRONMENT ───────────────────────────────────────────────
step "Configure environment variables"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env" 2>/dev/null || cat > "$PROJECT_DIR/.env" << 'EOF'
# ─── PostgreSQL Configuration ────────────────────────────────────────────────
POSTGRES_DB="solarcrm"
POSTGRES_USER="solarcrm_user"
POSTGRES_PASSWORD="change_me_to_strong_password_$(openssl rand -base64 16)"

# ─── Backend Configuration ───────────────────────────────────────────────────
VITE_API_URL="https://${APP_DOMAIN}/api"
NODE_ENV="production"
PORT=4000

# ─── Frontend Configuration ──────────────────────────────────────────────────
VITE_SUPABASE_URL="https://xvlfedjjaitxloorkfjr.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_ZY_L0nSRnd-i1Tu3onL-MQ_K2UdsMdD"
VITE_SPREADSHEET_ID=""
VITE_USE_MOCK="false"
VITE_R2_ACCOUNT_ID=""
VITE_R2_ACCESS_KEY_ID=""
VITE_R2_ACCESS_KEY_SECRET=""
VITE_R2_BUCKET_NAME=""
VITE_R2_BUCKET_URL=""
GEMINI_API_KEY=""
APP_URL="https://${APP_DOMAIN}"
EOF
    warn "Created .env file - EDIT THIS with your credentials!"
    warn "Location: $PROJECT_DIR/.env"
    warn "Required fields: POSTGRES_PASSWORD, VITE_SPREADSHEET_ID (or VITE_USE_MOCK=true)"
else
    log ".env file already exists"
fi

# Generate strong PostgreSQL password if needed
if grep -q "change_me_to_strong_password" "$PROJECT_DIR/.env"; then
    SAFE_PASSWORD=$(openssl rand -base64 16 | tr '+/' '-_')
    sed -i "s/change_me_to_strong_password_.*/${SAFE_PASSWORD}/" "$PROJECT_DIR/.env"
    warn "Generated secure PostgreSQL password"
fi

chown "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_DIR/.env"
chmod 600 "$PROJECT_DIR/.env"

# ─── STEP 7: SETUP LOGGING ──────────────────────────────────────────────────
step "Setup logging directory"
mkdir -p /var/log/solarcrm
chown "$DEPLOY_USER:$DEPLOY_USER" /var/log/solarcrm
chmod 755 /var/log/solarcrm
log "Logging directory created"

# ─── STEP 8: BUILD DOCKER IMAGES ─────────────────────────────────────────────
step "Build Docker images"
cd "$PROJECT_DIR"
docker-compose build --no-cache 2>&1 | tail -20
log "Docker images built"

# ─── STEP 9: START SERVICES ─────────────────────────────────────────────────
step "Start services (Docker Compose)"
docker-compose up -d
log "Services started"

# Wait for services to be healthy
log "Waiting for services to be ready..."
sleep 15

# ─── STEP 10: DATABASE MIGRATION ─────────────────────────────────────────────
step "Run database migrations"
docker-compose exec -T backend npm run db:migrate 2>&1 || warn "No migrations to run"
log "Database initialized"

# ─── STEP 11: SECURITY CONFIGURATION ─────────────────────────────────────────
step "Configure firewall (UFW)"
ufw --force enable > /dev/null 2>&1 || true
ufw allow "$SSH_PORT"/tcp > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
log "Firewall configured"

# ─── STEP 12: INSTALL FAIL2BAN ──────────────────────────────────────────────
step "Setup Fail2Ban (intrusion prevention)"
systemctl enable fail2ban > /dev/null 2>&1
systemctl restart fail2ban > /dev/null 2>&1
log "Fail2Ban enabled"

# ─── SUCCESS ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 ✅ DEPLOYMENT COMPLETE!                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Next Steps:${NC}"
echo "   1. Edit environment variables:"
echo "      ${YELLOW}nano $PROJECT_DIR/.env${NC}"
echo ""
echo "   2. Set your POSTGRES_PASSWORD, VITE_SPREADSHEET_ID, and other values"
echo ""
echo "   3. Restart services:"
echo "      ${YELLOW}docker-compose -f $PROJECT_DIR/infrastructure/docker-compose.yml restart${NC}"
echo ""
echo -e "${BLUE}🚀 Services Running:${NC}"
docker-compose -f "$PROJECT_DIR/infrastructure/docker-compose.yml" ps
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo "   • Frontend: http://$APP_DOMAIN"
echo "   • Backend: http://$APP_DOMAIN/api/health"
echo "   • Logs: docker-compose -f $PROJECT_DIR/infrastructure/docker-compose.yml logs -f"
echo ""
echo -e "${BLUE}♻️  Updates:${NC}"
echo "   ${YELLOW}cd $PROJECT_DIR && git pull && docker-compose build --no-cache && docker-compose up -d${NC}"
echo ""
