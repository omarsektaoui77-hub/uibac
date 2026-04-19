# Step 2: Sentry Error Tracking Setup

## Overview
Sentry provides real-time error tracking and performance monitoring for both frontend and backend applications.

## What is Sentry?
Sentry is an error tracking platform that:
- Captures errors in real-time
- Provides stack traces and context
- Tracks performance issues
- Alerts you when errors occur
- Free tier: 5,000 errors/month

## Step-by-Step Instructions

### 1. Create Sentry Account

#### Step A: Sign Up
1. Go to https://sentry.io
2. Click "Sign Up"
3. Sign up with GitHub (recommended)
4. Select "Free" plan
5. Create a new project

#### Step B: Create New Project
1. Click "Create Project"
2. Select "Next.js" as platform
3. Enter project name: "uibac"
4. Copy the DSN (Data Source Name) - you'll need this later

### 2. Install Sentry SDK

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install Sentry SDK
npm install @sentry/nextjs
```

### 3. Configure Sentry in next.config.js

#### Update next.config.js:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['roundhouse.proxy.rlwy.net'],
  },
}

module.exports = withSentryConfig(
  withPWA(nextConfig),
  {
    silent: true,
    org: 'your-org-name', // Replace with your Sentry org name
    project: 'uibac', // Replace with your Sentry project name
  }
)
```

#### PowerShell Command to Update:
```powershell
# Backup current config
Copy-Item C:\Users\DELL\uibac\next.config.js C:\Users\DELL\uibac\next.config.js.backup

# Update manually with the code above
# Or use Set-Content to replace the file
```

### 4. Add Sentry DSN to Environment Variables

#### In Vercel Dashboard:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Click "Add New"
3. Name: `SENTRY_DSN`
4. Value: Your Sentry DSN from Step 1
5. Select "Production" and "Preview"
6. Click "Save"

#### In .env.local:
```powershell
# Add Sentry DSN to local environment
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "SENTRY_DSN=your-sentry-dsn-here"
```

### 5. Create sentry.client.config.js

#### Create file: `sentry.client.config.js`:
```javascript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

#### PowerShell Command to Create:
```powershell
$sentryClientConfig = @"
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
"@
Set-Content -Path "C:\Users\DELL\uibac\sentry.client.config.js" -Value $sentryClientConfig
```

### 6. Create sentry.server.config.js

#### Create file: `sentry.server.config.js`:
```javascript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

#### PowerShell Command to Create:
```powershell
$sentryServerConfig = @"
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
"@
Set-Content -Path "C:\Users\DELL\uibac\sentry.server.config.js" -Value $sentryServerConfig
```

### 7. Update .gitignore

#### Add Sentry files to .gitignore:
```powershell
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "`n# Sentry" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value ".sentryclirc" -Force
```

### 8. Test Sentry Locally

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Start dev server
npm run dev
```

#### Trigger Test Error:
In browser console, run:
```javascript
throw new Error('Test error for Sentry');
```

#### Verify in Sentry Dashboard:
1. Go to Sentry dashboard
2. Check if error appears
3. Should show stack trace and context

### 9. Deploy to Production

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add Sentry error tracking"
git push origin main

# Deploy to production
vercel --prod --yes
```

### 10. Verify Sentry in Production

#### Step A: Check Sentry Dashboard
1. Go to Sentry dashboard
2. Check for incoming errors
3. Verify error details are captured

#### Step B: Test Production Error
1. Open https://uibac.vercel.app
2. Trigger an error in browser console
3. Check Sentry dashboard for error

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - Sentry free tier (5,000 errors/month)

## Common Issues

### Issue: Sentry not capturing errors
**Solution:**
1. Check DSN is correct
2. Verify environment variable is set
3. Check Sentry configuration in next.config.js
4. Ensure Sentry SDK is installed

### Issue: Build fails after adding Sentry
**Solution:**
1. Check next.config.js syntax
2. Ensure org and project names are correct
3. Check for TypeScript errors
4. Verify Sentry SDK version compatibility

### Issue: Too many errors in Sentry
**Solution:**
1. Adjust sampling rate in config
2. Filter errors in Sentry dashboard
3. Set up ignore rules
4. Upgrade to paid plan if needed

## Next Steps
- Configure logging (see `03-logging-configuration.md`)
