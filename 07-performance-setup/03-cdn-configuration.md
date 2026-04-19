# Step 3: CDN Configuration

## Overview
Configure CDN (Content Delivery Network) for static assets to improve load times globally.

## What is CDN?
A CDN is a network of servers distributed globally that delivers content to users based on their geographic location, reducing latency.

## Step-by-Step Instructions

### 1: Vercel CDN (Already Configured)

Vercel automatically provides a CDN for all deployments:
- Automatic edge network
- Global CDN
- Automatic HTTPS
- No additional configuration needed

### 2: Configure Static Asset Optimization

#### Update next.config.js:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['roundhouse.proxy.rlwy.net'],
    formats: ['image/webp', 'image/avif'], // Use modern image formats
  },
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
}

module.exports = withSentryConfig(
  withPWA(nextConfig),
  {
    silent: true,
    org: 'your-org-name',
    project: 'uibac',
  }
)
```

### 3: Optimize Static Assets

#### Move static assets to public/:
```powershell
cd C:\Users\DELL\uibac

# Ensure public directory exists
if (!(Test-Path "public")) {
    New-Item -ItemType Directory -Path "public"
}

# Move static assets to public/
# Images, fonts, etc. should be in public/
```

### 4: Use Next.js Image Component

#### Example:
```javascript
import Image from 'next/image'

export default function Page() {
  return (
    <div>
      <Image
        src="/hero-image.jpg"
        alt="Hero"
        width={1200}
        height={600}
        priority
        quality={85}
      />
    </div>
  )
}
```

### 5: Configure Image Domains

#### In next.config.js:
```javascript
images: {
  domains: ['roundhouse.proxy.rlwy.net', 'example.com'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.example.com',
    },
  ],
}
```

### 6: Enable Static Asset Caching

#### Vercel automatically caches static assets:
- CSS files
- JavaScript files
- Images
- Fonts
- No additional configuration needed

### 7: Configure Cache Headers (Optional)

#### Create vercel.json:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "https://roundhouse.proxy.rlwy.net:39487"
  },
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 8: Test CDN Performance

#### Use Lighthouse:
1. Open Chrome DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Performance"
4. Click "Analyze page load"
5. Check CDN usage in report

#### Use WebPageTest:
1. Go to https://www.webpagetest.org
2. Enter your URL: https://uibac.vercel.app
3. Select test location
4. Run test
5. Check CDN performance

### 9: Deploy and Verify

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Configure CDN for static assets"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Verify CDN:
1. Open https://uibac.vercel.app
2. Press F12 → Network tab
3. Refresh the page
4. Check response headers for CDN info
5. Check cache headers

## Time Estimate
**10 minutes** to complete this step

## Cost
**$0** - Vercel CDN is free

## Common Issues

### Issue: Images not loading
**Solution:**
1. Check image domains in next.config.js
2. Verify images are in public/ directory
3. Check image paths are correct

### Issue: Cache not working
**Solution:**
1. Check cache headers in vercel.json
2. Verify Vercel CDN is active
3. Check for cache-busting headers

## Next Steps
- Configure Edge Config (see `04-edge-config.md`)
