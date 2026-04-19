# Windows PowerShell Cheat Sheet: Next.js + Railway + Vercel

## Initial Setup - Windows 11 + PowerShell

### Prerequisites:
1. Node.js (v18+)
2. Git
3. GitHub account
4. Vercel account (free)
5. Railway account (free)

### Tool Installation:

#### 1. Node.js
- Download from https://nodejs.org
- LTS version recommended
- Verify: `node --version`

#### 2. Git
- Download from https://git-scm.com
- Verify: `git --version`

#### 3. Vercel CLI (global)
```powershell
npm install -g vercel
vercel --version
```

#### 4. Login to Vercel
```powershell
vercel login
```

#### 5. Link project to Vercel (first time only)
```powershell
cd C:\Users\DELL\uibac
vercel link
```

---

## Safe Testing Workflow (Windows PowerShell)

### 1. Create Preview Branch
```powershell
cd C:\Users\DELL\uibac
git checkout -b preview/test-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin preview/test-*
```

### 2. Deploy to Preview ONLY
```powershell
vercel --yes
```
**Note:** `vercel` without `--prod` deploys to Preview by default on non-main branches. Do NOT use `vercel --target=preview` - this flag doesn't exist.

### 3. Get Preview URL
```powershell
vercel ls | findstr Preview
```

### 4. Test Backend Connectivity
```powershell
curl http://roundhouse.proxy.rlwy.net:39487
```

### 5. Test API from Browser Console (Manual)
1. Open preview URL in browser
2. Press F12 → Console tab
3. Paste:
```javascript
fetch('http://roundhouse.proxy.rlwy.net:39487')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err.message));
```

### 6. Cleanup
```powershell
# Delete preview deployment
vercel rm --yes --safe

# Delete remote branch
git push origin --delete preview/test-*

# Delete local branch
git checkout main
git branch -D preview/test-*
```
**Note:** Do NOT use `vercel remove` - the correct command is `vercel rm`.

### 7. Emergency Rollback (if production broken)
```powershell
# List production deployments
vercel ls --prod

# Rollback to previous deployment (replace with URL)
vercel rollback <previous-deployment-url>
```

## Windows-Specific Notes

### PowerShell vs Bash Differences
- **Path separators:** Use `\` not `/` for Windows paths
- **Command output:** PowerShell uses different formatting than bash
- **Error handling:** Use `-ErrorAction SilentlyContinue` instead of `2>/dev/null`
- **String interpolation:** Use `"string $var"` not `'string $var'`

### Common PowerShell Commands
```powershell
# Check if file exists
Test-Path "C:\Users\DELL\uibac\file.txt"

# Copy file
Copy-Item "source.txt" "destination.txt"

# Check port usage
netstat -ano | findstr :3000

# Kill process on port
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force

# Get file content
Get-Content "file.txt"

# Set file content
Set-Content -Path "file.txt" -Value "content"
```

## Quick Reference

| Action | Command |
|--------|---------|
| Check backend | `curl http://roundhouse.proxy.rlwy.net:39487` |
| Deploy preview | `vercel --yes` |
| Deploy production | `vercel --prod` |
| List deployments | `vercel ls` |
| List preview only | `vercel ls \| findstr Preview` |
| Delete preview | `vercel rm --yes --safe` |
| Check env vars | `vercel env ls preview` |
| Add env var | `vercel env add NEXT_PUBLIC_API_URL preview` (manual input required) |

## Important Notes

1. **NEVER use `vercel --prod` for testing** - deploys to production
2. **Preview deployments are FREE** on Vercel Hobby tier
3. **Preview auto-deploys** when pushing to GitHub (if connected)
4. **Environment variables require manual input** - use Vercel dashboard
5. **Mixed-content errors expected** when HTTPS page calls HTTP backend
6. **Backup before testing** - use git tags to mark working states
