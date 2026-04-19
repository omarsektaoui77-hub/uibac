# PowerShell Commands - Mobile PWA Setup

# ============================================
# PWA INSTALLATION
# ============================================

# Install next-pwa
cd C:\Users\DELL\uibac
npm install next-pwa

# Verify installation
npm list next-pwa

# ============================================
# CONFIGURATION FILES
# ============================================

# Backup next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js C:\Users\DELL\uibac\next.config.js.backup

# Create public directory if not exists
if (!(Test-Path "C:\Users\DELL\uibac\public")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\public"
}

# Create manifest.json
$manifest = @"
{
  "name": "uibac",
  "short_name": "uibac",
  "description": "Progressive Web App for uibac",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
"@
Set-Content -Path "C:\Users\DELL\uibac\public\manifest.json" -Value $manifest

# Verify manifest
Test-Path "C:\Users\DELL\uibac\public\manifest.json"
Get-Content "C:\Users\DELL\uibac\public\manifest.json"

# Create offline page
$offlinePage = @"
export default function Offline() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>You are offline</h1>
      <p>Please check your internet connection</p>
    </div>
  )
}
"@
Set-Content -Path "C:\Users\DELL\uibac\pages\offline.js" -Value $offlinePage

# Add PWA files to .gitignore
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "`n# PWA" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/sw.js" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/workbox-*.js" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/worker-*.js" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/sw.js.map" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/workbox-*.js.map" -Force

# ============================================
# BUILD & TEST
# ============================================

# Install dependencies
cd C:\Users\DELL\uibac
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
# DEPLOYMENT
# ============================================

# Commit PWA changes
git add .
git commit -m "Add PWA configuration"
git push origin main

# Deploy to production
vercel --prod --yes

# Deploy to preview
vercel --yes

# ============================================
# VERIFICATION
# ============================================

# Check if manifest exists
Test-Path "C:\Users\DELL\uibac\public\manifest.json"

# Check if icons exist
Test-Path "C:\Users\DELL\uibac\public\icon-192x192.png"
Test-Path "C:\Users\DELL\uibac\public\icon-512x512.png"

# Check next.config.js
Get-Content "C:\Users\DELL\uibac\next.config.js"

# Test production URL
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing

# ============================================
# QR CODE GENERATION
# ============================================

# Install qrcode package
npm install -g qrcode

# Generate QR code for production URL
qrcode https://uibac.vercel.app

# Generate QR code for localhost
qrcode http://localhost:3000

# ============================================
# CLEANUP / ROLLBACK
# ============================================

# Restore next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js.backup C:\Users\DELL\uibac\next.config.js

# Remove manifest.json
Remove-Item "C:\Users\DELL\uibac\public\manifest.json"

# Remove icons
Remove-Item "C:\Users\DELL\uibac\public\icon-*.png"

# Remove offline page
Remove-Item "C:\Users\DELL\uibac\pages\offline.js"

# Rebuild after rollback
cd C:\Users\DELL\uibac
npm run build

# Redeploy
vercel --prod --yes

# ============================================
# VERIFICATION SCRIPT
# ============================================

Write-Host "=== PWA SETUP VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n1. Checking PWA files..." -ForegroundColor Yellow
$manifestExists = Test-Path "C:\Users\DELL\uibac\public\manifest.json"
$icon192Exists = Test-Path "C:\Users\DELL\uibac\public\icon-192x192.png"
$icon512Exists = Test-Path "C:\Users\DELL\uibac\public\icon-512x512.png"

if ($manifestExists) { Write-Host "✅ manifest.json exists" -ForegroundColor Green } else { Write-Host "❌ manifest.json missing" -ForegroundColor Red }
if ($icon192Exists) { Write-Host "✅ icon-192x192.png exists" -ForegroundColor Green } else { Write-Host "❌ icon-192x192.png missing" -ForegroundColor Red }
if ($icon512Exists) { Write-Host "✅ icon-512x512.png exists" -ForegroundColor Green } else { Write-Host "❌ icon-512x512.png missing" -ForegroundColor Red }

Write-Host "`n2. Checking configuration..." -ForegroundColor Yellow
$configExists = Test-Path "C:\Users\DELL\uibac\next.config.js"
if ($configExists) { Write-Host "✅ next.config.js exists" -ForegroundColor Green } else { Write-Host "❌ next.config.js missing" -ForegroundColor Red }

Write-Host "`n3. Testing production URL..." -ForegroundColor Yellow
try {
    $prodResponse = Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Production URL accessible (Status: $($prodResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Production URL failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Checking PWA package..." -ForegroundColor Yellow
$packageExists = npm list next-pwa
if ($packageExists) { Write-Host "✅ next-pwa installed" -ForegroundColor Green } else { Write-Host "❌ next-pwa not installed" -ForegroundColor Red }

Write-Host "`n=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Generate QR code: qrcode https://uibac.vercel.app" -ForegroundColor White
Write-Host "2. Test on mobile device" -ForegroundColor White
Write-Host "3. Run Lighthouse audit" -ForegroundColor White
