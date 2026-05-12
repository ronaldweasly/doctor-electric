# Cloudflare R2 Storage Setup

This CRM app uses **Cloudflare R2** for file storage (documents, photos, PDFs). R2 is Cloudflare's S3-compatible object storage with **zero egress fees**, making it ideal for cost-effective, distributed file storage.

## Quick Setup (5 minutes)

### 1. Create a Cloudflare Account
- Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
- Sign up or log in

### 2. Create an R2 Bucket
- In Cloudflare Dashboard, find **R2** in the left sidebar
- Click **Create bucket**
- Name: `solarcrm-files` (or your preferred name)
- Region: Select the region closest to your users
- Click **Create bucket**

### 3. Generate API Credentials
- Go to **My Profile** → **API Tokens**
- Click **Create Token**
- Select **Permissions**: Choose template **"Edit Cloudflare R2"**
  - Or manually select: **R2 → Edit → Account** scope
- **Include → Specific Buckets** and select your bucket
- Click **Create Token**

You'll see:
```
Access Key ID: xxxxxxxxxxxxxxxxxxxxxxx
Secret Access Key: xxxxxxxxxxxxxxxxxxxxxxx
```

**Save these securely!**

### 4. Get Your Account ID
- Dashboard → **R2** → Under "R2 API Token", you'll see your **Account ID**
- Format: `abc123def456`

### 5. Configure Environment Variables

#### Frontend (.env or infrastructure/.env)
```env
VITE_R2_ACCOUNT_ID="your-account-id"
VITE_R2_ACCESS_KEY_ID="your-access-key-id"
VITE_R2_ACCESS_KEY_SECRET="your-secret-access-key"
VITE_R2_BUCKET_NAME="solarcrm-files"
VITE_R2_BUCKET_URL="https://solarcrm-files.r2.cloudflarestorage.com"
VITE_API_URL="http://localhost:4000/api"  # or your production API URL
```

#### Backend (infrastructure/backend/.env)
```env
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="solarcrm-files"
R2_PUBLIC_URL="https://solarcrm-files.r2.cloudflarestorage.com"
```

### 6. Verify Setup
- Start the backend: `cd infrastructure/backend && npm run dev`
- Start the frontend: `npm run dev`
- Navigate to `/clients` and try uploading a file
- Check the R2 bucket in Cloudflare Dashboard - file should appear

---

## How It Works

### Upload Flow
1. **Frontend** requests presigned URL from backend
2. **Backend** generates secure, time-limited upload URL (expires in 1 hour)
3. **Frontend** uploads file directly to R2 using presigned URL
4. **R2** returns public URL for accessing the file

### Why This Approach?
- ✅ **No bandwidth overhead** on backend (file goes directly to R2)
- ✅ **Secure** - presigned URLs are time-limited and path-specific
- ✅ **Fast** - file uploads directly to Cloudflare's network
- ✅ **Scalable** - R2 handles storage, no VPS disk space used
- ✅ **Free egress** - unique to Cloudflare R2

---

## Accessing Stored Files

### Public Files
Files uploaded to R2 are stored at:
```
https://solarcrm-files.r2.cloudflarestorage.com/documents/[timestamp]_[random].[ext]
```

These URLs are returned after each upload and stored in the database.

### Private Files
For sensitive documents, use the `/api/uploads/download/:folder/:fileId` endpoint which requires authentication.

---

## Troubleshooting

### "Failed to upload file"
- Check that `VITE_API_URL` points to your backend API
- Verify R2 credentials in `.env`
- Check backend is running on the configured port

### Files don't appear in R2
- Verify bucket name is correct: `solarcrm-files`
- Check credentials have **"Edit"** permissions
- Ensure bucket was created in the correct Region

### "401 Unauthorized"
- Credentials are expired or invalid
- Try regenerating API token in Cloudflare Dashboard
- Ensure secret access key is copied correctly (no extra spaces)

### "Upload successful but file not accessible"
- Check that `R2_PUBLIC_URL` in backend matches your bucket domain
- Verify bucket allows public access (if using public URLs)
- Check browser cache: hard refresh (Ctrl+Shift+R)

---

## Production Deployment

### Environment Variables
Set these in your production hosting (Vercel, Docker, etc.):
```env
VITE_R2_ACCOUNT_ID=...
VITE_R2_ACCESS_KEY_ID=...
VITE_R2_ACCESS_KEY_SECRET=...
VITE_R2_BUCKET_NAME=...
VITE_R2_BUCKET_URL=...
VITE_API_URL=https://your-api-domain.com/api
```

### Custom Domain (Optional)
To serve files from your own domain instead of `r2.cloudflarestorage.com`:
1. Cloudflare Dashboard → **R2** → Bucket Settings
2. Under "Public access", enable **Custom Domain**
3. Add your domain: `files.yourdomain.com`
4. Update `R2_PUBLIC_URL` and `VITE_R2_BUCKET_URL` to your custom domain

---

## Costs

**Cloudflare R2 Pricing** (as of 2024):
- Storage: $0.015/GB/month
- Requests: $0.36/million requests
- **Egress: FREE** (unlike AWS S3)

For a typical CRM:
- 100GB files + 1M requests/month ≈ **$1.50/month**
- Same on AWS S3 would be ≈ $30/month (with egress fees)

---

## Removing Old Storage

If migrating from Supabase Storage:
1. Export all files from Supabase
2. Upload to R2 manually or via script
3. Update database to point URLs to new R2 locations
4. Delete Supabase storage bucket

See [migration guide](./MIGRATION.md) for details.

---

## Security Best Practices

✅ **Do**:
- Rotate API tokens regularly (every 3-6 months)
- Use separate credentials for prod/staging
- Store secrets in secure vaults (Docker secrets, Vercel secrets, etc.)
- Enable bucket versioning (Cloudflare R2 Settings)

❌ **Don't**:
- Commit `.env` files to git
- Share API credentials via email or chat
- Use overly permissive token scopes
- Disable HTTPS on public files

---

For more help, visit:
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for S3 (R2 compatible)](https://docs.aws.amazon.com/sdk-for-javascript/latest/)
