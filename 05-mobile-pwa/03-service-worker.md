# Step 3: Service Worker Implementation

## Overview
Service workers enable offline functionality, caching, and background sync. The next-pwa plugin automatically generates service workers, but you can customize them.

## What is a Service Worker?
A service worker is a script that runs in the background, separate from a web page. It enables:
- Offline functionality
- Resource caching
- Push notifications
- Background sync
- Performance improvements

## Step-by-Step Instructions

### 1. Understand Automatic Service Worker Generation

The next-pwa plugin automatically generates a service worker when you build your app. You don't need to create it manually.

#### Generated Files (in public/):
- `sw.js` - Service worker script
- `workbox-*.js` - Workbox library files
- `worker-*.js` - Additional worker files

These are automatically created during build and should be in .gitignore.

### 2. Customize Service Worker Configuration

#### Update next.config.js for Advanced Caching:

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
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

#### PowerShell Command to Update:
```powershell
$nextConfig = @"
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['roundhouse.proxy.rlwy.net'],
  },
}

module.exports = withPWA(nextConfig)
"@
Set-Content -Path "C:\Users\DELL\uibac\next.config.js" -Value $nextConfig
```

### 3. Add Offline Page (Optional)

#### Create `pages/offline.js`:
```javascript
export default function Offline() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>You are offline</h1>
      <p>Please check your internet connection</p>
    </div>
  )
}
```

#### PowerShell Command to Create:
```powershell
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
```

### 4. Build and Test Service Worker

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Build production version
npm run build

# Start production server
npm start
```

### 5. Verify Service Worker in Browser

#### Step 1: Open DevTools
1. Open http://localhost:3000
2. Press F12 → Application tab
3. Click "Service Workers" section

#### Step 2: Check Service Worker Status
- Service worker should be "activated" or "running"
- Status should show "active"
- Update on reload should be checked

#### Step 3: Test Offline Functionality
1. In Application tab → Service Workers
2. Check "Offline" checkbox
3. Refresh the page
4. App should load from cache

#### Step 4: Test Cache Storage
1. In Application tab → Cache Storage
2. Check for caches (e.g., "workbox-precache-v2")
3. Click on cache to see cached resources

### 6. Test on Mobile Device

#### Generate QR Code:
```powershell
# Use online QR code generator
# https://www.qrcode-generator.com/
# Or use npm package
# npm install -g qrcode
# qrcode http://localhost:3000
```

#### Test Steps:
1. Scan QR code with your phone
2. Open the URL
3. Check for install prompt (may not show on first visit)
4. Test offline by turning off WiFi
5. App should load from cache

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - Service workers are free

## Common Issues

### Issue: Service worker not registering
**Solution:**
1. Service workers require HTTPS (already have from Setup #2)
2. Check browser console for errors
3. Ensure next-pwa is configured correctly
4. Test with production build (not dev server)

### Issue: Offline not working
**Solution:**
1. Check cache storage in DevTools
2. Ensure runtimeCaching is configured
3. Test with production build
4. Clear cache and try again

### Issue: Service worker not updating
**Solution:**
1. Service worker updates automatically on new deployment
2. Use `skipWaiting: true` in config
3. Users may need to refresh twice
4. Clear cache if needed

## Advanced: Custom Service Worker

If you need more control, you can create a custom service worker:

#### Create `public/sw-custom.js`:
```javascript
self.addEventListener('install', (event) => {
  console.log('Service worker installing...')
})

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...')
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})
```

#### Update next.config.js:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})

// Add custom service worker
const runtimeCaching = [
  {
    urlPattern: /^https?.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'offlineCache',
      expiration: {
        maxEntries: 200,
      },
    },
  },
]

module.exports = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching,
})
```

## Next Steps
- Test mobile installation (see `04-mobile-testing.md`)
