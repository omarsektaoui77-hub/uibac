# Troubleshooting Guide - Performance Optimization

## Common Issues and Solutions

### Issue 1: Redis Connection Failed

**Symptoms:**
- Redis connection errors
- Caching not working
- API errors

**Solutions:**

#### Check 1: Upstash Credentials
```powershell
# Check environment variables
vercel env ls production | findstr UPSTASH
```

#### Check 2: Upstash Database Status
1. Go to Upstash dashboard
2. Check if database is active
3. Verify database is not paused

#### Check 3: Redis Client Configuration
```javascript
// Check redis.js configuration
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})
```

### Issue 2: Bundle Size Not Reduced

**Symptoms:**
- Bundle size remains large
- No improvement after optimization
- Build output shows large chunks

**Solutions:**

#### Check 1: Run Bundle Analyzer
```powershell
cd C:\Users\DELL\uibac
npm run analyze
```

#### Check 2: Identify Large Dependencies
```powershell
# Check for unused dependencies
npm install -g depcheck
depcheck
```

#### Check 3: Implement Code Splitting
- Add dynamic imports for large components
- Lazy load non-critical components
- Use React.lazy for component splitting

### Issue 3: Images Not Optimizing

**Symptoms:**
- Images not in webp/avif format
- Large image sizes
- Slow image loading

**Solutions:**

#### Check 1: Image Domains Configuration
```javascript
// next.config.js
images: {
  domains: ['roundhouse.proxy.rlwy.net'],
  formats: ['image/webp', 'image/avif'],
}
```

#### Check 2: Image Component Usage
```javascript
// Ensure using Next.js Image component
import Image from 'next/image'
```

#### Check 3: Image Location
- Ensure images are in public/ directory
- Check image paths are correct
- Verify image files exist

### Issue 4: CDN Not Working

**Symptoms:**
- No CDN headers
- Slow load times
- Cache not working

**Solutions:**

#### Check 1: Vercel CDN Status
1. Vercel CDN is automatic
2. No additional configuration needed
3. Check if deployment is successful

#### Check 2: Cache Headers
```json
// vercel.json
"headers": [
  {
    "source": "/static/(.*)",
    "headers": [
      {
        "key": "Cache-Control",
        "value": "public, max-age=31536000, immutable"
      }
    ]
  }
]
```

#### Check 3: Static Assets Location
- Ensure static assets are in public/ directory
- Check paths are correct
- Verify files exist

### Issue 5: Performance Score Not Improved

**Symptoms:**
- Lighthouse score remains low
- No performance improvement
- Load times still slow

**Solutions:**

#### Check 1: Lighthouse Report
1. Run Lighthouse audit
2. Check specific metrics
3. Address individual issues

#### Check 2: Core Web Vitals
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- Address each metric individually

#### Check 3: Network Conditions
- Test on slow 3G
- Test on different devices
- Check for network issues

### Issue 6: Configuration Variables Not Accessible

**Symptoms:**
- Environment variables undefined
- Configuration not loading
- Feature flags not working

**Solutions:**

#### Check 1: Variable Names
- Ensure variables start with NEXT_PUBLIC_
- Check for typos in variable names
- Verify variables are set in Vercel

#### Check 2: Redeploy After Adding Variables
```powershell
cd C:\Users\DELL\uibac
vercel --prod --yes
```

#### Check 3: Browser Console
```javascript
// Check if variables are accessible
console.log(process.env.NEXT_PUBLIC_APP_NAME)
```

### Issue 7: Caching Not Working

**Symptoms:**
- API calls not cached
- No performance improvement
- Cache always returns null

**Solutions:**

#### Check 1: Cache Key Consistency
- Ensure cache keys are consistent
- Check for typos in cache keys
- Verify key generation logic

#### Check 2: TTL Configuration
```javascript
// Check TTL is set correctly
await cacheSet(key, value, 3600) // 1 hour
```

#### Check 3: Redis Connection
- Test Redis connection
- Check for connection errors
- Verify Upstash database is active

### Getting Help

#### Check Logs
1. **Vercel logs:** Dashboard → Deployments → View logs
2. **Upstash logs:** Dashboard → Your database → Logs
3. **Browser console:** F12 → Console tab
4. **Network tab:** F12 → Network tab

#### Useful Commands
```powershell
# Check Redis package
npm list @upstash/redis

# Check bundle analyzer
npm list @next/bundle-analyzer

# Build project
cd C:\Users\DELL\uibac
npm run build

# Analyze bundle
npm run analyze

# Check environment variables
vercel env ls production
```

#### Reset Performance Configuration
If performance optimization is causing issues and you need to rollback:

```powershell
# Step 1: Remove Redis dependencies
npm uninstall @upstash/redis

# Step 2: Remove Redis utility
Remove-Item "C:\Users\DELL\uibac\lib\redis.js"

# Step 3: Remove bundle analyzer
npm uninstall @next/bundle-analyzer

# Step 4: Restore next.config.js
Copy-Item C:\Users\DELL\uibac\next.config.js.backup C:\Users\DELL\uibac\next.config.js

# Step 5: Remove config utility
Remove-Item "C:\Users\DELL\uibac\lib\config.js"

# Step 6: Rebuild and deploy
cd C:\Users\DELL\uibac
npm run build
vercel --prod --yes
```

#### Delete Upstash Database
1. Go to Upstash dashboard
2. Select your database
3. Click "Delete"
4. Confirm deletion

#### Contact Support
- Upstash Support: https://upstash.com/support
- Vercel Support: https://vercel.com/support
- Next.js Documentation: https://nextjs.org/docs

## Prevention Tips

1. **Monitor performance regularly** - Use Lighthouse and Vercel Analytics
2. **Test on multiple devices** - Desktop, mobile, tablet
3. **Test on slow networks** - 3G, 4G, WiFi
4. **Keep bundles small** - Regularly check bundle size
5. **Optimize images** - Use modern formats and compression
6. **Use caching wisely** - Cache expensive operations
7. **Monitor CDN performance** - Check cache hit rates

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Redis connection failed | Check Upstash credentials |
| Bundle size not reduced | Run bundle analyzer, implement code splitting |
| Images not optimizing | Check image domains, use Next.js Image component |
| CDN not working | Vercel CDN is automatic, check deployment |
| Performance score not improved | Check Lighthouse report, address Core Web Vitals |
| Config variables not accessible | Check NEXT_PUBLIC_ prefix, redeploy |
| Caching not working | Check cache keys, TTL, Redis connection |

## Performance Metrics

### Target Metrics:
- **Lighthouse Performance:** ≥ 80
- **Lighthouse Accessibility:** ≥ 90
- **Lighthouse Best Practices:** ≥ 90
- **Lighthouse SEO:** ≥ 80
- **Load Time:** < 3 seconds
- **First Contentful Paint:** < 1.8s
- **Time to Interactive:** < 3.8s
- **Bundle Size:** < 500KB (gzipped)

### Monitoring Tools:
- **Lighthouse:** Chrome DevTools
- **WebPageTest:** https://www.webpagetest.org
- **Vercel Analytics:** Dashboard → Analytics
- **Chrome DevTools:** Performance tab
- **Bundle Analyzer:** npm run analyze

## Dashboard URLs

- **Vercel Analytics:** https://vercel.com/omarsektaoui77-hubs-projects/uibac/analytics
- **Upstash Dashboard:** https://console.upstash.com
- **Vercel Deployments:** https://vercel.com/omarsektaoui77-hubs-projects/uibac/deployments
- **Vercel Settings:** https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings
