#!/usr/bin/env bash
# =============================================================================
# SolarCRM - Ubuntu 22.04 VPS Initial Setup Script
# =============================================================================
# Run this ONCE on a fresh Ubuntu 22.04 VPS.
# Must be run as root or with sudo.
#
# This script:
# 1. Updates the system
# 2. Creates a non-root deploy user
# 3. Hardens SSH
# 4. Installs Docker + Docker Compose
# 5. Configures UFW firewall
# 6. Installs Fail2Ban
# 7. Sets up log rotation
# 8. Creates the project directory structure
# 9. Sets up cron jobs for backups
#
# Usage: curl -sSL https://your-repo/setup.sh | sudo bash
#   or:  sudo bash scripts/setup-server.sh
# =============================================================================

set -euo pipefail

# ─── CONFIGURATION ───────────────────────────────────────────────────────────
DEPLOY_USER="deploy"
PROJECT_DIR="/opt/solarcrm"
SSH_PORT=2222  # Non-standard SSH port to reduce automated attacks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Must be root
if [ "$(id -u)" -ne 0 ]; then
    err "This script must be run as root (sudo)"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  SolarCRM - Ubuntu 22.04 VPS Setup"
echo "════════════════════════════════════════════════════════════════"
echo ""

# =============================================================================
# 1. SYSTEM UPDATE
# =============================================================================
log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl \
    wget \
    git \
    unzip \
    htop \
    ncdu \
    jq \
    fail2ban \
    ufw \
    logrotate \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common

log "System updated"

# =============================================================================
# 2. CREATE DEPLOY USER
# =============================================================================
if id "$DEPLOY_USER" &>/dev/null; then
    warn "User '$DEPLOY_USER' already exists, skipping creation"
else
    log "Creating deploy user: $DEPLOY_USER"
    useradd -m -s /bin/bash -G sudo "$DEPLOY_USER"
    
    # Copy root's SSH keys to deploy user (so you can SSH as deploy)
    if [ -d /root/.ssh ]; then
        mkdir -p "/home/$DEPLOY_USER/.ssh"
        cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/" 2>/dev/null || true
        chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
        chmod 700 "/home/$DEPLOY_USER/.ssh"
        chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys" 2>/dev/null || true
    fi
    
    # Allow deploy user to run docker without sudo
    log "Deploy user created"
fi

# =============================================================================
# 3. INSTALL DOCKER
# =============================================================================
if command -v docker &>/dev/null; then
    warn "Docker already installed: $(docker --version)"
else
    log "Installing Docker..."
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Add deploy user to docker group
    usermod -aG docker "$DEPLOY_USER"

    # Enable Docker to start on boot
    systemctl enable docker
    systemctl start docker

    log "Docker installed: $(docker --version)"
fi

# =============================================================================
# 4. SSH HARDENING
# =============================================================================
log "Hardening SSH..."

# Backup original SSH config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)

cat > /etc/ssh/sshd_config.d/hardened.conf << EOF
# =============================================================================
# SolarCRM SSH Hardening Configuration
# =============================================================================

# Change default SSH port to reduce automated brute-force attacks
# WHY: 99% of SSH brute-force bots only try port 22
Port $SSH_PORT

# Disable root login — use deploy user + sudo instead
PermitRootLogin no

# Disable password authentication — SSH keys only
PasswordAuthentication no
ChallengeResponseAuthentication no

# Only allow the deploy user
AllowUsers $DEPLOY_USER

# Timeout idle sessions after 10 minutes
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable X11 forwarding (not needed for a server)
X11Forwarding no

# Limit authentication attempts
MaxAuthTries 3
MaxSessions 3

# Use only strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group-exchange-sha256
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
EOF

# Restart SSH (but don't disconnect current session)
systemctl restart sshd
log "SSH hardened (port: $SSH_PORT)"
warn "⚠️  SSH is now on port $SSH_PORT — update your SSH config!"
warn "    ssh -p $SSH_PORT $DEPLOY_USER@your-server-ip"

# =============================================================================
# 5. UFW FIREWALL
# =============================================================================
log "Configuring UFW firewall..."

# Reset UFW to defaults
ufw --force reset

# Default policies: deny incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# Allow SSH on custom port
ufw allow $SSH_PORT/tcp comment 'SSH'

# Allow HTTP and HTTPS (for Cloudflare)
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable UFW (non-interactive)
ufw --force enable

log "UFW configured"
ufw status verbose

# =============================================================================
# 6. FAIL2BAN
# =============================================================================
log "Configuring Fail2Ban..."

cat > /etc/fail2ban/jail.local << EOF
# =============================================================================
# SolarCRM Fail2Ban Configuration
# =============================================================================

[DEFAULT]
# Ban duration: 1 hour (increases with repeat offenses)
bantime = 3600
# Find violations within 10 minutes
findtime = 600
# Ban after 3 failed attempts
maxretry = 3
# Use UFW for banning
banaction = ufw

# ─── SSH Protection ──────────────────────────────────────────────────────────
[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# ─── Nginx Rate Limiting ─────────────────────────────────────────────────────
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /opt/solarcrm/nginx/logs/error.log
maxretry = 5
bantime = 600
findtime = 60

# ─── Nginx Bad Bots ──────────────────────────────────────────────────────────
[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /opt/solarcrm/nginx/logs/access.log
maxretry = 2
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban

log "Fail2Ban configured"

# =============================================================================
# 7. PROJECT DIRECTORY STRUCTURE
# =============================================================================
log "Creating project directory structure..."

mkdir -p "$PROJECT_DIR"/{frontend,backend,nginx/{conf.d,ssl,logs},postgres/init,monitoring,scripts,backups/{daily,weekly}}

# Create log directory
mkdir -p /var/log/solarcrm

# Set ownership
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" /var/log/solarcrm

log "Project directory created at $PROJECT_DIR"

# =============================================================================
# 8. LOG ROTATION
# =============================================================================
log "Configuring log rotation..."

cat > /etc/logrotate.d/solarcrm << EOF
# SolarCRM application logs
/var/log/solarcrm/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0640 $DEPLOY_USER $DEPLOY_USER
}

# Nginx logs (inside Docker volume)
$PROJECT_DIR/nginx/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        docker exec solarcrm-nginx nginx -s reopen 2>/dev/null || true
    endscript
}
EOF

log "Log rotation configured"

# =============================================================================
# 9. CRON JOBS
# =============================================================================
log "Setting up cron jobs..."

# Create crontab for deploy user
CRON_FILE="/tmp/solarcrm_cron"
cat > "$CRON_FILE" << EOF
# =============================================================================
# SolarCRM Cron Jobs
# =============================================================================

# Daily database backup at 2:00 AM
0 2 * * * /opt/solarcrm/scripts/backup.sh >> /var/log/solarcrm/backup.log 2>&1

# Docker system prune (remove unused images/containers) — weekly on Sunday 3 AM
0 3 * * 0 docker system prune -f >> /var/log/solarcrm/docker-prune.log 2>&1

# Renew SSL certificates (if using Let's Encrypt) — twice daily
0 */12 * * * certbot renew --quiet --deploy-hook "docker exec solarcrm-nginx nginx -s reload" 2>/dev/null || true
EOF

crontab -u "$DEPLOY_USER" "$CRON_FILE"
rm "$CRON_FILE"

log "Cron jobs configured"

# =============================================================================
# 10. SYSTEM TUNING
# =============================================================================
log "Applying system tuning..."

cat >> /etc/sysctl.conf << EOF

# =============================================================================
# SolarCRM System Tuning
# =============================================================================
# Increase max file descriptors for Docker containers
fs.file-max = 65535

# Network tuning for a web server
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 1024
net.ipv4.ip_local_port_range = 10000 65535

# Reduce TIME_WAIT sockets
net.ipv4.tcp_tw_reuse = 1

# Enable SYN flood protection
net.ipv4.tcp_syncookies = 1

# Disable IPv6 if not needed (reduces attack surface)
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
EOF

sysctl -p > /dev/null 2>&1

log "System tuning applied"

# =============================================================================
# 11. SWAP (for 4GB VPS)
# =============================================================================
if [ ! -f /swapfile ]; then
    log "Creating 2GB swap file..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Reduce swappiness — prefer RAM over swap
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl -p > /dev/null 2>&1
    log "2GB swap created (swappiness=10)"
else
    warn "Swap already exists, skipping"
fi

# =============================================================================
# DONE
# =============================================================================

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ VPS SETUP COMPLETE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  SSH Port:      $SSH_PORT"
echo "  Deploy User:   $DEPLOY_USER"
echo "  Project Dir:   $PROJECT_DIR"
echo "  Docker:        $(docker --version 2>/dev/null || echo 'N/A')"
echo ""
echo "  ⚠️  IMPORTANT NEXT STEPS:"
echo "  1. Test SSH login: ssh -p $SSH_PORT $DEPLOY_USER@$(hostname -I | awk '{print $1}')"
echo "  2. Copy your project files to $PROJECT_DIR"
echo "  3. Create .env from .env.example"
echo "  4. Generate SSL certificates"
echo "  5. Run: cd $PROJECT_DIR && docker compose up -d"
echo ""
echo "  🔒 Security:"
echo "  - SSH is key-only on port $SSH_PORT"
echo "  - UFW allows only ports: $SSH_PORT, 80, 443"
echo "  - Fail2Ban is active"
echo "  - 2GB swap created for stability"
echo ""
echo "════════════════════════════════════════════════════════════════"
