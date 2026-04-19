# PowerShell Commands - Performance Optimization Setup

# ============================================
# REDIS CACHING SETUP
# ============================================

# Install Upstash Redis client
Set-Location "C:\Users\DELL\uibac"
npm install @upstash/redis

# Verify installation
npm list @upstash/redis

# Add Upstash variables to .env.local
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "UPSTASH_REDIS_REST_URL=your-upstash-url" -Force
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "UPSTASH_REDIS_REST_TOKEN=your-upstash-token" -Force

# ============================================
# BUNDLE OPTIMIZATION
# ============================================

# Install bundle analyzer
npm install @next/bundle-analyzer

# Verify installation
npm list @next/bundle-analyzer

# Install depcheck for unused dependencies
npm install -g depcheck

# Check for unused dependencies
depcheck

# Build and analyze bundle
npm run build

# Run bundle analyzer
npm run analyze

# ============================================
# CDN CONFIGURATION
# ============================================

# Ensure public directory exists
if (!(Test-Path "C:\Users\DELL\uibac\public")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\public"
}

# ============================================
# DEPLOYMENT
# ============================================

# Install dependencies
Set-Location "C:\Users\DELL\uibac"
npm install

# Build production version
npm run build

# Start production server
npm start

# Start dev server
npm run dev

# Stop dev server
Get-Process node | Stop-Process -Force

# ============================================
# GIT COMMANDS
# ============================================

# Commit performance optimization changes
git add .
git commit -m "Add performance optimization"
git push origin main

# Deploy to production
vercel --prod --yes

# Deploy to preview
vercel --yes

# ============================================
# VERIFICATION
# ============================================

# Test production URL
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing

# Check environment variables
vercel env ls production

# Check package installations
npm list @upstash/redis
npm list @next/bundle-analyzer

# Check if directories exist
Test-Path "C:\Users\DELL\uibac\lib"
Test-Path "C:\Users\DELL\uibac\public"

# ============================================
# CLEANUP / ROLLBACK
# ============================================

# Remove Redis dependencies
npm uninstall @upstash/redis

# Remove bundle analyzer
npm uninstall @next/bundle-analyzer

# Remove Redis utility
Remove-Item "C:\Users\DELL\uibac\lib\redis.js"

# Remove config utility
Remove-Item "C:\Users\DELL\uibac\lib\config.js"

# Restore next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js.backup C:\Users\DELL\uibac\next.config.js

# Rebuild after rollback
Set-Location "C:\Users\DELL\uibac"
npm run build

# Redeploy
vercel --prod --yes

# ============================================
# VERIFICATION SCRIPT
# ============================================

Write-Host "=== PERFORMANCE OPTIMIZATION SETUP VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n1. Checking performance packages..." -ForegroundColor Yellow
$redisExists = npm list @upstash/redis 2>$null
$analyzerExists = npm list @next/bundle-analyzer 2>$null

if ($redisExists) { Write-Host "✅ @upstash/redis installed" -ForegroundColor Green } else { Write-Host "❌ @upstash/redis not installed" -ForegroundColor Red }
if ($analyzerExists) { Write-Host "✅ @next/bundle-analyzer installed" -ForegroundColor Green } else { Write-Host "❌ @next/bundle-analyzer not installed" -ForegroundColor Red }

Write-Host "`n2. Checking configuration files..." -ForegroundColor Yellow
$redisUtilExists = Test-Path "C:\Users\DELL\uibac\lib\redis.js"
$configUtilExists = Test-Path "C:\Users\DELL\uibac\lib\config.js"
$publicDirExists = Test-Path "C:\Users\DELL\uibac\public"

if ($redisUtilExists) { Write-Host "✅ lib/redis.js exists" -ForegroundColor Green } else { Write-Host "❌ lib/redis.js missing" -ForegroundColor Red }
if ($configUtilExists) { Write-Host "✅ lib/config.js exists" -ForegroundColor Green } else { Write-Host "❌ lib/config.js missing" -ForegroundColor Red }
if ($publicDirExists) { Write-Host "✅ public directory exists" -ForegroundColor Green } else { Write-Host "❌ public directory missing" -ForegroundColor Red }

Write-Host "`n3. Testing build..." -ForegroundColor Yellow
try {
    Set-Location "C:\Users\DELL\uibac"
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Checking environment variables..." -ForegroundColor Yellow
$envVars = vercel env ls production 2>$null
if ($envVars) { Write-Host "✅ Environment variables configured" -ForegroundColor Green } else { Write-Host "⚠️ Check environment variables manually" -ForegroundColor Yellow }

Write-Host "`n5. Testing production URL..." -ForegroundColor Yellow
try {
    $prodResponse = Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Production URL accessible (Status: $($prodResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Production URL failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create Upstash account and get credentials" -ForegroundColor White
Write-Host "2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel" -ForegroundColor White
Write-Host "3. Run bundle analyzer: npm run analyze" -ForegroundColor White
Write-Host "4. Test caching in browser console" -ForegroundColor White
Write-Host "5. Run Lighthouse audit to check performance" -ForegroundColor White
