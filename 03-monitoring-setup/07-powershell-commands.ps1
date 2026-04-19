# PowerShell Commands - Monitoring & Logging Setup

# ============================================
# VERCEL ANALYTICS
# ============================================

# Install analytics package
Set-Location "C:\Users\DELL\uibac"
npm install @vercel/analytics

# Verify installation
npm list @vercel/analytics

# ============================================
# SENTRY SETUP
# ============================================

# Install Sentry SDK
npm install @sentry/nextjs

# Verify installation
npm list @sentry/nextjs

# Backup next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js C:\Users\DELL\uibac\next.config.js.backup

# Create Sentry client config
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

# Create Sentry server config
$sentryServerConfig = @"
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
"@
Set-Content -Path "C:\Users\DELL\uibac\sentry.server.config.js" -Value $sentryServerConfig

# Add Sentry to .gitignore
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "`n# Sentry" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value ".sentryclirc" -Force

# ============================================
# LOGGING CONFIGURATION
# ============================================

# Create lib directory
if (!(Test-Path "C:\Users\DELL\uibac\lib")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\lib"
}

# Create logger utility
$loggerUtil = @"
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args)
    }
  },
  error: (...args) => {
    console.error('[ERROR]', ...args)
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args)
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },
}
"@
Set-Content -Path "C:\Users\DELL\uibac\lib\logger.js" -Value $loggerUtil

# Create logs directory
if (!(Test-Path "C:\Users\DELL\uibac\logs")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\logs"
}

# Add logs to .gitignore
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "logs/" -Force

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

# Commit monitoring changes
git add .
git commit -m "Add monitoring and logging configuration"
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

# Test backend URL
Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing

# Check environment variables
vercel env ls production

# Check package installations
npm list @vercel/analytics
npm list @sentry/nextjs

# ============================================
# CLEANUP / ROLLBACK
# ============================================

# Restore next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js.backup C:\Users\DELL\uibac\next.config.js

# Remove Sentry config files
Remove-Item "C:\Users\DELL\uibac\sentry.client.config.js"
Remove-Item "C:\Users\DELL\uibac\sentry.server.config.js"

# Remove logger utility
Remove-Item "C:\Users\DELL\uibac\lib\logger.js"

# Rebuild after rollback
Set-Location "C:\Users\DELL\uibac"
npm run build

# Redeploy
vercel --prod --yes

# ============================================
# VERIFICATION SCRIPT
# ============================================

Write-Host "=== MONITORING SETUP VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n1. Checking monitoring packages..." -ForegroundColor Yellow
$analyticsExists = npm list @vercel/analytics 2>$null
$sentryExists = npm list @sentry/nextjs 2>$null

if ($analyticsExists) { Write-Host "✅ @vercel/analytics installed" -ForegroundColor Green } else { Write-Host "❌ @vercel/analytics not installed" -ForegroundColor Red }
if ($sentryExists) { Write-Host "✅ @sentry/nextjs installed" -ForegroundColor Green } else { Write-Host "❌ @sentry/nextjs not installed" -ForegroundColor Red }

Write-Host "`n2. Checking configuration files..." -ForegroundColor Yellow
$sentryClientExists = Test-Path "C:\Users\DELL\uibac\sentry.client.config.js"
$sentryServerExists = Test-Path "C:\Users\DELL\uibac\sentry.server.config.js"
$loggerExists = Test-Path "C:\Users\DELL\uibac\lib\logger.js"

if ($sentryClientExists) { Write-Host "✅ sentry.client.config.js exists" -ForegroundColor Green } else { Write-Host "❌ sentry.client.config.js missing" -ForegroundColor Red }
if ($sentryServerExists) { Write-Host "✅ sentry.server.config.js exists" -ForegroundColor Green } else { Write-Host "❌ sentry.server.config.js missing" -ForegroundColor Red }
if ($loggerExists) { Write-Host "✅ lib/logger.js exists" -ForegroundColor Green } else { Write-Host "❌ lib/logger.js missing" -ForegroundColor Red }

Write-Host "`n3. Testing production URLs..." -ForegroundColor Yellow
try {
    $prodResponse = Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Production URL accessible (Status: $($prodResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Production URL failed: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $backendResponse = Invoke-WebRequest -Uri "https://roundhouse.proxy.rlwy.net:39487" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend URL accessible (Status: $($backendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend URL failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Checking environment variables..." -ForegroundColor Yellow
$envVars = vercel env ls production 2>$null
if ($envVars) { Write-Host "✅ Environment variables configured" -ForegroundColor Green } else { Write-Host "⚠️ Check environment variables manually" -ForegroundColor Yellow }

Write-Host "`n=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Enable Vercel Analytics in dashboard" -ForegroundColor White
Write-Host "2. Create Sentry account and add DSN to environment variables" -ForegroundColor White
Write-Host "3. Set up UptimeRobot monitors" -ForegroundColor White
Write-Host "4. Test error tracking with: throw new Error('test')" -ForegroundColor White
