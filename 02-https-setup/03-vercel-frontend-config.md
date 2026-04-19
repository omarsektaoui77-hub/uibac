# Step 3: Vercel Frontend Configuration

## Overview
Update your Vercel frontend to use the HTTPS backend URL and ensure proper configuration for production.

## Step-by-Step Instructions

### 1. Update Environment Variables in Vercel

#### Via Vercel Dashboard (Recommended):
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Find `NEXT_PUBLIC_API_URL`
3. Update value to:
   ```
   https://roundhouse.proxy.rlwy.net:39487
   ```
4. Select both "Production" and "Preview" environments
5. Click "Save"

#### Via PowerShell (verify):
```powershell
# List current environment variables
vercel env ls production
vercel env ls preview
```

### 2. Update vercel.json

#### Current vercel.json:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "http://roundhouse.proxy.rlwy.net:39487"
  }
}
```

#### Updated vercel.json:
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
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://uibac.vercel.app"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

#### PowerShell Command to Update:
```powershell
# Backup current vercel.json
Copy-Item C:\Users\DELL\uibac\vercel.json C:\Users\DELL\uibac\vercel.json.backup

# Update with new configuration
# (Manually edit the file or use the updated version above)
```

### 3. Update Frontend Code to Use HTTPS

#### Example API Call in Next.js:
```javascript
// Before (HTTP)
const response = await fetch('http://roundhouse.proxy.rlwy.net:39487/api/health');

// After (HTTPS)
const response = await fetch('https://roundhouse.proxy.rlwy.net:39487/api/health');

// Or use environment variable (recommended)
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`);
```

#### Create API Utility File:
Create `lib/api.js`:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://roundhouse.proxy.rlwy.net:39487';

export async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

// Usage examples
export const api = {
  health: () => fetchAPI('/api/health'),
  getData: () => fetchAPI('/api/data'),
  postData: (data) => fetchAPI('/api/data', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
```

### 4. Update Local .env.local

#### PowerShell Command:
```powershell
Set-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "NEXT_PUBLIC_API_URL=https://roundhouse.proxy.rlwy.net:39487"
```

#### Verify:
```powershell
Get-Content "C:\Users\DELL\uibac\.env.local"
```

### 5. Test Local Development

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Test in Browser:
1. Open http://localhost:3000
2. Press F12 → Console
3. Run:
```javascript
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`)
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err.message));
```

### 6. Deploy to Preview

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Update frontend to use HTTPS backend"
git push origin main

# Deploy to preview
vercel --yes
```

### 7. Test Preview Deployment

#### Get Preview URL:
```powershell
vercel ls | findstr Preview
```

#### Test in Browser:
1. Open the preview URL
2. Press F12 → Console
3. Run:
```javascript
fetch('https://roundhouse.proxy.rlwy.net:39487/api/health')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err.message));
```

**Expected Result:**
- No mixed-content errors
- Status 200 or 404 (both mean HTTPS is working)
- No CORS errors

### 8. Deploy to Production

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Deploy to production
vercel --prod --yes
```

### 9. Verify Production

#### Test Production URL:
```powershell
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing
```

#### Test Backend from Production:
```javascript
// Run in browser console on https://uibac.vercel.app
fetch('https://roundhouse.proxy.rlwy.net:39487/api/health')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err.message));
```

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - No additional costs

## Next Steps
- Test and verify HTTPS connectivity (see `04-testing-verification.md`)
