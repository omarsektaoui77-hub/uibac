# Step 1: PWA Basics & Configuration

## Overview
Progressive Web Apps (PWAs) are web applications that can be installed on devices, work offline, and provide a native app-like experience.

## What is a PWA?
A PWA is a web app that:
- Can be installed on mobile and desktop
- Works offline with service workers
- Has a manifest.json file with app metadata
- Has app icons for different screen sizes
- Is mobile-responsive
- Provides push notifications (optional)

## Benefits of PWA
- **Installable:** Users can add to home screen
- **Offline support:** Works without internet
- **Fast:** Caches resources for quick loading
- **Engaging:** Push notifications
- **Cross-platform:** Works on iOS, Android, desktop
- **No app store approval:** Direct installation

## Step-by-Step Instructions

### 1. Install PWA Dependencies

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install next-pwa plugin
npm install next-pwa

# Install @ducanh2912/next-pwa (alternative if needed)
# npm install @ducanh2912/next-pwa
```

### 2. Update next.config.js

#### Current next.config.js:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

#### Updated next.config.js (with PWA):
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
```

#### PowerShell Command to Update:
```powershell
# Backup current config
Copy-Item C:\Users\DELL\uibac\next.config.js C:\Users\DELL\uibac\next.config.js.backup

# Update the file manually with the code above
# Or use this command to create new config
$nextConfig = @"
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
"@
Set-Content -Path "C:\Users\DELL\uibac\next.config.js" -Value $nextConfig
```

### 3. Create Public Directory (if not exists)

#### PowerShell Command:
```powershell
# Check if public directory exists
if (!(Test-Path "C:\Users\DELL\uibac\public")) {
    New-Item -ItemType Directory -Path "C:\Users\DELL\uibac\public"
    Write-Host "✅ Created public directory" -ForegroundColor Green
} else {
    Write-Host "✅ Public directory already exists" -ForegroundColor Green
}
```

### 4. Update .gitignore

#### Add to .gitignore:
```gitignore
# PWA
public/sw.js
public/workbox-*.js
public/worker-*.js
public/sw.js.map
public/workbox-*.js.map
```

#### PowerShell Command:
```powershell
# Add PWA files to .gitignore
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "`n# PWA" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/sw.js" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/workbox-*.js" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/worker-*.js" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/sw.js.map" -Force
Add-Content -Path "C:\Users\DELL\uibac\.gitignore" -Value "public/workbox-*.js.map" -Force
```

### 5. Test Local Development

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Start development server
npm run dev
```

#### Verification:
1. Open http://localhost:3000
2. Press F12 → Application tab
3. Check "Service Workers" section
4. Service worker should be registered (disabled in development)

### 6. Build and Test Production Build

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Build production version
npm run build

# Start production server
npm start
```

#### Verification:
1. Open http://localhost:3000
2. Press F12 → Application tab
3. Check "Service Workers" section
4. Service worker should be active
5. Check "Manifest" section
6. Manifest should be loaded

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - PWA is free

## Common Issues

### Issue: next-pwa not working
**Solution:**
1. Ensure package is installed: `npm install next-pwa`
2. Check next.config.js syntax
3. Restart dev server
4. Check for TypeScript errors

### Issue: Service worker not registering
**Solution:**
1. Service workers are disabled in development by default
2. Test with production build: `npm run build && npm start`
3. Check browser console for errors

### Issue: Build fails
**Solution:**
1. Check next.config.js syntax
2. Ensure all dependencies are installed
3. Check Node.js version (v18+)

## Next Steps
- Create app manifest (see `02-manifest-json.md`)
- Implement service worker (see `03-service-worker.md`)
