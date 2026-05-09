# SolarCRM Production Infrastructure

This directory contains the complete, production-ready architecture for SolarCRM, designed for an Ubuntu 22.04 LTS VPS.

## Architecture Overview

- **Nginx**: Edge proxy, SSL termination (via Cloudflare), rate limiting, and static file serving.
- **Frontend (Vite/React)**: Compiled to static files during deployment and served directly by Nginx (no Node.js overhead).
- **Backend API (Node.js/Express)**: Secure API layer managing database connections and business logic.
- **PostgreSQL**: Self-hosted, private database optimized for a 4GB VPS.
- **Cloudflare R2**: S3-compatible, zero-egress object storage for uploads.
- **Uptime Kuma**: Self-hosted monitoring dashboard.

---

## Complete Deployment Walkthrough

Follow these exact steps to go from a fresh Ubuntu 22.04 VPS to a live production deployment.

### Phase 1: Cloudflare Setup (Prerequisite)
1. Add your domain (e.g., `yourdomain.com`) to Cloudflare.
2. Go to **DNS** and add an A record for `crm.yourdomain.com` pointing to your VPS IP address. Ensure the proxy status is **Proxied (Orange Cloud)**.
3. Go to **SSL/TLS -> Overview** and set encryption mode to **Full (Strict)**.
4. Go to **SSL/TLS -> Origin Server** and click "Create Certificate". Leave defaults, click Create.
5. Save the Origin Certificate and Private Key (you will need them in Phase 4).
6. Go to **R2 Object Storage** and create a bucket named `solarcrm-files`.
7. Click "Manage R2 API Tokens" and create a token with "Object Read & Write" permissions. Save the credentials.

### Phase 2: VPS Provisioning & Security Hardening
1. Provision an Ubuntu 22.04 LTS VPS (Minimum specs: 2 vCPU, 4GB RAM, 40GB SSD). Providers: Hetzner, Hostinger, DigitalOcean, or AWS EC2.
2. SSH into your server as root: `ssh root@<your-vps-ip>`
3. Clone or copy your project repository to `/opt/solarcrm`
4. Run the setup script:
   ```bash
   sudo bash /opt/solarcrm/infrastructure/scripts/setup-server.sh
   ```
   *This script creates a `deploy` user, hardens SSH, installs Docker, configures the UFW firewall, Fail2Ban, log rotation, and adds a 2GB swap file.*
5. **IMPORTANT:** Log out of the root session.
6. Log back in using the new deploy user and the custom SSH port:
   ```bash
   ssh -p 2222 deploy@<your-vps-ip>
   ```

### Phase 3: Environment Configuration
1. Navigate to the project directory:
   ```bash
   cd /opt/solarcrm
   ```
2. Copy the environment variable template:
   ```bash
   cp infrastructure/.env.example .env
   ```
3. Edit the `.env` file and fill in all values marked with `CHANGEME`:
   ```bash
   nano .env
   ```
   *Generate secure random secrets using: `openssl rand -base64 32` or `openssl rand -hex 64`*

### Phase 4: SSL Certificates
1. Create the SSL directory if it doesn't exist:
   ```bash
   mkdir -p infrastructure/nginx/ssl
   ```
2. Create the origin certificate file:
   ```bash
   nano infrastructure/nginx/ssl/origin.pem
   ```
   *Paste the Cloudflare Origin Certificate.*
3. Create the private key file:
   ```bash
   nano infrastructure/nginx/ssl/origin-key.pem
   ```
   *Paste the Cloudflare Private Key.*
4. Secure the files:
   ```bash
   chmod 600 infrastructure/nginx/ssl/*
   ```

### Phase 5: Initial Deployment
1. Pull the Docker images and build the custom containers:
   ```bash
   cd /opt/solarcrm/infrastructure
   docker compose build
   ```
2. Start the services:
   ```bash
   docker compose up -d
   ```
3. Check the status:
   ```bash
   docker compose ps
   ```
   *All containers should show "Up" and become "healthy" within 30 seconds.*

### Phase 6: Database Initialization
1. The database schema needs to be created. Run the migration script inside the backend container:
   ```bash
   docker exec -it solarcrm-backend npm run db:migrate
   ```
   *This creates all tables, indexes, and triggers, and inserts a default admin user.*
2. **Default Admin Login:**
   - Email: `admin@solarcrm.com`
   - Password: `Admin@123`
   - **IMPORTANT:** Log into the web interface immediately and change this password!

### Phase 7: Automated CI/CD (Optional but Recommended)
1. In your GitHub repository, go to **Settings -> Secrets and variables -> Actions**.
2. Add the following Repository Secrets:
   - `VPS_HOST`: Your server IP address
   - `VPS_USER`: `deploy`
   - `VPS_SSH_KEY`: The private SSH key used to log in as the deploy user
   - `VPS_SSH_PORT`: `2222`
3. Push code to the `main` branch. GitHub Actions will automatically validate, build, and deploy to your VPS with near-zero downtime.

---

## Maintenance & Operations

### Viewing Logs
View all logs:
```bash
docker compose logs -f
```
View backend logs only:
```bash
docker compose logs -f backend
```

### Backups
Backups run automatically every day at 2:00 AM via cron. To trigger a backup manually:
```bash
bash /opt/solarcrm/infrastructure/scripts/backup.sh
```

### Restoring a Backup
To view available backups and restore:
```bash
bash /opt/solarcrm/infrastructure/scripts/restore.sh
bash /opt/solarcrm/infrastructure/scripts/restore.sh latest
```

### Monitoring
Uptime Kuma is running at `https://crm.yourdomain.com/status/`. Access it to configure alerts (Telegram, Discord, Email, Slack) for when your services go down or CPU/Memory usage spikes.
