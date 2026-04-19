# Setup #2: Backend HTTPS & Custom Domain

## Overview
Convert your Railway backend from HTTP to HTTPS and configure custom domain for production-ready deployment. This is critical for mobile app support and security.

## Current State
- Backend: HTTP (http://roundhouse.proxy.rlwy.net:39487)
- Frontend: HTTPS (https://uibac.vercel.app)
- Issue: Mixed-content errors when HTTPS frontend calls HTTP backend

## Goal
- Backend: HTTPS with custom domain
- Frontend: HTTPS (already configured)
- Result: No mixed-content errors, mobile-ready

## Time Estimate
**30 minutes** to complete this setup

## Cost
**$0** - Free tier only
- Railway: Free tier includes HTTPS
- Custom domain: Railway provides `.railway.app` domain free
- No additional costs

## Prerequisites
- Railway account (free tier)
- Vercel account (free tier)
- PowerShell on Windows 11
- Git installed

## Folder Structure
```
02-https-setup/
├── README.md (this file)
├── 01-railway-https-setup.md
├── 02-cors-configuration.md
├── 03-vercel-frontend-config.md
├── 04-testing-verification.md
├── 05-troubleshooting.md
└── 06-powershell-commands.ps1
```

## What You'll Learn
1. Enable HTTPS on Railway backend
2. Configure custom domain (.railway.app)
3. Set up CORS for production
4. Update Vercel frontend to use HTTPS backend
5. Test and verify HTTPS connectivity
6. Troubleshoot common issues

## Rollback Plan
If something breaks, you can:
1. Revert to HTTP backend (documented in troubleshooting)
2. Restore from git tag (created in initial setup)
3. Use backup files (vercel.json.backup)

## Next Steps
Start with `01-railway-https-setup.md` to enable HTTPS on your Railway backend.
