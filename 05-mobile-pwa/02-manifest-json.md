# Step 2: App Manifest Configuration

## Overview
The manifest.json file provides metadata about your PWA, including name, icons, colors, and display settings. This is required for PWA installation.

## What is manifest.json?
A JSON file that describes:
- App name and short name
- Icons for different screen sizes
- Theme colors
- Display mode (standalone, fullscreen, etc.)
- Start URL
- Orientation

## Step-by-Step Instructions

### 1. Create manifest.json

#### Create file: `public/manifest.json`

```json
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
```

#### PowerShell Command to Create:
```powershell
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
```

### 2. Generate PWA Icons

#### Option A: Use Online Icon Generator (Recommended)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo or image
3. Download generated icons
4. Extract and copy to `public/` directory:
   - icon-192x192.png
   - icon-512x512.png

#### Option B: Use PowerShell to Create Simple Icons
```powershell
# This requires ImageMagick or similar tool
# For now, use the online generator above
```

#### Option C: Use Placeholder Icons (For Testing)
```powershell
# Download placeholder icons from a service
# Or create simple colored squares
# For production, use proper icons
```

#### PowerShell Commands to Verify Icons:
```powershell
# Check if icons exist
if (Test-Path "C:\Users\DELL\uibac\public\icon-192x192.png") {
    Write-Host "✅ icon-192x192.png exists" -ForegroundColor Green
} else {
    Write-Host "❌ icon-192x192.png missing" -ForegroundColor Red
}

if (Test-Path "C:\Users\DELL\uibac\public\icon-512x512.png") {
    Write-Host "✅ icon-512x512.png exists" -ForegroundColor Green
} else {
    Write-Host "❌ icon-512x512.png missing" -ForegroundColor Red
}
```

### 3. Add Manifest to HTML

#### Update `pages/_document.js` (or `app/layout.js` for App Router):

```javascript
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

#### PowerShell Command to Check if File Exists:
```powershell
if (Test-Path "C:\Users\DELL\uibac\pages\_document.js") {
    Write-Host "✅ pages/_document.js exists" -ForegroundColor Green
} else {
    Write-Host "❌ pages/_document.js missing (create it manually)" -ForegroundColor Red
}
```

### 4. Update next.config.js for Icons

#### Update next.config.js:
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
  images: {
    domains: ['roundhouse.proxy.rlwy.net'],
  },
}

module.exports = withPWA(nextConfig)
```

### 5. Test Manifest

#### Build Production Version:
```powershell
cd C:\Users\DELL\uibac
npm run build
npm start
```

#### Verify in Browser:
1. Open http://localhost:3000
2. Press F12 → Application tab
3. Click "Manifest" section
4. Verify manifest is loaded
5. Check icons are displayed

### 6. Add More Icon Sizes (Optional)

For better PWA support, add more icon sizes:

```json
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
      "src": "/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Time Estimate
**20 minutes** to complete this step (including icon generation)

## Cost
**$0** - Icons are free to generate

## Common Issues

### Issue: Manifest not loading
**Solution:**
1. Check manifest.json is in public/ directory
2. Verify JSON syntax (use JSON validator)
3. Check browser console for errors
4. Ensure manifest link is in HTML head

### Issue: Icons not displaying
**Solution:**
1. Verify icon files exist in public/ directory
2. Check file paths in manifest.json
3. Ensure icons are PNG format
4. Clear browser cache

### Issue: PWA not installable
**Solution:**
1. Service worker must be active
2. Manifest must be valid
3. HTTPS is required (already have from Setup #2)
4. Test on mobile device

## Next Steps
- Implement service worker (see `03-service-worker.md`)
- Test mobile installation (see `04-mobile-testing.md`)
