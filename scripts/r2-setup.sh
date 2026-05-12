#!/bin/bash
# Cloudflare R2 Setup Quick Reference
# For: SolarCRM - Doctor Electric

echo "🚀 Cloudflare R2 File Storage Setup"
echo "===================================="
echo ""

# Step 1: Check environment
echo "Step 1: Setting up environment variables..."
echo "Files to edit:"
echo "  • .env (frontend config)"
echo "  • infrastructure/backend/.env (backend config)"
echo ""

# Step 2: Get credentials
echo "Step 2: Get Cloudflare R2 credentials:"
echo "  1. Go to https://dash.cloudflare.com"
echo "  2. Create R2 bucket: 'solarcrm-files'"
echo "  3. Generate API token (R2 Edit permissions)"
echo "  4. Copy: Account ID, Access Key ID, Secret Access Key"
echo ""

# Step 3: Configure frontend
echo "Step 3: Update .env (your root directory):"
cat << 'EOF'
VITE_R2_ACCOUNT_ID="your-account-id-here"
VITE_R2_ACCESS_KEY_ID="your-access-key-id-here"
VITE_R2_ACCESS_KEY_SECRET="your-secret-access-key-here"
VITE_R2_BUCKET_NAME="solarcrm-files"
VITE_R2_BUCKET_URL="https://solarcrm-files.r2.cloudflarestorage.com"
VITE_API_URL="http://localhost:4000/api"
EOF
echo ""

# Step 4: Configure backend
echo "Step 4: Update infrastructure/backend/.env:"
cat << 'EOF'
R2_ACCOUNT_ID="your-account-id-here"
R2_ACCESS_KEY_ID="your-access-key-id-here"
R2_SECRET_ACCESS_KEY="your-secret-access-key-here"
R2_BUCKET_NAME="solarcrm-files"
R2_PUBLIC_URL="https://solarcrm-files.r2.cloudflarestorage.com"
EOF
echo ""

# Step 5: Start services
echo "Step 5: Start the app:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd infrastructure/backend"
echo "  npm install  # if first time"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm install  # if first time"
echo "  npm run dev"
echo ""

# Step 6: Test
echo "Step 6: Test file uploads:"
echo "  1. Open http://localhost:3001/clients"
echo "  2. Click '+ Add Client'"
echo "  3. Upload a file (Aadhaar, bill, etc.)"
echo "  4. Check Cloudflare Dashboard → R2 → solarcrm-files"
echo "  5. File should appear there ✅"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "📚 For detailed info, see:"
echo "   • R2_SETUP.md (full guide)"
echo "   • R2_MIGRATION_SUMMARY.md (what changed)"
