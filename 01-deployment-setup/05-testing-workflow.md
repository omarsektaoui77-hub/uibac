# Testing Workflow - Safe Deployment Testing

## Overview
This workflow ensures you can test changes safely without affecting production. It uses Vercel Preview deployments which are free and isolated from production.

## Pre-Test Checklist

Before testing, verify:
- [ ] Production is working (https://uibac.vercel.app)
- [ ] Backend is reachable (http://roundhouse.proxy.rlwy.net:39487)
- [ ] Git working directory is clean (no uncommitted changes)
- [ ] You're on the main branch

## Safe Testing Workflow

### Step 1: Backup Current State
```powershell
# Save current production deployment info
vercel ls --prod > C:\Users\DELL\uibac\production-backup.txt

# Backup vercel.json
Copy-Item C:\Users\DELL\uibac\vercel.json C:\Users\DELL\uibac\vercel.json.backup

# Create git tag for working state
cd C:\Users\DELL\uibac
git tag working-production-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin --tags

# Save commit hash
git rev-parse HEAD > C:\Users\DELL\uibac\working-commit.txt
```

### Step 2: Create Test Branch
```powershell
cd C:\Users\DELL\uibac
git checkout -b preview/test-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin preview/test-*
```

### Step 3: Make Your Changes
```powershell
# Edit vercel.json, .env, or code
# Make your changes...
```

### Step 4: Deploy to Preview
```powershell
vercel --yes
```
**Important:** Never use `vercel --prod` for testing - it deploys to production.

### Step 5: Get Preview URL
```powershell
vercel ls | findstr Preview
```
The output will show your preview deployment URL.

### Step 6: Test Preview Deployment

#### Manual Browser Testing:
1. Open the preview URL in browser
2. Press F12 → Console tab
3. Check for console errors
4. Press F12 → Network tab
5. Look for API calls to backend
6. Test all features

#### Test Backend Connectivity:
```javascript
// Run in browser console
fetch('http://roundhouse.proxy.rlwy.net:39487')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err.message));
```

#### Test API Endpoints:
```javascript
// Test common endpoints
const endpoints = ['', '/api', '/api/v1', '/health', '/status'];
for (const endpoint of endpoints) {
  fetch(`http://roundhouse.proxy.rlwy.net:39487${endpoint}`)
    .then(res => console.log(`${endpoint}: ${res.status}`))
    .catch(err => console.log(`${endpoint}: FAILED`));
}
```

### Step 7: Decision Point

#### If Everything Works:
```powershell
# Merge to main
git checkout main
git merge preview/test-*

# Push to production
git push origin main

# Deploy to production
vercel --prod --yes

# Cleanup
git branch -D preview/test-*
git push origin --delete preview/test-*
vercel rm --yes --safe
```

#### If Something Fails:
```powershell
# Abort changes
git checkout main
git branch -D preview/test-*
git push origin --delete preview/test-*

# Delete preview deployment
vercel rm --yes --safe

# Restore from backup (if needed)
git checkout working-production-20260419-173351
```

## Cleanup After Testing

### Remove Preview Deployment:
```powershell
vercel rm --yes --safe
```

### Delete Git Branch:
```powershell
git checkout main
git branch -D preview/test-*
git push origin --delete preview/test-*
```

## Quick Reference

| Action | Command |
|--------|---------|
| Create test branch | `git checkout -b preview/test-$(Get-Date -Format 'yyyyMMdd-HHmmss')` |
| Deploy preview | `vercel --yes` |
| List previews | `vercel ls \| findstr Preview` |
| Delete preview | `vercel rm --yes --safe` |
| Deploy production | `vercel --prod --yes` |

## Important Notes

1. **NEVER use `vercel --prod` for testing** - deploys to production
2. **Preview deployments are FREE** on Vercel Hobby tier
3. **Preview auto-deploys** when pushing to GitHub (if connected)
4. **Mixed-content errors expected** when HTTPS page calls HTTP backend
5. **Backup before testing** - use git tags to mark working states
6. **Clean up after testing** - delete preview deployments and branches

## Common Issues

### Issue: Mixed-content error
**Cause:** HTTPS page calling HTTP backend
**Solution:** Use HTTPS for backend or configure Vercel rewrites

### Issue: Preview deployment not updating
**Solution:** Force redeploy with `vercel --yes`

### Issue: Environment variables not working in preview
**Solution:** Add variables to Preview environment in Vercel dashboard

## Next Steps
- [ ] Review troubleshooting guide (see `07-troubleshooting.md`)
