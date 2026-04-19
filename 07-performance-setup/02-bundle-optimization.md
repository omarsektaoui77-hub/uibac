# Step 2: Next.js Bundle Optimization

## Overview
Optimize your Next.js bundle size to improve load times and performance.

## What is Bundle Optimization?
Bundle optimization reduces the size of JavaScript files sent to the browser, improving load times and user experience.

## Step-by-Step Instructions

### 1: Analyze Current Bundle Size

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Build and analyze bundle
npm run build
```

#### Check Output:
- Look at the output for bundle sizes
- Check for large chunks
- Identify optimization opportunities

### 2: Enable Production Source Maps (Optional)

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
  },
  productionBrowserSourceMaps: true, // Enable source maps for production
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

### 3: Implement Code Splitting

#### Dynamic Imports:
```javascript
// Instead of:
import HeavyComponent from './HeavyComponent'

// Use:
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable server-side rendering if not needed
})
```

### 4: Lazy Load Components

#### Example: Lazy load a component
```javascript
import { lazy, Suspense } from 'react'

const LazyChart = lazy(() => import('./Chart'))

export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<div>Loading chart...</div>}>
        <LazyChart />
      </Suspense>
    </div>
  )
}
```

### 5: Optimize Images

#### Use Next.js Image component:
```javascript
import Image from 'next/image'

// Instead of:
<img src="/logo.png" alt="Logo" width="200" height="200" />

// Use:
<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={200}
  priority // For above-the-fold images
/>
```

### 6: Remove Unused Dependencies

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Check for unused dependencies
npm install -g depcheck
depcheck

# Remove unused dependencies
npm uninstall package-name
```

### 7: Use Tree Shaking

#### Import only what you need:
```javascript
// Instead of:
import _ from 'lodash'

// Use:
import { debounce } from 'lodash'
```

### 8: Configure Compression

#### Vercel automatically compresses assets, but you can verify:
```javascript
// next.config.js - Vercel handles this automatically
// No additional configuration needed
```

### 9: Enable SWC Minification (Default)

#### Next.js uses SWC by default for minification:
```javascript
// next.config.js - SWC is enabled by default
// No additional configuration needed
```

### 10: Analyze Bundle with Webpack Bundle Analyzer

#### Install bundle analyzer:
```powershell
cd C:\Users\DELL\uibac

npm install @next/bundle-analyzer
```

#### Update next.config.js:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

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
  },
}

module.exports = withSentryConfig(
  withBundleAnalyzer(withPWA(nextConfig)),
  {
    silent: true,
    org: 'your-org-name',
    project: 'uibac',
  }
)
```

#### Add script to package.json:
```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

#### Run analyzer:
```powershell
cd C:\Users\DELL\uibac
npm run analyze
```

### 11: Deploy and Verify

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Optimize bundle size"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Verify in Vercel:
1. Go to Vercel dashboard → Deployments
2. Click on latest deployment
3. Check bundle sizes
4. Compare with previous deployment

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - Bundle optimization is free

## Common Issues

### Issue: Dynamic imports not working
**Solution:**
1. Check dynamic import syntax
2. Ensure loading component is provided
3. Check for SSR issues

### Issue: Bundle size not reduced
**Solution:**
1. Run bundle analyzer to identify large chunks
2. Check for unused dependencies
3. Implement code splitting for large components

## Next Steps
- Configure CDN (see `03-cdn-configuration.md`)
