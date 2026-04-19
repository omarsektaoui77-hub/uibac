# Troubleshooting Guide

## Common Issues and Solutions

### Deployment Issues

#### Issue: Vercel build fails
**Symptoms:**
- Build error in Vercel dashboard
- Deployment stuck in "Building" state

**Solutions:**
1. Check build logs in Vercel dashboard
2. Verify `package.json` scripts are correct:
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start"
     }
   }
   ```
3. Check for missing dependencies:
   ```powershell
   npm install
   ```
4. Verify Node.js version compatibility (v18+)
5. Clear Vercel cache and redeploy

#### Issue: Preview deployment not updating
**Symptoms:**
- Preview URL shows old code
- Changes not reflected after push

**Solutions:**
1. Force redeploy:
   ```powershell
   vercel --yes
   ```
2. Check git branch is pushed:
   ```powershell
   git push origin preview/test-*
   ```
3. Clear browser cache (Ctrl+Shift+Delete)
4. Check Vercel dashboard for deployment status

#### Issue: Accidentally deployed to production
**Symptoms:**
- Production URL shows untested code
- Need to rollback immediately

**Solutions:**
1. List production deployments:
   ```powershell
   vercel ls --prod
   ```
2. Rollback to previous deployment:
   ```powershell
   vercel rollback <previous-deployment-url>
   ```
3. Or use git revert:
   ```powershell
   git revert HEAD
   git push origin main
   ```

### Backend Issues

#### Issue: Backend unreachable (Connection refused)
**Symptoms:**
- `curl http://roundhouse.proxy.rlwy.net:39487` fails
- Connection timeout errors

**Solutions:**
1. Verify Railway service is running
2. Check Railway URL is correct
3. Check Railway logs for errors
4. Verify port is correct (default: 39487)
5. Check Railway service status in dashboard

#### Issue: Backend returns 404 Not Found
**Symptoms:**
- Server reachable but routes don't exist
- `curl` returns "Cannot GET /"

**Solutions:**
1. This is normal if testing root path
2. Test specific endpoints:
   ```powershell
   curl http://roundhouse.proxy.rlwy.net:39487/api/health
   ```
3. Check backend code for route definitions
4. Verify backend is listening on correct port

#### Issue: CORS errors
**Symptoms:**
- Browser console shows CORS errors
- API calls blocked from frontend

**Solutions:**
1. Add CORS headers to backend:
   ```javascript
   const cors = require('cors');
   app.use(cors());
   ```
2. Configure CORS for specific origin:
   ```javascript
   app.use(cors({
     origin: 'https://uibac.vercel.app'
   }));
   ```
3. Use Vercel rewrites to proxy requests

### Environment Variables Issues

#### Issue: Environment variable not working
**Symptoms:**
- `process.env.VARIABLE_NAME` is undefined
- Configuration not applied

**Solutions:**
1. Check variable name matches exactly (case-sensitive)
2. Verify variable is set in correct environment (Preview/Production)
3. Redeploy after adding variables
4. Check Vercel dashboard to confirm variable exists
5. For client-side access, ensure variable starts with `NEXT_PUBLIC_`

#### Issue: Mixed-content error
**Symptoms:**
- Browser blocks HTTP requests from HTTPS page
- Console shows "Mixed Content" error

**Solutions:**
1. Use HTTPS for backend (if available)
2. Configure Vercel rewrites in `vercel.json`:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "http://roundhouse.proxy.rlwy.net:39487/api/:path*"
       }
     ]
   }
   ```
3. Use Railway's HTTPS URL if available

### Git Issues

#### Issue: Branch already exists
**Symptoms:**
- `git checkout -b preview/test-*` fails
- Error: "A branch named 'preview/test-*' already exists"

**Solutions:**
1. Delete existing branch:
   ```powershell
   git branch -D preview/test-*
   ```
2. Or checkout existing branch:
   ```powershell
   git checkout preview/test-*
   ```

#### Issue: Detached HEAD state
**Symptoms:**
- Git shows "(HEAD detached at ...)"
- Cannot push changes

**Solutions:**
1. Checkout a branch:
   ```powershell
   git checkout main
   ```
2. Or create new branch from current state:
   ```powershell
   git checkout -b new-branch-name
   ```

### Port Issues

#### Issue: Port already in use
**Symptoms:**
- `npm start` fails with "EADDRINUSE"
- Port 3000 or 3001 already occupied

**Solutions:**
1. Find process using port:
   ```powershell
   netstat -ano | findstr :3000
   ```
2. Kill process:
   ```powershell
   Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
   ```
3. Or use different port:
   ```powershell
   $env:PORT=3001
   npm start
   ```

### PowerShell Specific Issues

#### Issue: Command not recognized
**Symptoms:**
- PowerShell doesn't recognize commands
- "The term 'command' is not recognized"

**Solutions:**
1. Check you're using PowerShell (not CMD)
2. Verify path separators use `\` not `/`
3. Use full paths for executables:
   ```powershell
   C:\Users\DELL\AppData\Roaming\npm\vercel.cmd
   ```

#### Issue: Execution policy error
**Symptoms:**
- "Running scripts is disabled on this system"
- Cannot run .ps1 files

**Solutions:**
1. Set execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
2. Or run script bypassing policy:
   ```powershell
   powershell -ExecutionPolicy Bypass -File script.ps1
   ```

### Getting Help

#### Check Logs
1. **Vercel logs:** Go to Vercel dashboard → Deployments → View logs
2. **Railway logs:** Go to Railway dashboard → Your service → Logs
3. **Browser console:** Press F12 → Console tab
4. **Network tab:** Press F12 → Network tab (check failed requests)

#### Useful Commands
```powershell
# Check Vercel deployment status
vercel ls

# Check environment variables
vercel env ls preview

# Test backend connectivity
curl http://roundhouse.proxy.rlwy.net:39487

# Check git status
git status

# Check Node.js version
node --version
npm --version

# Check Vercel CLI version
vercel --version
```

#### Reset to Working State
If everything is broken and you need to start over:
```powershell
# Restore from git tag
git checkout working-production-20260419-173351
git push origin main --force

# Or restore from backup
Copy-Item C:\Users\DELL\uibac\vercel.json.backup C:\Users\DELL\uibac\vercel.json

# Redeploy
vercel --prod --yes
```

## Prevention Tips

1. **Always test in preview first** - Never deploy directly to production
2. **Backup before changes** - Use git tags to mark working states
3. **Use environment variables** - Don't hardcode sensitive data
4. **Check logs regularly** - Monitor for errors before they become critical
5. **Keep dependencies updated** - Run `npm update` regularly
6. **Document your setup** - Keep this guide handy for reference

## Contact Support

If issues persist:
- Vercel Support: https://vercel.com/support
- Railway Support: https://docs.railway.app/support
- GitHub Issues: https://github.com/vercel/vercel/issues
