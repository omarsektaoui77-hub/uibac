# Troubleshooting Guide - HTTPS & Custom Domain

## Common Issues and Solutions

### Issue 1: Backend HTTPS Not Working

**Symptoms:**
- `curl https://roundhouse.proxy.rlwy.net:39487` fails
- Connection timeout errors
- "SSL certificate error" in browser

**Solutions:**

#### Check 1: Verify Railway Service is Running
```powershell
# Go to Railway dashboard and check service status
# Or use Railway CLI
# railway status
```

#### Check 2: Verify Correct HTTPS URL
```powershell
# Make sure you're using https:// not http://
# Correct: https://roundhouse.proxy.rlwy.net:39487
# Wrong: http://roundhouse.proxy.rlwy.net:39487
```

#### Check 3: Check Railway Logs
1. Go to Railway dashboard
2. Select your project
3. Click on your backend service
4. Check logs for errors

#### Check 4: Restart Railway Service
```powershell
# In Railway dashboard, click "Restart" on your service
# Or use Railway CLI
# railway restart
```

### Issue 2: Mixed-Content Errors

**Symptoms:**
- Browser console shows: "Mixed Content: The page was loaded over HTTPS, but requested an insecure resource"
- API calls blocked

**Solutions:**

#### Solution 1: Update Environment Variable
```powershell
# In Vercel dashboard, change NEXT_PUBLIC_API_URL to:
# https://roundhouse.proxy.rlwy.net:39487
# (not http://)
```

#### Solution 2: Clear Browser Cache
1. Press Ctrl+Shift+Delete
2. Clear cache and cookies
3. Refresh the page

#### Solution 3: Hard Refresh
- Windows: Ctrl+F5
- Mac: Cmd+Shift+R

#### Solution 4: Check vercel.json
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://roundhouse.proxy.rlwy.net:39487"
  }
}
```

### Issue 3: CORS Errors

**Symptoms:**
- Browser console shows: "Access-Control-Allow-Origin" error
- API calls blocked due to CORS policy

**Solutions:**

#### Solution 1: Check Backend CORS Configuration
```javascript
// Ensure CORS is configured in backend
app.use(cors({
  origin: ['https://uibac.vercel.app', 'https://*.vercel.app'],
  credentials: true
}));
```

#### Solution 2: Allow All Origins (Development Only)
```javascript
app.use(cors()); // Allows all origins
```

#### Solution 3: Use Vercel Rewrites
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://roundhouse.proxy.rlwy.net:39487/api/:path*"
    }
  ]
}
```

#### Solution 4: Check Backend is Running
```powershell
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing
```

### Issue 4: Environment Variables Not Working

**Symptoms:**
- `process.env.NEXT_PUBLIC_API_URL` is undefined
- API calls failing

**Solutions:**

#### Solution 1: Check Variable Name
```powershell
# List environment variables
vercel env ls production
vercel env ls preview
```

#### Solution 2: Redeploy After Adding Variables
```powershell
vercel --prod --yes
```

#### Solution 3: Check .env.local
```powershell
Get-Content "C:\Users\DELL\uibac\.env.local"
```

#### Solution 4: Restart Dev Server
```powershell
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### Issue 5: Custom Domain Not Working

**Symptoms:**
- Custom domain shows "DNS_PROBE_FINISHED_NXDOMAIN"
- SSL certificate not provisioning

**Solutions:**

#### Solution 1: Check DNS Configuration
1. Go to your domain registrar
2. Verify CNAME record is correct
3. Check DNS propagation (can take 24-48 hours)

#### Solution 2: Check Railway Domain Settings
1. Go to Railway dashboard
2. Settings → Domains
3. Verify domain is added
4. Check DNS records provided by Railway

#### Solution 3: Wait for SSL Certificate
- Railway auto-provisions SSL
- Takes 5-10 minutes
- Check status in Railway dashboard

#### Solution 4: Use Railway Provided Domain
```powershell
# Use the default .railway.app domain
# https://your-project-name.railway.app
```

### Issue 6: Deployment Fails

**Symptoms:**
- Vercel build fails
- Deployment stuck in "Building" state

**Solutions:**

#### Solution 1: Check Build Logs
1. Go to Vercel dashboard
2. Deployments → View logs
3. Look for errors

#### Solution 2: Check package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

#### Solution 3: Clear Vercel Cache
1. Go to Vercel dashboard
2. Settings → Git
3. Clear cache
4. Redeploy

#### Solution 4: Check Node.js Version
```powershell
node --version
# Should be v18+
```

### Issue 7: Preview Deployment Not Updating

**Symptoms:**
- Preview URL shows old code
- Changes not reflected

**Solutions:**

#### Solution 1: Force Redeploy
```powershell
vercel --yes
```

#### Solution 2: Check Git Branch
```powershell
git branch
git status
```

#### Solution 3: Push Changes
```powershell
git push origin preview/test-*
```

#### Solution 4: Clear Browser Cache
- Press Ctrl+Shift+Delete
- Clear cache and cookies
- Refresh the page

### Issue 8: Mobile Testing Fails

**Symptoms:**
- App doesn't work on mobile
- Different behavior on mobile vs desktop

**Solutions:**

#### Solution 1: Test Responsive Design
1. Open Chrome DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Test different screen sizes
4. Check for mobile-specific issues

#### Solution 2: Check Network on Mobile
1. Open browser console on mobile
2. Check Network tab
3. Look for failed requests

#### Solution 3: Test on Real Device
1. Use QR code to open on phone
2. Test all features
3. Check for mobile-specific bugs

### Getting Help

#### Check Logs
1. **Vercel logs:** Dashboard → Deployments → View logs
2. **Railway logs:** Dashboard → Your service → Logs
3. **Browser console:** F12 → Console tab
4. **Network tab:** F12 → Network tab

#### Useful Commands
```powershell
# Check backend
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing

# Check production
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing

# Check environment variables
vercel env ls production

# Check git status
git status

# Check Node.js version
node --version
```

#### Reset to HTTP (Rollback)
If HTTPS is causing issues and you need to rollback:

```powershell
# Step 1: Revert environment variable in Vercel dashboard
# Change NEXT_PUBLIC_API_URL back to: http://roundhouse.proxy.rlwy.net:39487

# Step 2: Revert vercel.json
Copy-Item C:\Users\DELL\uibac\vercel.json.backup C:\Users\DELL\uibac\vercel.json

# Step 3: Redeploy
vercel --prod --yes

# Step 4: Verify
Invoke-WebRequest -Uri "http://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing
```

#### Contact Support
- Vercel Support: https://vercel.com/support
- Railway Support: https://docs.railway.app/support
- GitHub Issues: https://github.com/vercel/vercel/issues

## Prevention Tips

1. **Always test in preview first** - Never deploy directly to production
2. **Backup before changes** - Use git tags to mark working states
3. **Check logs regularly** - Monitor for errors before they become critical
4. **Test on multiple devices** - Desktop, mobile, tablet
5. **Keep dependencies updated** - Run `npm update` regularly
6. **Document your setup** - Keep this guide handy for reference

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| HTTPS not working | Check Railway service status |
| Mixed-content error | Update NEXT_PUBLIC_API_URL to https:// |
| CORS error | Configure CORS in backend or use Vercel rewrites |
| Env var not working | Redeploy after adding variable |
| Custom domain fails | Check DNS configuration |
| Build fails | Check build logs in Vercel |
| Preview not updating | Force redeploy with `vercel --yes` |
| Mobile fails | Test with DevTools device toolbar |
