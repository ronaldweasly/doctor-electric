# Google OAuth 2.0 Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project"
3. Name it "Solar CRM" and click Create
4. Wait for it to initialize

### Step 2: Enable Required APIs
1. In the Console, go to **APIs & Services > Library**
2. Search for and enable:
   - **Google Sheets API** ✓
   - **Google+ API** ✓ (for user info)

### Step 3: Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
5. Authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
6. Click Create
7. **Copy the Client ID** (you'll need this)

### Step 4: Configure Environment Variables
1. Open `.env` in the project root
2. Paste your Client ID into `VITE_GOOGLE_CLIENT_ID`
3. Get your Google Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
4. Paste it into `VITE_SPREADSHEET_ID`
5. Save the file

### Step 5: Configure OAuth Consent Screen (if not using Workspace)
1. In **APIs & Services > OAuth Consent Screen**
2. Choose **External** (for Gmail accounts)
3. Fill required fields:
   - App name: "Solar CRM"
   - User support email: your email
4. Under Scopes, add:
   - `.../auth/spreadsheets`
   - `openid`
   - `email`
   - `profile`
5. Add yourself as a test user
6. Save

## Troubleshooting

### "Invalid Client ID" Error
- ❌ Client ID is missing or incorrect
- ✓ Check `.env` file has `VITE_GOOGLE_CLIENT_ID` set
- ✓ Verify Client ID is from Google Cloud Console
- ✓ Verify origins match (localhost:3000)

### "Failed to fetch user info"
- ❌ OAuth scopes are incorrect
- ✓ Verify Google+ API is enabled
- ✓ Verify scopes include `email` and `profile`
- ✓ Check token is valid

### "Email not found in authorized users"
- ❌ User email doesn't exist in Google Sheet
- ✓ Add your email to `Users` sheet in Google Sheets
- ✓ Set `Role` to `Admin` or `Sales`
- ✓ Set `Active` to `TRUE`

### Token Expired
- ❌ Token is stale or invalid
- ✓ Sign out and sign in again
- ✓ Clear browser localStorage
- ✓ Check browser console for errors

## Debugging

Enable developer tools to see detailed errors:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for error messages starting with:
   - 🔐 (OAuth messages)
   - ❌ (Errors)
   - ⚠️ (Warnings)

## Production Deployment

When deploying:
1. Add production domain to Google Cloud Console credentials
2. Update `APP_URL` in `.env` to production URL
3. Update OAuth origins and redirect URIs in Google Console
4. Use environment-specific `.env` files
5. Never commit real Client IDs to git

## Reference

- [Google Cloud Console](https://console.cloud.google.com/)
- [@react-oauth/google docs](https://www.npmjs.com/package/@react-oauth/google)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
