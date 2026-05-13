# SolarCRM - Quick Start Guide

**Deploy in less than 5 minutes on your Linux server!**

---

## 🚀 One Command to Deploy

Run this on your Ubuntu 22.04+ server:

```bash
curl -sSL https://raw.githubusercontent.com/yourusername/solarcrm/main/deploy.sh | sudo bash
```

**Done!** That's literally it. The script handles:
- ✅ System setup (Docker, firewall, etc.)
- ✅ Project clone
- ✅ Dependencies installation
- ✅ Database initialization  
- ✅ Service startup
- ✅ Security hardening

The entire server is ready to run your app.

---

## ⚙️ 5-Minute Configuration

After deployment, configure your environment:

```bash
# Edit environment variables
sudo nano /opt/solarcrm/.env
```

### Minimal Setup (for testing)
Just set:
```env
POSTGRES_PASSWORD="any_password_here"
APP_URL="http://your.domain.com"
```

### Production Setup (with real data)
```env
POSTGRES_PASSWORD="strong_password_23_chars_min"
VITE_USE_MOCK="false"
VITE_SPREADSHEET_ID="your_google_sheets_id"
APP_URL="https://your.domain.com"
```

**Then restart:**
```bash
cd /opt/solarcrm/infrastructure
docker-compose restart
```

---

## 🔍 Verify It's Working

### Check Services
```bash
cd /opt/solarcrm/infrastructure
docker-compose ps
```

All should say `Up` ✅

### Test API
```bash
curl http://localhost/api/health
```

Should return:
```json
{"status":"ok"}
```

### View the App
```
http://your.domain.com
```

---

## 📊 Useful Commands

### View Logs
```bash
cd /opt/solarcrm/infrastructure
docker-compose logs -f          # All services
docker-compose logs -f backend  # Just backend
```

### Manage Services
```bash
cd /opt/solarcrm/infrastructure

# Restart everything
docker-compose restart

# Rebuild and restart (after code changes)
docker-compose build --no-cache
docker-compose up -d
```

### Backup Database
```bash
docker exec solarcrm-postgres pg_dump -U solarcrm_user solarcrm > backup.sql
```

### Access Database
```bash
docker exec -it solarcrm-postgres psql -U solarcrm_user -d solarcrm
```

---

## 🆘 Troubleshooting

### Services won't start?
```bash
# Check logs first
docker-compose logs -f

# Check if Docker is running
docker ps
```

### 502 Bad Gateway?
Services might still be starting. Wait 30 seconds and refresh.

### Database connection error?
```bash
# Verify database is running
docker exec solarcrm-postgres pg_isready

# Check environment variables
cat /opt/solarcrm/.env | grep POSTGRES
```

### Need to SSH to your server later?
```bash
ssh deploy@your.domain.com
# Then:
cd /opt/solarcrm
```

---

## 📱 Available Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://your.domain.com | Your CRM app |
| **API** | http://your.domain.com/api/health | Backend health |
| **Database** | (internal) | PostgreSQL internally |
| **Monitor** | http://your.domain.com:3001 | Monitoring (SSH tunnel only) |

---

## 🔐 Security

✅ Firewall automatically configured  
✅ Database not exposed to internet  
✅ Fail2Ban enabled for DDoS protection  
✅ HTTPS ready (add your certificate)  
✅ Regular backups can be automated  

---

## 📚 Next Steps

1. **Deploy:** `curl -sSL ... | sudo bash`
2. **Configure:** Edit `/opt/solarcrm/.env`
3. **Verify:** Visit `http://your.domain.com`
4. **Add Users:** Configure in your data source
5. **Enable HTTPS:** Get cert from Let's Encrypt

---

## 💡 Advanced Usage

### Use the management script
```bash
cd /opt/solarcrm

# View all available commands
./manage.sh help

# Examples:
./manage.sh logs backend
./manage.sh shell db
./manage.sh backup
./manage.sh update
```

### Update SolarCRM
```bash
cd /opt/solarcrm
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Scale for more users
Edit memory limits in `infrastructure/docker-compose.yml`:
```yaml
backend:
  deploy:
    resources:
      limits:
        memory: 1024M  # Increase from 512M
```

---

## ❓ Need Help?

- **Documentation:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Requirements:** See [REQUIREMENTS.md](REQUIREMENTS.md)
- **Development:** See [README.md](README.md)
- **Issues:** Check logs: `docker-compose logs -f`

---

## 🎉 You're Ready!

Your SolarCRM instance is now running. 

👉 Open `http://your.domain.com` and get to work!

**Questions?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive guide.
