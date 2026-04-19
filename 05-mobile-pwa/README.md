# Setup #5: Mobile Optimization & PWA

## Overview
Convert your Next.js app into a Progressive Web App (PWA) that can be installed on mobile devices, work offline, and provide a native app-like experience.

## Current State
- Frontend: Next.js on Vercel (https://uibac.vercel.app)
- Backend: HTTPS Railway (from Setup #2)
- Mobile: Not optimized, not installable

## Goal
- PWA installable on mobile devices
- Offline support with service workers
- Mobile-responsive design
- App manifest and icons
- Lighthouse score improvement

## Time Estimate
**45 minutes** to complete this setup

## Cost
**$0** - Free tier only
- PWA features are free
- No additional hosting costs
- Vercel free tier supports PWA

## Prerequisites
- Next.js project deployed on Vercel
- HTTPS backend (from Setup #2)
- PowerShell on Windows 11
- Git installed
- Image editing tool (for icons)

## Folder Structure
```
05-mobile-pwa/
├── README.md (this file)
├── 01-pwa-basics.md
├── 02-manifest-json.md
├── 03-service-worker.md
├── 04-mobile-testing.md
├── 05-troubleshooting.md
└── 06-powershell-commands.ps1
```

## What You'll Learn
1. What is a PWA and why it matters
2. Create app manifest.json
3. Generate PWA icons
4. Implement service workers for offline support
5. Make app mobile-responsive
6. Test PWA installation on mobile
7. Improve Lighthouse score
8. Troubleshoot common PWA issues

## Rollback Plan
If something breaks, you can:
1. Remove PWA files (manifest.json, service worker)
2. Revert Next.js configuration changes
3. Restore from git tag
4. Use backup files

## Next Steps
Start with `01-pwa-basics.md` to understand PWA fundamentals and set up the basic configuration.
