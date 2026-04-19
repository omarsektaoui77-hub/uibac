# Setup #4: CI/CD Pipeline with GitHub Actions

## Overview
Automate testing, preview deployments, and production deployments using GitHub Actions CI/CD pipeline.

## Current State
- Frontend: Next.js on Vercel (https://uibac.vercel.app)
- Backend: HTTPS Railway (from Setup #2)
- Monitoring: Vercel Analytics + Sentry (from Setup #3)
- Authentication: Supabase + JWT (from Setup #6)
- CI/CD: Manual deployments only

## Goal
- Automatic testing on every push
- Automatic preview deployment on PR
- Automatic production deployment on merge to main
- Status badges for README
- Zero manual steps for deployments

## Time Estimate
**40 minutes** to complete this setup

## Cost
**$0** - Free tier only
- GitHub Actions: Free for public repos (2000 minutes/month)
- Vercel: Free tier (unlimited deployments)
- No additional costs

## Prerequisites
- Next.js project on GitHub
- Vercel connected to GitHub (from initial setup)
- PowerShell on Windows 11
- Git installed

## Folder Structure
```
04-cicd-setup/
├── README.md (this file)
├── 01-github-actions-setup.md
├── 02-automated-testing.md
├── 03-preview-deployments.md
├── 04-production-deployments.md
├── 05-status-badges.md
├── 06-troubleshooting.md
└── 07-powershell-commands.ps1
```

## What You'll Learn
1. Set up GitHub Actions workflow
2. Configure automated testing
3. Enable automatic preview deployments
4. Configure automatic production deployments
5. Add status badges to README
6. Troubleshoot CI/CD issues

## Rollback Plan
If something breaks, you can:
1. Disable GitHub Actions workflow
2. Revert to manual deployments
3. Restore from git tag
4. Delete workflow file

## Next Steps
Start with `01-github-actions-setup.md` to set up GitHub Actions workflow.
