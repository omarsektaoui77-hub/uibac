# Step 4: Testing & Verification

## Overview
Comprehensive testing to ensure HTTPS backend is working correctly with Vercel frontend, no mixed-content errors, and CORS is properly configured.

## Pre-Test Checklist
- [ ] Backend HTTPS is enabled (Step 1)
- [ ] CORS is configured (Step 2)
- [ ] Frontend is updated to use HTTPS (Step 3)
- [ ] Environment variables are updated in Vercel
- [ ] Local .env.local is updated

## Test #1: Backend HTTPS Connectivity

### PowerShell Command:
```powershell
# Test HTTPS backend
$response = Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response) {
    Write-Host "✅ Backend HTTPS working (Status: $($response.StatusCode))" -ForegroundColor Green
} else {
    Write-Host "❌ Backend HTTPS failed" -ForegroundColor Red
}
```

**Expected Result:** ✅ Backend HTTPS working (Status: 200 or 404)

## Test #2: CORS Configuration

### PowerShell Command:
```powershell
# Test CORS headers
$response = Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response) {
    $corsHeaders = $response.Headers | Where-Object { $_ -like "*Access-Control*" }
    if ($corsHeaders) {
        Write-Host "✅ CORS headers present" -ForegroundColor Green
        $corsHeaders
    } else {
        Write-Host "⚠️ CORS headers not found (may not be needed)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ CORS test failed" -ForegroundColor Red
}
```

**Expected Result:** ✅ CORS headers present or ⚠️ CORS headers not found (may not be needed)

## Test #3: Local Development

### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Start dev server in background
Start-Process npm -ArgumentList "run", "dev" -NoNewWindow

# Wait 10 seconds for server to start
Start-Sleep -Seconds 10

# Test local server
$localResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -ErrorAction SilentlyContinue
if ($localResponse) {
    Write-Host "✅ Local dev server running (Status: $($localResponse.StatusCode))" -ForegroundColor Green
} else {
    Write-Host "❌ Local dev server failed" -ForegroundColor Red
}

# Kill dev server when done
Get-Process node | Stop-Process -Force
```

**Expected Result:** ✅ Local dev server running (Status: 200)

## Test #4: Preview Deployment

### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Deploy to preview
vercel --yes

# Get preview URL
$previewUrl = vercel ls | Select-String "Preview" | Select-String "https" | ForEach-Object { ($_ -split '\s+')[2] }
Write-Host "Preview URL: $previewUrl" -ForegroundColor Cyan

# Test preview deployment
$previewResponse = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -ErrorAction SilentlyContinue
if ($previewResponse) {
    Write-Host "✅ Preview deployment working (Status: $($previewResponse.StatusCode))" -ForegroundColor Green
} else {
    Write-Host "❌ Preview deployment failed" -ForegroundColor Red
}
```

**Expected Result:** ✅ Preview deployment working (Status: 200)

## Test #5: Browser Console Testing (Manual)

### Step 1: Open Preview URL
1. Copy the preview URL from the output above
2. Open in browser
3. Press F12 → Console tab

### Step 2: Test HTTPS Backend
```javascript
// Test HTTPS backend
fetch('https://roundhouse.proxy.rlwy.net:39487')
  .then(res => console.log('✅ HTTPS Status:', res.status))
  .catch(err => console.error('❌ HTTPS Error:', err.message));
```

**Expected Result:** ✅ HTTPS Status: 200 or 404

### Step 3: Test API Endpoint
```javascript
// Test API endpoint
fetch('https://roundhouse.proxy.rlwy.net:39487/api/health')
  .then(res => console.log('✅ API Status:', res.status))
  .catch(err => console.error('❌ API Error:', err.message));
```

**Expected Result:** ✅ API Status: 200 or 404

### Step 4: Check for Mixed-Content Errors
```javascript
// Check console for mixed-content errors
// If you see: "Mixed Content: The page was loaded over HTTPS..."
// Then HTTPS is not working correctly
```

**Expected Result:** No mixed-content errors

### Step 5: Check Network Tab
1. Press F12 → Network tab
2. Refresh the page
3. Look for requests to `roundhouse.proxy.rlwy.net`
4. Check status codes (should be 200 or 404)
5. Check for CORS errors in red

**Expected Result:** No CORS errors, status codes are 200 or 404

## Test #6: Production Deployment

### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Deploy to production
vercel --prod --yes

# Test production
$prodResponse = Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing -ErrorAction SilentlyContinue
if ($prodResponse) {
    Write-Host "✅ Production deployment working (Status: $($prodResponse.StatusCode))" -ForegroundColor Green
} else {
    Write-Host "❌ Production deployment failed" -ForegroundColor Red
}
```

**Expected Result:** ✅ Production deployment working (Status: 200)

## Test #7: Production Browser Testing (Manual)

### Step 1: Open Production URL
1. Go to https://uibac.vercel.app
2. Press F12 → Console tab

### Step 2: Test HTTPS Backend from Production
```javascript
fetch('https://roundhouse.proxy.rlwy.net:39487')
  .then(res => console.log('✅ Production HTTPS Status:', res.status))
  .catch(err => console.error('❌ Production HTTPS Error:', err.message));
```

**Expected Result:** ✅ Production HTTPS Status: 200 or 404

### Step 3: Test Environment Variable
```javascript
// Check if environment variable is set
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

**Expected Result:** API URL: https://roundhouse.proxy.rlwy.net:39487

## Test #8: Mobile Testing

### Step 1: Generate QR Code for Testing

#### PowerShell Command:
```powershell
# Install QR code generator (if not installed)
# npm install -g qrcode

# Generate QR code for production URL
qrcode https://uibac.vercel.app
```

Or use online QR code generator: https://www.qrcode-generator.com/

### Step 2: Test on Mobile Device
1. Scan QR code with your phone
2. Open the URL
3. Test all features
4. Check for any errors
5. Verify HTTPS lock icon in browser

**Expected Result:** App works on mobile, HTTPS lock icon visible

## Test #9: Security Headers Check

### PowerShell Command:
```powershell
# Check security headers
$response = Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing
$headers = $response.Headers
Write-Host "Security Headers:" -ForegroundColor Cyan
$headers | Where-Object { $_ -like "*Strict-Transport*" -or $_ -like "*Content-Security*" -or $_ -like "*X-Frame*" }
```

**Expected Result:** Security headers present

## Final Verification Checklist

- [ ] Backend HTTPS is working (Test #1)
- [ ] CORS is configured correctly (Test #2)
- [ ] Local development works (Test #3)
- [ ] Preview deployment works (Test #4)
- [ ] Browser console shows no errors (Test #5)
- [ ] Production deployment works (Test #6)
- [ ] Production browser testing passes (Test #7)
- [ ] Mobile testing passes (Test #8)
- [ ] Security headers are present (Test #9)

## Rollback Plan

If tests fail, rollback to HTTP:

### Step 1: Revert Environment Variables
```powershell
# In Vercel dashboard, change NEXT_PUBLIC_API_URL back to:
# http://roundhouse.proxy.rlwy.net:39487
```

### Step 2: Revert vercel.json
```powershell
Copy-Item C:\Users\DELL\uibac\vercel.json.backup C:\Users\DELL\uibac\vercel.json
```

### Step 3: Redeploy
```powershell
vercel --prod --yes
```

## Time Estimate
**15 minutes** to complete all tests

## Cost
**$0** - Testing is free

## Next Steps
- Review troubleshooting guide (see `05-troubleshooting.md`)
- If all tests pass, proceed to next setup (Setup #3: Monitoring)
