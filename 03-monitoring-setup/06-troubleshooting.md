# Troubleshooting Guide - Monitoring & Logging

## Common Issues and Solutions

### Issue 1: Vercel Analytics Not Showing Data

**Symptoms:**
- Analytics dashboard shows no data
- Page views not being tracked
- "No data available" message

**Solutions:**

#### Check 1: Analytics is Enabled
1. Go to Vercel dashboard → Analytics
2. Verify analytics is enabled
3. Check if terms of service accepted

#### Check 2: Analytics Package Installed
```powershell
cd C:\Users\DELL\uibac
npm list @vercel/analytics
```

#### Check 3: Analytics Component Added
```javascript
// Check if <Analytics /> is in _app.js or layout.js
import { Analytics } from '@vercel/analytics/react';
```

#### Check 4: Production Only
Analytics only works in production, not development:
```powershell
# Deploy to production
vercel --prod --yes
```

#### Check 5: Wait for Data
Analytics data takes 5-10 minutes to appear:
1. Generate some traffic
2. Wait 10 minutes
3. Refresh dashboard

### Issue 2: Sentry Not Capturing Errors

**Symptoms:**
- Errors not appearing in Sentry
- Sentry dashboard empty
- DSN configuration errors

**Solutions:**

#### Check 1: DSN is Correct
```powershell
# Check environment variable
vercel env ls production | findstr SENTRY
```

#### Check 2: Sentry Configuration
```javascript
// Verify next.config.js has Sentry config
const { withSentryConfig } = require('@sentry/nextjs')
module.exports = withSentryConfig(nextConfig, {
  org: 'your-org-name',
  project: 'uibac',
})
```

#### Check 3: Environment Variable Name
Should be `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN`:
```powershell
# In Vercel dashboard, check variable name
# Should be: SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN
```

#### Check 4: Test Error
```javascript
// In browser console
throw new Error('Test error');
```

#### Check 5: Check Sentry Dashboard
1. Go to Sentry dashboard
2. Check if project is active
3. Verify error appears

### Issue 3: Too Many Errors in Sentry

**Symptoms:**
- Sentry quota exceeded
- Too many errors being captured
- Performance issues

**Solutions:**

#### Solution 1: Adjust Sampling Rate
```javascript
Sentry.init({
  tracesSampleRate: 0.1, // Only sample 10% of transactions
})
```

#### Solution 2: Filter Errors in Sentry
1. Go to Sentry dashboard
2. Settings → Inbound Filters
3. Add ignore rules for common errors

#### Solution 3: Upgrade Plan
If free tier (5,000 errors/month) is insufficient:
1. Consider upgrading to paid plan
2. Or reduce error frequency

### Issue 4: Logging Not Working

**Symptoms:**
- Logs not appearing in console
- File logging not working
- Logs not in Vercel/Railway

**Solutions:**

#### Check 1: Logger Configuration
```javascript
// Verify logger utility is imported
import { logger } from '../lib/logger'
```

#### Check 2: Production Logging
In production, only errors are logged by default:
```javascript
const isDevelopment = process.env.NODE_ENV === 'development'
if (isDevelopment) {
  console.log('[LOG]', ...args)
}
```

#### Check 3: Vercel Logs
1. Go to Vercel dashboard → Deployments → Logs
2. Check for application logs
3. Logs may be filtered in production

#### Check 4: Railway Logs
1. Go to Railway dashboard → Your service → Logs
2. Check for backend logs
3. Verify logging is configured

### Issue 5: UptimeRobot Monitor Showing Down

**Symptoms:**
- Monitor shows "Down" status
- Alert emails received
- Site is actually up

**Solutions:**

#### Check 1: Verify Site is Actually Down
```powershell
# Test site manually
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing
```

#### Check 2: Check Monitor Configuration
1. URL is correct
2. Keyword exists (if configured)
3. Monitoring interval is appropriate

#### Check 3: Check for Authentication
- If site requires authentication, UptimeRobot can't access
- Use HTTP authentication in monitor settings

#### Check 4: Check SSL Certificate
- UptimeRobot requires valid SSL
- Your site already has HTTPS from Setup #2

#### Check 5: False Positives
- UptimeRobot may have false positives
- Check actual site status before taking action

### Issue 6: Not Receiving Alerts

**Symptoms:**
- UptimeRobot shows down but no email
- Sentry errors but no alerts
- No notification system working

**Solutions:**

#### Check 1: Alert Contact Configuration
1. UptimeRobot → My Alert Contacts
2. Verify email address is correct
3. Check spam folder

#### Check 2: Alert Settings
1. Check alert frequency
2. Check alert threshold
3. Verify notification types

#### Check 3: Sentry Alerts
1. Sentry dashboard → Settings → Alerts
2. Configure alert rules
3. Verify email notifications enabled

#### Check 4: Webhook Configuration
If using webhooks:
1. Verify webhook URL is correct
2. Check webhook endpoint is accessible
3. Test webhook manually

### Issue 7: Performance Impact

**Symptoms:**
- Site slower after adding monitoring
- Increased bundle size
- CPU usage increased

**Solutions:**

#### Check 1: Analytics Performance
Vercel Analytics has minimal performance impact:
- Uses beacon API
- Non-blocking
- Small bundle size

#### Check 2: Sentry Performance
Sentry can impact performance if not configured:
```javascript
// Reduce sampling rate
tracesSampleRate: 0.1, // Only sample 10%
```

#### Check 3: Logging Performance
Excessive logging can slow down app:
- Only log in development
- Use appropriate log levels
- Avoid logging large objects

#### Check 4: Monitor Bundle Size
```powershell
cd C:\Users\DELL\uibac
npm run build
# Check bundle size in output
```

### Getting Help

#### Check Logs
1. **Vercel logs:** Dashboard → Deployments → View logs
2. **Railway logs:** Dashboard → Your service → Logs
3. **Browser console:** F12 → Console tab
4. **Sentry dashboard:** Check error details

#### Useful Commands
```powershell
# Check analytics package
npm list @vercel/analytics

# Check Sentry package
npm list @sentry/nextjs

# Test site availability
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing

# Test backend availability
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing

# Check environment variables
vercel env ls production

# Check git status
git status
```

#### Reset Monitoring Configuration
If monitoring is causing issues and you need to rollback:

```powershell
# Step 1: Restore next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js.backup C:\Users\DELL\uibac\next.config.js

# Step 2: Remove Sentry config files
Remove-Item "C:\Users\DELL\uibac\sentry.client.config.js"
Remove-Item "C:\Users\DELL\uibac\sentry.server.config.js"

# Step 3: Remove logger utility
Remove-Item "C:\Users\DELL\uibac\lib\logger.js"

# Step 4: Remove analytics from code
# Manually remove <Analytics /> component

# Step 5: Rebuild and deploy
cd C:\Users\DELL\uibac
npm run build
vercel --prod --yes

# Step 6: Disable UptimeRobot monitors
# In UptimeRobot dashboard, pause or delete monitors
```

#### Contact Support
- Vercel Support: https://vercel.com/support
- Sentry Support: https://sentry.io/support
- UptimeRobot Support: https://uptimerobot.com/contact

## Prevention Tips

1. **Monitor in production only** - Avoid overhead in development
2. **Use sampling rates** - Don't capture 100% of errors
3. **Set appropriate log levels** - Only log errors in production
4. **Regularly check dashboards** - Monitor for issues before they become critical
5. **Set up alerts wisely** - Avoid alert fatigue
6. **Keep monitoring lightweight** - Don't over-engineer
7. **Review metrics regularly** - Optimize based on data

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Analytics no data | Check if enabled, wait 10 min |
| Sentry no errors | Check DSN, test with throw new Error() |
| Too many errors | Adjust sampling rate |
| Logging not working | Check logger import, production only |
| UptimeRobot down | Verify site is actually down |
| No alerts | Check alert contact config |
| Performance impact | Reduce sampling rate |

## Dashboard URLs

- **Vercel Analytics:** https://vercel.com/omarsektaoui77-hubs-projects/uibac/analytics
- **Sentry:** https://sentry.io (your org)
- **UptimeRobot:** https://uptimerobot.com/dashboard
- **Vercel Logs:** Dashboard → Deployments → Logs
- **Railway Logs:** Dashboard → Your service → Logs
