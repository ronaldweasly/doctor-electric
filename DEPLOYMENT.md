# SolarCRM - Linux Deployment Guide

> Deploy the full SolarCRM stack on Ubuntu 22.04+ with **one command**.

## 🚀 One-Command Deployment

### On a Fresh Ubuntu 22.04+ Server:

```bash
curl -sSL https://raw.githubusercontent.com/yourusername/solarcrm/main/deploy.sh | sudo bash
```

**Or locally:**

```bash
sudo bash deploy.sh
```

That's it! The script will:
- ✅ Install Docker & Docker Compose
- ✅ Create deploy user (`deploy`)
- ✅ Clone the repository
- ✅ Build all services
- ✅ Start the full stack
- ✅ Configure firewall & security
- ✅ Setup auto-backups

---

## 📋 What You Need Before Deploying

### 1. **A Linux Server**
- **OS:** Ubuntu 22.04 LTS or newer
- **Minimum:** 2GB RAM, 1 vCPU (recommended: 4GB RAM, 2 vCPU)
- **Storage:** 20GB for app + database
- **Network:** Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. **A Domain Name** (Optional but Recommended)
- For production: Point your domain to the server IP
- For local dev: Use `http://localhost`

### 3. **SSH Access**
- Root access or passwordless sudo
- SSH key configured (recommended)

---

## ⚙️ Post-Deployment Configuration

After running the deploy script:

### 1. **Edit Environment Variables**

```bash
sudo nano /opt/solarcrm/.env
```

**Required fields to configure:**

```env
# 🔐 Database password (auto-generated, but change if needed)
POSTGRES_PASSWORD="your_secure_password_here"

# 📊 Data source (pick one)
# Option A: Use mock data (development/testing)
VITE_USE_MOCK="true"

# Option B: Use real Google Sheets (production)
VITE_USE_MOCK="false"
VITE_SPREADSHEET_ID="paste_your_spreadsheet_id_here"

# 🌐 Your domain
APP_URL="https://yourdomain.com"
VITE_API_URL="https://yourdomain.com/api"
```

### 2. **Restart Services After Changes**

```bash
cd /opt/solarcrm
docker-compose restart
```

Monitor startup:
```bash
docker-compose logs -f
```

---

## 🔍 Verify Deployment

### Check All Services Are Running

```bash
cd /opt/solarcrm
docker-compose ps
```

Expected output:
```
CONTAINER ID   STATUS              PORTS
xxx            Up 2 minutes        80->80/tcp
xxx            Up 2 minutes        443->443/tcp
xxx            Up 2 minutes (healthy)
xxx            Up 2 minutes (healthy)
```

### Test API Endpoint

```bash
curl http://localhost/api/health
```

Should return:
```json
{"status":"ok"}
```

### View Real-Time Logs

```bash
docker-compose logs -f backend
```

---

## 📦 Services Running

| Service | Port | Purpose |
|---------|------|---------|
| **Nginx** | 80/443 | Reverse proxy + static frontend |
| **Backend API** | 4000 | Node.js/Express API |
| **PostgreSQL** | (internal) | Database (not exposed) |
| **Uptime Kuma** | 3001 (local) | Monitoring dashboard |

---

## 🔄 Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
docker-compose restart postgres
```

### Rebuild & Redeploy

```bash
cd /opt/solarcrm
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Access Database Directly

```bash
docker exec -it solarcrm-postgres psql -U solarcrm_user -d solarcrm
```

### Backup Database

```bash
docker exec solarcrm-postgres pg_dump -U solarcrm_user solarcrm > backup.sql
```

### Restore Database

```bash
docker exec -i solarcrm-postgres psql -U solarcrm_user solarcrm < backup.sql
```

---

## 🔐 Security Tips

### 1. **Use HTTPS** (Highly Recommended)
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx/ssl path in docker-compose.yml
```

### 2. **Change SSH Port** (Optional)
Edit `deploy.sh` before running:
```bash
SSH_PORT=2222  # Change from default 22
```

### 3. **Monitor System Health**
```bash
# View dashboard (local only)
ssh -L 3001:localhost:3001 deploy@your-server

# Then visit http://localhost:3001
```

### 4. **Check Firewall Status**
```bash
sudo ufw status
```

---

## 🆘 Troubleshooting

### Services Won't Start

1. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

2. **Verify .env file:**
   ```bash
   cat /opt/solarcrm/.env
   ```

3. **Restart everything:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker exec solarcrm-postgres pg_isready

# View postgres logs
docker-compose logs postgres
```

### High Memory/CPU Usage

```bash
# Check resource usage
docker stats

# Check which processes are using resources
docker top solarcrm-backend
docker top solarcrm-postgres
```

### Want to Rollback?

```bash
# Restore previous version (saved in .deploy-previous-sha)
cd /opt/solarcrm
git checkout $(cat .deploy-previous-sha)
docker-compose rebuild
docker-compose up -d
```

---

## 📈 Scaling & Performance

### For 100+ Users:

1. **Increase resources:**
   ```yaml
   # Edit docker-compose.yml
   backend:
     deploy:
       resources:
         limits:
           memory: 1024M  # Increase from 512M
           cpus: "1.0"    # Increase from 0.50
   ```

2. **Add Redis caching:**
   ```bash
   # Uncomment Redis in docker-compose.yml
   # Update backend to use Redis
   ```

3. **Use managed PostgreSQL:**
   ```bash
   # Update DATABASE_URL to external Postgres
   docker-compose.yml: set external DB URL
   ```

---

## 📞 Support

- **Issues?** Check logs: `docker-compose logs -f`
- **Need help?** See README.md for feature docs
- **Bug report?** Create an issue on GitHub

---

## 🎯 Next Steps

1. ✅ Deploy with one command
2. ✅ Configure environment variables
3. ✅ Point your domain to the server
4. ✅ Setup HTTPS/SSL certificates
5. ✅ Configure backups & monitoring
6. ✅ Train your team

**Happy deploying! 🚀**
