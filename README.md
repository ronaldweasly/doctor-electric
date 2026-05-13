# SolarCRM - Full-Stack Solar Installation CRM

A powerful CRM tailored for Solar Installation companies, built with React, Tailwind CSS, Node.js backend, and PostgreSQL database.

## ✨ Features

- 🔐 **Role-based Access Control** (Admin, Sales, Engineer, Accountant)
- 🔑 **Google OAuth Integration**
- 📊 **Dashboard with Pipeline Analytics** & Recharts
- 📄 **PDF Generation** with jsPDF
- 📈 **Excel/CSV Export** with SheetJS
- 🔔 **In-App Notifications** for Overdue Payments and Stale Pipeline stages
- 🗄️ **PostgreSQL Database** (self-hosted or managed)
- 📱 **Mobile Responsive** design with Tailwind CSS
- 🚀 **Docker-based** deployment

---

## 🚀 Quick Start

### 🖥️ **For Production (Linux Server)**

**One-command deployment on Ubuntu 22.04+:**

```bash
curl -sSL https://raw.githubusercontent.com/yourusername/solarcrm/main/deploy.sh | sudo bash
```

👉 **See [DEPLOYMENT.md](DEPLOYMENT.md) for full production guide**

### 💻 **For Local Development**

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start dev server
npm run dev
```

The app starts at `http://localhost:3000`

---

## 📋 First-Time Setup

### 1. Environment Configuration

Copy the template and fill in your values:

```bash
cp .env.example .env
```

**For Development (quickest):**
```env
VITE_USE_MOCK="true"        # Use built-in sample data
APP_URL="http://localhost:3000"
```

**For Production:**
```env
VITE_USE_MOCK="false"
VITE_SPREADSHEET_ID="your_google_sheets_id"
POSTGRES_PASSWORD="strong_password_here"
APP_URL="https://yourdomain.com"
```

### 2. Database Setup (Production Only)

If using Google Sheets (recommended for quick setup):
```bash
# Create 9 sheets with exact names:
# Clients, WorkflowStatus, Surveys, Quotations, Installations, 
# Subsidies, Payments, Documents, Users
```

If using PostgreSQL (comes with Docker deployment):
- Already configured in docker-compose.yml
- Auto-migrated on startup

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS + Vite |
| **Backend** | Node.js 18+ + Express.js |
| **Database** | PostgreSQL 16 |
| **Server** | Nginx (reverse proxy) |
| **Infrastructure** | Docker & Docker Compose |
| **Auth** | Google OAuth 2.0 |
| **File Storage** | Cloudflare R2 (optional) |

---

## 🔧 Development

### Commands

```bash
# Install dependencies
npm install

# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run lint
```

### Backend Development

```bash
cd infrastructure/backend

npm install
npm run dev          # Watch mode with tsx
npm run build        # Compile TypeScript
npm run db:migrate   # Run migrations
```

---

## 🐳 Docker Deployment

Deploy the full stack with Docker Compose:

```bash
cd infrastructure

# Build images (first time)
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

Services include:
- **Frontend** (Nginx static + reverse proxy)
- **Backend API** (Node.js/Express)
- **PostgreSQL** (database)
- **Uptime Kuma** (monitoring)

---

## 🆘 Troubleshooting

### App Won't Start?

```bash
# Check environment variables
cat .env

# Verify mock data mode is enabled for dev
grep "VITE_USE_MOCK" .env

# Clear and reinstall
rm -rf node_modules
npm install
npm run dev
```

### On Linux Server?

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for production troubleshooting

---

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[OAUTH_SETUP.md](OAUTH_SETUP.md)** - Google OAuth configuration
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Backend API reference
- **[MOBILE_DEV_GUIDE.md](MOBILE_DEV_GUIDE.md)** - Mobile optimization tips

---

## 🔒 Security

Production deployments include:
- ✅ Firewall (UFW) with automatic setup
- ✅ Fail2Ban for intrusion prevention
- ✅ HTTPS/SSL support (bring your own certificate)
- ✅ Database encryption at rest
- ✅ Rate limiting on API endpoints
- ✅ CORS protection

---

## 📊 Monitoring

**Uptime Kuma** monitoring dashboard available at:
```
http://your-server:3001
```

Monitors:
- All services health
- Endpoint availability
- Response times
- Automatic alerts via Telegram/Email/Discord

---

## 💬 Support & Contributing

- **Issues?** Check [DEPLOYMENT.md](DEPLOYMENT.md)
- **Questions?** See README in `infrastructure/`
- **Bug reports?** Open an issue on GitHub

**Ready to deploy?** 👉 [DEPLOYMENT.md](DEPLOYMENT.md)
