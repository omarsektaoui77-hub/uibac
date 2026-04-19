# Step 2: CORS Configuration

## Overview
CORS (Cross-Origin Resource Sharing) allows your Vercel frontend to call your Railway backend. With HTTPS, you need to configure CORS properly to avoid errors.

## What is CORS?
CORS is a security feature that restricts which domains can access your API. Without proper CORS, your frontend cannot call your backend.

## Step-by-Step Instructions

### 1. Install CORS Package (if using Express)

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# If you have a separate backend folder
# cd backend

npm install cors
```

### 2. Configure CORS in Backend

#### For Express.js Backend:
Create or update `backend/index.js` (or your main server file):

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Option 1: Allow all origins (for development)
app.use(cors());

// Option 2: Allow specific origins (recommended for production)
app.use(cors({
  origin: [
    'https://uibac.vercel.app',
    'https://*.vercel.app',  // Allow all Vercel preview deployments
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Your routes...
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 39487;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### For Next.js API Routes (if using Next.js backend):
Create or update `pages/api/[...].js`:

```javascript
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://uibac.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Your API logic...
  res.status(200).json({ status: 'ok' });
}
```

### 3. Deploy Updated Backend

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add CORS configuration"
git push origin main

# Railway will auto-deploy
# Or use Railway CLI
# railway up
```

### 4. Test CORS Configuration

#### Test from Browser Console:
```javascript
// Test CORS preflight
fetch('https://roundhouse.proxy.rlwy.net:39487/api/health', {
  method: 'OPTIONS'
})
  .then(res => console.log('CORS Preflight:', res.status, res.headers))
  .catch(err => console.error('CORS Error:', err.message));

// Test actual request
fetch('https://roundhouse.proxy.rlwy.net:39487/api/health')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err.message));
```

**Expected Result:**
- No CORS errors in console
- Status 200 or 404 (both mean CORS is working)
- Access-Control-Allow-Origin header present

### 5. Verify CORS Headers

#### PowerShell Command:
```powershell
$response = Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487/api/health" -UseBasicParsing
$response.Headers
```

**Look for:**
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

## Alternative: Vercel Rewrites (No Backend Changes)

If you can't modify the backend code, use Vercel rewrites:

### Update vercel.json:
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
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://roundhouse.proxy.rlwy.net:39487/api/:path*"
    }
  ]
}
```

### Update Frontend Code:
```javascript
// Use relative URL instead of absolute
fetch('/api/health')
  .then(res => res.json())
  .then(data => console.log(data));
```

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - CORS is free

## Common Issues

### Issue: CORS error "Origin not allowed"
**Solution:**
1. Check your CORS origin configuration
2. Add your Vercel domain to allowed origins
3. Restart backend server

### Issue: Preflight request fails
**Solution:**
1. Ensure OPTIONS method is allowed
2. Check Access-Control-Allow-Methods header
3. Verify credentials setting matches frontend

## Next Steps
- Update Vercel frontend configuration (see `03-vercel-frontend-config.md`)
- Test HTTPS connectivity (see `04-testing-verification.md`)
