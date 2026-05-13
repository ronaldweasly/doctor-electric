# SolarCRM - Requirements & System Specifications

## System Requirements

### Development Machine
- **OS:** macOS, Linux, or Windows (with WSL2)
- **Node.js:** 18.0 or newer
- **npm:** 9.0 or newer
- **Git:** Latest version
- **RAM:** 4GB minimum
- **Storage:** 5GB free space

### Production Server
- **OS:** Ubuntu 22.04 LTS or newer (highly recommended)
- **RAM:** 2GB minimum / 4GB recommended
- **vCPU:** 1-2 cores minimum
- **Storage:** 20GB minimum
- **Network:** Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **Docker:** Installed via deploy script

---

## Dependencies

### Frontend (React)
- React 19
- TypeScript 5.8
- Tailwind CSS 4.1
- Vite 6.2
- React Router 7.15
- @hookform/resolvers 5.2
- Recharts 3.8
- jsPDF 4.2 (PDF generation)
- XLSX 0.18 (Excel export)
- Lucide React (icons)

### Backend (Node.js)
- Express 4.21
- PostgreSQL client (pg 8.13)
- JWT (jsonwebtoken 9.0)
- bcryptjs (2.4.3)
- AWS SDK for R2 (S3-compatible)
- Helmet (security headers)
- CORS enabled
- Rate limiting

### Infrastructure
- Docker 24+
- Docker Compose 2.0+
- Nginx 1.27 (Alpine)
- PostgreSQL 16 (Alpine)
- Node 20 (Alpine)

### Optional Services
- Cloudflare R2 (file storage)
- Google OAuth (authentication)
- Google Sheets API (data backend)
- Gemini API (AI features)
- Supabase (auth/realtime)
- Uptime Kuma (monitoring)

---

## Installation Requirements

### For Development

```bash
# Unix/Linux/macOS
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g npm@latest
```

### For Production (Automated)

Just run:
```bash
curl -sSL https://raw.githubusercontent.com/yourusername/solarcrm/main/deploy.sh | sudo bash
```

The script handles:
- Ubuntu system updates
- Docker installation
- Docker Compose setup
- User creation
- Security hardening
- Firewall configuration

---

## Network Requirements

### Ports Used

| Service | Port | Type | Access |
|---------|------|------|--------|
| SSH | 22 | TCP | External (security: key-only) |
| HTTP | 80 | TCP | External (auto-redirect to 443) |
| HTTPS | 443 | TCP | External (production) |
| Backend | 4000 | TCP | Internal only |
| Database | 5432 | TCP | Internal only |
| Monitoring | 3001 | TCP | Localhost only (SSH tunnel) |

### Firewall Rules (UFW)

```bash
# Automatically configured by deploy script
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
```

---

## Environment Variables

### Minimal Setup (Development)
```env
VITE_USE_MOCK="true"              # Use mock data
APP_URL="http://localhost:3000"
```

### Production Setup
```env
POSTGRES_PASSWORD="YOUR_SECURE_PASSWORD"
VITE_USE_MOCK="false"
VITE_SPREADSHEET_ID="your_id_here"
APP_URL="https://yourdomain.com"
VITE_API_URL="https://yourdomain.com/api"
```

### Optional Configuration
```env
VITE_SUPABASE_URL=""              # For Supabase
VITE_SUPABASE_ANON_KEY=""
VITE_R2_ACCOUNT_ID=""              # For Cloudflare R2
VITE_R2_ACCESS_KEY_ID=""
VITE_R2_ACCESS_KEY_SECRET=""
VITE_R2_BUCKET_NAME=""
VITE_R2_BUCKET_URL=""
GEMINI_API_KEY=""                  # For AI features
VITE_GOOGLE_CLIENT_ID=""           # For Google OAuth
```

---

## Storage Requirements

### Database
- **Initial:** 50MB
- **Per 1,000 clients:** +20MB
- **Backups:** 2x database size (recommended)
- **Example:** 1000 clients = 50MB + 20MB + 40MB backup = 110MB

### File Storage (R2 or Local)
- **Per client/proposal:** 1-5MB average
- **Total capacity:** Based on max expected files × average size
- **Example:** 10,000 files × 2MB = 20GB needed

### Application
- **Frontend build:** 5MB
- **Backend: 200MB
- **Docker images:** 800MB
- **Total node_modules:** 500MB

---

## Performance Specifications

### API Response Times (Target)
- List endpoint: < 500ms
- Details endpoint: < 300ms
- Health check: < 50ms
- File upload: < 2s (varies by file size)

### Database Performance
- Max concurrent connections: 20 (default PostgreSQL)
- Connection pool size: 10-15
- Query timeout: 30s
- Connection timeout: 5s

### Concurrent Users
- **Optimal:** 50 concurrent users
- **Acceptable:** 100+ concurrent (with monitoring)
- **Max safe:** 200 concurrent (recommended server upgrade)

---

## Backup & Disaster Recovery

### Automated Backups (Built-in)
- **Daily database backup** to `/opt/solarcrm/backups/`
- **Retention:** 30 days
- **Size:** 1 backup per day

### Manual Backup
```bash
docker exec solarcrm-postgres pg_dump -U solarcrm_user solarcrm > backup.sql
```

### Restore from Backup
```bash
docker exec -i solarcrm-postgres psql -U solarcrm_user solarcrm < backup.sql
```

---

## Security Checklist

- [ ] OS firewall enabled (UFW)
- [ ] SSH key-based authentication only
- [ ] SSH port changed from 22 (optional)
- [ ] HTTPS/SSL certificate installed
- [ ] Database password 16+ characters
- [ ] Fail2Ban enabled for brute-force protection
- [ ] Regular backups verified
- [ ] Monitoring/alerting configured
- [ ] Docker images updated monthly
- [ ] .env file protected (chmod 600)

---

## Monitoring & Logging

### Logs Located At
- **Application:** `/var/log/solarcrm/`
- **Docker:** `docker-compose logs -f`
- **System:** `/var/log/syslog`
- **Nginx:** `/var/log/nginx/`

### Monitoring Dashboard
- **Uptime Kuma:** http://localhost:3001 (local SSH tunnel)
- **Resource monitoring:** `docker stats`
- **System monitoring:** `htop`

---

## Browser Compatibility

| Browser | Minimum Version | Status |
|---------|-----------------|--------|
| Chrome | 90+ | ✅ Full Support |
| Firefox | 88+ | ✅ Full Support |
| Safari | 14+ | ✅ Full Support |
| Edge | 90+ | ✅ Full Support |
| Mobile (iOS/Android) | Latest | ✅ Full Support |

---

## Compliance & Legal

- GDPR compliant (when using self-hosted PostgreSQL)
- CCPA ready
- No third-party trackers (when self-hosted)
- Data stays on your server (unlike Supabase)
- Backups encrypted in transit

---

## Support & Updates

- **Deployment issues?** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Development setup?** Check [README.md](README.md)
- **API docs?** View [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## Quick Reference: One-Command Deployment

```bash
curl -sSL https://raw.githubusercontent.com/yourusername/solarcrm/main/deploy.sh | sudo bash
```

That's it! Everything else is automated. 🚀
