# Step 1: Redis Caching with Upstash

## Overview
Set up Redis caching with Upstash free tier to cache API responses and improve performance.

## What is Redis?
Redis is an in-memory data store used for caching, session management, and real-time applications.

## What is Upstash?
Upstash is a serverless Redis provider with a free tier that's perfect for development and small applications.

## Step-by-Step Instructions

### 1: Create Upstash Account

#### Step A: Sign Up
1. Go to https://upstash.com
2. Click "Sign Up"
3. Sign up with GitHub (recommended)
4. Select "Free" plan
5. Verify email address

#### Step B: Create Redis Database
1. Click "Create Database"
2. Enter database name: "uibac-cache"
3. Select region: Choose closest to your users
4. Click "Create"
5. Copy the REST API URL and token

### 2: Install Upstash Redis Client

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Install Upstash Redis client
npm install @upstash/redis
```

### 3: Add Environment Variables

#### In Vercel Dashboard:
1. Go to https://vercel.com/omarsektaoui77-hubs-projects/uibac/settings/environment-variables
2. Add `UPSTASH_REDIS_REST_URL` with your Upstash URL
3. Add `UPSTASH_REDIS_REST_TOKEN` with your Upstash token
4. Select "Production" and "Preview"
5. Click "Save"

#### In .env.local:
```powershell
# Add Upstash variables to local environment
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "UPSTASH_REDIS_REST_URL=your-upstash-url"
Add-Content -Path "C:\Users\DELL\uibac\.env.local" -Value "UPSTASH_REDIS_REST_TOKEN=your-upstash-token"
```

### 4: Create Redis Client Utility

#### Create file: `lib/redis.js`:
```javascript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default redis

export async function cacheGet(key) {
  try {
    const data = await redis.get(key)
    return data
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function cacheSet(key, value, ttl = 3600) {
  try {
    await redis.set(key, value, { ex: ttl })
    return true
  } catch (error) {
    console.error('Redis set error:', error)
    return false
  }
}

export async function cacheDelete(key) {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error('Redis delete error:', error)
    return false
  }
}
```

#### PowerShell Command to Create:
```powershell
$redisUtil = @"
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default redis

export async function cacheGet(key) {
  try {
    const data = await redis.get(key)
    return data
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function cacheSet(key, value, ttl = 3600) {
  try {
    await redis.set(key, value, { ex: ttl })
    return true
  } catch (error) {
    console.error('Redis set error:', error)
    return false
  }
}

export async function cacheDelete(key) {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error('Redis delete error:', error)
    return false
  }
}
"@
Set-Content -Path "C:\Users\DELL\uibac\lib\redis.js" -Value $redisUtil
```

### 5: Implement Caching in API Routes

#### Example: Cache API response
```javascript
import { cacheGet, cacheSet } from '../../../lib/redis'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const cacheKey = 'api:data'
  
  // Try to get from cache
  const cachedData = await cacheGet(cacheKey)
  if (cachedData) {
    return res.status(200).json({ data: cachedData, cached: true })
  }
  
  // Fetch from database
  const { data } = await supabase.from('your_table').select('*')
  
  // Cache the result for 1 hour
  await cacheSet(cacheKey, data, 3600)
  
  res.status(200).json({ data, cached: false })
}
```

### 6: Test Redis Connection

#### Create test file: `lib/test-redis.js`:
```javascript
import redis from './redis'

export async function testRedisConnection() {
  try {
    await redis.set('test', 'hello')
    const value = await redis.get('test')
    await redis.del('test')
    return value === 'hello'
  } catch (error) {
    console.error('Redis connection failed:', error)
    return false
  }
}
```

### 7: Deploy and Test

#### PowerShell Commands:
```powershell
cd C:\Users\DELL\uibac

# Commit changes
git add .
git commit -m "Add Redis caching with Upstash"
git push origin main

# Deploy to production
vercel --prod --yes
```

#### Test in Browser:
```javascript
// Test caching by calling API twice
// First call should return cached: false
// Second call should return cached: true
```

## Time Estimate
**15 minutes** to complete this step

## Cost
**$0** - Upstash free tier (10,000 commands/month)

## Common Issues

### Issue: Redis connection failed
**Solution:**
1. Check UPSTASH_REDIS_REST_URL is correct
2. Check UPSTASH_REDIS_REST_TOKEN is correct
3. Verify environment variables are set in Vercel

### Issue: Cache not working
**Solution:**
1. Check cache key is consistent
2. Verify TTL is set correctly
3. Check for errors in cache functions

## Next Steps
- Optimize bundle size (see `02-bundle-optimization.md`)
