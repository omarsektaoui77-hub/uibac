# PowerShell Commands - Quick Reference

# ============================================
# DEPLOYMENT COMMANDS
# ============================================

# Create test branch
git checkout -b preview/test-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin preview/test-*

# Deploy to preview (NOT production)
vercel --yes

# Deploy to production
vercel --prod --yes

# List all deployments
vercel ls

# List only preview deployments
vercel ls | findstr Preview

# List production deployments
vercel ls --prod

# Delete preview deployment
vercel rm --yes --safe

# ============================================
# GIT COMMANDS
# ============================================

# Check current branch
git branch

# Check git status
git status

# Switch to main branch
git checkout main

# Delete local branch
git branch -D preview/test-*

# Delete remote branch
git push origin --delete preview/test-*

# Create git tag
git tag working-production-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin --tags

# Get current commit hash
git rev-parse HEAD

# ============================================
# BACKEND TESTING
# ============================================

# Test backend connectivity
Invoke-WebRequest -Uri "http://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing

# Test specific endpoint
Invoke-WebRequest -Uri "http://roundhouse.proxy.rlwy.net:39487/api/health" -UseBasicParsing

# Test with PowerShell (more details)
$response = Invoke-WebRequest -Uri "http://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response) { "Status: " + $response.StatusCode } else { "Backend unreachable" }

# ============================================
# ENVIRONMENT VARIABLES
# ============================================

# List Vercel environment variables (preview)
vercel env ls preview

# List Vercel environment variables (production)
vercel env ls production

# Add environment variable (requires interactive input)
vercel env add NEXT_PUBLIC_API_URL preview

# Pull environment variables to local file
vercel env pull .env.local

# Create .env.local file
Set-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "NEXT_PUBLIC_API_URL=http://roundhouse.proxy.rlwy.net:39487"

# Read .env.local file
Get-Content "C:\Users\DELL\uibac\.env.local"

# ============================================
# FILE OPERATIONS
# ============================================

# Check if file exists
Test-Path "C:\Users\DELL\uibac\file.txt"

# Copy file
Copy-Item "source.txt" "destination.txt"

# Backup file
Copy-Item "C:\Users\DELL\uibac\vercel.json" "C:\Users\DELL\uibac\vercel.json.backup"

# Get file content
Get-Content "C:\Users\DELL\uibac\file.txt"

# Set file content
Set-Content -Path "C:\Users\DELL\uibac\file.txt" -Value "content"

# Delete file
Remove-Item "C:\Users\DELL\uibac\file.txt"

# ============================================
# PORT AND PROCESS MANAGEMENT
# ============================================

# Check port usage
netstat -ano | findstr :3000

# Kill process on specific port
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force

# List running Node.js processes
Get-Process node

# Kill all Node.js processes
Get-Process node | Stop-Process -Force

# ============================================
# VERCEL CLI
# ============================================

# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Inspect deployment
vercel inspect

# Rollback to previous deployment
# Usage: vercel rollback <deployment-url>
# Replace <deployment-url> with actual URL from vercel ls --prod

# ============================================
# BACKUP AND RESTORE
# ============================================

# Backup production deployment info
vercel ls --prod > C:\Users\DELL\uibac\production-backup.txt

# Backup vercel.json
Copy-Item C:\Users\DELL\uibac\vercel.json C:\Users\DELL\uibac\vercel.json.backup

# Create git tag for working state
git tag working-production-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git push origin --tags

# Save commit hash
git rev-parse HEAD > C:\Users\DELL\uibac\working-commit.txt

# ============================================
# NPM COMMANDS
# ============================================

# Install dependencies
npm install

# Install global package
npm install -g vercel

# Build project
npm run build

# Start development server
npm run dev

# Start production server
npm start

# ============================================
# VERIFICATION SCRIPT
# ============================================

Write-Host "=== FINAL VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n1. Testing Backend API..." -ForegroundColor Yellow
$backendUrl = "http://roundhouse.proxy.rlwy.net:39487"
try {
    $backendResponse = Invoke-WebRequest -Uri $backendUrl -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend reachable (Status: $($backendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend unreachable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing Production URL..." -ForegroundColor Yellow
$prodUrl = "https://uibac.vercel.app"
try {
    $prodResponse = Invoke-WebRequest -Uri $prodUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Production loads (Status: $($prodResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Production failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TESTING COMPLETE ===" -ForegroundColor Cyan
