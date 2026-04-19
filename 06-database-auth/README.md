# Setup #6: Database & Authentication

## Overview
Add a free database and implement JWT authentication for user management and protected routes.

## Current State
- Frontend: Next.js on Vercel (https://uibac.vercel.app)
- Backend: HTTPS Railway (from Setup #2)
- Monitoring: Vercel Analytics + Sentry (from Setup #3)
- Database: None
- Authentication: None

## Goal
- Free database (Supabase or MongoDB Atlas free tier)
- JWT authentication for users
- Protected routes (frontend + backend)
- User session management

## Time Estimate
**60 minutes** to complete this setup

## Cost
**$0** - Free tier only
- Supabase: Free tier (500MB database)
- MongoDB Atlas: Free tier (512MB database)
- JWT: Free (open-source)
- No additional costs

## Prerequisites
- Next.js project deployed on Vercel
- HTTPS backend (from Setup #2)
- PowerShell on Windows 11
- Git installed
- Supabase or MongoDB Atlas account (free)

## Folder Structure
```
06-database-auth/
├── README.md (this file)
├── 01-database-setup.md
├── 02-authentication-setup.md
├── 03-protected-routes.md
├── 04-session-management.md
├── 05-testing-verification.md
├── 06-troubleshooting.md
└── 07-powershell-commands.ps1
```

## What You'll Learn
1. Set up free database (Supabase or MongoDB Atlas)
2. Implement JWT authentication
3. Create protected API routes
4. Add authentication to frontend
5. Manage user sessions
6. Test authentication flow
7. Troubleshoot common auth issues

## Rollback Plan
If something breaks, you can:
1. Remove authentication code from codebase
2. Delete database (if not needed)
3. Revert configuration changes
4. Restore from git tag

## Next Steps
Start with `01-database-setup.md` to set up your free database.
