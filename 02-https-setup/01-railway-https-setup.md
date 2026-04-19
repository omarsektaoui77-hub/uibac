# Step 1: Railway HTTPS Setup

## Overview
Railway provides free HTTPS certificates for all deployments. Your backend already has HTTPS available - you just need to use the HTTPS URL instead of HTTP.

## Current Backend URL
- HTTP: `http://roundhouse.proxy.rlwy.net:39487`
- HTTPS: `https://roundhouse.proxy.rlwy.net:39487` (already available!)

## Step-by-Step Instructions

### 1. Verify HTTPS is Available

#### PowerShell Command:
```powershell
# Test HTTPS backend
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing
```

**Expected Result:**
- If backend is running: Returns response (200 or 404 - both mean HTTPS works)
- If backend is down: Connection timeout

### 2. Get Your Railway HTTPS URL

#### Option A: Use Railway Dashboard
1. Go to https://railway.app
2. Select your project
3. Click on your backend service
4. Copy the HTTPS URL from the "Domains" section

#### Option B: Use PowerShell
```powershell
# Your Railway HTTPS URL is:
# https://roundhouse.proxy.rlwy.net:39487
# (Just change http:// to https://)
```

### 3. Configure Custom Domain (Optional)

Railway provides a `.railway.app` domain for free. If you want a custom domain:

#### Step A: Add Custom Domain in Railway
1. Go to Railway dashboard
2. Select your project
3. Click "Settings" → "Domains"
4. Click "Add Domain"
5. Enter your domain (e.g., `api.yourdomain.com`)
6. Railway will provide DNS records

#### Step B: Configure DNS
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add CNAME record:
   - Name: `api`
   - Value: `your-project-name.railway.app`
   - TTL: 3600

#### Step C: Wait for SSL Certificate
Railway automatically provisions SSL certificate. This takes 5-10 minutes.

### 4. Update Environment Variables

#### In Vercel Dashboard:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Find `NEXT_PUBLIC_API_URL`
3. Update value from:
   ```
   http://roundhouse.proxy.rlwy.net:39487
   ```
   To:
   ```
   https://roundhouse.proxy.rlwy.net:39487
   ```
4. Select "Production" and "Preview" environments
5. Click "Save"

#### In vercel.json:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "https://roundhouse.proxy.rlwy.net:39487"
  }
}
```

### 5. Update Local .env.local

#### PowerShell Command:
```powershell
Set-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "NEXT_PUBLIC_API_URL=https://roundhouse.proxy.rlwy.net:39487"
```

### 6. Redeploy to Apply Changes

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Deploy to preview first (test)
vercel --yes

# If preview works, deploy to production
vercel --prod --yes
```

## Verification

### Test HTTPS Backend from PowerShell:
```powershell
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing
```

### Test from Browser Console:
```javascript
fetch('https://roundhouse.proxy.rlwy.net:39487')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err.message));
```

**Expected Result:**
- No mixed-content errors
- Status 200 or 404 (both mean HTTPS is working)

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - HTTPS is free on Railway

## Next Steps
- Configure CORS (see `02-cors-configuration.md`)
- Update Vercel frontend (see `03-vercel-frontend-config.md`)
