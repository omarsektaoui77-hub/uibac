# Troubleshooting Guide - Mobile PWA

## Common Issues and Solutions

### Issue 1: PWA Not Installable

**Symptoms:**
- No install prompt appears
- "Add to Home Screen" option not available
- Lighthouse shows "Is not installable"

**Solutions:**

#### Check 1: Verify Manifest is Valid
```powershell
# Check if manifest.json exists
Test-Path "C:\Users\DELL\uibac\public\manifest.json"

# View manifest content
Get-Content "C:\Users\DELL\uibac\public\manifest.json"
```

#### Check 2: Verify Icons Exist
```powershell
# Check for required icons
Test-Path "C:\Users\DELL\uibac\public\icon-192x192.png"
Test-Path "C:\Users\DELL\uibac\public\icon-512x512.png"
```

#### Check 3: Test Manifest in Browser
1. Open DevTools (F12)
2. Application tab → Manifest
3. Check for errors
4. Verify icons are displayed

#### Check 4: Ensure HTTPS is Enabled
```powershell
# Test production URL
Invoke-WebRequest -Uri "https://uibac.vercel.app" -UseBasicParsing
```

PWA requires HTTPS - already have from Setup #2.

#### Check 5: Service Worker Must Be Active
1. DevTools → Application → Service Workers
2. Service worker should be "activated"
3. If not, check next.config.js configuration

### Issue 2: Service Worker Not Registering

**Symptoms:**
- Service worker not showing in DevTools
- "Service worker registration failed" in console
- Offline functionality not working

**Solutions:**

#### Solution 1: Check next.config.js
```javascript
// Ensure next-pwa is configured
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})
```

#### Solution 2: Test with Production Build
```powershell
cd C:\Users\DELL\uibac
npm run build
npm start
```

Service workers are disabled in development by default.

#### Solution 3: Check Console for Errors
1. Open DevTools (F12)
2. Console tab
3. Look for service worker errors
4. Check for TypeScript errors

#### Solution 4: Clear Browser Cache
1. DevTools → Application → Clear storage
2. Clear site data
3. Refresh the page

### Issue 3: Offline Not Working

**Symptoms:**
- App doesn't load when offline
- Shows "No Internet" error
- Cache not storing resources

**Solutions:**

#### Solution 1: Check Cache Storage
1. DevTools → Application → Cache Storage
2. Check if caches exist
3. Click on cache to see resources

#### Solution 2: Configure Runtime Caching
```javascript
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
]
```

#### Solution 3: Test with Production Build
```powershell
cd C:\Users\DELL\uibac
npm run build
npm start
```

#### Solution 4: Check Network Tab
1. DevTools → Network tab
2. Refresh the page
3. Check which resources are cached
4. Look for failed requests

### Issue 4: Icons Not Displaying

**Symptoms:**
- Icons not showing in manifest
- App shows default icon
- Lighthouse shows "No icons"

**Solutions:**

#### Solution 1: Verify Icon Files Exist
```powershell
Test-Path "C:\Users\DELL\uibac\public\icon-192x192.png"
Test-Path "C:\Users\DELL\uibac\public\icon-512x512.png"
```

#### Solution 2: Check Icon Paths in Manifest
```json
{
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

#### Solution 3: Ensure Icons are PNG Format
- Icons must be PNG format
- Check file extension
- Re-generate icons if needed

#### Solution 4: Clear Browser Cache
1. DevTools → Application → Clear storage
2. Clear cache
3. Refresh the page

### Issue 5: Build Fails

**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Module not found errors

**Solutions:**

#### Solution 1: Check next.config.js Syntax
```powershell
# Validate JavaScript syntax
# Use online validator or check manually
```

#### Solution 2: Ensure Dependencies are Installed
```powershell
cd C:\Users\DELL\uibac
npm install
```

#### Solution 3: Check Node.js Version
```powershell
node --version
# Should be v18+
```

#### Solution 4: Check for TypeScript Errors
```powershell
# If using TypeScript, check for type errors
# Ensure types are correct
```

### Issue 6: Mobile Installation Fails

**Symptoms:**
- "Add to Home Screen" not available on iOS
- Install prompt not showing on Android
- App installs but doesn't open correctly

**Solutions:**

#### Solution 1: iOS Specific Requirements
iOS has strict PWA requirements:
- Must have manifest.json
- Must have icons (at least 192x192)
- Must have service worker
- Must be served over HTTPS
- Must be visited at least twice

#### Solution 2: Android Specific Requirements
- Chrome must detect PWA
- Manifest must be valid
- Service worker must be active
- HTTPS required

#### Solution 3: Test on Real Device
1. Generate QR code
2. Scan with phone
3. Test installation
4. Check for device-specific issues

#### Solution 4: Check User Agent
1. DevTools → More tools → Network conditions
2. Change user agent to mobile
3. Test PWA features

### Issue 7: Responsive Design Issues

**Symptoms:**
- Layout breaks on mobile
- Text too small to read
- Buttons not touch-friendly
- Horizontal scrolling

**Solutions:**

#### Solution 1: Test with DevTools Device Toolbar
1. DevTools → Device toolbar (Ctrl+Shift+M)
2. Test different screen sizes
3. Check for layout issues

#### Solution 2: Use CSS Media Queries
```css
/* Mobile styles */
@media (max-width: 768px) {
  /* Adjust layout for mobile */
  body {
    font-size: 16px;
  }
  
  button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

#### Solution 3: Use Responsive Units
- Use `%` instead of `px` for widths
- Use `rem` or `em` for font sizes
- Use `vh` and `vw` for viewport-based sizing

#### Solution 4: Test on Real Devices
1. Test on iPhone
2. Test on Android
3. Test on tablet
4. Check for device-specific issues

### Issue 8: Performance Issues

**Symptoms:**
- Slow load time
- Large bundle size
- Poor Lighthouse score

**Solutions:**

#### Solution 1: Check Bundle Size
```powershell
cd C:\Users\DELL\uibac
npm run build
# Check output for bundle sizes
```

#### Solution 2: Optimize Images
- Use WebP format
- Compress images
- Use next/image for optimization

#### Solution 3: Code Splitting
- Use dynamic imports
- Split routes
- Lazy load components

#### Solution 4: Enable Compression
Vercel automatically compresses assets. Ensure next.config.js has compression enabled.

### Getting Help

#### Check Logs
1. **Vercel logs:** Dashboard → Deployments → View logs
2. **Browser console:** F12 → Console tab
3. **Service worker logs:** F12 → Application → Service Workers
4. **Network tab:** F12 → Network tab

#### Useful Commands
```powershell
# Check PWA files
Test-Path "C:\Users\DELL\uibac\public\manifest.json"
Test-Path "C:\Users\DELL\uibac\public\icon-192x192.png"

# Check configuration
Get-Content "C:\Users\DELL\uibac\next.config.js"

# Test build
cd C:\Users\DELL\uibac
npm run build

# Test production
npm start
```

#### Reset PWA Configuration
If PWA is causing issues and you need to rollback:

```powershell
# Step 1: Restore next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js.backup C:\Users\DELL\uibac\next.config.js

# Step 2: Remove manifest.json
Remove-Item "C:\Users\DELL\uibac\public\manifest.json"

# Step 3: Remove icons
Remove-Item "C:\Users\DELL\uibac\public\icon-*.png"

# Step 4: Rebuild
cd C:\Users\DELL\uibac
npm run build

# Step 5: Redeploy
vercel --prod --yes
```

#### Contact Support
- Next.js Documentation: https://nextjs.org/docs
- next-pwa GitHub: https://github.com/DuCanhGH/next-pwa
- PWA Documentation: https://web.dev/progressive-web-apps/
- Vercel Support: https://vercel.com/support

## Prevention Tips

1. **Test on multiple devices** - Desktop, iOS, Android
2. **Test offline functionality** - Ensure cache works
3. **Monitor bundle size** - Keep it under 500KB
4. **Use Lighthouse regularly** - Check PWA score
5. **Test with slow networks** - Ensure performance is good
6. **Keep icons optimized** - Compress images
7. **Test after every deployment** - Catch issues early

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| PWA not installable | Check manifest and icons |
| Service worker not registering | Test with production build |
| Offline not working | Configure runtime caching |
| Icons not displaying | Verify icon files exist |
| Build fails | Check next.config.js syntax |
| Mobile install fails | Test on real device |
| Responsive issues | Use DevTools device toolbar |
| Performance issues | Check bundle size |

## Browser-Specific Notes

### Chrome
- Best PWA support
- Install prompt appears automatically
- Full offline support

### Safari (iOS)
- Requires manual "Add to Home Screen"
- Limited service worker support
- Requires HTTPS

### Firefox
- Good PWA support
- Install prompt available
- Full offline support

### Edge
- Based on Chromium (same as Chrome)
- Full PWA support
- Install prompt available
