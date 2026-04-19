# Step 1: Vercel Analytics Setup

## Overview
Vercel Analytics provides built-in analytics for your Next.js application, including page views, core web vitals, and user insights.

## What is Vercel Analytics?
Free analytics included with Vercel that provides:
- Page views and unique visitors
- Core Web Vitals (LCP, FID, CLS)
- Geographic data
- Device breakdown
- Performance insights

## Step-by-Step Instructions

### 1. Enable Vercel Analytics in Dashboard

#### Step A: Go to Vercel Dashboard
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/analytics
2. Or navigate: Dashboard → uibac → Analytics tab

#### Step B: Enable Analytics
1. Click "Enable Analytics"
2. Accept terms of service
3. Analytics will start collecting data automatically

### 2. Install @vercel/analytics Package

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install analytics package
npm install @vercel/analytics
```

### 3. Add Analytics to Next.js App

#### For Pages Router (pages/):
Update `pages/_app.js`:

```javascript
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Analytics />
      <Component {...pageProps} />
    </>
  )
}
```

#### For App Router (app/):
Update `app/layout.js`:

```javascript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  )
}
```

#### PowerShell Command to Check Router Type:
```powershell
# Check if using pages router
if (Test-Path "C:\Users\DELL\uibac\pages") {
    Write-Host "✅ Using Pages Router" -ForegroundColor Green
}

# Check if using app router
if (Test-Path "C:\Users\DELL\uibac\app") {
    Write-Host "✅ Using App Router" -ForegroundColor Green
}
```

### 4. Test Analytics Locally

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Start dev server
npm run dev
```

#### Verification:
1. Open http://localhost:3000
2. Navigate to different pages
3. Check browser console for analytics errors
4. Analytics won't show in dev (only production)

### 5. Deploy to Production

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add Vercel Analytics"
git push origin main

# Deploy to production
vercel --prod --yes
```

### 6. Verify Analytics in Dashboard

#### Step A: Go to Analytics Dashboard
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/analytics
2. Wait a few minutes for data to appear
3. Check page views, visitors, and performance metrics

#### Step B: Check Real-time Data
1. Open your production URL: https://uibac.vercel.app
2. Navigate through the site
3. Refresh analytics dashboard
4. Data should appear within a few minutes

### 7. Configure Analytics Settings (Optional)

#### Step A: Go to Analytics Settings
1. Dashboard → uibac → Settings → Analytics
2. Configure settings:
   - Enable/disable data collection
   - Set up custom events
   - Configure privacy settings

#### Step B: Add Custom Events (Optional)
```javascript
import { Analytics } from '@vercel/analytics/react';

// Track custom event
Analytics.track('custom_event', { property: 'value' });
```

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - Vercel Analytics is free

## Common Issues

### Issue: Analytics not showing data
**Solution:**
1. Analytics only works in production (not dev)
2. Wait 5-10 minutes for data to appear
3. Check if analytics is enabled in dashboard
4. Verify package is installed correctly

### Issue: Analytics package not found
**Solution:**
```powershell
cd C:\Users\DELL\uibac
npm install @vercel/analytics
```

### Issue: Analytics causing build errors
**Solution:**
1. Check Next.js version compatibility
2. Ensure package is in dependencies
3. Check for TypeScript errors

## Next Steps
- Set up Sentry for error tracking (see `02-sentry-setup.md`)
