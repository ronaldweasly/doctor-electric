# ⚡ Supabase Setup Guide for Solar CRM

Follow these simple steps to get your Supabase backend fully connected.

---

## 1. Create your Supabase Project
1.  Go to [Supabase.com](https://supabase.com/) and sign in.
2.  Click **New Project** and select your organization.
3.  Name it `Solar CRM`, set a database password, and click **Create new project**.
4.  Wait a few minutes for the project to provision.

## 2. Get your API Keys
1.  Once the project is ready, go to **Project Settings** (gear icon) -> **API**.
2.  Copy the **Project URL**.
3.  Copy the **`anon` public API Key**.
4.  Open your `.env` file in the project and paste them:
    ```env
    VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
    VITE_SUPABASE_ANON_KEY="your-anon-key-here"
    ```

## 3. Enable Google Login
1.  In Supabase, go to **Authentication** (person icon) -> **Providers**.
2.  Find **Google** and click to expand.
3.  Toggle **Enable Google Provider** to **ON**.
4.  You will need a **Client ID** and **Client Secret** from Google Cloud Console (see Step 4 below).
5.  **CRITICAL**: Copy the **Redirect URL** shown in the Supabase Google settings (it looks like `https://xxx.supabase.co/auth/v1/callback`). You'll need this for Google.

## 4. Google Cloud Console Configuration
1.  Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Create or select your project.
3.  Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
4.  Choose **Web application**.
5.  **Authorized JavaScript origins**: `http://localhost:3001`
6.  **Authorized redirect URIs**: Paste the **Redirect URL** you copied from Supabase in Step 3.
7.  Click **Create**, then copy your **Client ID** and **Client Secret** back into the Supabase Google Provider settings.

## 5. Add App Redirect URL in Supabase
1.  In Supabase, go to **Authentication** -> **URL Configuration**.
2.  In **Site URL**, put: `http://localhost:3001`
3.  In **Redirect URLs**, add: `http://localhost:3001/auth/callback`
    *(Note: We use port 3001 because 3000 is often busy on your machine).*

## 6. Create your first User (Optional)
If you want to log in with email/password instead of Google:
1.  In Supabase, go to **Authentication** -> **Users**.
2.  Click **Add User** -> **Create new user**.
3.  Enter `admin@solar.com` and a password.
4.  You can now log in using the email form in the app!

---

**Done!** Your app should now be able to authenticate users via Google or Email.
