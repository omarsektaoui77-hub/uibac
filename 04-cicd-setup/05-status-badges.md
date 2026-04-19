# Step 5: Status Badges

## Overview
Add status badges to your README to show build status, deployment status, and other metrics at a glance.

## What are Status Badges?
Status badges are small images that display the current state of your CI/CD pipeline, deployments, and other metrics directly in your README.

## Step-by-Step Instructions

### 1: Add GitHub Actions Badge

#### Get Badge URL:
```
https://github.com/omarsektaoui77-hubs/uibac/actions/workflows/ci-cd.yml/badge.svg
```

#### Add to README.md:
```markdown
![CI/CD Pipeline](https://github.com/omarsektaoui77-hubs/uibac/actions/workflows/ci-cd.yml/badge.svg)
```

### 2: Add Vercel Deployment Badge

#### Get Badge URL from Vercel:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac
2. Click "Settings" → "General"
3. Scroll to "Deployment Badge"
4. Copy the badge URL

#### Add to README.md:
```markdown
![Vercel Deployment](https://img.shields.io/badge/vercel-deployed-success-green)
```

Or use Vercel's dynamic badge:
```markdown
[![Deployment status](https://img.shields.io/endpoint?url=https://vercel.com/api/v1/your-project-id/deploy-status)](https://vercel.com/your-project)
```

### 3: Add License Badge

#### Add to README.md:
```markdown
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
```

### 4: Add Version Badge

#### Add to README.md:
```markdown
![npm version](https://img.shields.io/npm/v/next?label=next)
```

### 5: Add Code Coverage Badge (Optional)

#### If using Jest with coverage:
```markdown
![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)
```

### 6: Complete README Example

#### Update README.md:
```markdown
# uibac

![CI/CD Pipeline](https://github.com/omarsektaoui77-hubs/uibac/actions/workflows/ci-cd.yml/badge.svg)
![Vercel Deployment](https://img.shields.io/badge/vercel-deployed-success-green)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![npm version](https://img.shields.io/npm/v/next?label=next)

## Overview
uibac is a Next.js application deployed on Vercel with Railway backend.

## Features
- Next.js frontend
- Railway backend
- JWT authentication
- PWA support
- Automated CI/CD

## Quick Start
```bash
npm install
npm run dev
```

## Deployment
- Frontend: https://uibac.vercel.app
- Backend: https://roundhouse.proxy.rlwy.net:39487

## License
MIT
```

### 7: Commit and Push

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit README changes
git add README.md
git commit -m "Add status badges to README"
git push origin main
```

### 8: Verify Badges

#### Step A: Check GitHub README
1. Go to https://github.com/omarsektaoui77-hubs/uibac
2. Verify badges are displayed
3. Click on badges to verify they link correctly

#### Step B: Check Badge Status
1. CI/CD badge should show passing
2. Vercel badge should show deployed
3. Badges should update automatically

## Additional Badges

### Popular Badge Services:

#### Shields.io (https://shields.io/)
- Custom badges for any metric
- Wide variety of styles
- Dynamic badges available

#### Badgen.net (https://badgen.net/)
- Alternative to shields.io
- Simpler syntax
- Good for simple badges

#### Examples:
```markdown
# Node version
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

# GitHub stars
![GitHub stars](https://img.shields.io/github/stars/omarsektaoui77-hubs/uibac?style=social)

# GitHub forks
![GitHub forks](https://img.shields.io/github/forks/omarsektaoui77-hubs/uibac?style=social)

# GitHub issues
![GitHub issues](https://img.shields.io/github/issues/omarsektaoui77-hubs/uibac)

# Code size
![code size](https://img.shields.io/github/languages/code-size/omarsektaoui77-hubs/uibac)
```

## Time Estimate
**5 minutes** to complete this step

## Cost
**$0** - Badges are free

## Common Issues

### Issue: Badge not updating
**Solution:**
1. Wait a few minutes for badge to update
2. Clear browser cache
3. Check badge URL is correct

### Issue: Badge showing error
**Solution:**
1. Verify badge URL is correct
2. Check if service is accessible
3. Verify workflow/job name is correct

## Next Steps
- Review troubleshooting guide (see `06-troubleshooting.md`)
