# Step 4: UptimeRobot Monitoring Setup

## Overview
UptimeRobot provides free uptime monitoring to alert you when your site goes down.

## What is UptimeRobot?
UptimeRobot is a free monitoring service that:
- Checks your site uptime every 5 minutes
- Alerts you when your site goes down
- Provides uptime statistics
- Free tier: 50 monitors

## Step-by-Step Instructions

### 1. Create UptimeRobot Account

#### Step A: Sign Up
1. Go to https://uptimerobot.com
2. Click "Sign Up"
3. Sign up for free account
4. Verify email address

#### Step B: Login
1. Login to UptimeRobot dashboard
2. Go to "My Monitors" section

### 2. Add New Monitor for Frontend

#### Step A: Click "Add New Monitor"
1. Click "Add New Monitor" button
2. Select "HTTPS" monitor type

#### Step B: Configure Monitor
- **Monitor Type:** HTTPS
- **Friendly Name:** "uibac Frontend"
- **URL (or IP):** https://uibac.vercel.app
- **Monitoring Interval:** 5 minutes (free tier)
- **Monitor Type:** Keyword
- **Keyword (optional):** Leave empty or add a word from your homepage

#### Step C: Alert Settings
- **Alert Contacts:** Add your email
- **Notification Types:** Email (free)
- **Alert When:** Down (1 occurrence)

#### Step D: Save Monitor
1. Click "Create Monitor"
2. Monitor will start checking immediately

### 3: Add New Monitor for Backend

#### Step A: Click "Add New Monitor"
1. Click "Add New Monitor" button
2. Select "HTTP" monitor type

#### Step B: Configure Monitor
- **Monitor Type:** HTTP
- **Friendly Name:** "uibac Backend"
- **URL (or IP):** https://roundhouse.proxy.rlwy.net:39487
- **Monitoring Interval:** 5 minutes (free tier)
- **Monitor Type:** Keyword
- **Keyword (optional):** Leave empty

#### Step C: Alert Settings
- **Alert Contacts:** Add your email
- **Notification Types:** Email (free)
- **Alert When:** Down (1 occurrence)

#### Step D: Save Monitor
1. Click "Create Monitor"
2. Monitor will start checking immediately

### 4: Add Additional Monitors (Optional)

#### Monitor Specific API Endpoints:
1. Add monitor for: https://uibac.vercel.app/api/health
2. Add monitor for: https://roundhouse.proxy.rlwy.net:39487/api/health
3. Configure keyword: "ok" or "success"

#### Monitor Database (if applicable):
1. Add monitor for database endpoint
2. Configure appropriate settings

### 5: Configure Alert Notifications

#### Add Multiple Alert Contacts:
1. Go to "My Alert Contacts"
2. Click "Add New Alert Contact"
3. Options:
   - Email (free)
   - SMS (paid)
   - Slack (paid)
   - Webhook (free)

#### Configure Webhook (Optional):
1. Create webhook endpoint in your app
2. Add webhook URL to UptimeRobot
3. Receive alerts programmatically

### 6: Test Monitors

#### Test Frontend Monitor:
1. In UptimeRobot dashboard
2. Click "Test" next to monitor
3. Check if monitor succeeds

#### Test Backend Monitor:
1. In UptimeRobot dashboard
2. Click "Test" next to monitor
3. Check if monitor succeeds

### 7: View Monitoring Dashboard

#### Check Uptime Statistics:
1. Go to UptimeRobot dashboard
2. Click on a monitor
3. View uptime percentage
4. View response time graph
5. View incident history

#### Public Uptime Page (Optional):
1. In monitor settings
2. Enable "Public Status Page"
3. Share URL with users

### 8: Configure Status Page (Optional)

#### Create Public Status Page:
1. Go to "Status Pages" in UptimeRobot
2. Click "Create New Status Page"
3. Add monitors to display
4. Customize branding
5. Share URL: https://stats.uptimerobot.com/your-page

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - UptimeRobot free tier (50 monitors)

## Common Issues

### Issue: Monitor showing down
**Solution:**
1. Check if site is actually down
2. Verify URL is correct
3. Check if keyword exists in page
4. Check if site requires authentication

### Issue: Not receiving alerts
**Solution:**
1. Verify email address is correct
2. Check spam folder
3. Verify alert settings
4. Test alert contact

### Issue: Monitor checking too frequently
**Solution:**
1. Free tier is limited to 5-minute intervals
2. Upgrade to paid for 1-minute intervals
3. Use multiple monitors for different endpoints

## Next Steps
- Test and verify monitoring (see `05-testing-verification.md`)
