# Backend Setup - Railway

## What is Railway?
Railway is a cloud platform for deploying backend services, databases, and other infrastructure. It offers a free tier perfect for development and testing.

## Railway Account Setup

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub (recommended)
- Free tier includes:
  - $5/month credit
  - Up to 500 hours of runtime
  - 1GB storage

### 2. Create a New Project
1. Click "New Project" in Railway dashboard
2. Click "Deploy from GitHub repo"
3. Select your backend repository
4. Railway will auto-detect your project type

### 3. Configure Backend Service

#### For Node.js/Express Backend:
```powershell
# Example backend structure
# backend/
# ├── package.json
# ├── index.js
# └── .env
```

#### Environment Variables in Railway:
1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add required environment variables:
   - `PORT=39487` (or your preferred port)
   - `NODE_ENV=production`
   - Any other API keys or secrets

### 4. Get Backend URL
After deployment, Railway will provide:
- **Public URL:** `https://your-project.railway.app`
- **Custom domain:** `http://roundhouse.proxy.rlwy.net:39487` (example)

## Test Backend Connectivity

### From PowerShell:
```powershell
# Test if backend is reachable
curl http://roundhouse.proxy.rlwy.net:39487

# Test specific endpoint
curl http://roundhouse.proxy.rlwy.net:39487/api/health
```

### Expected Responses:
- **200 OK:** Backend is working
- **404 Not Found:** Server running but route doesn't exist (normal if testing root path)
- **Connection refused:** Backend is down or wrong URL

## Common Railway Issues

### Issue: Backend returns 404
**Solution:** Check your backend routes. The server is running but the specific endpoint doesn't exist.

### Issue: Connection timeout
**Solution:**
1. Check if Railway service is running
2. Verify the URL is correct
3. Check Railway logs for errors

### Issue: CORS errors
**Solution:** Add CORS headers to your backend:
```javascript
// Express example
const cors = require('cors');
app.use(cors());
```

## Railway CLI (Optional)
```powershell
# Install Railway CLI
npm install -g railway

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Open project in browser
railway open
```

## Next Steps
- [ ] Set up Vercel frontend (see `03-frontend-vercel.md`)
- [ ] Configure environment variables (see `04-environment-variables.md`)
