# PowerShell Commands - Database & Authentication Setup

# ============================================
# DATABASE SETUP (SUPABASE)
# ============================================

# Install Supabase client
Set-Location "C:\Users\DELL\uibac"
npm install @supabase/supabase-js

# Verify installation
npm list @supabase/supabase-js

# Generate JWT secret
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
Write-Host "JWT_SECRET: $jwtSecret"

# Add to .env.local
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "JWT_SECRET=$jwtSecret" -Force
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "SUPABASE_URL=your-supabase-url" -Force
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "SUPABASE_ANON_KEY=your-anon-key" -Force
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" -Force

# ============================================
# AUTHENTICATION SETUP
# ============================================

# Install JWT and bcrypt packages
npm install jsonwebtoken bcryptjs
npm install @types/jsonwebtoken @types/bcryptjs --save-dev

# Verify installation
npm list jsonwebtoken
npm list bcryptjs

# Create lib directory if not exists
if (!(Test-Path "C:\Users\DELL\uibac\lib")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\lib"
}

# Create context directory if not exists
if (!(Test-Path "C:\Users\DELL\uibac\context")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\context"
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

# Commit database and auth changes
git add .
git commit -m "Add database and authentication"
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
npm list @supabase/supabase-js
npm list jsonwebtoken
npm list bcryptjs

# Check if directories exist
Test-Path "C:\Users\DELL\uibac\lib"
Test-Path "C:\Users\DELL\uibac\context"
Test-Path "C:\Users\DELL\uibac\pages\api\auth"

# ============================================
# CLEANUP / ROLLBACK
# ============================================

# Remove auth context
Remove-Item "C:\Users\DELL\uibac\context\AuthContext.js"

# Remove auth pages
Remove-Item "C:\Users\DELL\uibac\pages\login.js"
Remove-Item "C:\Users\DELL\uibac\pages\register.js"
Remove-Item "C:\Users\DELL\uibac\pages\dashboard.js"

# Remove auth API routes
Remove-Item "C:\Users\DELL\uibac\pages\api\auth\*.js"

# Remove protected routes
Remove-Item "C:\Users\DELL\uibac\pages\api\protected.js"

# Remove auth utilities
Remove-Item "C:\Users\DELL\uibac\lib\auth.js"
Remove-Item "C:\Users\DELL\uibac\lib\supabase.js"

# Remove middleware
Remove-Item "C:\Users\DELL\uibac\lib\middleware.js"

# Rebuild after rollback
Set-Location "C:\Users\DELL\uibac"
npm run build

# Redeploy
vercel --prod --yes

# ============================================
# VERIFICATION SCRIPT
# ============================================

Write-Host "=== DATABASE & AUTHENTICATION SETUP VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n1. Checking database packages..." -ForegroundColor Yellow
$supabaseExists = npm list @supabase/supabase-js 2>$null
if ($supabaseExists) { Write-Host "✅ @supabase/supabase-js installed" -ForegroundColor Green } else { Write-Host "❌ @supabase/supabase-js not installed" -ForegroundColor Red }

Write-Host "`n2. Checking authentication packages..." -ForegroundColor Yellow
$jwtExists = npm list jsonwebtoken 2>$null
$bcryptExists = npm list bcryptjs 2>$null
if ($jwtExists) { Write-Host "✅ jsonwebtoken installed" -ForegroundColor Green } else { Write-Host "❌ jsonwebtoken not installed" -ForegroundColor Red }
if ($bcryptExists) { Write-Host "✅ bcryptjs installed" -ForegroundColor Green } else { Write-Host "❌ bcryptjs not installed" -ForegroundColor Red }

Write-Host "`n3. Checking configuration files..." -ForegroundColor Yellow
$libExists = Test-Path "C:\Users\DELL\uibac\lib"
$contextExists = Test-Path "C:\Users\DELL\uibac\context"
$authApiExists = Test-Path "C:\Users\DELL\uibac\pages\api\auth"

if ($libExists) { Write-Host "✅ lib directory exists" -ForegroundColor Green } else { Write-Host "❌ lib directory missing" -ForegroundColor Red }
if ($contextExists) { Write-Host "✅ context directory exists" -ForegroundColor Green } else { Write-Host "❌ context directory missing" -ForegroundColor Red }
if ($authApiExists) { Write-Host "✅ auth API directory exists" -ForegroundColor Green } else { Write-Host "❌ auth API directory missing" -ForegroundColor Red }

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
Write-Host "1. Create Supabase account and get credentials" -ForegroundColor White
Write-Host "2. Add SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY to Vercel" -ForegroundColor White
Write-Host "3. Create database tables in Supabase SQL Editor" -ForegroundColor White
Write-Host "4. Test registration and login in browser" -ForegroundColor White
Write-Host "5. Test protected routes with valid token" -ForegroundColor White
