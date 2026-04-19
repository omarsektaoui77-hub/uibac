# PowerShell Commands - HTTPS & Custom Domain Setup

# ============================================
# RAILWAY HTTPS SETUP
# ============================================

# Test HTTPS backend connectivity
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing

# Test specific endpoint
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487/api/health" -UseBasicParsing

# Check CORS headers
$response = Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response) { $response.Headers | Where-Object { $_ -like "*Access-Control*" } }

# ============================================
# ENVIRONMENT VARIABLES
# ============================================

# List Vercel environment variables (production)
vercel env ls production

# List Vercel environment variables (preview)
vercel env ls preview

# Add HTTPS environment variable (requires interactive input)
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://roundhouse.proxy.rlwy.net:39487

# Pull environment variables locally
vercel env pull .env.local

# Update .env.local to HTTPS
Set-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "NEXT_PUBLIC_API_URL=https://roundhouse.proxy.rlwy.net:39487"

# Read .env.local
Get-Content "C:\Users\DELL\uibac\.env.local"

# ============================================
# BACKUP FILES
# ============================================

# Backup vercel.json
Copy-Item C:\Users\DELL\uibac\vercel.json C:\Users\DELL\uibac\vercel.json.backup

# Restore from backup
Copy-Item C:\Users\DELL\uibac\vercel.json.backup C:\Users\DELL\uibac\vercel.json

# ============================================
# DEPLOYMENT
# ============================================

# Deploy to preview
vercel --yes

# Deploy to production
vercel --prod --yes

# List all deployments
vercel ls

# List preview deployments
vercel ls | findstr Preview

# List production deployments
vercel ls --prod

# Delete preview deployment
vercel rm --yes --safe

# ============================================
# TESTING
# ============================================

# Test production URL
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing

# Test backend HTTPS
$response = Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response) { Write-Host "✅ Backend HTTPS working (Status: $($response.StatusCode))" -ForegroundColor Green } else { Write-Host "❌ Backend HTTPS failed" -ForegroundColor Red }

# Test CORS headers
$response = Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response) {
    $corsHeaders = $response.Headers | Where-Object { $_ -like "*Access-Control*" }
    if ($corsHeaders) { Write-Host "✅ CORS headers present" -ForegroundColor Green; $corsHeaders }
}

# ============================================
# LOCAL DEVELOPMENT
# ============================================

# Install dependencies
npm install

# Start development server
npm run dev

# Start dev server in background
Start-Process npm -ArgumentList "run", "dev" -NoNewWindow

# Stop dev server
Get-Process node | Stop-Process -Force

# Kill process on port 3000
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force

# ============================================
# GIT COMMANDS
# ============================================

# Commit changes
git add .
git commit -m "Update frontend to use HTTPS backend"
git push origin main

# Create git tag
git tag https-setup-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin --tags

# ============================================
# VERIFICATION SCRIPT
# ============================================

Write-Host "=== HTTPS SETUP VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n1. Testing Backend HTTPS..." -ForegroundColor Yellow
$backendUrl = "https://roundhouse.proxy.rlwy.net:39487"
try {
    $backendResponse = Invoke-WebRequest -Uri $backendUrl -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend HTTPS working (Status: $($backendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend HTTPS failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing Production URL..." -ForegroundColor Yellow
$prodUrl = "https://uibac.vercel.app"
try {
    $prodResponse = Invoke-WebRequest -Uri $prodUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Production loads (Status: $($prodResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Production failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Checking Environment Variables..." -ForegroundColor Yellow
$envContent = Get-Content "C:\Users\DELL\uibac\.env.local" -ErrorAction SilentlyContinue
if ($envContent -like "*https://*") {
    Write-Host "✅ Environment variable set to HTTPS" -ForegroundColor Green
} else {
    Write-Host "❌ Environment variable not set to HTTPS" -ForegroundColor Red
}

Write-Host "`n=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan

# ============================================
# ROLLBACK COMMANDS
# ============================================

# Revert environment variable (manual - use Vercel dashboard)
# Change NEXT_PUBLIC_API_URL back to: http://roundhouse.proxy.rlwy.net:39487

# Restore vercel.json from backup
Copy-Item C:\Users\DELL\uibac\vercel.json.backup C:\Users\DELL\uibac\vercel.json

# Redeploy to production
vercel --prod --yes

# Test HTTP backend (after rollback)
Invoke-WebRequest -Uri "http://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing
