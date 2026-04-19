# Step 4: Vercel Edge Config

## Overview
Configure Vercel Edge Config for fast, globally distributed configuration data.

## What is Edge Config?
Edge Config is a Vercel feature that allows you to store configuration data that can be read quickly from the edge network.

## Step-by-Step Instructions

### 1: Enable Edge Config in Vercel

#### Step A: Go to Vercel Dashboard
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/edge-config
2. Edge Config is available on Pro plans and above
3. For free tier, skip this step or use environment variables instead

### 2: Alternative: Use Environment Variables

Since Edge Config requires a paid plan, we'll use environment variables for configuration:

#### Add configuration variables to Vercel:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Add configuration variables:
   - `NEXT_PUBLIC_APP_NAME`: "uibac"
   - `NEXT_PUBLIC_APP_VERSION`: "1.0.0"
   - `NEXT_PUBLIC_FEATURE_FLAGS`: "new-feature:true,experimental:false"
3. Select "Production" and "Preview"
4. Click "Save"

### 3: Create Configuration Utility

#### Create file: `lib/config.js`:
```javascript
export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'uibac',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  featureFlags: {
    newFeature: process.env.NEXT_PUBLIC_FEATURE_FLAGS?.includes('new-feature:true'),
    experimental: process.env.NEXT_PUBLIC_FEATURE_FLAGS?.includes('experimental:false'),
  },
}

export function isFeatureEnabled(featureName) {
  return config.featureFlags[featureName] || false
}
```

#### PowerShell Command to Create:
```powershell
$configUtil = @"
export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'uibac',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  featureFlags: {
    newFeature: process.env.NEXT_PUBLIC_FEATURE_FLAGS?.includes('new-feature:true'),
    experimental: process.env.NEXT_PUBLIC_FEATURE_FLAGS?.includes('experimental:false'),
  },
}

export function isFeatureEnabled(featureName) {
  return config.featureFlags[featureName] || false
}
"@
Set-Content -Path "C:\Users\DELL\uibac\lib\config.js" -Value $configUtil
```

### 4: Use Configuration in Components

#### Example:
```javascript
import { config, isFeatureEnabled } from '../lib/config'

export default function FeatureComponent() {
  if (!isFeatureEnabled('newFeature')) {
    return null
  }

  return (
    <div>
      <h1>{config.appName}</h1>
      <p>Version: {config.appVersion}</p>
    </div>
  )
}
```

### 5: Deploy and Test

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add configuration management"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Test in Browser:
```javascript
// Test configuration
console.log(process.env.NEXT_PUBLIC_APP_NAME)
console.log(process.env.NEXT_PUBLIC_APP_VERSION)
```

## Time Estimate
**5 minutes** to complete this step

## Cost
**$0** - Environment variables are free

## Common Issues

### Issue: Environment variables not accessible
**Solution:**
1. Ensure variables start with NEXT_PUBLIC_
2. Verify variables are set in Vercel
3. Redeploy after adding variables

## Next Steps
- Test and verify performance (see `05-testing-verification.md`)
