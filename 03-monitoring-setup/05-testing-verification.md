# Step 5: Testing & Verification

## Overview
Comprehensive testing to ensure all monitoring tools are working correctly and capturing data.

## Pre-Test Checklist
- [ ] Vercel Analytics enabled (Step 1)
- [ ] Sentry configured (Step 2)
- [ ] Logging configured (Step 3)
- [ ] UptimeRobot monitors set up (Step 4)

## Test #1: Vercel Analytics Verification

### Step A: Check Analytics Dashboard
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/analytics
2. Verify analytics is enabled
3. Check for data (may take 5-10 minutes)

### Step B: Generate Traffic
1. Open https://uibac.vercel.app
2. Navigate through different pages
3. Refresh the page multiple times
4. Wait 5-10 minutes

### Step C: Verify Data in Dashboard
1. Refresh analytics dashboard
2. Check for page views
3. Check for unique visitors
4. Check for performance metrics

**Expected Result:** Analytics data appears in dashboard

## Test #2: Sentry Error Tracking Verification

### Step A: Check Sentry Dashboard
1. Go to Sentry dashboard
2. Verify project is active
3. Check for incoming errors

### Step B: Trigger Test Error
1. Open https://uibac.vercel.app
2. Press F12 → Console tab
3. Run:
```javascript
throw new Error('Test error for Sentry monitoring');
```

### Step C: Verify Error in Sentry
1. Refresh Sentry dashboard
2. Check for new error
3. Verify stack trace is captured
4. Check error details and context

**Expected Result:** Error appears in Sentry dashboard with stack trace

## Test #3: Logging Verification

### Step A: Test Frontend Logging
1. Open https://uibac.vercel.app
2. Press F12 → Console tab
3. Run:
```javascript
console.log('[TEST] Frontend logging works');
console.error('[TEST] Error logging works');
console.warn('[TEST] Warning logging works');
```

### Step B: Check Browser Console
1. Verify logs appear in console
2. Check formatting
3. Check log levels

### Step C: Check Vercel Logs
1. Go to Vercel dashboard → Deployments → Logs
2. Check for application logs
3. Verify logging is working

**Expected Result:** Logs appear in browser console and Vercel logs

## Test #4: Backend Logging Verification

### Step A: Test Backend Endpoint
```powershell
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487/api/health" -UseBasicParsing
```

### Step B: Check Railway Logs
1. Go to Railway dashboard
2. Select your backend service
3. Check logs for API calls
4. Verify logging is working

**Expected Result:** Logs appear in Railway dashboard

## Test #5: UptimeRobot Verification

### Step A: Check UptimeRobot Dashboard
1. Go to UptimeRobot dashboard
2. Check monitor status
3. Verify monitors are "Up"

### Step B: Test Monitor
1. Click "Test" next to each monitor
2. Verify test succeeds
3. Check response time

### Step C: Check Uptime Statistics
1. Click on a monitor
2. View uptime percentage
3. View response time graph
4. View incident history

**Expected Result:** All monitors show "Up" status

## Test #6: Alert System Verification

### Step A: Test Alert Configuration
1. In UptimeRobot, temporarily pause a monitor
2. Wait for alert (or manually trigger)
3. Check if email is received

### Step B: Verify Alert Delivery
1. Check email inbox
2. Check spam folder
3. Verify alert content

### Step C: Resume Monitor
1. Resume the paused monitor
2. Verify status returns to "Up"

**Expected Result:** Alerts are received when monitor goes down

## Test #7: End-to-End Monitoring Test

### Step A: Deploy Test Version
```powershell
cd C:\Users\DELL\uibac

# Create test branch with intentional error
git checkout -b test/monitoring
# Add intentional error in code
git add .
git commit -m "Add test error for monitoring"
git push origin test/monitoring

# Deploy to preview
vercel --yes
```

### Step B: Trigger Error
1. Open preview URL
2. Trigger the intentional error
3. Check Sentry for error capture

### Step C: Verify All Tools
1. Check Vercel Analytics for traffic
2. Check Sentry for error
3. Check logs for error message
4. Check UptimeRobot for status

### Step D: Cleanup
```powershell
# Delete test branch
git checkout main
git branch -D test/monitoring
git push origin --delete test/monitoring
vercel rm --yes --safe
```

**Expected Result:** All monitoring tools capture the error

## Final Verification Checklist

- [ ] Vercel Analytics capturing data
- [ ] Sentry capturing errors
- [ ] Frontend logging working
- [ ] Backend logging working
- [ ] UptimeRobot monitors active
- [ ] Alert system working
- [ ] All dashboards accessible

## Time Estimate
**15 minutes** to complete all tests

## Cost
**$0** - Testing is free

## Rollback Plan

If monitoring causes issues:

### Remove Sentry:
```powershell
# Remove Sentry from next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js.backup C:\Users\DELL\uibac\next.config.js

# Remove Sentry config files
Remove-Item "C:\Users\DELL\uibac\sentry.client.config.js"
Remove-Item "C:\Users\DELL\uibac\sentry.server.config.js"

# Rebuild and deploy
cd C:\Users\DELL\uibac
npm run build
vercel --prod --yes
```

### Disable UptimeRobot:
1. Go to UptimeRobot dashboard
2. Pause or delete monitors
3. No code changes needed

## Next Steps
- Review troubleshooting guide (see `06-troubleshooting.md`)
- If all tests pass, proceed to next setup (Setup #6: Database & Authentication)
