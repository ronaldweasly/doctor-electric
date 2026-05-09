# DOCTOR ELECTRIC CRM - Full-Stack Solar Installation CRM

A powerful CRM tailored for Solar Installation companies, built with React, Tailwind CSS, and using Google Sheets as a fully-featured backend.

## Features
- Role-based Access Control (Admin, Sales, Engineer, Accountant)
- Google OAuth Integration
- Dashboard with Pipeline Analytics & Recharts
- PDF generation with jsPDF
- Excel/CSV export with SheetJS
- In-App Notifications for Overdue Payments and Stale Pipeline stages

### Setup Instructions

**⏱️ Quick Setup: See [OAUTH_SETUP.md](OAUTH_SETUP.md) for step-by-step instructions (5 minutes)**

### 1. Google Cloud Console Setup
To run this application, you need to set up a Google Cloud Project with the free Sheets API and OAuth 2.0.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a **New Project**.
3. Under **APIs & Services > Library**, search for and enable:
   - **Google Sheets API** ✓
   - **Google+ API** ✓
4. Under **APIs & Services > OAuth consent screen**:
   - Choose **External** (or Internal if you have a Google Workspace)
   - Fill in required fields (App Name, User Support Email).
   - Under Scopes, add:
     - `.../auth/spreadsheets`
     - `email`
     - `profile`
   - Add your Google account under **Test Users**.
5. Under **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Authorized JavaScript origins: `http://localhost:3000` (and your deployed domain).
   - Authorized redirect URIs: `http://localhost:3000` (and your deployed domain).
   - **Copy the Client ID** and save it.

### 2. Google Sheet Setup
Create a new Google Spreadsheet and copy its ID from the URL:
```
https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit
```

Create exactly 9 tabs with these exact names:
1. `Clients`
2. `WorkflowStatus`
3. `Surveys`
4. `Quotations`
5. `Installations`
6. `Subsidies`
7. `Payments`
8. `Documents`
9. `Users`

**Users Sheet Setup (IMPORTANT):**
1. In the `Users` tab, Row 1 headers: `Email`, `Role`, `Name`, `Active`
2. In Row 2+, add your test users:
   - **Email**: Your Gmail account (**must match your OAuth login**)
   - **Role**: `Admin`, `Sales`, `Engineer`, or `Accountant`
   - **Name**: Your full name
   - **Active**: `TRUE`

### 3. Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in the values:

```env
# From Google Cloud Console
VITE_GOOGLE_CLIENT_ID="your_client_id_here"

# From Google Sheets URL
VITE_SPREADSHEET_ID="your_spreadsheet_id_here"

# Optional
VITE_GOOGLE_DOMAIN=""  # For Google Workspace domain restriction
GEMINI_API_KEY=""      # For AI features
APP_URL="http://localhost:3000"
```

### 4. Running the application
```bash
npm install
npm run dev
```

The app will start at `http://localhost:3000`

### Troubleshooting

If you encounter OAuth errors:
- ❌ "Invalid Client ID" → Check your `.env` has the correct `VITE_GOOGLE_CLIENT_ID`
- ❌ "Email not found" → Add your email to the `Users` sheet with `Active = TRUE`
- ❌ "Token expired" → Sign out and sign in again
- ❌ Network errors → Check browser console (F12) for detailed error messages

See [OAUTH_SETUP.md](OAUTH_SETUP.md) for detailed troubleshooting.
